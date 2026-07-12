// @vitest-environment jsdom

import { vi } from 'vitest';

import { getMapSupportError } from './support';

describe('getMapSupportError', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it('reports the missing WebGL2 support jsdom shares with Lockdown Mode', () => {
    // jsdom never provides a webgl2 context, matching a hardened browser.
    expect(getMapSupportError()).toMatch(/WebGL/);
  });

  it('reports disabled WebAssembly', () => {
    vi.stubGlobal('WebAssembly', undefined);

    expect(getMapSupportError()).toMatch(/WebAssembly/);
  });

  it('returns null when WebGL2 is available', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
      {} as unknown as RenderingContext,
    );

    expect(getMapSupportError()).toBeNull();
  });

  it('reports a blocked graphics stack when context creation throws', () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => {
      throw new Error('blocked');
    });

    expect(getMapSupportError()).toMatch(/blocks the graphics/);
  });
});
