import { useCallback, useEffect, useRef, useState } from 'react';

import { detectSummitedPeaks, type Peak } from '../domain';
import { usePreferencesStore, useProgressStore } from '../store';

export type SummitDetectionStatus = 'off' | 'watching' | 'denied' | 'unavailable';

export interface SummitDetectionState {
  status: SummitDetectionStatus;
  /** Peaks bagged by detection since the notice was last dismissed. */
  detectedPeaks: Peak[];
  dismissDetections: () => void;
}

/** Process at most one GPS fix per interval; summits do not move. */
export const SUMMIT_DETECTION_THROTTLE_MS = 10_000;

function getGeolocation(): Geolocation | undefined {
  // Geolocation requires a secure context, and some environments omit the
  // API entirely — treat both as "unavailable" rather than erroring.
  if (!window.isSecureContext) {
    return undefined;
  }

  return (navigator as Partial<Navigator>).geolocation;
}

function todayIsoDate() {
  return new Intl.DateTimeFormat('en-CA').format(new Date());
}

/**
 * Watches the device position while the opt-in "Summit detection"
 * preference is enabled, and bags any peak whose summit is reached.
 *
 * Privacy: positions are processed in memory and immediately discarded.
 * Nothing about location is stored — only the boolean preference and the
 * normal PeakProgress records persist.
 *
 * List-agnostic: pass whichever peaks array is currently active. Today the
 * app passes the Wainwrights; a multi-list integrator only needs to change
 * the array handed in at the call site in `App`.
 */
export function useSummitDetection(peaks: Peak[]): SummitDetectionState {
  const enabled = usePreferencesStore((state) => state.summitDetectionEnabled);
  const setEnabled = usePreferencesStore((state) => state.setSummitDetectionEnabled);
  // Set only from geolocation callbacks; keeps a hard permission denial
  // visible in Settings after the preference switches itself off.
  const [denied, setDenied] = useState(false);
  const [detectedPeaks, setDetectedPeaks] = useState<Peak[]>([]);
  const lastProcessedAtRef = useRef(0);

  const dismissDetections = useCallback(() => {
    setDetectedPeaks([]);
  }, []);

  const status: SummitDetectionStatus = enabled
    ? getGeolocation()
      ? 'watching'
      : 'unavailable'
    : denied
      ? 'denied'
      : 'off';

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const geolocation = getGeolocation();

    if (!geolocation) {
      return;
    }

    lastProcessedAtRef.current = 0;

    const watchId = geolocation.watchPosition(
      (position) => {
        // A fix arriving means permission is granted.
        setDenied(false);

        const now = Date.now();

        if (now - lastProcessedAtRef.current < SUMMIT_DETECTION_THROTTLE_MS) {
          return;
        }

        lastProcessedAtRef.current = now;

        const { progressByPeakId, bag } = useProgressStore.getState();
        const baggedPeakIds = new Set(
          Object.values(progressByPeakId)
            .filter((record) => record.bagged)
            .map((record) => record.peakId),
        );

        const detections = detectSummitedPeaks(
          {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracyM: position.coords.accuracy,
          },
          peaks,
          { excludePeakIds: baggedPeakIds },
        );

        if (detections.length === 0) {
          return;
        }

        // Only unbagged peaks reach this point, so bagging here never
        // overwrites an existing baggedDate or notes.
        const date = todayIsoDate();

        for (const detection of detections) {
          bag(detection.peak.id, date);
        }

        setDetectedPeaks((previous) => [
          ...previous,
          ...detections.map((detection) => detection.peak),
        ]);
      },
      (error) => {
        if (error.code === error.PERMISSION_DENIED) {
          // Hard denial: switch the preference off rather than retrying,
          // and leave a quiet explanation for the Settings page.
          setDenied(true);
          setEnabled(false);
          return;
        }

        // Transient errors (position unavailable, timeout) resolve on the
        // next fix — stay watching quietly.
      },
      { enableHighAccuracy: true, maximumAge: 30_000, timeout: 60_000 },
    );

    return () => {
      geolocation.clearWatch(watchId);
    };
  }, [enabled, peaks, setEnabled]);

  return { status, detectedPeaks, dismissDetections };
}
