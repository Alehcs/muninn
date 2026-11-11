/**
 * Logotipo de Muninn: el cuervo de Odín ("Memoria") recortado sobre la luna.
 * Es el mismo dibujo que el icono de la app (`assets/brand/muninn-icon.svg`),
 * con sus colores fijos para que la marca se reconozca igual en el Dock y
 * dentro de la app, sea cual sea el tema.
 */
const RAVEN_PATH =
  "M14 100 C12 72 20 48 34 36 C44 27 58 22 70 25 C80 28 90 31 97 36 C89 40 80 43 72 45 C69 50 70 55 73 60 C69 61 66 63 64 67 C66 69 67 71 66 73 C63 82 61 91 59 100 Z";

export default function MuninnMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="100 100 824 824"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <clipPath id="muninn-mark-clip">
          <rect x="100" y="100" width="824" height="824" rx="185" />
        </clipPath>
      </defs>
      <g clipPath="url(#muninn-mark-clip)">
        <rect x="100" y="100" width="824" height="824" fill="#1f2647" />
        <circle cx="560" cy="470" r="290" fill="#ebe9f6" />
        <path
          d={RAVEN_PATH}
          transform="translate(150 220) scale(7.2)"
          fill="#0c1022"
        />
        <circle cx="589" cy="465" r="26" fill="#e8a54b" />
      </g>
    </svg>
  );
}
