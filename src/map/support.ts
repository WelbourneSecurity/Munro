/**
 * MapLibre GL requires WebGL2 (and modern engines JIT-compile it alongside
 * WebAssembly-backed workers in some browsers). Hardened browser profiles —
 * iOS Lockdown Mode in particular — disable WebGL2 and WebAssembly, which
 * would leave the tracker mounting a map that can never draw. Detect the
 * missing capability up front so the tracker can say what happened instead.
 */
export function getMapSupportError(): string | null {
  if (typeof WebAssembly === 'undefined') {
    return 'This browser has WebAssembly disabled (iOS Lockdown Mode does this), which the map engine needs.';
  }

  try {
    const canvas = document.createElement('canvas');

    if (!canvas.getContext('webgl2')) {
      return 'This browser has WebGL disabled (iOS Lockdown Mode does this), which the map needs to draw.';
    }
  } catch {
    return 'This browser blocks the graphics features the map needs to draw.';
  }

  return null;
}
