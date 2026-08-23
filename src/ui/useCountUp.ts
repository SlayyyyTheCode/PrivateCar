import { useEffect, useRef, useState } from 'react';

/** Ease-out cubic: fast to start, settles gently on the final figure. */
const ease = (t: number) => 1 - Math.pow(1 - t, 3);

/**
 * Counts a number up on mount, and again whenever the target changes.
 *
 * Driven by requestAnimationFrame rather than Animated so the value is plain
 * React state and can be formatted as currency on every frame.
 */
export function useCountUp(target: number, durationMs = 1100): number {
  const [value, setValue] = useState(0);
  const frame = useRef<number | null>(null);
  const from = useRef(0);

  useEffect(() => {
    const start = from.current;
    const startedAt = Date.now();

    const step = () => {
      // Nothing to animate towards — adopt the value and stop.
      if (!Number.isFinite(target)) {
        setValue(target);
        from.current = target;
        return;
      }

      const elapsed = Date.now() - startedAt;
      const progress = Math.min(1, elapsed / durationMs);
      const next = start + (target - start) * ease(progress);
      setValue(next);

      if (progress < 1) {
        frame.current = requestAnimationFrame(step);
      } else {
        from.current = target;
      }
    };

    frame.current = requestAnimationFrame(step);
    return () => {
      if (frame.current !== null) cancelAnimationFrame(frame.current);
      from.current = value;
    };
    // `value` is intentionally not a dependency: it changes every frame and
    // would restart the animation continuously.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, durationMs]);

  return value;
}
