/** Añade https:// si falta el esquema (http, https o mailto). */
export function toOpenableUrl(url: string): string {
  return /^https?:\/\//i.test(url) || /^mailto:/i.test(url)
    ? url
    : `https://${url}`;
}
