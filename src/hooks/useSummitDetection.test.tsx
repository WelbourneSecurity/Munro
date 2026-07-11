import { act, renderHook } from '@testing-library/react';
import { vi } from 'vitest';

import type { Peak } from '../domain';
import { usePreferencesStore, useProgressStore } from '../store';
import { SUMMIT_DETECTION_THROTTLE_MS, useSummitDetection } from './useSummitDetection';

function makePeak(id: string, lat: number, lon: number, name = id): Peak {
  return {
    id,
    dobihId: 1,
    name,
    list: ['wainwright'],
    region: 'Test Fells',
    heightM: 900,
    lat,
    lon,
  };
}

const highFell = makePeak('dobih-1', 54.5, -3.1, 'High Fell');
const farFell = makePeak('dobih-2', 54.6, -3.3, 'Far Fell');
const peaks = [highFell, farFell];

function installGeolocation() {
  let onSuccess: PositionCallback | undefined;
  let onError: PositionErrorCallback | undefined;

  const watchPosition = vi.fn(
    (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions,
    ) => {
      void options;
      onSuccess = success;
      onError = error ?? undefined;
      return 7;
    },
  );
  const clearWatch = vi.fn();

  Object.defineProperty(navigator, 'geolocation', {
    configurable: true,
    value: { watchPosition, clearWatch },
  });

  return {
    watchPosition,
    clearWatch,
    sendPosition(lat: number, lon: number, accuracy: number) {
      act(() => {
        onSuccess?.({
          coords: { latitude: lat, longitude: lon, accuracy },
          timestamp: Date.now(),
        } as unknown as GeolocationPosition);
      });
    },
    sendError(code: number) {
      act(() => {
        onError?.({
          code,
          message: 'geolocation error',
          PERMISSION_DENIED: 1,
          POSITION_UNAVAILABLE: 2,
          TIMEOUT: 3,
        } as unknown as GeolocationPositionError);
      });
    },
  };
}

function removeGeolocation() {
  delete (navigator as { geolocation?: unknown }).geolocation;
}

beforeEach(() => {
  localStorage.clear();
  useProgressStore.getState().resetAll();
  usePreferencesStore.getState().setSummitDetectionEnabled(false);
  vi.stubGlobal('isSecureContext', true);
});

afterEach(() => {
  removeGeolocation();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('useSummitDetection', () => {
  it('does not watch when the setting is off', () => {
    const geo = installGeolocation();

    const { result } = renderHook(() => useSummitDetection(peaks));

    expect(result.current.status).toBe('off');
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });

  it('watches with high accuracy when the setting is on', () => {
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    expect(result.current.status).toBe('watching');
    expect(geo.watchPosition).toHaveBeenCalledTimes(1);
    expect(geo.watchPosition.mock.calls[0]?.[2]).toMatchObject({
      enableHighAccuracy: true,
    });
  });

  it('bags an unbagged peak at the summit with today’s date', () => {
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    geo.sendPosition(highFell.lat, highFell.lon, 12);

    const record = useProgressStore.getState().progressByPeakId[highFell.id];
    const today = new Intl.DateTimeFormat('en-CA').format(new Date());

    expect(record).toEqual({ peakId: highFell.id, bagged: true, baggedDate: today });
    expect(result.current.detectedPeaks.map((peak) => peak.id)).toEqual([highFell.id]);
  });

  it('never overwrites an already-bagged record', () => {
    const geo = installGeolocation();
    useProgressStore.getState().bag(highFell.id, '2020-01-01');
    useProgressStore.getState().setNotes(highFell.id, 'First round');
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    geo.sendPosition(highFell.lat, highFell.lon, 12);

    expect(useProgressStore.getState().progressByPeakId[highFell.id]).toEqual({
      peakId: highFell.id,
      bagged: true,
      baggedDate: '2020-01-01',
      notes: 'First round',
    });
    expect(result.current.detectedPeaks).toEqual([]);
  });

  it('ignores fixes with unusable accuracy', () => {
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    renderHook(() => useSummitDetection(peaks));

    geo.sendPosition(highFell.lat, highFell.lon, 2_000);

    expect(useProgressStore.getState().progressByPeakId[highFell.id]).toBeUndefined();
  });

  it('throttles how often fixes are processed', () => {
    vi.useFakeTimers();
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    renderHook(() => useSummitDetection(peaks));

    geo.sendPosition(highFell.lat, highFell.lon, 12);
    geo.sendPosition(farFell.lat, farFell.lon, 12);

    expect(useProgressStore.getState().progressByPeakId[highFell.id]?.bagged).toBe(
      true,
    );
    expect(useProgressStore.getState().progressByPeakId[farFell.id]).toBeUndefined();

    vi.advanceTimersByTime(SUMMIT_DETECTION_THROTTLE_MS + 1);
    geo.sendPosition(farFell.lat, farFell.lon, 12);

    expect(useProgressStore.getState().progressByPeakId[farFell.id]?.bagged).toBe(true);
  });

  it('auto-disables the setting on hard permission denial', () => {
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    geo.sendError(1);

    expect(result.current.status).toBe('denied');
    expect(usePreferencesStore.getState().summitDetectionEnabled).toBe(false);
    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  it('keeps watching through transient errors', () => {
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    geo.sendError(2);

    expect(result.current.status).toBe('watching');
    expect(usePreferencesStore.getState().summitDetectionEnabled).toBe(true);
    expect(geo.clearWatch).not.toHaveBeenCalled();
  });

  it('reports unavailable when geolocation is missing', () => {
    removeGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    expect(result.current.status).toBe('unavailable');
  });

  it('reports unavailable in an insecure context', () => {
    const geo = installGeolocation();
    vi.stubGlobal('isSecureContext', false);
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    expect(result.current.status).toBe('unavailable');
    expect(geo.watchPosition).not.toHaveBeenCalled();
  });

  it('stops watching when the setting is turned off', () => {
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    act(() => {
      usePreferencesStore.getState().setSummitDetectionEnabled(false);
    });

    expect(geo.clearWatch).toHaveBeenCalledWith(7);
    expect(result.current.status).toBe('off');
  });

  it('stops watching on unmount', () => {
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { unmount } = renderHook(() => useSummitDetection(peaks));

    unmount();

    expect(geo.clearWatch).toHaveBeenCalledWith(7);
  });

  it('clears the notice when dismissed', () => {
    const geo = installGeolocation();
    usePreferencesStore.getState().setSummitDetectionEnabled(true);

    const { result } = renderHook(() => useSummitDetection(peaks));

    geo.sendPosition(highFell.lat, highFell.lon, 12);

    expect(result.current.detectedPeaks).toHaveLength(1);

    act(() => {
      result.current.dismissDetections();
    });

    expect(result.current.detectedPeaks).toEqual([]);
  });
});
