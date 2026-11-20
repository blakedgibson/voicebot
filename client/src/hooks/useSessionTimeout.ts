/**
 * HIPAA Session Timeout Hook — § 164.312(a)(2)(iii) Automatic Logoff
 *
 * Automatically logs out the user after a period of inactivity.
 * Required for any dashboard that displays PHI (healthcare, dentist, medical-spa).
 *
 * Usage:
 *   useSessionTimeout({ timeoutMs: 15 * 60 * 1000, onTimeout: logout });
 */

import { useEffect, useRef, useCallback } from 'react';

const ACTIVITY_EVENTS = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];

interface SessionTimeoutOptions {
  /** Inactivity duration in ms before logout. Default: 15 minutes (HIPAA standard) */
  timeoutMs?: number;
  /** Called when the session expires due to inactivity */
  onTimeout: () => void;
  /** Set to false to disable the hook (e.g. for non-HIPAA industries) */
  enabled?: boolean;
}

export function useSessionTimeout({
  timeoutMs = 15 * 60 * 1000,
  onTimeout,
  enabled = true,
}: SessionTimeoutOptions): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  const reset = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onTimeoutRef.current();
    }, timeoutMs);
  }, [timeoutMs]);

  useEffect(() => {
    if (!enabled) return;

    reset();

    ACTIVITY_EVENTS.forEach(event => window.addEventListener(event, reset, { passive: true }));

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      ACTIVITY_EVENTS.forEach(event => window.removeEventListener(event, reset));
    };
  }, [enabled, reset]);
}
