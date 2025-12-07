import { useState, useEffect, useRef } from 'react';

/**
 * Hook to detect when user is actively scrolling
 * Returns true during scroll, false when scroll stops
 * Used to pause animations during scroll for better performance
 */
export const useScrollDetection = (delay: number = 150): boolean => {
    const [isScrolling, setIsScrolling] = useState(false);
    const scrollTimeoutRef = useRef<number | null>(null);

    useEffect(() => {
        const handleScroll = () => {
            // Set scrolling to true immediately
            setIsScrolling(true);

            // Clear existing timeout
            if (scrollTimeoutRef.current !== null) {
                clearTimeout(scrollTimeoutRef.current);
            }

            // Set timeout to detect scroll end
            scrollTimeoutRef.current = window.setTimeout(() => {
                setIsScrolling(false);
            }, delay);
        };

        // Listen to scroll events
        window.addEventListener('scroll', handleScroll, { passive: true });

        return () => {
            window.removeEventListener('scroll', handleScroll);
            if (scrollTimeoutRef.current !== null) {
                clearTimeout(scrollTimeoutRef.current);
            }
        };
    }, [delay]);

    return isScrolling;
};
