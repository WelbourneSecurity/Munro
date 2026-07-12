import { act, render } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';

import type { Peak } from '../domain';
import {
  SUMMIT_NOTICE_DURATION_MS,
  SummitDetectionNotice,
} from './SummitDetectionNotice';

function makePeak(id: string, name: string): Peak {
  return {
    id,
    dobihId: 1,
    name,
    list: ['wainwright'],
    region: 'Test Fells',
    heightM: 900,
    lat: 54.5,
    lon: -3.1,
  };
}

describe('SummitDetectionNotice', () => {
  it('shows no notice without detections, keeping only the empty live region', () => {
    const { getByRole, queryByText } = render(
      <SummitDetectionNotice peaks={[]} onDismiss={vi.fn()} />,
    );

    expect(queryByText('Summit reached')).not.toBeInTheDocument();
    // The live region stays mounted (and empty) so a later detection is a
    // text update, which screen readers announce reliably.
    expect(getByRole('status')).toBeEmptyDOMElement();
  });

  it('announces a detection by updating the permanently mounted live region', () => {
    const { getByRole, rerender } = render(
      <SummitDetectionNotice peaks={[]} onDismiss={vi.fn()} />,
    );

    const region = getByRole('status');
    expect(region).toBeEmptyDOMElement();

    rerender(
      <SummitDetectionNotice
        peaks={[makePeak('dobih-1', 'High Fell')]}
        onDismiss={vi.fn()}
      />,
    );

    expect(getByRole('status')).toBe(region);
    expect(region).toHaveTextContent('Summit reached. High Fell marked as bagged.');
  });

  it('announces a single bagged peak calmly', () => {
    const { getByRole, getByText } = render(
      <SummitDetectionNotice
        peaks={[makePeak('dobih-1', 'High Fell')]}
        onDismiss={vi.fn()}
      />,
    );

    expect(getByRole('status')).toBeVisible();
    expect(getByText('Summit reached')).toBeVisible();
    expect(getByText('High Fell marked as bagged.')).toBeVisible();
  });

  it('joins multiple peak names', () => {
    const { getByText } = render(
      <SummitDetectionNotice
        peaks={[makePeak('dobih-1', 'High Fell'), makePeak('dobih-2', 'Near Top')]}
        onDismiss={vi.fn()}
      />,
    );

    expect(getByText('High Fell and Near Top marked as bagged.')).toBeVisible();
  });

  it('dismisses via the button', async () => {
    const onDismiss = vi.fn();
    const user = userEvent.setup();
    const { getByRole } = render(
      <SummitDetectionNotice
        peaks={[makePeak('dobih-1', 'High Fell')]}
        onDismiss={onDismiss}
      />,
    );

    await user.click(getByRole('button', { name: 'Dismiss' }));

    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('dismisses itself after a short while', () => {
    vi.useFakeTimers();

    try {
      const onDismiss = vi.fn();
      render(
        <SummitDetectionNotice
          peaks={[makePeak('dobih-1', 'High Fell')]}
          onDismiss={onDismiss}
        />,
      );

      act(() => {
        vi.advanceTimersByTime(SUMMIT_NOTICE_DURATION_MS + 1);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it('pauses the auto-dismiss while focus is inside the notice', () => {
    vi.useFakeTimers();

    try {
      const onDismiss = vi.fn();
      const { getByRole } = render(
        <SummitDetectionNotice
          peaks={[makePeak('dobih-1', 'High Fell')]}
          onDismiss={onDismiss}
        />,
      );

      const dismiss = getByRole('button', { name: 'Dismiss' });

      act(() => {
        dismiss.focus();
      });
      act(() => {
        vi.advanceTimersByTime(SUMMIT_NOTICE_DURATION_MS * 2);
      });

      // A keyboard user who tabbed to Dismiss must never have the focused
      // button unmounted under them by the timer.
      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        dismiss.blur();
      });
      act(() => {
        vi.advanceTimersByTime(SUMMIT_NOTICE_DURATION_MS + 1);
      });

      expect(onDismiss).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
