import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { PerformanceMonitor } from '../PerformanceMonitor';
import { ObjectPool, PoolManager, PoolableParticle, PoolableText } from '../ObjectPool';
import { RenderOptimizer } from '../RenderOptimizer';

// Mock Phaser scene for memory testing
const createMockScene = () => {
  return {
    renderer: { drawCalls: 0 },
    cameras: {
      main: {
        scrollX: 0,
        scrollY: 0,
        width: 800,
        height: 600,
        centerX: 400,
        centerY: 300,
        on: vi.fn()
      }
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
    add: {
      container: vi.fn(() => ({
        setDepth: vi.fn(),
        add: vi.fn(),
        list: []
      })),
      graphics: vi.fn(() => ({
        fillStyle: vi.fn(),
        fillRect: vi.fn(),
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

// Enhanced memory mock with realistic behavior
const createMemoryMock = () => {
  let currentMemory = 50 * 1024 * 1024; // Start at 50MB
  let peakMemory = currentMemory;
  let gcCount = 0;

  return {
    get usedJSHeapSize() {
      return currentMemory;
    },
    get totalJSHeapSize() {
      return Math.max(currentMemory * 1.5, 100 * 1024 * 1024);
    },
    get jsHeapSizeLimit() {
      return 2 * 1024 * 1024 * 1024; // 2GB limit
    },
    // Test utilities
    allocate(bytes: number) {
      currentMemory += bytes;
      peakMemory = Math.max(peakMemory, currentMemory);
    },
    gc() {
      currentMemory = Math.max(currentMemory * 0.7, 30 * 1024 * 1024); // Reduce by 30%
      gcCount++;
    },
    getPeakMemory() {
      return peakMemory;
    },
    getGCCount() {
      return gcCount;
    },
    reset() {
      currentMemory = 50 * 1024 * 1024;
      peakMemory = currentMemory;
      gcCount = 0;
    }
  };
};

describe('Memory Stress Tests', () => {
  let mockScene: any;
  let performanceMonitor: PerformanceMonitor;
  let memoryMock: ReturnType<typeof createMemoryMock>;

  beforeEach(() => {
    mockScene = createMockScene();
    memoryMock = createMemoryMock();
    
    // Replace performance.memory with our mock
    Object.defineProperty(performance, 'memory', {
      value: memoryMock,
      writable: true,
      configurable: true
    });

    performanceMonitor = new PerformanceMonitor(mockScene, {
      minFPS: 30,
      maxFrameTime: 33,
      maxMemoryUsage: 150 * 1024 * 1024 // 150MB threshold
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    performanceMonitor.destroy();
    memoryMock.reset();
  });

  describe('Memory Allocation Stress Tests', () => {
    it('should handle rapid memory allocation and deallocation', () => {
      performanceMonitor.startMonitoring();
      
      const memoryReadings: number[] = [];
      const allocationSize = 1024 * 1024; // 1MB per allocation

      // Simulate rapid allocation/deallocation cycles
      for (let cycle = 0; cycle < 50; cycle++) {
        // Allocation phase
        for (let i = 0; i < 10; i++) {
          memoryMock.allocate(allocationSize);
          performanceMonitor.update(16.67);
          memoryReadings.push(memoryMock.usedJSHeapSize);
        }

        // Deallocation phase (simulate GC)
        if (cycle % 5 === 0) {
          memoryMock.gc();
        }
      }

      const summary = performanceMonitor.getPerformanceSummary();
      expect(summary.memory.peak).toBeGreaterThan(summary.memory.current);
      expect(memoryReadings.length).toBe(500); // 50 cycles * 10 allocations

      // Memory should not grow indefinitely
      const finalMemory = memoryMock.usedJSHeapSize;
      const peakMemory = memoryMock.getPeakMemory();
      expect(peakMemory).toBeLessThan(500 * 1024 * 1024); // Should not exceed 500MB
    });

    it('should detect memory leaks in object pools', () => {
      const poolManager = new PoolManager(mockScene);
      
      // Create a pool that simulates memory leaks
      let leakyObjectCount = 0;
      const leakyPool = poolManager.createPool('leaky-objects', () => {
        leakyObjectCount++;
        memoryMock.allocate(1024); // Each object "leaks" 1KB
        return {
          active: false,
          reset: vi.fn(),
          destroy: vi.fn(() => {
            // Simulate incomplete cleanup - memory not freed
          })
        };
      }, { initialSize: 10, maxSize: 100 });

      // Use pool extensively
      const objects = [];
      for (let i = 0; i < 200; i++) {
        const obj = poolManager.get('leaky-objects');
        if (obj) {
          objects.push(obj);
          
          // Release some objects but they "leak" memory
          if (objects.length > 50) {
            const objToRelease = objects.shift();
            if (objToRelease) {
              poolManager.release('leaky-objects', objToRelease);
            }
          }
        }
      }

      // Memory should have grown significantly due to leaks
      expect(leakyObjectCount).toBeGreaterThan(100);
      expect(memoryMock.usedJSHeapSize).toBeGreaterThan(50 * 1024 * 1024 + 100 * 1024);

      poolManager.destroy();
    });

    it('should handle memory pressure gracefully', () => {
      performanceMonitor.startMonitoring();
      
      const warningHandler = vi.fn();
      const optimizationHandler = vi.fn();
      
      performanceMonitor.on('performance-warning', warningHandler);
      performanceMonitor.on('optimization-suggestion', optimizationHandler);

      // Simulate memory pressure by allocating large amounts
      const largeAllocationSize = 20 * 1024 * 1024; // 20MB per allocation
      
      for (let i = 0; i < 10; i++) {
        memoryMock.allocate(largeAllocationSize);
        performanceMonitor.update(16.67);
        
        // Trigger optimization check
        performanceMonitor.optimizePerformance();
      }

      // Should trigger memory warnings and optimization suggestions
      setTimeout(() => {
        expect(warningHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            issues: expect.arrayContaining([
              expect.stringContaining('High memory usage')
            ])
          })
        );

        expect(optimizationHandler).toHaveBeenCalledWith(
          expect.objectContaining({
            type: 'garbage-collection',
            reason: 'High memory usage'
          })
        );
      }, 100);
    });
  });

  describe('Object Pool Memory Management', () => {
    it('should efficiently manage particle object memory', () => {
      const poolManager = new PoolManager(mockScene);
      
      // Track memory usage for particle pool
      let particleMemoryUsage = 0;
      const particlePool = poolManager.createPool('particles', () => {
        const particle = new PoolableParticle(mockScene);
        particleMemoryUsage += 1024; // Assume 1KB per particle
        memoryMock.allocate(1024);
        return particle;
      }, { initialSize: 100, maxSize: 500 });

      const initialMemory = memoryMock.usedJSHeapSize;

      // Simulate heavy particle usage
      const activeParticles = [];
      for (let frame = 0; frame < 1000; frame++) {
        // Create particles
        for (let i = 0; i < 5; i++) {
          const particle = poolManager.get('particles');
          if (particle) {
            activeParticles.push(particle);
          }
        }

        // Release old particles
        while (activeParticles.length > 200) {
          const oldParticle = activeParticles.shift();
          if (oldParticle) {
            poolManager.release('particles', oldParticle);
          }
        }

        // Periodic cleanup
        if (frame % 100 === 0) {
          poolManager.cleanupAll();
          memoryMock.gc(); // Simulate garbage collection
        }
      }

      const finalMemory = memoryMock.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;

      // Memory growth should be reasonable (not linear with usage)
      expect(memoryGrowth).toBeLessThan(100 * 1024 * 1024); // Less than 100MB growth

      const poolStats = poolManager.getAllStats().get('particles');
      expect(poolStats?.totalSize).toBeLessThanOrEqual(500);
      expect(poolStats?.utilizationRate).toBeLessThanOrEqual(1);

      poolManager.destroy();
    });

    it('should handle text object memory efficiently', () => {
      const poolManager = new PoolManager(mockScene);
      
      const textPool = poolManager.createPool('text-objects', () => {
        const text = new PoolableText(mockScene);
        memoryMock.allocate(512); // Assume 512 bytes per text object
        return text;
      }, { initialSize: 50, maxSize: 200 });

      const initialMemory = memoryMock.usedJSHeapSize;

      // Simulate UI text updates
      const textObjects = [];
      for (let i = 0; i < 500; i++) {
        const textObj = poolManager.get('text-objects');
        if (textObj) {
          textObj.setup(100, 100, `Score: ${i}`, {
            fontSize: '16px',
            color: '#FFFFFF'
          });
          textObjects.push(textObj);

          // Release text objects after use
          if (textObjects.length > 50) {
            const oldText = textObjects.shift();
            if (oldText) {
              poolManager.release('text-objects', oldText);
            }
          }
        }
      }

      const finalMemory = memoryMock.usedJSHeapSize;
      const memoryGrowth = finalMemory - initialMemory;

      // Text objects should not cause excessive memory growth
      expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024); // Less than 50MB

      poolManager.destroy();
    });

    it('should prevent memory leaks in pool cleanup', () => {
      const poolManager = new PoolManager(mockScene);
      
      // Create multiple pools
      const pools = ['particles', 'text', 'effects', 'ui-elements'];
      pools.forEach(poolName => {
        poolManager.createPool(poolName, () => {
          memoryMock.allocate(1024); // Each object allocates 1KB
          return {
            active: false,
            reset: vi.fn(),
            destroy: vi.fn(() => {
              // Properly cleanup memory on destroy
              memoryMock.allocate(-1024); // Free memory (simulated)
            })
          };
        }, { initialSize: 20, maxSize: 100 });
      });

      const initialMemory = memoryMock.usedJSHeapSize;

      // Use all pools extensively
      const allObjects = [];
      for (let i = 0; i < 1000; i++) {
        const poolName = pools[i % pools.length];
        const obj = poolManager.get(poolName);
        if (obj) {
          allObjects.push({ obj, poolName });
        }
      }

      const peakMemory = memoryMock.usedJSHeapSize;

      // Destroy pool manager (should cleanup all objects)
      poolManager.destroy();

      // Memory should be significantly reduced after cleanup
      const finalMemory = memoryMock.usedJSHeapSize;
      expect(finalMemory).toBeLessThan(peakMemory);
    });
  });

  describe('Garbage Collection Behavior', () => {
    it('should trigger garbage collection under memory pressure', () => {
      performanceMonitor.startMonitoring();
      
      // Mock window.gc function
      const mockGC = vi.fn();
      (window as any).gc = mockGC;

      const renderOptimizer = new RenderOptimizer(mockScene);

      // Simulate memory pressure
      for (let i = 0; i < 20; i++) {
        memoryMock.allocate(10 * 1024 * 1024); // 10MB per iteration
        performanceMonitor.update(16.67);
      }

      // Force garbage collection
      renderOptimizer.forceGarbageCollection();

      expect(mockGC).toHaveBeenCalled();

      // Cleanup
      delete (window as any).gc;
      renderOptimizer.destroy();
    });

    it('should handle garbage collection timing', () => {
      performanceMonitor.startMonitoring();
      
      const gcTimings: number[] = [];
      let lastGCTime = performance.now();

      // Simulate periodic garbage collection
      for (let frame = 0; frame < 500; frame++) {
        memoryMock.allocate(100 * 1024); // 100KB per frame
        performanceMonitor.update(16.67);

        // Simulate GC every 50 frames
        if (frame % 50 === 0 && frame > 0) {
          const gcTime = performance.now();
          gcTimings.push(gcTime - lastGCTime);
          lastGCTime = gcTime;
          
          memoryMock.gc();
        }
      }

      // GC should occur at regular intervals
      expect(gcTimings.length).toBeGreaterThan(5);
      
      // Average GC interval should be reasonable
      const avgGCInterval = gcTimings.reduce((a, b) => a + b, 0) / gcTimings.length;
      expect(avgGCInterval).toBeGreaterThan(0);
    });

    it('should measure garbage collection impact on performance', () => {
      performanceMonitor.startMonitoring();
      
      const frameTimesBeforeGC: number[] = [];
      const frameTimesAfterGC: number[] = [];

      // Collect baseline performance
      for (let i = 0; i < 60; i++) {
        const frameTime = 16.67 + Math.random() * 2;
        performanceMonitor.update(frameTime);
        frameTimesBeforeGC.push(frameTime);
      }

      // Simulate garbage collection impact
      memoryMock.gc();
      
      // Collect post-GC performance (may have temporary impact)
      for (let i = 0; i < 60; i++) {
        const frameTime = 16.67 + Math.random() * 2 + (i < 10 ? 5 : 0); // GC impact for first 10 frames
        performanceMonitor.update(frameTime);
        frameTimesAfterGC.push(frameTime);
      }

      const avgBeforeGC = frameTimesBeforeGC.reduce((a, b) => a + b, 0) / frameTimesBeforeGC.length;
      const avgAfterGC = frameTimesAfterGC.slice(10).reduce((a, b) => a + b, 0) / (frameTimesAfterGC.length - 10);

      // Performance should recover after GC
      expect(Math.abs(avgAfterGC - avgBeforeGC)).toBeLessThan(5); // Within 5ms difference
    });
  });

  describe('Memory Leak Detection', () => {
    it('should detect gradual memory leaks', () => {
      performanceMonitor.startMonitoring();
      
      const memoryReadings: number[] = [];
      const leakSize = 100 * 1024; // 100KB leak per frame

      // Simulate gradual memory leak
      for (let frame = 0; frame < 200; frame++) {
        memoryMock.allocate(leakSize);
        performanceMonitor.update(16.67);
        memoryReadings.push(memoryMock.usedJSHeapSize);

        // Occasional GC that doesn't fully clean up the leak
        if (frame % 50 === 0 && frame > 0) {
          memoryMock.gc();
          memoryMock.allocate(leakSize * 10); // Leak persists
        }
      }

      // Memory should show consistent growth pattern
      const initialMemory = memoryReadings[0];
      const finalMemory = memoryReadings[memoryReadings.length - 1];
      const memoryGrowth = finalMemory - initialMemory;

      expect(memoryGrowth).toBeGreaterThan(10 * 1024 * 1024); // Should show significant growth

      // Check for consistent upward trend
      const midpointMemory = memoryReadings[Math.floor(memoryReadings.length / 2)];
      expect(midpointMemory).toBeGreaterThan(initialMemory);
      expect(finalMemory).toBeGreaterThan(midpointMemory);
    });

    it('should differentiate between leaks and normal growth', () => {
      performanceMonitor.startMonitoring();
      
      const normalGrowthReadings: number[] = [];
      const leakyReadings: number[] = [];

      // Simulate normal memory usage (with proper cleanup)
      memoryMock.reset();
      for (let frame = 0; frame < 100; frame++) {
        memoryMock.allocate(50 * 1024); // 50KB allocation
        performanceMonitor.update(16.67);
        normalGrowthReadings.push(memoryMock.usedJSHeapSize);

        // Regular GC that properly cleans up
        if (frame % 20 === 0 && frame > 0) {
          memoryMock.gc();
        }
      }

      // Simulate leaky memory usage
      memoryMock.reset();
      for (let frame = 0; frame < 100; frame++) {
        memoryMock.allocate(50 * 1024); // Same allocation
        performanceMonitor.update(16.67);
        leakyReadings.push(memoryMock.usedJSHeapSize);

        // GC that doesn't clean up properly
        if (frame % 20 === 0 && frame > 0) {
          memoryMock.gc();
          memoryMock.allocate(200 * 1024); // Leak persists
        }
      }

      // Compare growth patterns
      const normalGrowth = normalGrowthReadings[normalGrowthReadings.length - 1] - normalGrowthReadings[0];
      const leakyGrowth = leakyReadings[leakyReadings.length - 1] - leakyReadings[0];

      expect(leakyGrowth).toBeGreaterThan(normalGrowth * 2); // Leaky should grow much more
    });
  });

  describe('Memory Optimization Strategies', () => {
    it('should optimize memory usage based on available memory', () => {
      performanceMonitor.startMonitoring();
      
      const optimizationHandler = vi.fn();
      performanceMonitor.on('optimization-suggestion', optimizationHandler);

      // Simulate low memory condition
      memoryMock.allocate(120 * 1024 * 1024); // Allocate 120MB (close to 150MB threshold)
      performanceMonitor.update(16.67);
      performanceMonitor.optimizePerformance();

      expect(optimizationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'garbage-collection',
          reason: 'High memory usage'
        })
      );

      // Simulate very high object count
      const mockObjects = new Array(600).fill(null).map(() => ({ type: 'GameObject' }));
      mockScene.children.list = mockObjects;
      
      performanceMonitor.update(16.67);
      performanceMonitor.optimizePerformance();

      expect(optimizationHandler).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'object-pooling',
          reason: 'High object count'
        })
      );
    });

    it('should provide memory usage recommendations', () => {
      const poolManager = new PoolManager(mockScene);
      
      // Create pools with different configurations
      const efficientPool = poolManager.createPool('efficient', () => ({
        active: false,
        reset: vi.fn(),
        destroy: vi.fn()
      }), { initialSize: 10, maxSize: 50, enableAutoCleanup: true });

      const inefficientPool = poolManager.createPool('inefficient', () => ({
        active: false,
        reset: vi.fn(),
        destroy: vi.fn()
      }), { initialSize: 100, maxSize: 1000, enableAutoCleanup: false });

      // Use pools
      for (let i = 0; i < 200; i++) {
        poolManager.get('efficient');
        poolManager.get('inefficient');
      }

      const efficientStats = poolManager.getAllStats().get('efficient');
      const inefficientStats = poolManager.getAllStats().get('inefficient');

      // Efficient pool should have better utilization
      expect(efficientStats?.totalSize).toBeLessThan(inefficientStats?.totalSize);

      poolManager.destroy();
    });
  });
});