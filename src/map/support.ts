/**
 * MapLibre GL requires WebGL2. Hardened browser profiles — iOS Lockdown
 * Mode in particular — disable it, which would leave the tracker mounting
 * a map that can never draw. Detect that up front so the tracker can say
 * what happened instead. WebGL2 is the only capability gated here: the
 * shipped map engine contains no WebAssembly, so a browser with WASM off
 * but WebGL2 on renders the map fine and must not be blocked.
 */
export function getMapSupportError(): string | null {
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
