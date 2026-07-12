/**
 * The hand-authored Munro mark shared by every icon generator: concentric
 * contour rings around a soft-green summit point. `npm run data:icons`
 * rasterizes it into the committed PWA icons, and the mobile packaging
 * patch renders it into the generated native projects' launcher icons.
 */

// Palette — keep in sync with the theme tokens in src/index.css.
export const SURFACE = '#111713';
const RING = '#96a095';
const SUMMIT = '#a7d8b6';

/**
 * The Munro mark: three irregular contour rings closing on a summit dot,
 * drawn in a 512x512 box. `markScale` shrinks the mark towards the centre
 * so maskable / adaptive icons keep the mark inside their safe zone.
 * `background` fills the canvas; pass `'none'` for a transparent canvas
 * (Android adaptive-icon foregrounds supply the background separately).
 */
export function buildMarkSvg(markScale: number, background: string = SURFACE): string {
  const translate = (512 * (1 - markScale)) / 2;
  const backgroundRect =
    background === 'none'
      ? ''
      : `<rect width="512" height="512" fill="${background}"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512" viewBox="0 0 512 512">
  ${backgroundRect}
  <g transform="translate(${translate} ${translate}) scale(${markScale})"
     fill="none" stroke="${RING}" stroke-width="17" stroke-linecap="round" stroke-linejoin="round">
    <path d="M 106 300 C 100 222 168 128 264 122 C 352 118 410 206 404 290 C 398 352 340 392 250 394 C 162 396 112 362 106 300 Z"/>
    <path d="M 162 294 C 158 238 202 176 264 172 C 322 168 356 224 352 282 C 349 328 310 354 252 356 C 200 358 165 340 162 294 Z"/>
    <path d="M 216 288 C 214 252 236 216 262 214 C 290 212 308 244 306 280 C 304 308 284 322 258 323 C 232 324 218 314 216 288 Z"/>
    <circle cx="260" cy="268" r="15" fill="${SUMMIT}" stroke="none"/>
  </g>
</svg>
`;
}
