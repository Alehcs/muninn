/** Devuelve el contenido principal (el que tiene el scroll) arriba del todo. */
export function scrollMainToTop(): void {
  document.getElementById("main-content")?.scrollTo({ top: 0 });
}
