/**
 * Núcleo puro de la búsqueda global: normaliza, puntúa, ordena y recorta el
 * fragmento. Sin base de datos ni React.
 *
 * La normalización (minúsculas y sin tildes) conserva la longitud del texto
 * carácter a carácter, de modo que una posición encontrada en el texto
 * normalizado vale también en el original.
 */

export type SearchKind = "page" | "task" | "item" | "habit";

/** Orden fijo de los grupos en los resultados. */
export const SEARCH_KINDS: readonly SearchKind[] = ["page", "task", "item", "habit"];

export const KIND_LABEL: Record<SearchKind, string> = {
  page: "Páginas",
  task: "Tareas",
  item: "Items de listas",
  habit: "Hábitos",
};

/** Un elemento buscable. `ref` lleva lo que la interfaz necesita para abrirlo. */
export interface SearchEntry<Ref = unknown> {
  id: string;
  kind: SearchKind;
  title: string;
  /** Texto largo donde también se busca (contenido, notas…). */
  body: string;
  /** Dónde vive (colección, lista › sección…). No se busca en él. */
  context?: string;
  ref: Ref;
}

/** Un elemento con su texto ya normalizado (se hace una vez al cargar el índice). */
export interface PreparedEntry<Ref = unknown> extends SearchEntry<Ref> {
  titleN: string;
  bodyN: string;
}

/** Tramo `[inicio, fin)` de un texto. */
export type Range = readonly [number, number];

export interface Snippet {
  text: string;
  ranges: Range[];
}

export interface SearchResult<Ref = unknown> {
  entry: PreparedEntry<Ref>;
  score: number;
  /** Coincidencias dentro del título (para resaltarlas). */
  titleRanges: Range[];
  /** Fragmento del cuerpo alrededor de la coincidencia, si el cuerpo contiene alguna. */
  snippet: Snippet | null;
}

export interface SearchGroup<Ref = unknown> {
  kind: SearchKind;
  results: SearchResult<Ref>[];
  /** Total de coincidencias del grupo (puede superar `results.length`). */
  total: number;
}

/* ---------- normalización ---------- */

const COMBINING_MARKS = /\p{M}/gu;

/**
 * Minúsculas y sin diacríticos ("Canción" → "cancion"). Devuelve un texto con
 * EXACTAMENTE la misma longitud (en unidades UTF-16) que el original.
 */
export function normalizeText(text: string): string {
  let out = "";
  for (const char of text) {
    let mapped = char.normalize("NFD").replace(COMBINING_MARKS, "").toLowerCase();
    if (mapped.length !== char.length) {
      // Caso raro (p. ej. una marca suelta): se mantiene la longitud.
      mapped = char.length === 1 ? (mapped[0] ?? " ") : char;
    }
    out += mapped;
  }
  return out;
}

/** Palabras de la consulta, normalizadas y sin repetir. */
export function tokenize(query: string): string[] {
  const words = normalizeText(query).split(/\s+/).filter((word) => word !== "");
  return [...new Set(words)];
}

export function prepareEntry<Ref>(entry: SearchEntry<Ref>): PreparedEntry<Ref> {
  return { ...entry, titleN: normalizeText(entry.title), bodyN: normalizeText(entry.body) };
}

/* ---------- coincidencias ---------- */

const WORD_CHAR = /[\p{L}\p{N}]/u;

function isWordBoundary(text: string, index: number): boolean {
  return index === 0 || !WORD_CHAR.test(text[index - 1]);
}

/** Une tramos que se tocan o se solapan. */
export function mergeRanges(ranges: readonly Range[]): Range[] {
  const sorted = [...ranges].sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const merged: Range[] = [];
  for (const range of sorted) {
    const last = merged[merged.length - 1];
    if (last && range[0] <= last[1]) {
      merged[merged.length - 1] = [last[0], Math.max(last[1], range[1])];
    } else {
      merged.push(range);
    }
  }
  return merged;
}

/** Todos los tramos de `textN` donde aparece alguna palabra (ya normalizadas). */
export function findRanges(textN: string, tokens: readonly string[]): Range[] {
  const found: Range[] = [];
  for (const token of tokens) {
    if (token === "") continue;
    let from = 0;
    for (;;) {
      const index = textN.indexOf(token, from);
      if (index === -1) break;
      found.push([index, index + token.length]);
      from = index + token.length;
    }
  }
  return mergeRanges(found);
}

/* ---------- puntuación ---------- */

const TITLE_HIT = 100;
const TITLE_WORD_START = 30;
const TITLE_PREFIX = 40;
const BODY_HIT = 10;
const BODY_WORD_START = 4;
const TITLE_EXACT = 200;
const TITLE_STARTS_WITH_QUERY = 80;

/**
 * Puntuación de un elemento para las palabras dadas, o null si NO coincide:
 * todas las palabras deben aparecer (en el título o en el cuerpo). Un acierto
 * en el título pesa mucho más que uno en el cuerpo; empezar una palabra o el
 * propio título suma un extra.
 */
export function scoreEntry(entry: PreparedEntry, tokens: readonly string[]): number | null {
  if (tokens.length === 0) return null;
  let score = 0;
  for (const token of tokens) {
    const inTitle = entry.titleN.indexOf(token);
    if (inTitle !== -1) {
      score += TITLE_HIT;
      if (inTitle === 0) score += TITLE_PREFIX;
      else if (isWordBoundary(entry.titleN, inTitle)) score += TITLE_WORD_START;
      continue;
    }
    const inBody = entry.bodyN.indexOf(token);
    if (inBody === -1) return null;
    score += BODY_HIT;
    if (isWordBoundary(entry.bodyN, inBody)) score += BODY_WORD_START;
  }

  const phrase = tokens.join(" ");
  if (entry.titleN === phrase) score += TITLE_EXACT;
  else if (entry.titleN.startsWith(phrase)) score += TITLE_STARTS_WITH_QUERY;
  return score;
}

/* ---------- fragmento ---------- */

export interface SnippetOptions {
  /** Caracteres de contexto antes de la primera coincidencia. */
  before?: number;
  /** Caracteres de contexto desde el inicio de la coincidencia. */
  after?: number;
}

/** Adornos de Markdown que estorban en una vista previa de una línea. */
const MARKDOWN_NOISE = /[#*_`>~|]+/g;

/**
 * Fragmento del cuerpo alrededor de la primera coincidencia, en una sola
 * línea y con las coincidencias marcadas. Devuelve null si el cuerpo no
 * contiene ninguna palabra. Añade "…" donde se recorta.
 */
export function makeSnippet(
  body: string,
  bodyN: string,
  tokens: readonly string[],
  { before = 36, after = 90 }: SnippetOptions = {},
): Snippet | null {
  let first = -1;
  for (const token of tokens) {
    if (token === "") continue;
    const index = bodyN.indexOf(token);
    if (index !== -1 && (first === -1 || index < first)) first = index;
  }
  if (first === -1) return null;

  let start = Math.max(0, first - before);
  let end = Math.min(body.length, first + after);
  // No se corta una palabra por la mitad.
  if (start > 0) {
    const space = body.indexOf(" ", start);
    if (space !== -1 && space < first) start = space + 1;
  }
  if (end < body.length) {
    const space = body.lastIndexOf(" ", end);
    if (space > first) end = space;
  }

  const window = body.slice(start, end).replace(MARKDOWN_NOISE, "").replace(/\s+/g, " ");
  const core = window.trim();
  const text = `${start > 0 ? "…" : ""}${core}${end < body.length ? "…" : ""}`;

  const prefix = start > 0 ? 1 : 0;
  const ranges = findRanges(normalizeText(core), tokens).map(
    ([from, to]) => [from + prefix, to + prefix] as const,
  );
  return { text, ranges };
}

/* ---------- búsqueda ---------- */

export interface SearchOptions {
  /** Máximo de resultados por grupo. */
  limitPerGroup?: number;
}

export const DEFAULT_LIMIT_PER_GROUP = 6;

/**
 * Busca en el índice y devuelve los resultados agrupados por tipo (en el orden
 * de `SEARCH_KINDS`, sin los grupos vacíos), cada grupo de mejor a peor
 * puntuación. A igual puntuación manda el título más corto y, después, el
 * orden del índice.
 */
export function searchEntries<Ref>(
  entries: readonly PreparedEntry<Ref>[],
  query: string,
  { limitPerGroup = DEFAULT_LIMIT_PER_GROUP }: SearchOptions = {},
): SearchGroup<Ref>[] {
  const tokens = tokenize(query);
  if (tokens.length === 0) return [];

  const byKind = new Map<SearchKind, { entry: PreparedEntry<Ref>; score: number; order: number }[]>();
  entries.forEach((entry, order) => {
    const score = scoreEntry(entry, tokens);
    if (score === null) return;
    const list = byKind.get(entry.kind) ?? [];
    list.push({ entry, score, order });
    byKind.set(entry.kind, list);
  });

  const groups: SearchGroup<Ref>[] = [];
  for (const kind of SEARCH_KINDS) {
    const hits = byKind.get(kind);
    if (!hits) continue;
    hits.sort(
      (a, b) =>
        b.score - a.score ||
        a.entry.title.length - b.entry.title.length ||
        a.order - b.order,
    );
    groups.push({
      kind,
      total: hits.length,
      results: hits.slice(0, limitPerGroup).map(({ entry, score }) => ({
        entry,
        score,
        titleRanges: findRanges(entry.titleN, tokens),
        snippet: makeSnippet(entry.body, entry.bodyN, tokens),
      })),
    });
  }
  return groups;
}

/* ---------- filtrado de acciones ---------- */

/** ¿La etiqueta contiene todas las palabras de la consulta? (sin mayúsculas ni tildes) */
export function matchesLabel(label: string, query: string): boolean {
  const tokens = tokenize(query);
  if (tokens.length === 0) return true;
  const labelN = normalizeText(label);
  return tokens.every((token) => labelN.includes(token));
}

/** Trozos de `text` marcados/no marcados según `ranges` (para pintar el resaltado). */
export function splitByRanges(
  text: string,
  ranges: readonly Range[],
): { text: string; match: boolean }[] {
  const parts: { text: string; match: boolean }[] = [];
  let cursor = 0;
  for (const [from, to] of mergeRanges(ranges)) {
    const start = Math.min(Math.max(from, cursor), text.length);
    const end = Math.min(to, text.length);
    if (end <= start) continue;
    if (start > cursor) parts.push({ text: text.slice(cursor, start), match: false });
    parts.push({ text: text.slice(start, end), match: true });
    cursor = end;
  }
  if (cursor < text.length) parts.push({ text: text.slice(cursor), match: false });
  return parts;
}
