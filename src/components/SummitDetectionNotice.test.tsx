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
  it('renders nothing without detections', () => {
    const { container } = render(
      <SummitDetectionNotice peaks={[]} onDismiss={vi.fn()} />,
    );

    expect(container).toBeEmptyDOMElement();
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
});
