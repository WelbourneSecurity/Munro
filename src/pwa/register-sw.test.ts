import {
  detectServiceWorkerEnvironment,
  registerServiceWorker,
  shouldRegisterServiceWorker,
  type ServiceWorkerEnvironment,
} from './register-sw';

function environment(
  overrides: Partial<ServiceWorkerEnvironment>,
): ServiceWorkerEnvironment {
  return { isProduction: true, supportsServiceWorker: true, ...overrides };
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
});

describe('registerServiceWorker', () => {
  it('loads the register module and registers immediately in production', async () => {
    const registerSW = vi.fn(() => () => Promise.resolve());
    const loadRegisterModule = vi.fn(() => Promise.resolve({ registerSW }));

    const started = registerServiceWorker(environment({}), loadRegisterModule);

    expect(started).toBe(true);
    expect(loadRegisterModule).toHaveBeenCalledOnce();
    await vi.waitFor(() => {
      expect(registerSW).toHaveBeenCalledWith({ immediate: true });
    });
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

    const started = registerServiceWorker(environment({}), loadRegisterModule);

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
