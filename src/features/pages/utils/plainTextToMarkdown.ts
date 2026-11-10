/**
 * Convierte el texto plano de una nota antigua en Markdown para MOSTRARLA.
 * Es pura y no toca la base: la conversión solo se guarda si el usuario edita.
 *
 * En Markdown un salto de línea simple no separa líneas, así que mostrar la
 * nota tal cual la apelmazaría. Reglas:
 * - Cada salto de línea sigue siendo visible: líneas contiguas se unen con un
 *   salto duro (`\` al final) y una línea en blanco separa párrafos.
 * - Las líneas que ya son Markdown se respetan: listas (`- `, `* `, `+ `,
 *   `1. `), casillas (`- [ ]`), encabezados (`# `), citas (`> `), separadores
 *   (`---`) y bloques de código con ``` (se copian tal cual).
 * - En las líneas de texto se escapan los caracteres que Markdown trataría
 *   como formato (`*`, `` ` ``, `[`…) para que se vean literalmente.
 * - Las URLs sueltas (`http://`, `https://`) pasan a enlaces automáticos.
 * - No se pierde texto. Solo se normalizan espacios: se quitan los de los
 *   extremos de cada línea y varias líneas en blanco seguidas pasan a una.
 */

type LineKind = "blank" | "text" | "list" | "heading" | "quote" | "rule";

const HEADING = /^ {0,3}#{1,6}(?:[ \t]|$)/;
// Un marcador solo ("-", "1.") no es una lista: es texto y se conserva.
const LIST = /^[ \t]*(?:[-*+]|\d{1,9}[.)])[ \t]+\S/;
const LONE_MARKER = /^(?:[-+]|\d{1,9}[.)])$/;
const QUOTE = /^ {0,3}>/;
const RULE = /^ {0,3}(?:(?:-[ \t]*){3,}|(?:\*[ \t]*){3,}|(?:_[ \t]*){3,})$/;
const FENCE = /^ {0,3}(```+|~~~+)/;

const URL = /https?:\/\/[^\s<>]+/g;
/** URL ya envuelta en Markdown: `](url`, `<url`, `(url` o `[url`. */
const URL_PREFIX_IN_MARKDOWN = /[(<[\]"'=]$/;

function classify(line: string): LineKind {
  if (line.trim() === "") return "blank";
  if (RULE.test(line)) return "rule";
  if (HEADING.test(line)) return "heading";
  if (QUOTE.test(line)) return "quote";
  if (LIST.test(line)) return "list";
  return "text";
}

/** Separa la puntuación final que no forma parte de la URL. */
function splitTrailingPunctuation(raw: string): [string, string] {
  let url = raw;
  let tail = "";
  for (;;) {
    const last = url[url.length - 1];
    if (last === undefined) break;
    const unbalancedParen =
      last === ")" && (url.match(/\(/g)?.length ?? 0) < (url.match(/\)/g)?.length ?? 0);
    if (/[.,;:!?'"»”’\]]/.test(last) || unbalancedParen) {
      tail = last + tail;
      url = url.slice(0, -1);
    } else {
      break;
    }
  }
  return [url, tail];
}

/** Escapa lo que Markdown interpretaría como formato en texto corriente. */
export function escapeMarkdownText(text: string): string {
  let out = "";
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const prev = text[i - 1] ?? "";
    const next = text[i + 1] ?? "";
    switch (char) {
      case "\\":
      case "`":
      case "*":
      case "[":
      case "]":
      case "<":
        out += `\\${char}`;
        break;
      case "_":
        // `snake_case` no es énfasis; `_texto_` sí.
        out += /[\p{L}\p{N}]/u.test(prev) && /[\p{L}\p{N}]/u.test(next) ? char : "\\_";
        break;
      case "~":
        out += next === "~" || prev === "~" ? "\\~" : char;
        break;
      case "&":
        out += /^#?\w+;/.test(text.slice(i + 1)) ? "\\&" : char;
        break;
      default:
        out += char;
    }
  }
  return out;
}

/** Texto corriente: URLs a enlaces automáticos y el resto escapado. */
function convertText(text: string): string {
  let out = "";
  let last = 0;
  for (const match of text.matchAll(URL)) {
    const [url, tail] = splitTrailingPunctuation(match[0]);
    const start = match.index ?? 0;
    if (url === "" || !/^https?:\/\/[^\s<>]+$/.test(url)) continue;
    out += escapeMarkdownText(text.slice(last, start));
    out += `<${url}>`;
    out += escapeMarkdownText(tail);
    last = start + match[0].length;
  }
  return out + escapeMarkdownText(text.slice(last));
}

/** Línea que ya es Markdown: solo se enlazan las URLs sueltas. */
function linkBareUrls(line: string): string {
  return line.replace(URL, (raw, offset: number) => {
    if (URL_PREFIX_IN_MARKDOWN.test(line.slice(0, offset))) return raw;
    const [url, tail] = splitTrailingPunctuation(raw);
    return url === "" ? raw : `<${url}>${tail}`;
  });
}

export function plainTextToMarkdown(text: string): string {
  const lines = text.split(/\r\n|\r|\n/);
  const out: string[] = [];

  let previous: LineKind = "blank";
  /** Índice en `out` donde empieza la tanda actual de texto o de citas. */
  let runStart = -1;
  let fence: string | null = null;

  /** Las tandas de texto y de citas llevan salto duro en todas menos la última. */
  const closeRun = () => {
    if (runStart === -1) return;
    for (let i = runStart; i < out.length - 1; i++) out[i] += "\\";
    runStart = -1;
  };

  const separate = () => {
    if (out.length > 0 && out[out.length - 1] !== "") out.push("");
  };

  for (const rawLine of lines) {
    if (fence !== null) {
      out.push(rawLine);
      const closing = /^ {0,3}(`{3,}|~{3,})\s*$/.exec(rawLine);
      if (closing && closing[1][0] === fence[0] && closing[1].length >= fence.length) {
        fence = null;
        previous = "rule";
      }
      continue;
    }

    const opening = FENCE.exec(rawLine);
    if (opening) {
      closeRun();
      separate();
      out.push(rawLine);
      fence = opening[1];
      continue;
    }

    const line = rawLine.replace(/\s+$/, "");
    const kind = classify(line);

    if (kind === "blank") {
      closeRun();
      if (previous !== "blank") separate();
      previous = "blank";
      continue;
    }

    const continuesRun =
      (kind === "text" || kind === "quote" || kind === "list") && kind === previous;

    if (!continuesRun) {
      closeRun();
      separate();
    }

    if (kind === "text") {
      if (!continuesRun) runStart = out.length;
      // Sin sangría (4+ espacios serían código) y sin que `===` forme un título.
      const body = convertText(line.trimStart());
      if (/^=+$/.test(body)) out.push(`\\${body}`);
      else if (LONE_MARKER.test(body)) out.push(body.replace(/^(\d+)?([-+.)])$/, "$1\\$2"));
      else out.push(body);
    } else if (kind === "quote") {
      if (!continuesRun) runStart = out.length;
      out.push(linkBareUrls(line));
    } else {
      out.push(linkBareUrls(line));
    }
    previous = kind;
  }
  closeRun();

  while (out.length > 0 && out[out.length - 1] === "") out.pop();
  return out.join("\n");
}
