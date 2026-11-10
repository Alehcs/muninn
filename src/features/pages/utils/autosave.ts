export type SaveStatus = "idle" | "pending" | "saving" | "saved" | "error";

export interface AutosaverOptions {
  /** Persiste el texto. Debe lanzar si falla. */
  save: (value: string) => Promise<void>;
  /** Valor actual del campo/editor, o null si aún no está disponible. */
  readCurrent: () => string | null;
  onStatus?: (status: SaveStatus) => void;
  onError?: (error: unknown) => void;
  /** Espera tras dejar de escribir. */
  delayMs?: number;
  /** Espera antes de reintentar tras un fallo. */
  retryMs?: number;
}

/**
 * Guardado automático con retardo para un texto (el cuerpo Markdown o el
 * título de una página).
 *
 * - No escribe si el valor es igual al de referencia: lo último guardado o,
 *   mientras no se haya guardado nada, el valor base (lo que ya había al
 *   abrir). Por eso abrir una página nunca produce una escritura.
 * - `schedule()` espera `delayMs` sin cambios; `flush()` guarda ya (al salir,
 *   cambiar de vista o cerrar).
 * - Si guardar falla, el valor sigue pendiente: se avisa y se reintenta cada
 *   `retryMs` mientras no haya otro intento.
 * - Nunca hay dos guardados a la vez; si llega un cambio durante uno, se
 *   guarda justo después.
 */
export class Autosaver {
  private baseline: string | null = null;
  private saved: string | null = null;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private inFlight: Promise<void> | null = null;
  private again = false;
  private disposed = false;
  private pendingValue: string | null = null;
  /** Último estado estable (sin cambios pendientes): "idle" o "saved". */
  private stable: SaveStatus = "idle";

  constructor(private readonly options: AutosaverOptions) {}

  /** Fija el valor con el que se compara mientras no se haya guardado nada. */
  setBaseline(value: string): void {
    this.baseline = value;
  }

  /** Valor de referencia (último guardado o base), o null si no hay base. */
  get reference(): string | null {
    return this.saved ?? this.baseline;
  }

  /** Programa un guardado tras `delayMs` sin nuevos cambios. */
  schedule(): void {
    if (this.disposed || this.baseline === null) return;
    this.clearTimer();
    this.options.onStatus?.("pending");
    this.timer = setTimeout(() => void this.flush(), this.options.delayMs ?? 600);
  }

  /** Guarda ya si hay algo distinto. `value` permite pasar el último texto conocido. */
  async flush(value?: string): Promise<void> {
    this.clearTimer();
    if (this.baseline === null) return;

    if (this.inFlight) {
      this.again = true;
      if (value !== undefined) this.pendingValue = value;
      await this.inFlight;
      return;
    }

    const current = value ?? this.pendingValue ?? this.options.readCurrent();
    this.pendingValue = null;
    if (current === null || current === this.reference) {
      this.options.onStatus?.(this.stable);
      return;
    }

    this.inFlight = this.run(current);
    try {
      await this.inFlight;
    } finally {
      this.inFlight = null;
    }
    if (this.again) {
      this.again = false;
      await this.flush();
    }
  }

  private async run(value: string): Promise<void> {
    this.options.onStatus?.("saving");
    try {
      await this.options.save(value);
      this.saved = value;
      this.stable = "saved";
      this.options.onStatus?.("saved");
    } catch (error) {
      this.options.onStatus?.("error");
      this.options.onError?.(error);
      // El texto sigue pendiente: se reintenta con este mismo valor aunque el
      // editor ya no exista (p. ej. se salió de la página).
      this.pendingValue = value;
      this.again = false;
      this.clearTimer();
      if (!this.disposed) {
        this.timer = setTimeout(() => void this.flush(), this.options.retryMs ?? 5000);
      }
    }
  }

  private clearTimer(): void {
    if (this.timer !== null) clearTimeout(this.timer);
    this.timer = null;
  }

  /** Cancela temporizadores pendientes (no guarda). */
  dispose(): void {
    this.disposed = true;
    this.clearTimer();
  }
}
