import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { FrameRateOptimizer } from '../FrameRateOptimizer';
import { RenderOptimizer } from '../RenderOptimizer';
import { ObjectPool, PoolManager } from '../ObjectPool';

// Device capability profiles for testing
interface DeviceProfile {
  name: string;
  screenWidth: number;
  screenHeight: number;
  pixelRatio: number;
  memoryLimit: number;
  cpuPower: number; // Relative CPU power (1.0 = baseline)
  gpuPower: number; // Relative GPU power (1.0 = baseline)
  targetFPS: number;
  minFPS: number;
  recommendedQuality: string;
  maxObjects: number;
  maxParticles: number;
  supportedFeatures: string[];
}

const DEVICE_PROFILES: DeviceProfile[] = [
  {
    name: 'iPhone SE (1st gen)',
    screenWidth: 320,
    screenHeight: 568,
    pixelRatio: 2,
    memoryLimit: 30 * 1024 * 1024, // 30MB
    cpuPower: 0.3,
    gpuPower: 0.2,
    targetFPS: 30,
    minFPS: 20,
    recommendedQuality: 'Potato',
    maxObjects: 100,
    maxParticles: 20,
    supportedFeatures: ['basic-rendering']
  },
  {
    name: 'iPhone 8',
    screenWidth: 375,
    screenHeight: 667,
    pixelRatio: 2,
    memoryLimit: 80 * 1024 * 1024, // 80MB
    cpuPower: 0.6,
    gpuPower: 0.5,
    targetFPS: 45,
    minFPS: 30,
    recommendedQuality: 'Low',
    maxObjects: 200,
    maxParticles: 50,
    supportedFeatures: ['basic-rendering', 'simple-effects']
  },
  {
    name: 'iPhone 12',
    screenWidth: 390,
    screenHeight: 844,
    pixelRatio: 3,
    memoryLimit: 150 * 1024 * 1024, // 150MB
    cpuPower: 1.0,
    gpuPower: 1.0,
    targetFPS: 60,
    minFPS: 45,
    recommendedQuality: 'Medium',
    maxObjects: 400,
    maxParticles: 100,
    supportedFeatures: ['basic-rendering', 'simple-effects', 'advanced-effects']
  },
  {
    name: 'iPad Air',
    screenWidth: 768,
    screenHeight: 1024,
    pixelRatio: 2,
    memoryLimit: 200 * 1024 * 1024, // 200MB
    cpuPower: 1.2,
    gpuPower: 1.3,
    targetFPS: 60,
    minFPS: 45,
    recommendedQuality: 'High',
    maxObjects: 600,
    maxParticles: 150,
    supportedFeatures: ['basic-rendering', 'simple-effects', 'advanced-effects', 'shadows']
  },
  {
    name: 'Desktop (Low-end)',
    screenWidth: 1366,
    screenHeight: 768,
    pixelRatio: 1,
    memoryLimit: 300 * 1024 * 1024, // 300MB
    cpuPower: 1.5,
    gpuPower: 1.2,
    targetFPS: 60,
    minFPS: 45,
    recommendedQuality: 'High',
    maxObjects: 800,
    maxParticles: 200,
    supportedFeatures: ['basic-rendering', 'simple-effects', 'advanced-effects', 'shadows']
  },
  {
    name: 'Desktop (High-end)',
    screenWidth: 1920,
    screenHeight: 1080,
    pixelRatio: 1,
    memoryLimit: 500 * 1024 * 1024, // 500MB
    cpuPower: 2.0,
    gpuPower: 2.5,
    targetFPS: 60,
    minFPS: 50,
    recommendedQuality: 'Ultra',
    maxObjects: 1000,
    maxParticles: 300,
    supportedFeatures: ['basic-rendering', 'simple-effects', 'advanced-effects', 'shadows', 'post-processing']
  }
];

// Mock scene factory with device-specific configurations
const createMockSceneForDevice = (device: DeviceProfile) => {
  const mockRenderer = {
    drawCalls: 0,
    textureSwaps: 0,
    type: device.gpuPower > 1.0 ? 'WebGL' : 'Canvas'
  };

  const mockCamera = {
    scrollX: 0,
    scrollY: 0,
    width: device.screenWidth,
    height: device.screenHeight,
    centerX: device.screenWidth / 2,
    centerY: device.screenHeight / 2,
    on: vi.fn()
  };

  return {
    renderer: mockRenderer,
    cameras: {
      main: mockCamera
    },
    events: {
      emit: vi.fn(),
      on: vi.fn(),
      off: vi.fn()
    },
    children: {
      list: []
    },
    scale: {
      width: device.screenWidth,
      height: device.screenHeight,
      pixelRatio: device.pixelRatio
    },
    time: {
      addEvent: vi.fn(() => ({
        destroy: vi.fn()
      })),
      delayedCall: vi.fn()
    },
    game: {
      loop: {
        actualFps: device.targetFPS
      },
      device: {
        os: {
          iOS: device.name.includes('iPhone') || device.name.includes('iPad'),
          android: false,
          desktop: device.name.includes('Desktop')
        }
      }
    },
    add: {
      container: vi.fn(() => ({
        setDepth: vi.fn(),
        add: vi.fn(),
        list: []
      })),
      graphics: vi.fn(() => ({
        fillStyle: vi.fn(),
        fillRect: vi.fn(),
        lineStyle: vi.fn(),
        strokeRect: vi.fn(),
        clear: vi.fn(),
        setPosition: vi.fn(),
        setAlpha: vi.fn(),
        setScale: vi.fn(),
        setRotation: vi.fn(),
        setVisible: vi.fn(),
        fillCircle: vi.fn(),
        destroy: vi.fn(),
        getBounds: () => ({ x: 0, y: 0, width: 32, height: 32 })
      })),
      text: vi.fn(() => ({
        setText: vi.fn(),
        setPosition: vi.fn(),
        setAlpha: vi.fn(),
        setScale: vi.fn(),
        setRotation: vi.fn(),
        setVisible: vi.fn(),
        setStyle: vi.fn(),
        setInteractive: vi.fn(),
        on: vi.fn(),
        destroy: vi.fn(),
        getBounds: () => ({ x: 0, y: 0, width: 100, height: 20 })
      })),
      group: vi.fn(() => ({
        children: {
          size: 0,
          entries: []
        },
        add: vi.fn(),
        remove: vi.fn(),
        destroy: vi.fn()
      }))
    },
    tweens: {
      add: vi.fn(() => ({
        stop: vi.fn()
      }))
    },
    textures: {
      get: vi.fn(() => ({
        key: 'test-texture',
        getSourceImage: () => ({
          width: 32,
          height: 32
        })
      })),
      addCanvas: vi.fn(),
      list: new Map([
        ['texture1', { key: 'texture1' }],
        ['texture2', { key: 'texture2' }],
        ['texture3', { key: 'texture3' }]
      ]),
      remove: vi.fn()
    }
  } as any;
};

// Performance simulator that adjusts based on device capabilities
class DevicePerformanceSimulator {
  private device: DeviceProfile;
  private currentLoad: number = 0;
  private thermalThrottling: number = 1.0;
  private batteryLevel: number = 1.0;

  constructor(device: DeviceProfile) {
    this.device = device;
  }

  simulateFrameTime(baseFrameTime: number, objectCount: number, particleCount: number): number {
    // Calculate load based on object counts
    const objectLoad = Math.max(0, (objectCount - this.device.maxObjects) / this.device.maxObjects);
    const particleLoad = Math.max(0, (particleCount - this.device.maxParticles) / this.device.maxParticles);
    
    this.currentLoad = Math.min(2.0, objectLoad + particleLoad);

    // Apply device-specific performance factors
    let adjustedFrameTime = baseFrameTime;
    
    // CPU performance impact
    adjustedFrameTime *= (2.0 - this.device.cpuPower) * (1 + this.currentLoad);
    
    // GPU performance impact (affects rendering)
    adjustedFrameTime *= (2.0 - this.device.gpuPower) * (1 + particleLoad);
    
    // Thermal throttling (increases over time under load)
    if (this.currentLoad > 0.5) {
      this.thermalThrottling = Math.max(0.7, this.thermalThrottling - 0.001);
    } else {
      this.thermalThrottling = Math.min(1.0, this.thermalThrottling + 0.0005);
    }
    adjustedFrameTime *= (2.0 - this.thermalThrottling);

    // Battery impact (mobile devices slow down on low battery)
    if (this.device.name.includes('iPhone') || this.device.name.includes('iPad')) {
      if (this.batteryLevel < 0.2) {
        adjustedFrameTime *= 1.5; // Significant slowdown
      } else if (this.batteryLevel < 0.5) {
        adjustedFrameTime *= 1.2; // Moderate slowdown
      }
      
      // Simulate battery drain
      this.batteryLevel = Math.max(0.1, this.batteryLevel - 0.0001);
    }

    // Add realistic variance
    adjustedFrameTime += (Math.random() - 0.5) * 2;

    return Math.max(8, adjustedFrameTime); // Minimum 8ms (125 FPS cap)
  }

  getMemoryUsage(baseMemory: number, objectCount: number): number {
    const objectMemory = objectCount * 1024; // 1KB per object
    const deviceMemoryPressure = Math.min(1.0, baseMemory / this.device.memoryLimit);
    
    return baseMemory + objectMemory * (1 + deviceMemoryPressure);
  }

  getCurrentLoad(): number {
    return this.currentLoad;
  }

  getThermalState(): number {
    return this.thermalThrottling;
  }

  getBatteryLevel(): number {
    return this.batteryLevel;
  }
}

describe('Cross-Device Performance Tests', () => {
  describe('Device-Specific Performance Characteristics', () => {
    DEVICE_PROFILES.forEach(device => {
      describe(`${device.name} Performance`, () => {
        let mockScene: any;
        let performanceMonitor: PerformanceMonitor;
        let frameRateOptimizer: FrameRateOptimizer;
        let deviceSimulator: DevicePerformanceSimulator;

        beforeEach(() => {
          mockScene = createMockSceneForDevice(device);
          deviceSimulator = new DevicePerformanceSimulator(device);
          
          // Mock performance.memory with device-appropriate values
          Object.defineProperty(performance, 'memory', {
            value: {
              usedJSHeapSize: device.memoryLimit * 0.3, // Start at 30% of limit
              totalJSHeapSize: device.memoryLimit * 0.8,
              jsHeapSizeLimit: device.memoryLimit * 2
            },
            writable: true
          });

          performanceMonitor = new PerformanceMonitor(mockScene, {
            minFPS: device.minFPS,
            maxFrameTime: 1000 / device.minFPS,
            maxMemoryUsage: device.memoryLimit * 0.8
          });

          frameRateOptimizer = new FrameRateOptimizer(mockScene, {
            targetFPS: device.targetFPS,
            minFPS: device.minFPS,
            adaptiveQuality: true
          });

          vi.clearAllMocks();
        });

        afterEach(() => {
          performanceMonitor.destroy();
          frameRateOptimizer.destroy();
        });

        it(`should maintain target performance on ${device.name}`, () => {
          performanceMonitor.startMonitoring();
          frameRateOptimizer.setQualityLevel(device.recommendedQuality);

          const frameRates: number[] = [];
          const baseFrameTime = 1000 / device.targetFPS;

          // Simulate typical gameplay load
          for (let frame = 0; frame < 300; frame++) {
            const objectCount = Math.min(device.maxObjects, 50 + frame);
            const particleCount = Math.min(device.maxParticles, 10 + Math.floor(frame / 10));

            const simulatedFrameTime = deviceSimulator.simulateFrameTime(
              baseFrameTime,
              objectCount,
              particleCount
            );

            mockScene.game.loop.actualFps = Math.max(1, 1000 / simulatedFrameTime);
            
            performanceMonitor.update(simulatedFrameTime);
            frameRateOptimizer.update?.(simulatedFrameTime);
            
            frameRates.push(mockScene.game.loop.actualFps);

            // Update memory usage
            const memoryUsage = deviceSimulator.getMemoryUsage(
              device.memoryLimit * 0.3,
              objectCount
            );
            (performance as any).memory.usedJSHeapSize = memoryUsage;
          }

          // Analyze performance
          const avgFPS = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
          const minFPS = Math.min(...frameRates);
          const framesAboveTarget = frameRates.filter(fps => fps >= device.targetFPS * 0.9).length;
          const performanceRatio = framesAboveTarget / frameRates.length;

          console.log(`${device.name} Performance Results:
            Average FPS: ${avgFPS.toFixed(2)}
            Minimum FPS: ${minFPS.toFixed(2)}
            Target FPS: ${device.targetFPS}
            Performance Ratio: ${(performanceRatio * 100).toFixed(1)}%
            Thermal State: ${(deviceSimulator.getThermalState() * 100).toFixed(1)}%
            Battery Level: ${(deviceSimulator.getBatteryLevel() * 100).toFixed(1)}%`);

          // Performance expectations based on device capability
          if (device.cpuPower >= 1.0) {
            expect(avgFPS).toBeGreaterThan(device.targetFPS * 0.8);
            expect(performanceRatio).toBeGreaterThan(0.7);
          } else {
            expect(avgFPS).toBeGreaterThan(device.minFPS);
            expect(minFPS).toBeGreaterThan(device.minFPS * 0.8);
          }
        });

        it(`should adapt quality appropriately on ${device.name}`, () => {
          frameRateOptimizer.setAdaptiveQuality(true);
          frameRateOptimizer.setQualityLevel('Ultra'); // Start high

          // Simulate performance stress
          for (let i = 0; i < 100; i++) {
            const heavyLoad = device.maxObjects * 2; // Double the recommended load
            const frameTime = deviceSimulator.simulateFrameTime(16.67, heavyLoad, device.maxParticles);
            
            mockScene.game.loop.actualFps = 1000 / frameTime;
            frameRateOptimizer.update?.(frameTime);
          }

          const finalQuality = frameRateOptimizer.getCurrentQuality();
          const stats = frameRateOptimizer.getStats();

          // Should have adapted quality based on device capability
          if (device.cpuPower < 0.5) {
            expect(['Potato', 'Low']).toContain(finalQuality.name);
          } else if (device.cpuPower < 1.0) {
            expect(['Low', 'Medium']).toContain(finalQuality.name);
          }

          expect(stats.adaptationsCount).toBeGreaterThan(0);
        });

        it(`should handle memory constraints on ${device.name}`, () => {
          performanceMonitor.startMonitoring();
          
          const warningHandler = vi.fn();
          performanceMonitor.on('performance-warning', warningHandler);

          // Simulate memory pressure
          let currentMemory = device.memoryLimit * 0.3;
          for (let i = 0; i < 100; i++) {
            currentMemory += device.memoryLimit * 0.01; // 1% increase per frame
            (performance as any).memory.usedJSHeapSize = currentMemory;
            
            performanceMonitor.update(16.67);
            
            if (currentMemory > device.memoryLimit * 0.8) {
              break; // Stop before hitting limit
            }
          }

          // Low-memory devices should trigger warnings earlier
          if (device.memoryLimit < 100 * 1024 * 1024) {
            setTimeout(() => {
              expect(warningHandler).toHaveBeenCalled();
            }, 100);
          }
        });
      });
    });
  });

  describe('Comparative Performance Analysis', () => {
    it('should show performance scaling across device tiers', () => {
      const results: Array<{
        device: string;
        avgFPS: number;
        minFPS: number;
        memoryUsage: number;
        qualityLevel: string;
      }> = [];

      DEVICE_PROFILES.forEach(device => {
        const mockScene = createMockSceneForDevice(device);
        const simulator = new DevicePerformanceSimulator(device);
        const frameRateOptimizer = new FrameRateOptimizer(mockScene, {
          targetFPS: device.targetFPS,
          minFPS: device.minFPS
        });

        frameRateOptimizer.setQualityLevel(device.recommendedQuality);

        const frameRates: number[] = [];
        
        // Standardized test scenario
        for (let frame = 0; frame < 100; frame++) {
          const objectCount = 200; // Fixed object count for comparison
          const particleCount = 50; // Fixed particle count
          
          const frameTime = simulator.simulateFrameTime(16.67, objectCount, particleCount);
          const fps = 1000 / frameTime;
          frameRates.push(fps);
        }

        const avgFPS = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
        const minFPS = Math.min(...frameRates);
        
        results.push({
          device: device.name,
          avgFPS,
          minFPS,
          memoryUsage: simulator.getMemoryUsage(device.memoryLimit * 0.3, 200),
          qualityLevel: device.recommendedQuality
        });

        frameRateOptimizer.destroy();
      });

      // Verify performance scaling
      const sortedResults = results.sort((a, b) => a.avgFPS - b.avgFPS);
      
      console.log('Performance Scaling Analysis:');
      sortedResults.forEach(result => {
        console.log(`${result.device}: ${result.avgFPS.toFixed(1)} FPS (${result.qualityLevel})`);
      });

      // High-end devices should significantly outperform low-end
      const lowEnd = sortedResults[0];
      const highEnd = sortedResults[sortedResults.length - 1];
      
      expect(highEnd.avgFPS).toBeGreaterThan(lowEnd.avgFPS * 1.5);
    });

    it('should validate quality level recommendations', () => {
      const qualityValidation: Array<{
        device: string;
        recommendedQuality: string;
        actualPerformance: number;
        isAppropriate: boolean;
      }> = [];

      DEVICE_PROFILES.forEach(device => {
        const mockScene = createMockSceneForDevice(device);
        const simulator = new DevicePerformanceSimulator(device);
        const frameRateOptimizer = new FrameRateOptimizer(mockScene);

        // Test each quality level on this device
        const qualityLevels = ['Potato', 'Low', 'Medium', 'High', 'Ultra'];
        const performanceResults: Record<string, number> = {};

        qualityLevels.forEach(quality => {
          frameRateOptimizer.setQualityLevel(quality);
          
          const frameRates: number[] = [];
          for (let i = 0; i < 50; i++) {
            const frameTime = simulator.simulateFrameTime(16.67, device.maxObjects, device.maxParticles);
            frameRates.push(1000 / frameTime);
          }
          
          performanceResults[quality] = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
        });

        // Check if recommended quality achieves target performance
        const recommendedPerformance = performanceResults[device.recommendedQuality];
        const isAppropriate = recommendedPerformance >= device.targetFPS * 0.8;

        qualityValidation.push({
          device: device.name,
          recommendedQuality: device.recommendedQuality,
          actualPerformance: recommendedPerformance,
          isAppropriate
        });

        frameRateOptimizer.destroy();
      });

      // Most devices should achieve good performance with recommended settings
      const appropriateCount = qualityValidation.filter(v => v.isAppropriate).length;
      const appropriateRatio = appropriateCount / qualityValidation.length;

      console.log('Quality Recommendation Validation:');
      qualityValidation.forEach(v => {
        console.log(`${v.device}: ${v.recommendedQuality} -> ${v.actualPerformance.toFixed(1)} FPS (${v.isAppropriate ? 'Good' : 'Poor'})`);
      });

      expect(appropriateRatio).toBeGreaterThan(0.8); // 80% should be appropriate
    });
  });

  describe('Real-World Scenario Testing', () => {
    it('should handle intensive gameplay scenarios', () => {
      const intensiveScenarios = [
        {
          name: 'Line Clear Explosion',
          objectCount: 300,
          particleCount: 200,
          duration: 60 // frames
        },
        {
          name: 'Multiple Simultaneous Effects',
          objectCount: 250,
          particleCount: 150,
          duration: 120
        },
        {
          name: 'Screen Transition',
          objectCount: 400,
          particleCount: 100,
          duration: 30
        }
      ];

      DEVICE_PROFILES.forEach(device => {
        const mockScene = createMockSceneForDevice(device);
        const simulator = new DevicePerformanceSimulator(device);
        const performanceMonitor = new PerformanceMonitor(mockScene);
        const frameRateOptimizer = new FrameRateOptimizer(mockScene);

        performanceMonitor.startMonitoring();
        frameRateOptimizer.setQualityLevel(device.recommendedQuality);

        intensiveScenarios.forEach(scenario => {
          const frameRates: number[] = [];
          
          for (let frame = 0; frame < scenario.duration; frame++) {
            const frameTime = simulator.simulateFrameTime(
              16.67,
              scenario.objectCount,
              scenario.particleCount
            );
            
            const fps = 1000 / frameTime;
            frameRates.push(fps);
            
            performanceMonitor.update(frameTime);
            frameRateOptimizer.update?.(frameTime);
          }

          const avgFPS = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
          const minFPS = Math.min(...frameRates);

          // Even during intensive scenarios, should maintain minimum performance
          expect(minFPS).toBeGreaterThan(device.minFPS * 0.7);
          
          console.log(`${device.name} - ${scenario.name}: Avg ${avgFPS.toFixed(1)} FPS, Min ${minFPS.toFixed(1)} FPS`);
        });

        performanceMonitor.destroy();
        frameRateOptimizer.destroy();
      });
    });

    it('should handle extended gameplay sessions', () => {
      // Test thermal throttling and battery impact over time
      const mobileDevices = DEVICE_PROFILES.filter(d => 
        d.name.includes('iPhone') || d.name.includes('iPad')
      );

      mobileDevices.forEach(device => {
        const mockScene = createMockSceneForDevice(device);
        const simulator = new DevicePerformanceSimulator(device);
        const performanceMonitor = new PerformanceMonitor(mockScene);

        performanceMonitor.startMonitoring();

        const sessionData = {
          initialFPS: 0,
          midSessionFPS: 0,
          finalFPS: 0,
          thermalDegradation: 0,
          batteryDrain: 0
        };

        // Simulate 30-minute session (1800 frames at 60 FPS)
        const sessionFrames = 1800;
        const frameRates: number[] = [];

        for (let frame = 0; frame < sessionFrames; frame++) {
          const frameTime = simulator.simulateFrameTime(16.67, device.maxObjects * 0.8, device.maxParticles * 0.6);
          const fps = 1000 / frameTime;
          frameRates.push(fps);
          
          performanceMonitor.update(frameTime);

          // Record key metrics
          if (frame === 60) sessionData.initialFPS = fps;
          if (frame === sessionFrames / 2) sessionData.midSessionFPS = fps;
          if (frame === sessionFrames - 1) {
            sessionData.finalFPS = fps;
            sessionData.thermalDegradation = 1.0 - simulator.getThermalState();
            sessionData.batteryDrain = 1.0 - simulator.getBatteryLevel();
          }
        }

        console.log(`${device.name} Extended Session:
          Initial FPS: ${sessionData.initialFPS.toFixed(1)}
          Mid-session FPS: ${sessionData.midSessionFPS.toFixed(1)}
          Final FPS: ${sessionData.finalFPS.toFixed(1)}
          Thermal Degradation: ${(sessionData.thermalDegradation * 100).toFixed(1)}%
          Battery Drain: ${(sessionData.batteryDrain * 100).toFixed(1)}%`);

        // Performance should degrade gracefully, not crash
        expect(sessionData.finalFPS).toBeGreaterThan(device.minFPS * 0.8);
        expect(sessionData.thermalDegradation).toBeLessThan(0.4); // Less than 40% degradation

        performanceMonitor.destroy();
      });
    });
  });

  describe('Performance Regression Detection', () => {
    it('should detect performance regressions across devices', () => {
      // Baseline performance expectations
      const baselineExpectations: Record<string, { minFPS: number; avgFPS: number }> = {
        'iPhone SE (1st gen)': { minFPS: 18, avgFPS: 25 },
        'iPhone 8': { minFPS: 25, avgFPS: 40 },
        'iPhone 12': { minFPS: 45, avgFPS: 55 },
        'iPad Air': { minFPS: 50, avgFPS: 58 },
        'Desktop (Low-end)': { minFPS: 45, avgFPS: 58 },
        'Desktop (High-end)': { minFPS: 55, avgFPS: 60 }
      };

      const regressionResults: Array<{
        device: string;
        expectedMinFPS: number;
        actualMinFPS: number;
        expectedAvgFPS: number;
        actualAvgFPS: number;
        hasRegression: boolean;
      }> = [];

      DEVICE_PROFILES.forEach(device => {
        const baseline = baselineExpectations[device.name];
        if (!baseline) return;

        const mockScene = createMockSceneForDevice(device);
        const simulator = new DevicePerformanceSimulator(device);
        const frameRateOptimizer = new FrameRateOptimizer(mockScene);

        frameRateOptimizer.setQualityLevel(device.recommendedQuality);

        const frameRates: number[] = [];
        
        // Standard performance test
        for (let i = 0; i < 200; i++) {
          const frameTime = simulator.simulateFrameTime(16.67, device.maxObjects * 0.7, device.maxParticles * 0.5);
          frameRates.push(1000 / frameTime);
        }

        const actualMinFPS = Math.min(...frameRates);
        const actualAvgFPS = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;

        const hasRegression = actualMinFPS < baseline.minFPS || actualAvgFPS < baseline.avgFPS;

        regressionResults.push({
          device: device.name,
          expectedMinFPS: baseline.minFPS,
          actualMinFPS,
          expectedAvgFPS: baseline.avgFPS,
          actualAvgFPS,
          hasRegression
        });

        frameRateOptimizer.destroy();
      });

      // Report regression results
      console.log('Performance Regression Analysis:');
      regressionResults.forEach(result => {
        const status = result.hasRegression ? '❌ REGRESSION' : '✅ OK';
        console.log(`${result.device}: ${status}
          Min FPS: ${result.actualMinFPS.toFixed(1)} (expected ${result.expectedMinFPS})
          Avg FPS: ${result.actualAvgFPS.toFixed(1)} (expected ${result.expectedAvgFPS})`);
      });

      // No device should have significant regressions
      const regressionCount = regressionResults.filter(r => r.hasRegression).length;
      expect(regressionCount).toBe(0);
    });
  });
});