'use client';

import { useState, useEffect, useCallback } from 'react';

interface PerformanceMetrics {
  canAnimate: boolean;
  deviceMemory?: number;
  hardwareConcurrency?: number;
  connectionType?: string;
  effectiveType?: string;
  saveData?: boolean;
  batteryLevel?: number;
  isCharging?: boolean;
  frameRate?: number;
  isLowEndDevice: boolean;
  performanceScore: number; // 0-100 score
}

/**
 * Hook to monitor animation performance and device capabilities
 * Automatically disables animations on low-end devices or poor connections
 * Provides detailed performance metrics for optimization decisions
 */
export const useAnimationPerformance = (): boolean => {
  const [canAnimate, setCanAnimate] = useState(true);
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    canAnimate: true,
    isLowEndDevice: false,
    performanceScore: 100
  });

  // Frame rate monitoring
  const measureFrameRate = useCallback(() => {
    if (typeof window === 'undefined') return Promise.resolve(60);
    
    return new Promise<number>((resolve) => {
      let frames = 0;
      const startTime = performance.now();
      
      const countFrame = () => {
        frames++;
        if (performance.now() - startTime < 1000) {
          requestAnimationFrame(countFrame);
        } else {
          resolve(frames);
        }
      };
      
      requestAnimationFrame(countFrame);
    });
  }, []);

  // Calculate performance score based on various factors
  const calculatePerformanceScore = useCallback((metrics: Partial<PerformanceMetrics>): number => {
    let score = 100;
    
    // Network connection impact
    if (metrics.effectiveType === 'slow-2g') score -= 40;
    else if (metrics.effectiveType === '2g') score -= 30;
    else if (metrics.effectiveType === '3g') score -= 15;
    
    if (metrics.saveData) score -= 20;
    
    // Device memory impact
    if (metrics.deviceMemory) {
      if (metrics.deviceMemory < 1) score -= 30;
      else if (metrics.deviceMemory < 2) score -= 20;
      else if (metrics.deviceMemory < 4) score -= 10;
    }
    
    // CPU cores impact
    if (metrics.hardwareConcurrency) {
      if (metrics.hardwareConcurrency < 2) score -= 25;
      else if (metrics.hardwareConcurrency < 4) score -= 10;
    }
    
    // Battery impact
    if (metrics.batteryLevel !== undefined && metrics.isCharging === false) {
      if (metrics.batteryLevel < 0.15) score -= 25;
      else if (metrics.batteryLevel < 0.3) score -= 15;
    }
    
    // Frame rate impact
    if (metrics.frameRate) {
      if (metrics.frameRate < 30) score -= 30;
      else if (metrics.frameRate < 45) score -= 15;
      else if (metrics.frameRate < 55) score -= 5;
    }
    
    return Math.max(0, Math.min(100, score));
  }, []);

  const checkPerformance = useCallback(async () => {
    if (typeof window === 'undefined') return;

    const newMetrics: Partial<PerformanceMetrics> = {};
    
    // Check network connection quality
    const connection = (navigator as any).connection || 
                      (navigator as any).mozConnection || 
                      (navigator as any).webkitConnection;
    
    if (connection) {
      newMetrics.connectionType = connection.type;
      newMetrics.effectiveType = connection.effectiveType;
      newMetrics.saveData = connection.saveData;
    }

    // Check device memory (if available)
    const deviceMemory = (navigator as any).deviceMemory;
    if (deviceMemory) {
      newMetrics.deviceMemory = deviceMemory;
    }

    // Check hardware concurrency (CPU cores)
    if (navigator.hardwareConcurrency) {
      newMetrics.hardwareConcurrency = navigator.hardwareConcurrency;
    }

    // Check battery status
    try {
      const battery = (navigator as any).battery || 
                     await (navigator as any).getBattery?.();
      if (battery) {
        newMetrics.batteryLevel = battery.level;
        newMetrics.isCharging = battery.charging;
      }
    } catch (error) {
      // Battery API not available or blocked
    }

    // Measure frame rate
    try {
      const frameRate = await measureFrameRate();
      newMetrics.frameRate = frameRate;
    } catch (error) {
      // Frame rate measurement failed
    }

    // Calculate performance score
    const performanceScore = calculatePerformanceScore(newMetrics);
    newMetrics.performanceScore = performanceScore;
    
    // Determine if device is low-end
    const isLowEndDevice = performanceScore < 50;
    newMetrics.isLowEndDevice = isLowEndDevice;
    
    // Determine if animations should be enabled
    const shouldAnimate = performanceScore >= 40; // Threshold for enabling animations
    newMetrics.canAnimate = shouldAnimate;
    
    setMetrics(prev => ({ ...prev, ...newMetrics }));
    setCanAnimate(shouldAnimate);
  }, [measureFrameRate, calculatePerformanceScore]);

  useEffect(() => {
    checkPerformance();

    // Re-check performance periodically
    const interval = setInterval(checkPerformance, 30000); // Every 30 seconds

    // Listen for network changes
    const handleConnectionChange = () => {
      setTimeout(checkPerformance, 1000); // Delay to allow connection to stabilize
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('online', handleConnectionChange);
      window.addEventListener('offline', handleConnectionChange);
    }

    return () => {
      clearInterval(interval);
      if (typeof window !== 'undefined') {
        window.removeEventListener('online', handleConnectionChange);
        window.removeEventListener('offline', handleConnectionChange);
      }
    };
  }, [checkPerformance]);

  return canAnimate;
};

/**
 * Hook that provides detailed performance metrics
 */
export const useDetailedAnimationPerformance = (): PerformanceMetrics => {
  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    canAnimate: true,
    isLowEndDevice: false,
    performanceScore: 100
  });

  const canAnimate = useAnimationPerformance();

  useEffect(() => {
    setMetrics(prev => ({ ...prev, canAnimate }));
  }, [canAnimate]);

  return metrics;
};