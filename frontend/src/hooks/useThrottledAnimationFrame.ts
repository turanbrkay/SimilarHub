import { useEffect, useRef } from 'react';

/**
 * Hook for throttled requestAnimationFrame
 * Reduces animation frame rate from 60fps to target fps (default 30fps)
 * Significantly reduces CPU usage for non-critical animations
 */
export const useThrottledAnimationFrame = (
    callback: (time: number) => void,
    fps: number = 30,
    isActive: boolean = true,
    isScrolling: boolean = false // NEW: pause during scroll
): void => {
    const requestRef = useRef<number>();
    const previousTimeRef = useRef<number>();
    const callbackRef = useRef(callback);

    // Update callback ref when callback changes
    useEffect(() => {
        callbackRef.current = callback;
    }, [callback]);

    useEffect(() => {
        // Pause if not active OR if scrolling
        if (!isActive || isScrolling) {
            // Cancel animation frame if not active or scrolling
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
            return;
        }

        const targetFrameTime = 1000 / fps; // milliseconds per frame

        const animate = (time: number) => {
            if (previousTimeRef.current !== undefined) {
                const deltaTime = time - previousTimeRef.current;

                // Only call callback if enough time has passed
                if (deltaTime >= targetFrameTime) {
                    callbackRef.current(time);
                    previousTimeRef.current = time;
                }
            } else {
                previousTimeRef.current = time;
            }

            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);

        return () => {
            if (requestRef.current) {
                cancelAnimationFrame(requestRef.current);
            }
        };
    }, [fps, isActive, isScrolling]); // Add isScrolling to dependencies
}
