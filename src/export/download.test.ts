import { exportFilename } from './download';

describe('exportFilename', () => {
  it('formats the list id and local date as munro-<list>-yyyy-mm-dd.png', () => {
    expect(exportFilename('wainwrights', new Date(2026, 6, 10))).toBe(
      'munro-wainwrights-2026-07-10.png',
    );
    expect(exportFilename('munros', new Date(2026, 6, 10))).toBe(
      'munro-munros-2026-07-10.png',
    );
  });

  it('zero-pads single-digit months and days', () => {
    expect(exportFilename('wainwrights', new Date(2026, 0, 5))).toBe(
      'munro-wainwrights-2026-01-05.png',
    );
  });

  it('defaults to today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59));

    try {
      expect(exportFilename('all')).toBe('munro-all-2026-12-31.png');
    } finally {
      vi.useRealTimers();
    }
  });
});
