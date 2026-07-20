import { useState } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { HillListDefinition } from '../data/lists';
import type { RangeEditionView } from '../domain';
import type { CapturePosterMap, ExportPresetId, MapSnapshot } from '../export';
import { exportFilename } from '../export/download';
import { ExportDialog } from './ExportDialog';

const engine = vi.hoisted(() => ({
  composeExport: vi.fn(),
  getExportPreset: vi.fn(),
  layoutExport: vi.fn(),
}));

vi.mock('../export', () => ({
  composeExport: engine.composeExport,
  getExportPreset: engine.getExportPreset,
  layoutExport: engine.layoutExport,
}));

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
const capturePosterMap = vi.fn<CapturePosterMap>();

function dialog(overrides: Partial<React.ComponentProps<typeof ExportDialog>> = {}) {
  return (
    <ExportDialog
      open
      activePalette="midnight"
      baggedPeakKey="dobih-1,dobih-2"
      capturePosterMap={capturePosterMap}
      list={list}
      stats={stats}
      onClose={vi.fn()}
      {...overrides}
    />
  );
}

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
        activePalette="midnight"
        baggedPeakKey="dobih-1,dobih-2"
        capturePosterMap={capturePosterMap}
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
  URL.createObjectURL = vi.fn(() => 'blob:preview');
  URL.revokeObjectURL = vi.fn();
});

beforeEach(() => {
  vi.clearAllMocks();
  capturePosterMap.mockResolvedValue(snapshot);
  engine.composeExport.mockResolvedValue(composedBlob);
  engine.getExportPreset.mockImplementation((id: ExportPresetId) =>
    id === 'portrait'
      ? { id, label: 'Portrait', width: 1600, height: 2000 }
      : { id, label: 'Landscape', width: 1920, height: 1080 },
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
  it('captures the active palette and composes a labelled preview', async () => {
    render(dialog());

    const modal = screen.getByRole('dialog', { name: 'Export image' });
    expect(modal).toHaveAttribute('aria-modal', 'true');
    expect(modal).toHaveFocus();
    expect(await screen.findByRole('img')).toHaveAttribute('src', 'blob:preview');

    expect(capturePosterMap).toHaveBeenCalledWith(
      expect.objectContaining({
        palette: 'midnight',
        bounds: list.bounds,
        aspect: 1456 / 1500,
      }),
    );
    const request = capturePosterMap.mock.calls[0]?.[0];
    expect(request?.signal).toBeInstanceOf(AbortSignal);
    expect(engine.composeExport).toHaveBeenCalledWith(snapshot, stats, {
      preset: 'portrait',
      title: 'Lake District · Wainwrights',
    });
  });

  it('uses an edition curated frame instead of its raw peak bounds', async () => {
    const scotland: RangeEditionView = {
      id: 'scotland',
      key: 'range:scotland',
      name: 'Scotland',
      identity: 'Scotland',
      descriptor: 'Highlands, islands and Southern Uplands',
      peakNoun: 'hills',
      peaks: [],
      bounds: [
        [-8, 55],
        [-1, 61],
      ],
      frameBounds: [
        [-9.3, 54.15],
        [-0.1, 61.35],
      ],
      initialView: list.initialView,
    };

    render(dialog({ list: scotland }));
    await screen.findByRole('img');

    expect(capturePosterMap).toHaveBeenCalledWith(
      expect.objectContaining({ bounds: scotland.frameBounds }),
    );
    expect(engine.composeExport).toHaveBeenCalledWith(snapshot, stats, {
      preset: 'portrait',
      title: 'Scotland',
    });
  });

  it('recomposes in every separately selected map colour', async () => {
    const user = userEvent.setup();
    render(dialog());
    await screen.findByRole('img');

    await user.click(screen.getByRole('radio', { name: /Light/ }));
    await waitFor(() => {
      expect(capturePosterMap).toHaveBeenLastCalledWith(
        expect.objectContaining({ palette: 'light' }),
      );
    });

    await user.click(screen.getByRole('radio', { name: /Nature/ }));

    await waitFor(() => {
      expect(capturePosterMap).toHaveBeenLastCalledWith(
        expect.objectContaining({ palette: 'nature' }),
      );
    });
    expect(screen.getByRole('radio', { name: /Nature/ })).toBeChecked();
  });

  it('invalidates the preview when bagged identities change at the same count', async () => {
    const { rerender } = render(dialog());
    await screen.findByRole('img');
    expect(capturePosterMap).toHaveBeenCalledTimes(1);

    rerender(dialog({ baggedPeakKey: 'dobih-3,dobih-4' }));
    await waitFor(() => {
      expect(capturePosterMap).toHaveBeenCalledTimes(2);
    });
  });

  it('reports capture failures and keeps download disabled', async () => {
    capturePosterMap.mockRejectedValue(new Error('Map canvas has no pixels'));
    render(dialog());

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent(
        'Export failed: Map canvas has no pixels.',
      );
    });
    expect(screen.getByRole('button', { name: 'Download PNG' })).toBeDisabled();
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
      render(dialog());
      await screen.findByRole('img');
      await user.click(screen.getByRole('button', { name: 'Download PNG' }));
      expect(downloads).toEqual([exportFilename(list.id)]);
    } finally {
      click.mockRestore();
    }
  });

  it('shares a ready PNG when file sharing is available', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, 'share', { configurable: true, value: share });
    const user = userEvent.setup();

    render(dialog());
    await user.click(await screen.findByRole('button', { name: 'Share image' }));
    expect(share).toHaveBeenCalledWith(
      expect.objectContaining({ files: [expect.any(File)] }),
    );
  });

  it('closes on Escape, aborts capture and returns focus to the trigger', async () => {
    let signal: AbortSignal | undefined;
    capturePosterMap.mockImplementation((request) => {
      signal = request.signal;
      return new Promise(() => undefined);
    });
    const user = userEvent.setup();
    render(<Harness />);

    const trigger = screen.getByRole('button', { name: 'Export image' });
    await user.click(trigger);
    await waitFor(() => {
      expect(capturePosterMap).toHaveBeenCalled();
    });
    await user.keyboard('{Escape}');

    expect(signal?.aborted).toBe(true);
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it('traps focus within the dialog', async () => {
    const user = userEvent.setup();
    render(dialog());
    await screen.findByRole('img');

    await user.keyboard('{Shift>}{Tab}{/Shift}');
    expect(screen.getByRole('button', { name: 'Download PNG' })).toHaveFocus();
    await user.keyboard('{Tab}');
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus();
  });
});
