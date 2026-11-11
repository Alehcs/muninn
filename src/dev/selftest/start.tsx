import { createRoot } from "react-dom/client";
import { isTauri } from "@/lib/platform/env";
import SelfTestPanel from "./SelfTestPanel";
import { runSelfTest, type SelfTestResult, type StepResult } from "./runSelfTest";

let started = false;

/** Lanza la autoprueba una vez y pinta su panel. Solo desarrollo, con `?selftest=1`. */
export async function startSelfTest(): Promise<void> {
  if (started) return;
  started = true;

  const host = document.createElement("div");
  host.id = "selftest-root";
  document.body.appendChild(host);
  const root = createRoot(host);
  const runtime = isTauri() ? "Tauri: plugin SQL + Rust" : "navegador: sql.js";

  const render = (steps: StepResult[], result: SelfTestResult | null, crash: string | null) =>
    root.render(<SelfTestPanel steps={steps} result={result} crash={crash} runtime={runtime} />);

  render([], null, null);
  try {
    const result = await runSelfTest((steps) => render(steps, null, null));
    (window as unknown as { __selftestResult?: SelfTestResult }).__selftestResult = result;
    render(result.steps, result, null);
    console.info("Autoprueba:", result.passed ? "CORRECTA" : "CON FALLOS", result);
  } catch (error) {
    console.error("La autoprueba se interrumpió", error);
    const message = error instanceof Error ? error.message : String(error);
    (window as unknown as { __selftestResult?: unknown }).__selftestResult = { crash: message };
    render([], null, `La autoprueba se interrumpió: ${message}`);
  }
}
