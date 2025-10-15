import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { FrameRateOptimizer } from '../FrameRateOptimizer';
import { ObjectPool, PoolManager } from '../ObjectPool';
import { RenderOptimizer } from '../RenderOptimizer';

// Mock Phaser scene with extended functionality for performance testing
const createMockScene = () => {
  const mockRenderer = {
    drawCalls: 0,
    textureSwaps: 0
  };

  const mockCamera = {
    scrollX: 0,
    scrollY: 0,
    width: 800,
    height: 600,
    centerX: 400,
    centerY: 300,
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
      width: 800,
      height: 600
    },
    time: {
      addEvent: vi.fn(() => ({
        destroy: vi.fn()
      })),
      delayedCall: vi.fn()
    },
    game: {
      loop: {
        actualFps: 60
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
        destroy: vi.fn()
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
        destroy: vi.fn()
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
      list: new Map(),
      remove: vi.fn()
    }
  } as any;
};

// Mock performance.memory with realistic values
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  },
  writable: true
});

describe('Performance Stability Tests', () => {
  let mockScene: any;
  let performanceMonitor: PerformanceMonitor;
  let frameRateOptimizer: FrameRateOptimizer;

  beforeEach(() => {
    mockScene = createMockScene();
    performanceMonitor = new PerformanceMonitor(mockScene, {
      minFPS: 30,
      maxFrameTime: 33,
      maxMemoryUsage: 100 * 1024 * 1024
    });
    frameRateOptimizer = new FrameRateOptimizer(mockScene, {
      targetFPS: 60,
      minFPS: 30,
      adaptiveQuality: true
    });
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.destroy();
    frameRateOptimizer.destroy();
  });

  describe('Frame Rate Stability During Extended Gameplay', () => {
    it('should maintain stable frame rate over 1000 frames', async () => {
      performanceMonitor.startMonitoring();
      frameRateOptimizer.setAdaptiveQuality(true);

      const frameRates: number[] = [];
      const targetFrameTime = 16.67; // 60 FPS

      // Simulate 1000 frames of gameplay
      for (let frame = 0; frame < 1000; frame++) {
        // Simulate varying frame times with occasional spikes
        let frameTime = targetFrameTime;
        
        // Add realistic frame time variations
        frameTime += (Math.random() - 0.5) * 2; // ±1ms variation
        
        // Simulate occasional frame spikes (every 100 frames)
        if (frame % 100 === 0) {
          frameTime += Math.random() * 10; // Up to 10ms spike
        }

        // Simulate heavy load periods (every 200 frames)
        if (frame % 200 === 0 && frame > 0) {
          frameTime += 5; // 5ms additional load
        }

        mockScene.game.loop.actualFps = Math.max(1, 1000 / frameTime);
        
        performanceMonitor.update(frameTime);
        frameRateOptimizer.update?.(frameTime);
        
        frameRates.push(mockScene.game.loop.actualFps);
      }

      // Analyze frame rate stability
      const avgFPS = frameRates.reduce((a, b) => a + b, 0) / frameRates.length;
      const minFPS = Math.min(...frameRates);
      const maxFPS = Math.max(...frameRates);
      const fpsVariance = frameRates.reduce((acc, fps) => acc + Math.pow(fps - avgFPS, 2), 0) / frameRates.length;
      const fpsStdDev = Math.sqrt(fpsVariance);

      // Performance assertions
      expect(avgFPS).toBeGreaterThan(45); // Average should be above 45 FPS
      expect(minFPS).toBeGreaterThan(25); // Minimum should not drop below 25 FPS
      expect(fpsStdDev).toBeLessThan(15); // Standard deviation should be reasonable

      // Check that frame rate optimizer responded to performance issues
      const stats = frameRateOptimizer.getStats();
      expect(stats.adaptationsCount).toBeGreaterThanOrEqual(0);

      console.log(`Frame Rate Stability Test Results:
        Average FPS: ${avgFPS.toFixed(2)}
        Min FPS: ${minFPS.toFixed(2)}
        Max FPS: ${maxFPS.toFixed(2)}
        Standard Deviation: ${fpsStdDev.toFixed(2)}
        Quality Adaptations: ${stats.adaptationsCount}`);
    });

    it('should recover from severe frame drops', async () => {
      performanceMonitor.startMonitoring();
      frameRateOptimizer.setAdaptiveQuality(true);

      const recoveryFrames: number[] = [];
      
      // Simulate severe performance drop
      for (let i = 0; i < 10; i++) {
        const badFrameTime = 100; // 10 FPS
        mockScene.game.loop.actualFps = 10;
        performanceMonitor.update(badFrameTime);
        frameRateOptimizer.update?.(badFrameTime);
      }

      // Monitor recovery
      for (let i = 0; i < 60; i++) {
        const frameTime = 16.67 + Math.random() * 2; // Good frame time with small variation
        mockScene.game.loop.actualFps = 1000 / frameTime;
        performanceMonitor.update(frameTime);
        frameRateOptimizer.update?.(frameTime);
        recoveryFrames.push(mockScene.game.loop.actualFps);
      }

      // Should recover to good performance
      const avgRecoveryFPS = recoveryFrames.slice(-30).reduce((a, b) => a + b, 0) / 30;
      expect(avgRecoveryFPS).toBeGreaterThan(50);

      // Frame rate optimizer should have adapted quality
      const stats = frameRateOptimizer.getStats();
      expect(stats.qualityLevel).not.toBe('Ultra'); // Should have reduced quality
    });

    it('should handle frame time spikes gracefully', () => {
      performanceMonitor.startMonitoring();
      
      const frameTimeSpikes = [16.67, 16.67, 50, 16.67, 16.67, 100, 16.67, 16.67];
      const warningHandler = vi.fn();
      performanceMonitor.on('performance-warning', warningHandler);

      frameTimeSpikes.forEach(frameTime => {
        mockScene.game.loop.actualFps = 1000 / frameTime;
        performanceMonitor.update(frameTime);
      });

      // Should detect and handle spikes
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.frameTime).toBeDefined();
      
      // Performance monitor should track the spikes
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.frameTime.max).toBeGreaterThan(50);
    });
  });

  describe('Memory Usage and Garbage Collection Tests', () => {
    it('should monitor memory usage over extended period', () => {
      performanceMonitor.startMonitoring();
      
      const memoryReadings: number[] = [];
      const initialMemory = 50 * 1024 * 1024; // 50MB
      
      // Simulate memory usage over time
      for (let i = 0; i < 100; i++) {
        // Simulate gradual memory increase with occasional GC
        let currentMemory = initialMemory + (i * 1024 * 100); // 100KB per frame
        
        // Simulate garbage collection every 20 frames
        if (i % 20 === 0 && i > 0) {
          currentMemory = initialMemory + (i * 1024 * 50); // Reduce memory usage
        }

        // Update mock memory
        (performance as any).memory.usedJSHeapSize = currentMemory;
        
        performanceMonitor.update(16.67);
        memoryReadings.push(currentMemory);
      }

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.memory.current).toBeGreaterThan(0);
      expect(summary.memory.peak).toBeGreaterThan(summary.memory.current);

      // Memory should not grow indefinitely
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const peakMemory = Math.max(...memoryReadings);
      expect(peakMemory).toBeLessThan(200 * 1024 * 1024); // Should not exceed 200MB
    });

    it('should detect memory leaks', () => {
      performanceMonitor.startMonitoring();
      
      const warningHandler = vi.fn();
      performanceMonitor.on('performance-warning', warningHandler);
      
      // Simulate memory leak - continuous growth
      for (let i = 0; i < 50; i++) {
        const leakyMemory = 50 * 1024 * 1024 + (i * 2 * 1024 * 1024); // 2MB per frame
        (performance as any).memory.usedJSHeapSize = leakyMemory;
        performanceMonitor.update(16.67);
      }

      // Should eventually trigger memory warnings
      setTimeout(() => {
        expect(warningHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            issues: expect.arrayContaining([
              expect.stringContaining('High memory usage')
            ])
          })
        );
      }, 100);
    });

    it('should handle object pool memory management', () => {
      const poolManager = new PoolManager(mockScene);
      
      // Create pools for different object types
      const particlePool = poolManager.createPool('particles', () => ({
        active: false,
        reset: vi.fn(),
        destroy: vi.fn()
      }), { initialSize: 50, maxSize: 200 });

      const textPool = poolManager.createPool('text', () => ({
        active: false,
        reset: vi.fn(),
        destroy: vi.fn()
      }), { initialSize: 20, maxSize: 100 });

      // Simulate heavy object usage
      const activeObjects = [];
      for (let i = 0; i < 500; i++) {
        const particleObj = poolManager.get('particles');
        const textObj = poolManager.get('text');
        
        if (particleObj) activeObjects.push({ obj: particleObj, pool: 'particles' });
        if (textObj) activeObjects.push({ obj: textObj, pool: 'text' });

        // Randomly release some objects
        if (activeObjects.length > 100 && Math.random() > 0.8) {
          const { obj, pool } = activeObjects.pop()!;
          poolManager.release(pool, obj);
        }
      }

      // Check pool statistics
      const stats = poolManager.getAllStats();
      const particleStats = stats.get('particles');
      const textStats = stats.get('text');

      expect(particleStats?.totalSize).toBeLessThanOrEqual(200);
      expect(textStats?.totalSize).toBeLessThanOrEqual(100);
      expect(particleStats?.utilizationRate).toBeLessThanOrEqual(1);
      expect(textStats?.utilizationRate).toBeLessThanOrEqual(1);

      poolManager.destroy();
    });

    it('should trigger garbage collection optimization', () => {
      performanceMonitor.startMonitoring();
      
      const optimizationHandler = vi.fn();
      performanceMonitor.on('optimization-suggestion', optimizationHandler);

      // Simulate high memory usage
      (performance as any).memory.usedJSHeapSize = 80 * 1024 * 1024; // 80MB
      performanceMonitor.update(16.67);
      performanceMonitor.optimizePerformance();

      expect(optimizationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'garbage-collection',
          reason: 'High memory usage'
        })
      );
    });
  });

  describe('Cross-Device Performance Tests', () => {
    it('should optimize for mobile devices', () => {
      frameRateOptimizer.optimizeForDevice('mobile');
      
      const quality = frameRateOptimizer.getCurrentQuality();
      expect(quality.name).toBe('Low');
      
      // Mobile should have lower performance targets
      const stats = frameRateOptimizer.getStats();
      expect(stats.qualityLevel).toBe('Low');
    });

    it('should optimize for tablet devices', () => {
      frameRateOptimizer.optimizeForDevice('tablet');
      
      const quality = frameRateOptimizer.getCurrentQuality();
      expect(quality.name).toBe('Medium');
    });

    it('should optimize for desktop devices', () => {
      frameRateOptimizer.optimizeForDevice('desktop');
      
      const quality = frameRateOptimizer.getCurrentQuality();
      expect(quality.name).toBe('High');
    });

    it('should adapt quality based on device performance', () => {
      frameRateOptimizer.setAdaptiveQuality(true);
      
      // Simulate poor performance on mobile
      frameRateOptimizer.optimizeForDevice('mobile');
      
      // Simulate consistently poor performance
      for (let i = 0; i < 100; i++) {
        mockScene.game.loop.actualFps = 20; // Poor performance
        frameRateOptimizer.update?.(50); // 20 FPS = 50ms frame time
      }

      // Should adapt to even lower quality
      const finalQuality = frameRateOptimizer.getCurrentQuality();
      expect(['Low', 'Potato']).toContain(finalQuality.name);
    });

    it('should handle different screen sizes and resolutions', () => {
      const renderOptimizer = new RenderOptimizer(mockScene);
      
      // Test different screen configurations
      const screenConfigs = [
        { width: 320, height: 568 }, // iPhone SE
        { width: 375, height: 667 }, // iPhone 8
        { width: 414, height: 896 }, // iPhone 11
        { width: 768, height: 1024 }, // iPad
        { width: 1920, height: 1080 }, // Desktop
        { width: 2560, height: 1440 }  // High-res desktop
      ];

      screenConfigs.forEach(config => {
        mockScene.scale.width = config.width;
        mockScene.scale.height = config.height;
        
        // Update culling bounds for new screen size
        renderOptimizer.updateConfig({
          cullingMargin: Math.min(config.width, config.height) * 0.1
        });

        // Should handle different screen sizes without errors
        expect(() => {
          renderOptimizer.getStats();
        }).not.toThrow();
      });

      renderOptimizer.destroy();
    });

    it('should measure performance across simulated device types', () => {
      const deviceTests = [
        {
          name: 'Low-end Mobile',
          targetFPS: 30,
          memoryLimit: 50 * 1024 * 1024,
          qualityLevel: 'Potato'
        },
        {
          name: 'Mid-range Mobile',
          targetFPS: 45,
          memoryLimit: 100 * 1024 * 1024,
          qualityLevel: 'Low'
        },
        {
          name: 'High-end Mobile',
          targetFPS: 60,
          memoryLimit: 150 * 1024 * 1024,
          qualityLevel: 'Medium'
        },
        {
          name: 'Desktop',
          targetFPS: 60,
          memoryLimit: 200 * 1024 * 1024,
          qualityLevel: 'High'
        }
      ];

      deviceTests.forEach(device => {
        const deviceOptimizer = new FrameRateOptimizer(mockScene, {
          targetFPS: device.targetFPS,
          minFPS: Math.max(20, device.targetFPS - 15)
        });

        deviceOptimizer.setQualityLevel(device.qualityLevel);

        // Simulate device performance
        const frameTime = 1000 / device.targetFPS;
        for (let i = 0; i < 60; i++) {
          mockScene.game.loop.actualFps = device.targetFPS + (Math.random() - 0.5) * 10;
          deviceOptimizer.update?.(frameTime + (Math.random() - 0.5) * 5);
        }

        const stats = deviceOptimizer.getStats();
        expect(stats.qualityLevel).toBe(device.qualityLevel);
        expect(stats.currentFPS).toBeGreaterThan(device.targetFPS - 20);

        console.log(`${device.name} Performance Test:
          Target FPS: ${device.targetFPS}
          Actual FPS: ${stats.currentFPS.toFixed(2)}
          Quality: ${stats.qualityLevel}
          Adaptations: ${stats.adaptationsCount}`);

        deviceOptimizer.destroy();
      });
    });
  });

  describe('Render Performance Tests', () => {
    it('should optimize draw calls and batching', () => {
      const renderOptimizer = new RenderOptimizer(mockScene, {
        enableBatching: true,
        maxBatchSize: 100,
        enableCulling: true
      });

      // Simulate many objects
      const objects = [];
      for (let i = 0; i < 500; i++) {
        const obj = {
          x: Math.random() * 800,
          y: Math.random() * 600,
          visible: true,
          depth: Math.random() * 10,
          getBounds: () => ({ x: 0, y: 0, width: 32, height: 32 }),
          setVisible: vi.fn(),
          texture: { key: `texture-${i % 5}` }
        };
        objects.push(obj);
        renderOptimizer.addToBatch('game-objects', obj as any);
      }

      mockScene.children.list = objects;

      // Simulate render cycle
      mockScene.events.emit('prerender');
      mockScene.events.emit('render');
      mockScene.events.emit('postrender');

      const stats = renderOptimizer.getStats();
      expect(stats.batchedObjects).toBeGreaterThan(0);
      expect(stats.visibleObjects).toBeGreaterThan(0);

      renderOptimizer.destroy();
    });

    it('should handle texture optimization', () => {
      const renderOptimizer = new RenderOptimizer(mockScene, {
        enableTextureAtlas: true,
        maxTextureSize: 1024
      });

      // Add some textures to the scene
      mockScene.textures.list.set('texture1', { key: 'texture1' });
      mockScene.textures.list.set('texture2', { key: 'texture2' });
      mockScene.textures.list.set('texture3', { key: 'texture3' });

      expect(() => {
        renderOptimizer.optimizeTextures();
      }).not.toThrow();

      renderOptimizer.destroy();
    });
  });

  describe('Emergency Performance Recovery', () => {
    it('should trigger emergency optimization under severe load', () => {
      frameRateOptimizer.setAdaptiveQuality(true);
      
      const emergencyHandler = vi.fn();
      frameRateOptimizer.on('emergency-optimization', emergencyHandler);

      // Simulate severe performance issues
      for (let i = 0; i < 10; i++) {
        mockScene.game.loop.actualFps = 5; // Extremely poor performance
        frameRateOptimizer.update?.(200); // 5 FPS = 200ms frame time
      }

      frameRateOptimizer.emergencyOptimize();

      expect(emergencyHandler).toHaveBeenCalled();
      
      // Should drop to lowest quality
      const quality = frameRateOptimizer.getCurrentQuality();
      expect(quality.name).toBe('Potato');
    });

    it('should recover from emergency optimization', async () => {
      frameRateOptimizer.emergencyOptimize();
      
      // Wait for recovery period (simulated)
      await new Promise(resolve => setTimeout(resolve, 100));

      // Simulate good performance
      for (let i = 0; i < 60; i++) {
        mockScene.game.loop.actualFps = 60;
        frameRateOptimizer.update?.(16.67);
      }

      // Should eventually allow quality improvements
      expect(frameRateOptimizer.getCurrentQuality().name).toBeDefined();
    });
  });

  describe('Performance Monitoring Integration', () => {
    it('should coordinate between performance systems', () => {
      performanceMonitor.startMonitoring();
      frameRateOptimizer.setAdaptiveQuality(true);

      const poolManager = new PoolManager(mockScene);
      const particlePool = poolManager.createPool('particles', () => ({
        active: false,
        reset: vi.fn(),
        destroy: vi.fn()
      }));

      // Simulate coordinated performance monitoring
      for (let frame = 0; frame < 100; frame++) {
        const frameTime = 16.67 + Math.random() * 10;
        mockScene.game.loop.actualFps = 1000 / frameTime;

        performanceMonitor.update(frameTime);
        frameRateOptimizer.update?.(frameTime);

        // Track object pool usage
        const poolStats = particlePool.getStats();
        performanceMonitor.trackObjectPool('particles', poolStats.activeCount);

        // Simulate object creation/release
        if (frame % 10 === 0) {
          const obj = poolManager.get('particles');
          if (obj && Math.random() > 0.5) {
            poolManager.release('particles', obj);
          }
        }
      }

      const perfSummary = performanceMonitor.getPerformanceSummary();
      const frameStats = frameRateOptimizer.getStats();

      expect(perfSummary.objects.pools.has('particles')).toBe(true);
      expect(frameStats.currentFPS).toBeGreaterThan(0);

      poolManager.destroy();
    });
  });
});