import { useState } from "react";
import type { SelfTestResult, StepResult } from "./runSelfTest";

interface SelfTestPanelProps {
  steps: StepResult[];
  result: SelfTestResult | null;
  crash: string | null;
  runtime: string;
}

/** Panel simple con el resultado de la autoprueba (solo desarrollo). */
export default function SelfTestPanel({ steps, result, crash, runtime }: SelfTestPanelProps) {
  const [hidden, setHidden] = useState(false);
  if (hidden) return null;

  const status = crash ? "ERROR" : result ? (result.passed ? "CORRECTA" : "CON FALLOS") : "en curso…";
  const differences = result
    ? Object.keys(result.countsBefore).filter((t) => result.countsBefore[t] !== result.countsAfter[t])
    : [];

  return (
    <div
      data-selftest={result || crash ? "done" : "running"}
      data-selftest-passed={result ? String(result.passed) : undefined}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 p-4"
    >
      <div
        role="dialog"
        aria-label="Resultado de la autoprueba"
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-xl border border-border bg-surface p-5 text-text shadow-lg"
      >
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-base font-semibold">Autoprueba ({runtime})</h2>
          <span className="text-sm font-medium">{status}</span>
        </div>
        {crash && <p className="mt-2 text-sm text-danger">{crash}</p>}
        <ul className="mt-3 min-h-0 flex-1 divide-y divide-border overflow-y-auto text-sm">
          {steps.map((step) => (
            <li key={step.name} className="flex gap-2 py-1.5">
              <span className="w-5 shrink-0" aria-label={step.skipped ? "omitido" : step.ok ? "correcto" : "fallo"}>
                {step.skipped ? "–" : step.ok ? "✓" : "✗"}
              </span>
              <span className="min-w-0">
                {step.name}
                {step.error && (
                  <span className={step.ok ? "block text-text-muted" : "block text-danger"}>{step.error}</span>
                )}
              </span>
            </li>
          ))}
        </ul>
        {result && (
          <p className="mt-3 text-xs text-text-muted">
            Conteos: {differences.length === 0 ? "iguales al inicio en todas las tablas" : `distintos en ${differences.join(", ")}`}.
            Resultado guardado en app_metadata («selftest_result»).
          </p>
        )}
        <div className="mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => setHidden(true)}
            className="rounded-lg border border-border px-3 py-1.5 text-sm text-text-muted hover:bg-surface-hover hover:text-text"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
