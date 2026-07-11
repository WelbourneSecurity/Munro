import { useCallback, useEffect, useRef, useState } from 'react';

import { SUMMIT_DETECTION_RADIUS_M, detectSummitedPeaks, type Peak } from '../domain';
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
 * preference is enabled, and bags the peak whose summit is reached.
 *
 * A fix bags at most one peak — the nearest detected summit — and only
 * when the fix identifies that summit unambiguously. A fix whose
 * accuracy-widened radius covers several summits (for example one taken
 * on the col between two neighbouring peaks) proves the hiker reached
 * none of them, so it bags nothing and detection waits for a closer fix.
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

        // Detect against every peak — including already-bagged ones — so
        // a fix sitting between two summits still reads as ambiguous when
        // one of the pair is already in the record.
        const detections = detectSummitedPeaks(
          {
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            accuracyM: position.coords.accuracy,
          },
          peaks,
        );

        const nearest = detections[0];

        if (!nearest) {
          return;
        }

        // A fix bags at most the nearest summit. When the accuracy-widened
        // radius covers more than one summit, the fix only counts if it is
        // within the base radius of the nearest — otherwise it may be a
        // col between summits the hiker never reached, so bag nothing and
        // wait for a closer fix.
        if (detections.length > 1 && nearest.distanceM > SUMMIT_DETECTION_RADIUS_M) {
          return;
        }

        const { progressByPeakId, bag } = useProgressStore.getState();

        // Never touch an existing bagged record: detection must not
        // overwrite a baggedDate or notes.
        if (progressByPeakId[nearest.peak.id]?.bagged) {
          return;
        }

        bag(nearest.peak.id, todayIsoDate());
        setDetectedPeaks((previous) => [...previous, nearest.peak]);
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
