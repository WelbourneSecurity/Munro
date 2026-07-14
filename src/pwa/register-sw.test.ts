// @vitest-environment jsdom

import {
  detectServiceWorkerEnvironment,
  registerServiceWorker,
  scheduleWhenIdleAfterLoad,
  shouldRegisterServiceWorker,
  type ServiceWorkerEnvironment,
} from './register-sw';

function environment(
  overrides: Partial<ServiceWorkerEnvironment>,
): ServiceWorkerEnvironment {
  return {
    isProduction: true,
    supportsServiceWorker: true,
    isNativeWrapper: false,
    ...overrides,
  };
}

describe('detectServiceWorkerEnvironment', () => {
  it('reports a non-production environment under tests', () => {
    const detected = detectServiceWorkerEnvironment();

    expect(detected.isProduction).toBe(false);
  });
});

describe('shouldRegisterServiceWorker', () => {
  it('registers only in production browsers with service worker support', () => {
    expect(shouldRegisterServiceWorker(environment({}))).toBe(true);
    expect(shouldRegisterServiceWorker(environment({ isProduction: false }))).toBe(
      false,
    );
    expect(
      shouldRegisterServiceWorker(environment({ supportsServiceWorker: false })),
    ).toBe(false);
    expect(
      shouldRegisterServiceWorker(
        environment({ isProduction: false, supportsServiceWorker: false }),
      ),
    ).toBe(false);
  });

  it('skips registration inside the Capacitor native wrapper', () => {
    expect(shouldRegisterServiceWorker(environment({ isNativeWrapper: true }))).toBe(
      false,
    );
  });
});

/** Runs scheduled work synchronously, standing in for the idle deferral. */
const runNow = (callback: () => void) => {
  callback();
};

describe('registerServiceWorker', () => {
  it('loads the register module and registers in production', async () => {
    const registerSW = vi.fn(() => () => Promise.resolve());
    const loadRegisterModule = vi.fn(() => Promise.resolve({ registerSW }));

    const started = registerServiceWorker(environment({}), loadRegisterModule, runNow);

    expect(started).toBe(true);
    expect(loadRegisterModule).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(registerSW).toHaveBeenCalledWith({ immediate: true });
    });
  });

  it('defers loading until the idle scheduler runs its callback', () => {
    const loadRegisterModule = vi.fn(() =>
      Promise.resolve({ registerSW: vi.fn(() => () => Promise.resolve()) }),
    );
    let scheduled: (() => void) | undefined;

    const started = registerServiceWorker(environment({}), loadRegisterModule, (cb) => {
      scheduled = cb;
    });

    // The registration is queued, not started: nothing downloads while the
    // first render is still fetching styles, glyphs and tiles.
    expect(started).toBe(true);
    expect(loadRegisterModule).not.toHaveBeenCalled();

    scheduled?.();

    expect(loadRegisterModule).toHaveBeenCalledOnce();
  });

  it('does nothing outside production', () => {
    const loadRegisterModule = vi.fn(() =>
      Promise.resolve({ registerSW: vi.fn(() => () => Promise.resolve()) }),
    );

    const started = registerServiceWorker(
      environment({ isProduction: false }),
      loadRegisterModule,
    );

    expect(started).toBe(false);
    expect(loadRegisterModule).not.toHaveBeenCalled();
  });

  it('does nothing when service workers are unsupported', () => {
    const loadRegisterModule = vi.fn(() =>
      Promise.resolve({ registerSW: vi.fn(() => () => Promise.resolve()) }),
    );

    const started = registerServiceWorker(
      environment({ supportsServiceWorker: false }),
      loadRegisterModule,
    );

    expect(started).toBe(false);
    expect(loadRegisterModule).not.toHaveBeenCalled();
  });

  it('logs instead of throwing when registration fails', async () => {
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const failure = new Error('offline registry');
    const loadRegisterModule = vi.fn(() => Promise.reject(failure));

    const started = registerServiceWorker(environment({}), loadRegisterModule, runNow);

    expect(started).toBe(true);
    await vi.waitFor(() => {
      expect(consoleError).toHaveBeenCalledWith(
        'Munro service worker registration failed.',
        failure,
      );
    });

    consoleError.mockRestore();
  });
});

describe('scheduleWhenIdleAfterLoad', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it('waits for idle via requestIdleCallback once the page has loaded', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    const requestIdleCallback = vi.fn((cb: IdleRequestCallback) => {
      cb({} as IdleDeadline);
      return 1;
    });
    vi.stubGlobal('requestIdleCallback', requestIdleCallback);
    const callback = vi.fn();

    scheduleWhenIdleAfterLoad(callback);

    expect(requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: 10_000,
    });
    expect(callback).toHaveBeenCalledOnce();
  });

  it('defers past the load event while the page is still loading', () => {
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('loading');
    vi.stubGlobal(
      'requestIdleCallback',
      vi.fn((cb: IdleRequestCallback) => {
        cb({} as IdleDeadline);
        return 1;
      }),
    );
    const callback = vi.fn();

    scheduleWhenIdleAfterLoad(callback);

    // Nothing runs while first-render fetches are still in flight.
    expect(callback).not.toHaveBeenCalled();

    window.dispatchEvent(new Event('load'));

    expect(callback).toHaveBeenCalledOnce();
  });

  it('falls back to a timeout when requestIdleCallback is unavailable', () => {
    vi.useFakeTimers();
    vi.spyOn(document, 'readyState', 'get').mockReturnValue('complete');
    vi.stubGlobal('requestIdleCallback', undefined);
    const callback = vi.fn();

    scheduleWhenIdleAfterLoad(callback);

    expect(callback).not.toHaveBeenCalled();
    vi.advanceTimersByTime(3_000);
    expect(callback).toHaveBeenCalledOnce();
  });
});
