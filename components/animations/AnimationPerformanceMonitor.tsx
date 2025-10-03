'use client';

import React, { useState, useEffect } from 'react';
import { useDetailedAnimationPerformance } from '@/hooks/useAnimationPerformance';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface AnimationPerformanceMonitorProps {
  /**
   * Whether to show the performance overlay in development
   */
  showOverlay?: boolean;
  /**
   * Callback when performance changes significantly
   */
  onPerformanceChange?: (canAnimate: boolean, score: number) => void;
  /**
   * Whether to log performance metrics to console
   */
  enableLogging?: boolean;
}

/**
 * Component that monitors animation performance and provides feedback
 * Only active in development mode for debugging purposes
 */
export const AnimationPerformanceMonitor: React.FC<AnimationPerformanceMonitorProps> = ({
  showOverlay = false,
  onPerformanceChange,
  enableLogging = false
}) => {
  const metrics = useDetailedAnimationPerformance();
  const prefersReducedMotion = useReducedMotion();
  const [previousScore, setPreviousScore] = useState(metrics.performanceScore);

  // Track performance changes
  useEffect(() => {
    if (Math.abs(metrics.performanceScore - previousScore) > 10) {
      onPerformanceChange?.(metrics.canAnimate, metrics.performanceScore);
      setPreviousScore(metrics.performanceScore);
    }
  }, [metrics.performanceScore, metrics.canAnimate, previousScore, onPerformanceChange]);

  // Log performance metrics
  useEffect(() => {
    if (enableLogging && process.env.NODE_ENV === 'development') {
      console.group('🎬 Animation Performance Metrics');
      console.log('Can Animate:', metrics.canAnimate);
      console.log('Performance Score:', metrics.performanceScore);
      console.log('Prefers Reduced Motion:', prefersReducedMotion);
      console.log('Is Low-End Device:', metrics.isLowEndDevice);
      console.log('Device Memory:', metrics.deviceMemory, 'GB');
      console.log('CPU Cores:', metrics.hardwareConcurrency);
      console.log('Connection Type:', metrics.effectiveType);
      console.log('Save Data:', metrics.saveData);
      console.log('Battery Level:', metrics.batteryLevel ? `${Math.round(metrics.batteryLevel * 100)}%` : 'Unknown');
      console.log('Frame Rate:', metrics.frameRate, 'fps');
      console.groupEnd();
    }
  }, [metrics, prefersReducedMotion, enableLogging]);

  // Only show overlay in development
  if (!showOverlay || process.env.NODE_ENV !== 'development') {
    return null;
  }

  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  const getStatusIcon = () => {
    if (prefersReducedMotion) return '🔇';
    if (!metrics.canAnimate) return '⚠️';
    if (metrics.performanceScore >= 80) return '🚀';
    if (metrics.performanceScore >= 60) return '✅';
    if (metrics.performanceScore >= 40) return '⚡';
    return '🐌';
  };

  return (
    <div className="fixed bottom-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs font-mono z-50 max-w-xs">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-lg">{getStatusIcon()}</span>
        <span className="font-semibold">Animation Performance</span>
      </div>
      
      <div className="space-y-1">
        <div className="flex justify-between">
          <span>Score:</span>
          <span className={getScoreColor(metrics.performanceScore)}>
            {metrics.performanceScore}/100
          </span>
        </div>
        
        <div className="flex justify-between">
          <span>Status:</span>
          <span className={metrics.canAnimate ? 'text-green-400' : 'text-red-400'}>
            {metrics.canAnimate ? 'Enabled' : 'Disabled'}
          </span>
        </div>
        
        {prefersReducedMotion && (
          <div className="text-yellow-400 text-center">
            Reduced Motion Preferred
          </div>
        )}
        
        {metrics.isLowEndDevice && (
          <div className="text-orange-400 text-center">
            Low-End Device Detected
          </div>
        )}
        
        <div className="border-t border-gray-600 pt-1 mt-2">
          <div className="grid grid-cols-2 gap-1 text-xs">
            {metrics.deviceMemory && (
              <div>RAM: {metrics.deviceMemory}GB</div>
            )}
            {metrics.hardwareConcurrency && (
              <div>CPU: {metrics.hardwareConcurrency} cores</div>
            )}
            {metrics.effectiveType && (
              <div>Net: {metrics.effectiveType}</div>
            )}
            {metrics.frameRate && (
              <div>FPS: {Math.round(metrics.frameRate)}</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnimationPerformanceMonitor;