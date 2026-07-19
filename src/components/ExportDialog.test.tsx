import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import type { Map as MapLibreMap } from 'maplibre-gl';

import type { HillListDefinition } from '../data/lists';
import type { RangeEditionView } from '../domain';
import type { ExportPresetId, MapSnapshot } from '../export';
import { exportFilename } from '../export/download';
import { ExportDialog } from './ExportDialog';

// The composition engine is loaded by the dialog with a dynamic
// import('../export'); vi.mock intercepts that import so no WebGL, canvas or
// maplibre code runs in jsdom.
const engine = vi.hoisted(() => ({
  restore: vi.fn(),
  frameBoundary: vi.fn(),
  captureMap: vi.fn(),
  composeExport: vi.fn(),
  getExportPreset: vi.fn(),
  layoutExport: vi.fn(),
}));

vi.mock('../export', () => ({
  frameBoundary: engine.frameBoundary,
  captureMap: engine.captureMap,
  composeExport: engine.composeExport,
  getExportPreset: engine.getExportPreset,
  layoutExport: engine.layoutExport,
}));

const map = {} as unknown as MapLibreMap;
const getMap = () => map;
const stats = { bagged: 37, total: 214 };

const list: HillListDefinition = {
  id: 'wainwrights',
  name: 'Wainwrights',
  regionLabel: 'Lake District',
  peakNoun: 'fells',
  bounds: [
    [-3.58, 54.18],
    [-2.55, 54.82],
  ],
  initialView: {
    longitude: -3.1,
    latitude: 54.53,
    zoom: 8.55,
    bearing: -12,
    pitch: 38,
  },
  hasHillLighting: true,
  loadPeaks: () => Promise.resolve([]),
};

const snapshot: MapSnapshot = {
  blob: new Blob(['snapshot'], { type: 'image/png' }),
  width: 1200,
  height: 900,
  pixelRatio: 1,
};

const composedBlob = new Blob(['composed'], { type: 'image/png' });

interface ShareCapable {
  canShare?: (data: ShareData) => boolean;
  share?: (data: ShareData) => Promise<void>;
}

function stubShare(overrides: ShareCapable) {
  for (const [key, value] of Object.entries(overrides)) {
    Object.defineProperty(navigator, key, { value, configurable: true });
  }
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });

  return { promise, resolve, reject };
}

/** Wraps the dialog behind a trigger button, like MapView does. */
function Harness() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
        }}
      >
        Export image
      </button>
      <ExportDialog
        open={open}
        getMap={getMap}
        list={list}
        stats={stats}
        onClose={() => {
          setOpen(false);
        }}
      />
    </>
  );
}

beforeAll(() => {
  // jsdom has no object-URL implementation.
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  engine.frameBoundary.mockResolvedValue(engine.restore);
  engine.captureMap.mockResolvedValue(snapshot);
  engine.composeExport.mockResolvedValue(composedBlob);
  engine.getExportPreset.mockImplementation((id: ExportPresetId) =>
    id === 'portrait'
      ? { id, label: 'Portrait 1600 × 2000', width: 1600, height: 2000 }
      : { id, label: 'Landscape 1920 × 1080', width: 1920, height: 1080 },
  );
  engine.layoutExport.mockReturnValue({
    map: { x: 72, y: 72, width: 1456, height: 1500 },
  });
});

afterEach(() => {
  Reflect.deleteProperty(navigator, 'share');
  Reflect.deleteProperty(navigator, 'canShare');
});

describe('ExportDialog', () => {
  it('is a labelled modal dialog that takes focus and composes a preview', async () => {
    render(
      <ExportDialog open getMap={getMap} list={list} stats={stats} onClose={vi.fn()} />,
    );

    const dialog = screen.getByRole('dialog', { name: 'Export image' });
    expect(dialog).toHaveAttribute('aria-modal', 'true');
    expect(dialog).toHaveFocus();

    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:preview');

    // frameBoundary framed the list bounds at the portrait map-box aspect,
    // the capture happened, and the user's viewport was restored.
    expect(engine.frameBoundary).toHaveBeenCalledWith(
      map,
      list.bounds,
      48,
      1456 / 1500,
    );
    expect(engine.captureMap).toHaveBeenCalledWith(map);
    expect(engine.restore).toHaveBeenCalledTimes(1);
    expect(engine.composeExport).toHaveBeenCalledWith(
      snapshot,
      { bagged: 37, total: 214 },
      { preset: 'portrait', title: 'Lake District · Wainwrights' },
    );
  });

  it('frames, titles and names the export from the active geographic edition', async () => {
    const scotland: RangeEditionView = {
      id: 'scotland',
      key: 'range:scotland',
      name: 'Scotland',
      identity: 'Scotland',
      descriptor: 'Highlands, islands and Southern Uplands',
      peakNoun: 'hills',
      peaks: [],
      bounds: [
        [-6.6, 56.0],
        [-2.7, 58.7],
      ],
      initialView: list.initialView,
    };

    render(
      <ExportDialog
        open
        getMap={getMap}
        list={scotland}
        stats={stats}
        onClose={vi.fn()}
      />,
    );

    await screen.findByRole('img');

    expect(engine.frameBoundary).toHaveBeenCalledWith(
      map,
      scotland.bounds,
      48,
      expect.any(Number),
    );
    expect(engine.composeExport).toHaveBeenCalledWith(
      snapshot,
      { bagged: 37, total: 214 },
      { preset: 'portrait', title: 'Scotland' },
    );
    expect(
      screen.getByText('Highlands, islands and Southern Uplands'),
    ).toBeInTheDocument();
    expect(screen.getByText(/Saved as munro-scotland-/)).toBeInTheDocument();
  });

  it('shows a quiet busy state while composing', async () => {
    const pending = deferred<Blob>();
    engine.composeExport.mockReturnValue(pending.promise);

    render(
      <ExportDialog open getMap={getMap} list={list} stats={stats} onClose={vi.fn()} />,
    );

    expect(await screen.findByRole('status')).toHaveTextContent('Composing image…');
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled();

    pending.resolve(composedBlob);

    expect(await screen.findByRole('img')).toBeVisible();
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
    // Readiness is announced by updating the persistent live region — the
    // Download button becoming enabled says nothing to a screen reader.
    expect(screen.getByRole('status')).toHaveTextContent('Export ready.');
  });

  it('recomposes at the landscape preset when switched', async () => {
    const user = userEvent.setup();
    render(
      <ExportDialog open getMap={getMap} list={list} stats={stats} onClose={vi.fn()} />,
    );

    await screen.findByRole('img');
    await user.click(screen.getByRole('button', { name: 'Landscape' }));

    await waitFor(() => {
      expect(engine.composeExport).toHaveBeenLastCalledWith(
        snapshot,
        { bagged: 37, total: 214 },
        { preset: 'landscape', title: 'Lake District · Wainwrights' },
      );
    });
    expect(screen.getByRole('button', { name: 'Landscape' })).toHaveAttribute(
      'aria-pressed',
      'true',
    );
    expect(engine.getExportPreset).toHaveBeenLastCalledWith('landscape');
  });

  it('serializes overlapping compose runs so the camera is restored between them', async () => {
    const user = userEvent.setup();
    const firstCapture = deferred<MapSnapshot>();
    engine.captureMap.mockReturnValueOnce(firstCapture.promise);

    render(
      <ExportDialog open getMap={getMap} list={list} stats={stats} onClose={vi.fn()} />,
    );

    await waitFor(() => {
      expect(engine.frameBoundary).toHaveBeenCalledTimes(1);
    });

    // Switch preset while the portrait capture is still in flight.
    await user.click(screen.getByRole('button', { name: 'Landscape' }));

    // The landscape run must not touch the camera yet — its frameBoundary
    // would otherwise record the portrait run's export framing as the user
    // viewport to restore.
    expect(engine.frameBoundary).toHaveBeenCalledTimes(1);
    expect(engine.restore).not.toHaveBeenCalled();

    firstCapture.resolve(snapshot);

    await waitFor(() => {
      expect(engine.frameBoundary).toHaveBeenCalledTimes(2);
    });

    // The portrait run restored the viewport before the landscape run framed.
    const [firstRestore] = engine.restore.mock.invocationCallOrder;
    const secondFrame = engine.frameBoundary.mock.invocationCallOrder[1];
    expect(firstRestore).toBeLessThan(secondFrame ?? 0);

    expect(await screen.findByRole('img')).toBeVisible();
    await waitFor(() => {
      expect(engine.restore).toHaveBeenCalledTimes(2);
    });
    expect(engine.composeExport).toHaveBeenLastCalledWith(
      snapshot,
      { bagged: 37, total: 214 },
      { preset: 'landscape', title: 'Lake District · Wainwrights' },
    );
  });

  it('skips queued compose runs once they are superseded or the dialog closes', async () => {
    const user = userEvent.setup();
    const firstCapture = deferred<MapSnapshot>();
    engine.captureMap.mockReturnValueOnce(firstCapture.promise);

    render(<Harness />);
    await user.click(screen.getByRole('button', { name: 'Export image' }));

    await waitFor(() => {
      expect(engine.frameBoundary).toHaveBeenCalledTimes(1);
    });

    // Queue a landscape run behind the in-flight capture, then close the
    // dialog before it starts.
    await user.click(screen.getByRole('button', { name: 'Landscape' }));
    await user.click(screen.getByRole('button', { name: 'Close' }));

    firstCapture.resolve(snapshot);

    // The in-flight run finishes and restores the viewport; the queued run
    // must bail without framing — nobody can see its output, and framing
    // would visibly hijack the map camera behind the closed dialog.
    await waitFor(() => {
      expect(engine.restore).toHaveBeenCalledTimes(1);
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(engine.frameBoundary).toHaveBeenCalledTimes(1);
    expect(engine.captureMap).toHaveBeenCalledTimes(1);
  });

  it('reports a plain error and still restores the viewport when capture fails', async () => {
    engine.captureMap.mockRejectedValue(
      new Error('Map canvas has no pixels to capture'),
    );

    render(
      <ExportDialog open getMap={getMap} list={list} stats={stats} onClose={vi.fn()} />,
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Export failed: Map canvas has no pixels to capture.',
      );
    });
    expect(engine.restore).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
  });

  it('explains when the map is not ready yet', async () => {
    render(
      <ExportDialog
        open
        getMap={() => null}
        list={list}
        stats={stats}
        onClose={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Export failed: the map has not finished loading yet.',
      );
    });
    expect(engine.frameBoundary).not.toHaveBeenCalled();
  });

  it('downloads the PNG with the dated filename', async () => {
    const downloads: string[] = [];
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(function (this: HTMLAnchorElement) {
        downloads.push(this.download);
      });
    const user = userEvent.setup();

    try {
      render(
        <ExportDialog
          open
          getMap={getMap}
          list={list}
          stats={stats}
          onClose={vi.fn()}
        />,
      );

      await screen.findByRole('img');
      await user.click(screen.getByRole('button', { name: 'Download PNG' }));

      // Today's date; the exact formatting is covered by download.test.ts.
      expect(downloads).toEqual([exportFilename(list.id)]);
      expect(downloads[0]).toMatch(/^munro-wainwrights-\d{4}-\d{2}-\d{2}\.png$/);
    } finally {
      click.mockRestore();
    }
  });

  it('shares the file through the Web Share API when the browser supports it', async () => {
    const share = vi
      .fn<(data: ShareData) => Promise<void>>()
      .mockResolvedValue(undefined);
    stubShare({ canShare: () => true, share });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();

    try {
      render(
        <ExportDialog
          open
          getMap={getMap}
          list={list}
          stats={stats}
          onClose={vi.fn()}
        />,
      );

      await user.click(await screen.findByRole('button', { name: 'Share image' }));

      await waitFor(() => {
        expect(share).toHaveBeenCalledTimes(1);
      });
      const payload = share.mock.calls[0]?.[0];
      expect(payload?.files).toHaveLength(1);
      expect(payload?.files?.[0]?.name).toBe(exportFilename(list.id));
      expect(payload?.files?.[0]?.type).toBe('image/png');
      expect(click).not.toHaveBeenCalled();
    } finally {
      click.mockRestore();
    }
  });

  it('falls back to a download when sharing fails', async () => {
    const share = vi
      .fn<(data: ShareData) => Promise<void>>()
      .mockRejectedValue(new Error('share broke'));
    stubShare({ canShare: () => true, share });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const user = userEvent.setup();

    try {
      render(
        <ExportDialog
          open
          getMap={getMap}
          list={list}
          stats={stats}
          onClose={vi.fn()}
        />,
      );

      await user.click(await screen.findByRole('button', { name: 'Share image' }));

      await waitFor(() => {
        expect(click).toHaveBeenCalledTimes(1);
      });
    } finally {
      click.mockRestore();
    }
  });

  it('offers no share button when the browser cannot share the file', async () => {
    stubShare({ canShare: () => false, share: vi.fn() });

    render(
      <ExportDialog open getMap={getMap} list={list} stats={stats} onClose={vi.fn()} />,
    );

    await screen.findByRole('img');

    expect(
      screen.queryByRole('button', { name: 'Share image' }),
    ).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeEnabled();
  });

  it('closes on Escape and returns focus to the trigger', async () => {
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Export image' });
    await user.click(trigger);

    expect(screen.getByRole('dialog')).toHaveFocus();

    await user.keyboard('{Escape}');

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('traps Tab within the dialog', async () => {
    const user = userEvent.setup();
    render(
      <ExportDialog open getMap={getMap} list={list} stats={stats} onClose={vi.fn()} />,
    );

    await screen.findByRole('img');

    // Shift+Tab from the dialog itself wraps to the last focusable control.
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Download PNG' })).toHaveFocus();

    // Tab from the last control wraps back to the first.
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });

  it('pulls Tab back into the dialog when focus falls outside it', async () => {
    const user = userEvent.setup();
    render(
      <ExportDialog open getMap={getMap} list={list} stats={stats} onClose={vi.fn()} />,
    );

    await screen.findByRole('img');

    // A backdrop click (or a focused control unmounting) drops focus to body.
    const active = document.activeElement;
    if (active instanceof HTMLElement) {
      active.blur();
    }
    expect(document.body).toHaveFocus();

    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();

    const refocused = document.activeElement;
    if (refocused instanceof HTMLElement) {
      refocused.blur();
    }
    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Download PNG' })).toHaveFocus();
  });
});
