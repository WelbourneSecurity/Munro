import { exportFilename } from './download';

describe('exportFilename', () => {
  it('formats the local date as munro-wainwrights-yyyy-mm-dd.png', () => {
    expect(exportFilename(new Date(2026, 6, 10))).toBe(
      'munro-wainwrights-2026-07-10.png',
    );
  });

  it('zero-pads single-digit months and days', () => {
    expect(exportFilename(new Date(2026, 0, 5))).toBe(
      'munro-wainwrights-2026-01-05.png',
    );
  });

  it('defaults to today', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 11, 31, 23, 59));

    try {
      expect(exportFilename()).toBe('munro-wainwrights-2026-12-31.png');
    } finally {
      vi.useRealTimers();
    }
  });
});
