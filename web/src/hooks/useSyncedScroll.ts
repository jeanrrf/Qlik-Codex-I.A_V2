/**
 * Synchronized Scroll Hook
 * Keeps two scrollable elements in sync for side-by-side code comparison
 */

import { useEffect, RefObject } from 'react';

/**
 * Synchronizes scroll position between two elements
 * @param leftRef - Reference to the left scroll container
 * @param rightRef - Reference to the right scroll container
 */
export function useSyncedScroll(
  leftRef: RefObject<HTMLElement>,
  rightRef: RefObject<HTMLElement>
): void {
  useEffect(() => {
    const left = leftRef.current;
    const right = rightRef.current;

    if (!left || !right) {
      return;
    }

    let syncing = false;

    const syncScroll = (source: HTMLElement, target: HTMLElement) => {
      if (syncing) return;

      syncing = true;
      target.scrollTop = source.scrollTop;
      target.scrollLeft = source.scrollLeft;

      requestAnimationFrame(() => {
        syncing = false;
      });
    };

    const handleLeftScroll = () => syncScroll(left, right);
    const handleRightScroll = () => syncScroll(right, left);

    left.addEventListener('scroll', handleLeftScroll);
    right.addEventListener('scroll', handleRightScroll);

    return () => {
      left.removeEventListener('scroll', handleLeftScroll);
      right.removeEventListener('scroll', handleRightScroll);
    };
  }, [leftRef, rightRef]);
}
