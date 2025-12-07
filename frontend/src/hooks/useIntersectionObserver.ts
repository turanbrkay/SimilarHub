import { useEffect, useState, useRef, RefCallback } from 'react';

interface UseIntersectionObserverOptions extends IntersectionObserverInit {
    freezeOnceVisible?: boolean;
}

/**
 * Hook to detect when an element enters/exits the viewport
 * Used to pause animations when elements are not visible
 */
export function useIntersectionObserver(
    options: UseIntersectionObserverOptions = {}
): [RefCallback<Element>, boolean] {
    const { threshold = 0, root = null, rootMargin = '0px', freezeOnceVisible = false } = options;

    const [isIntersecting, setIsIntersecting] = useState(false);
    const [node, setNode] = useState<Element | null>(null);
    const frozen = useRef(false);

    useEffect(() => {
        if (!node) return;

        // If frozen and was already visible, don't observe
        if (frozen.current) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                const isElementIntersecting = entry.isIntersecting;
                setIsIntersecting(isElementIntersecting);

                if (isElementIntersecting && freezeOnceVisible) {
                    frozen.current = true;
                }
            },
            { threshold, root, rootMargin }
        );

        observer.observe(node);

        return () => {
            observer.disconnect();
        };
    }, [node, threshold, root, rootMargin, freezeOnceVisible]);

    const ref: RefCallback<Element> = (element) => {
        setNode(element);
    };

    return [ref, isIntersecting];
}
