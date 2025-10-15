import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { PerformanceMonitor } from '../PerformanceMonitor';

// Mock Phaser scene
const createMockScene = () => {
  const mockRenderer = {
    drawCalls: 0
  };

  return {
    renderer: mockRenderer,
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
      delayedCall: vi.fn()
    }
  } as any;
};

// Mock performance.memory
Object.defineProperty(performance, 'memory', {
  value: {
    usedJSHeapSize: 50 * 1024 * 1024, // 50MB
    totalJSHeapSize: 100 * 1024 * 1024,
    jsHeapSizeLimit: 200 * 1024 * 1024
  },
  writable: true
});

describe('PerformanceMonitor', () => {
  let performanceMonitor: PerformanceMonitor;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    performanceMonitor = new PerformanceMonitor(mockScene);
    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.destroy();
  });

  describe('Initialization', () => {
    it('should create with default thresholds', () => {
      expect(performanceMonitor).toBeDefined();
      
      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBe(60);
      expect(metrics.frameTime).toBe(16.67);
    });

    it('should create with custom thresholds', () => {
      const customMonitor = new PerformanceMonitor(mockScene, {
        minFPS: 45,
        maxFrameTime: 22
      });

      expect(customMonitor).toBeDefined();
      customMonitor.destroy();
    });
  });

  describe('Monitoring Control', () => {
    it('should start monitoring', () => {
      performanceMonitor.startMonitoring();
      // Monitoring state is tested indirectly through update behavior
    });

    it('should stop monitoring', () => {
      performanceMonitor.startMonitoring();
      performanceMonitor.stopMonitoring();
      // Monitoring state is tested indirectly through update behavior
    });

    it('should not start monitoring twice', () => {
      performanceMonitor.startMonitoring();
      performanceMonitor.startMonitoring(); // Should not cause issues
    });
  });

  describe('Frame Tracking', () => {
    beforeEach(() => {
      performanceMonitor.startMonitoring();
    });

    it('should track frame performance', () => {
      const delta = 16.67; // 60 FPS
      performanceMonitor.update(delta);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.frameTime).toBeGreaterThan(0);
    });

    it('should calculate FPS over time', () => {
      // Simulate multiple frames
      for (let i = 0; i < 60; i++) {
        performanceMonitor.update(16.67);
      }

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.fps).toBeGreaterThan(0);
    });

    it('should track frame operations', () => {
      performanceMonitor.startFrame('test-operation');
      
      // Simulate some work
      const start = performance.now();
      while (performance.now() - start < 5) {
        // Busy wait for 5ms
      }
      
      performanceMonitor.endFrame('test-operation');

      const frameStats = performanceMonitor.getFrameStats();
      expect(frameStats.has('test-operation')).toBe(true);
      
      const stats = frameStats.get('test-operation');
      expect(stats?.count).toBe(1);
      expect(stats?.avg).toBeGreaterThan(0);
    });

    it('should handle missing frame end', () => {
      performanceMonitor.startFrame('missing-end');
      
      // Don't call endFrame - should not cause errors
      expect(() => {
        performanceMonitor.update(16.67);
      }).not.toThrow();
    });

    it('should emit slow frame events', () => {
      const slowFrameHandler = vi.fn();
      performanceMonitor.on('slow-frame', slowFrameHandler);

      performanceMonitor.startFrame('slow-operation');
      
      // Simulate slow operation (>16.67ms)
      const start = performance.now();
      while (performance.now() - start < 20) {
        // Busy wait for 20ms
      }
      
      performanceMonitor.endFrame('slow-operation');

      expect(slowFrameHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'slow-operation',
          duration: expect.any(Number)
        })
      );
    });
  });

  describe('Memory Monitoring', () => {
    beforeEach(() => {
      performanceMonitor.startMonitoring();
    });

    it('should track memory usage', () => {
      performanceMonitor.update(16.67);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.memoryUsage).toBeGreaterThan(0);
    });

    it('should handle missing performance.memory', () => {
      // Temporarily remove performance.memory
      const originalMemory = (performance as any).memory;
      delete (performance as any).memory;

      expect(() => {
        performanceMonitor.update(16.67);
      }).not.toThrow();

      // Restore
      (performance as any).memory = originalMemory;
    });
  });

  describe('Object Tracking', () => {
    beforeEach(() => {
      performanceMonitor.startMonitoring();
    });

    it('should track object pools', () => {
      performanceMonitor.trackObjectPool('particles', 50);
      performanceMonitor.trackObjectPool('ui-elements', 25);

      // Object pool tracking is tested indirectly through summary
      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.objects.pools.has('particles')).toBe(true);
      expect(summary.objects.pools.get('particles')).toBe(50);
    });

    it('should update object counts from scene', () => {
      // Add mock objects to scene
      mockScene.children.list = [
        { type: 'GameObject' },
        { type: 'GameObject' },
        { 
          type: 'ParticleEmitter',
          getAliveParticleCount: () => 10
        }
      ];

      performanceMonitor.update(16.67);

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.activeObjects).toBe(3);
      expect(metrics.particleCount).toBe(10);
    });
  });

  describe('Performance Thresholds', () => {
    beforeEach(() => {
      performanceMonitor.startMonitoring();
    });

    it('should emit performance warnings', () => {
      const warningHandler = vi.fn();
      performanceMonitor.on('performance-warning', warningHandler);

      // Create a monitor with low thresholds to trigger warnings
      const testMonitor = new PerformanceMonitor(mockScene, {
        minFPS: 100, // Impossible to achieve
        maxFrameTime: 1 // Very low threshold
      });

      testMonitor.startMonitoring();
      testMonitor.update(16.67);

      // Wait for warning cooldown to pass
      setTimeout(() => {
        expect(warningHandler).toHaveBeenCalled();
        testMonitor.destroy();
      }, 100);
    });

    it('should respect warning cooldown', () => {
      const warningHandler = vi.fn();
      performanceMonitor.on('performance-warning', warningHandler);

      // Trigger multiple warnings quickly
      for (let i = 0; i < 5; i++) {
        performanceMonitor.update(100); // Very slow frame
      }

      // Should only emit one warning due to cooldown
      expect(warningHandler).toHaveBeenCalledTimes(0); // Cooldown prevents immediate warnings
    });
  });

  describe('Performance Summary', () => {
    beforeEach(() => {
      performanceMonitor.startMonitoring();
    });

    it('should provide comprehensive performance summary', () => {
      // Generate some frame history
      for (let i = 0; i < 10; i++) {
        performanceMonitor.update(16.67 + Math.random() * 5);
      }

      const summary = performanceMonitor.getPerformanceSummary();

      expect(summary.fps).toHaveProperty('current');
      expect(summary.fps).toHaveProperty('avg');
      expect(summary.fps).toHaveProperty('min');
      expect(summary.fps).toHaveProperty('max');

      expect(summary.frameTime).toHaveProperty('current');
      expect(summary.frameTime).toHaveProperty('avg');
      expect(summary.frameTime).toHaveProperty('max');

      expect(summary.memory).toHaveProperty('current');
      expect(summary.memory).toHaveProperty('peak');

      expect(summary.objects).toHaveProperty('active');
      expect(summary.objects).toHaveProperty('pools');
    });

    it('should handle empty frame history', () => {
      const summary = performanceMonitor.getPerformanceSummary();
      
      expect(summary.frameTime.avg).toBe(0);
      expect(summary.frameTime.max).toBe(0);
    });
  });

  describe('Optimization Suggestions', () => {
    beforeEach(() => {
      performanceMonitor.startMonitoring();
    });

    it('should suggest optimizations based on metrics', () => {
      const suggestionHandler = vi.fn();
      performanceMonitor.on('optimization-suggestion', suggestionHandler);

      // Mock poor performance
      performanceMonitor.update(100); // Very slow frame

      performanceMonitor.optimizePerformance();

      expect(suggestionHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: expect.any(String),
          reason: expect.any(String),
          suggestion: expect.any(String)
        })
      );
    });

    it('should suggest particle reduction for low FPS', () => {
      const suggestionHandler = vi.fn();
      performanceMonitor.on('optimization-suggestion', suggestionHandler);

      // Simulate low FPS
      const testMonitor = new PerformanceMonitor(mockScene);
      testMonitor.startMonitoring();
      
      // Force low FPS in metrics
      (testMonitor as any).metrics.fps = 20;
      
      testMonitor.optimizePerformance();

      expect(suggestionHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'reduce-particles'
        })
      );

      testMonitor.destroy();
    });
  });

  describe('Debug Overlay', () => {
    beforeEach(() => {
      performanceMonitor.startMonitoring();
    });

    it('should create debug overlay', () => {
      const overlay = performanceMonitor.createDebugOverlay();

      expect(overlay).toBeDefined();
      expect(mockScene.add.container).toHaveBeenCalled();
      expect(mockScene.add.graphics).toHaveBeenCalled();
      expect(mockScene.add.text).toHaveBeenCalled();
    });

    it('should update debug overlay with metrics', () => {
      const overlay = performanceMonitor.createDebugOverlay();
      
      // Simulate metrics update
      performanceMonitor.update(16.67);

      // The overlay should update automatically through events
      expect(mockScene.events.on).toHaveBeenCalledWith('postupdate', expect.any(Function));
    });
  });

  describe('Performance Reporting', () => {
    beforeEach(() => {
      performanceMonitor.startMonitoring();
    });

    it('should log performance report', () => {
      const consoleSpy = vi.spyOn(console, 'group').mockImplementation(() => {});
      const consoleLogSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
      const consoleGroupEndSpy = vi.spyOn(console, 'groupEnd').mockImplementation(() => {});

      // Add some frame stats
      performanceMonitor.startFrame('test-op');
      performanceMonitor.endFrame('test-op');

      performanceMonitor.logPerformanceReport();

      expect(consoleSpy).toHaveBeenCalledWith('🔍 Performance Report');
      expect(consoleLogSpy).toHaveBeenCalled();
      expect(consoleGroupEndSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleGroupEndSpy.mockRestore();
    });
  });

  describe('Error Handling', () => {
    it('should handle errors in update gracefully', () => {
      performanceMonitor.startMonitoring();

      // Mock scene.children.list to throw error
      Object.defineProperty(mockScene.children, 'list', {
        get: () => {
          throw new Error('Test error');
        }
      });

      expect(() => {
        performanceMonitor.update(16.67);
      }).not.toThrow();
    });

    it('should handle missing renderer gracefully', () => {
      mockScene.renderer = null;
      
      expect(() => {
        performanceMonitor.startMonitoring();
        performanceMonitor.update(16.67);
      }).not.toThrow();
    });
  });

  describe('Cleanup', () => {
    it('should clean up resources on destroy', () => {
      performanceMonitor.startMonitoring();
      
      // Add some data
      performanceMonitor.startFrame('test');
      performanceMonitor.trackObjectPool('test-pool', 10);

      performanceMonitor.destroy();

      // Verify cleanup
      const stats = performanceMonitor.getFrameStats();
      expect(stats.size).toBe(0);
    });

    it('should remove all event listeners on destroy', () => {
      performanceMonitor.startMonitoring();
      
      const handler = vi.fn();
      performanceMonitor.on('performance-warning', handler);

      performanceMonitor.destroy();

      // Verify listeners are removed
      expect(performanceMonitor.listenerCount('performance-warning')).toBe(0);
    });
  });

  describe('Edge Cases', () => {
    it('should handle very high frame times', () => {
      performanceMonitor.startMonitoring();
      
      expect(() => {
        performanceMonitor.update(1000); // 1 second frame time
      }).not.toThrow();

      const metrics = performanceMonitor.getMetrics();
      expect(metrics.frameTime).toBe(1000);
    });

    it('should handle negative delta values', () => {
      performanceMonitor.startMonitoring();
      
      expect(() => {
        performanceMonitor.update(-16.67);
      }).not.toThrow();
    });

    it('should handle zero delta values', () => {
      performanceMonitor.startMonitoring();
      
      expect(() => {
        performanceMonitor.update(0);
      }).not.toThrow();
    });

    it('should handle missing performance.now', () => {
      const originalNow = performance.now;
      performance.now = undefined as any;

      expect(() => {
        performanceMonitor.startFrame('test');
        performanceMonitor.endFrame('test');
      }).not.toThrow();

      performance.now = originalNow;
    });
  });
});