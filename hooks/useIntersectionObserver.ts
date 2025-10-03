'use client';

import { useState, useEffect, useRef, RefObject } from 'react';

interface UseIntersectionObserverOptions {
  threshold?: number | number[];
  root?: Element | null;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/**
 * Hook for detecting when an element enters the viewport
 * Uses Intersection Observer API for efficient scroll detection
 */
export const useIntersectionObserver = <T extends Element>(
  options: UseIntersectionObserverOptions = {}
): [RefObject<T | null>, boolean] => {
  const {
    threshold = 0.1,
    root = null,
    rootMargin = '0px',
    triggerOnce = true
  } = options;

  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasTriggered, setHasTriggered] = useState(false);
  const elementRef = useRef<T | null>(null);

  useEffect(() => {
    const element = elementRef.current;
    if (!element) return;

    // If triggerOnce is true and we've already triggered, don't observe
    if (triggerOnce && hasTriggered) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isElementIntersecting = entry.isIntersecting;
        setIsIntersecting(isElementIntersecting);

        if (isElementIntersecting && triggerOnce) {
          setHasTriggered(true);
        }
      },
      {
        threshold,
        root,
        rootMargin
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [threshold, root, rootMargin, triggerOnce, hasTriggered]);

  // Return the current intersection state, or true if we've already triggered once
  return [elementRef, triggerOnce ? (hasTriggered || isIntersecting) : isIntersecting];
};

/**
 * Hook for detecting when multiple elements enter the viewport
 * Useful for staggered animations
 */
export const useMultipleIntersectionObserver = <T extends Element>(
  count: number,
  options: UseIntersectionObserverOptions = {}
): [RefObject<T | null>[], boolean[]] => {
  const refs = useRef<RefObject<T | null>[]>(
    Array.from({ length: count }, () => ({ current: null }))
  );
  const [intersections, setIntersections] = useState<boolean[]>(
    new Array(count).fill(false)
  );

  const {
    threshold = 0.1,
    root = null,
    rootMargin = '0px',
    triggerOnce = true
  } = options;

  useEffect(() => {
    const observers: IntersectionObserver[] = [];

    refs.current.forEach((ref, index) => {
      const element = ref.current;
      if (!element) return;

      const observer = new IntersectionObserver(
        ([entry]) => {
          const isElementIntersecting = entry.isIntersecting;
          
          setIntersections(prev => {
            const newIntersections = [...prev];
            newIntersections[index] = isElementIntersecting || (triggerOnce && prev[index]);
            return newIntersections;
          });
        },
        {
          threshold,
          root,
          rootMargin
        }
      );

      observer.observe(element);
      observers.push(observer);
    });

    return () => {
      observers.forEach(observer => observer.disconnect());
    };
  }, [threshold, root, rootMargin, triggerOnce, count]);

  return [refs.current, intersections];
};