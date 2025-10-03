# Animation Performance Optimization Guide

This guide explains how the animation system automatically optimizes performance based on device capabilities and user preferences.

## Performance Monitoring

The animation system continuously monitors device performance and adjusts animations accordingly:

### Metrics Tracked
- **Device Memory**: RAM available to the browser
- **CPU Cores**: Hardware concurrency for parallel processing
- **Network Connection**: Speed and data saver preferences
- **Battery Status**: Level and charging state (when available)
- **Frame Rate**: Real-time animation smoothness measurement
- **User Preferences**: Reduced motion and accessibility settings

### Performance Scoring
The system calculates a performance score (0-100) based on:
- Network connection quality (40 points max penalty)
- Device memory (30 points max penalty)
- CPU cores (25 points max penalty)
- Battery status (25 points max penalty)
- Frame rate (30 points max penalty)

## Automatic Optimizations

### High Performance (Score 80-100)
- All animations enabled at full quality
- Complex hover effects and parallax
- No duration or stagger reductions

### Medium Performance (Score 60-79)
- Animations enabled with optimizations
- 30% shorter durations
- 50% reduced stagger delays
- Parallax effects disabled

### Low Performance (Score 40-59)
- Basic animations only
- Simplified animation variants
- Hover effects disabled
- Concurrent animation limiting

### Minimal Performance (Score 0-39)
- All animations disabled
- Static fallback rendering
- CSS transitions only for essential feedback

## Usage Examples

### Basic Performance-Aware Component
```tsx
import { useAnimationPerformance, createOptimizedAnimationConfig } from '@/lib/animations';

const MyComponent = () => {
  const canAnimate = useAnimationPerformance();
  const config = createOptimizedAnimationConfig(75, {
    duration: 0.6,
    enableHoverEffects: true
  });
  
  return (
    <AnimatedSection
      duration={config.duration}
      variant={canAnimate ? 'slideUp' : 'fade'}
    >
      Content
    </AnimatedSection>
  );
};
```

### Performance Monitoring in Development
```tsx
import { AnimationPerformanceMonitor } from '@/components/animations';

const App = () => (
  <>
    <YourContent />
    <AnimationPerformanceMonitor 
      showOverlay={true}
      enableLogging={true}
      onPerformanceChange={(canAnimate, score) => {
        console.log('Performance changed:', { canAnimate, score });
      }}
    />
  </>
);
```

### Custom Performance Optimization
```tsx
import { useDetailedAnimationPerformance, getPerformanceLevel } from '@/lib/animations';

const AdvancedComponent = () => {
  const metrics = useDetailedAnimationPerformance();
  const level = getPerformanceLevel(metrics.performanceScore);
  
  const animationProps = {
    duration: level.optimizations.reduceDuration ? 0.3 : 0.6,
    enableHover: !level.optimizations.disableHoverEffects,
    variant: level.optimizations.simplifyAnimations ? 'fade' : 'slideUp'
  };
  
  return <AnimatedCard {...animationProps}>Content</AnimatedCard>;
};
```

## Best Practices

### 1. Use Performance-Aware Components
Always use the provided animated components which automatically handle performance optimization.

### 2. Respect User Preferences
The system automatically respects `prefers-reduced-motion` and other accessibility preferences.

### 3. Monitor in Development
Use `AnimationPerformanceMonitor` during development to understand performance impact.

### 4. Test on Various Devices
Test animations on different device types and network conditions.

### 5. Provide Meaningful Fallbacks
Ensure all functionality works when animations are disabled.

## Performance Thresholds

| Metric | Good | Fair | Poor |
|--------|------|------|------|
| Device Memory | ≥4GB | 2-4GB | <2GB |
| CPU Cores | ≥4 | 2-3 | <2 |
| Network | 4G+ | 3G | 2G/Slow |
| Frame Rate | ≥55fps | 30-55fps | <30fps |
| Battery | >30% | 15-30% | <15% |

## Debugging Performance Issues

### Console Logging
Enable detailed logging in development:
```tsx
<AnimationPerformanceMonitor enableLogging={true} />
```

### Performance Overlay
Show real-time metrics:
```tsx
<AnimationPerformanceMonitor showOverlay={true} />
```

### Manual Performance Check
```tsx
import { useDetailedAnimationPerformance } from '@/lib/animations';

const metrics = useDetailedAnimationPerformance();
console.log('Current performance:', metrics);
```

## Common Optimizations Applied

1. **Duration Reduction**: Animations run 30% faster on medium/low performance devices
2. **Stagger Simplification**: Sequential delays reduced by 50%
3. **Effect Simplification**: Complex transforms and filters disabled
4. **Hover Disabling**: Interactive effects removed on touch devices with poor performance
5. **Concurrent Limiting**: Maximum 2-5 simultaneous animations based on device capability
6. **Hardware Acceleration**: Automatic `transform3d` and `will-change` optimization

The system ensures smooth user experience across all device types while maintaining visual appeal on capable devices.