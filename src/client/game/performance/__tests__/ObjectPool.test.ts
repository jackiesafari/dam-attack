import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import * as Phaser from 'phaser';
import { ObjectPool, PoolManager, PoolableObject, PoolableParticle, PoolableText } from '../ObjectPool';

// Mock poolable object
class MockPoolableObject implements PoolableObject {
  public active: boolean = false;
  public resetCalled: boolean = false;
  public destroyCalled: boolean = false;

  reset(): void {
    this.resetCalled = true;
    this.active = false;
  }

  destroy(): void {
    this.destroyCalled = true;
  }
}

// Mock Phaser scene
const createMockScene = () => ({
  time: {
    addEvent: vi.fn(() => ({
      destroy: vi.fn()
    }))
  },
  add: {
    graphics: vi.fn(() => ({
      clear: vi.fn(),
      setPosition: vi.fn(),
      setAlpha: vi.fn(),
      setScale: vi.fn(),
      setRotation: vi.fn(),
      setVisible: vi.fn(),
      fillStyle: vi.fn(),
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
    }))
  },
  tweens: {
    add: vi.fn(() => ({
      stop: vi.fn()
    }))
  }
} as any);

describe('ObjectPool', () => {
  let objectPool: ObjectPool<MockPoolableObject>;
  let factory: () => MockPoolableObject;

  beforeEach(() => {
    factory = () => new MockPoolableObject();
    objectPool = new ObjectPool(factory, { initialSize: 5, maxSize: 20 });
  });

  afterEach(() => {
    objectPool.destroy();
  });

  describe('Initialization', () => {
    it('should create pool with initial objects', () => {
      const stats = objectPool.getStats();
      expect(stats.poolSize).toBe(5);
      expect(stats.activeCount).toBe(0);
      expect(stats.totalSize).toBe(5);
    });

    it('should create pool with custom configuration', () => {
      const customPool = new ObjectPool(factory, {
        initialSize: 10,
        maxSize: 50,
        growthFactor: 2.0
      });

      const stats = customPool.getStats();
      expect(stats.poolSize).toBe(10);
      expect(stats.maxSize).toBe(50);

      customPool.destroy();
    });
  });

  describe('Object Management', () => {
    it('should get object from pool', () => {
      const obj = objectPool.get();

      expect(obj).toBeDefined();
      expect(obj.active).toBe(true);

      const stats = objectPool.getStats();
      expect(stats.poolSize).toBe(4);
      expect(stats.activeCount).toBe(1);
    });

    it('should release object back to pool', () => {
      const obj = objectPool.get();
      objectPool.release(obj);

      expect(obj.active).toBe(false);
      expect(obj.resetCalled).toBe(true);

      const stats = objectPool.getStats();
      expect(stats.poolSize).toBe(5);
      expect(stats.activeCount).toBe(0);
    });

    it('should create new objects when pool is empty', () => {
      // Get all objects from pool
      const objects = [];
      for (let i = 0; i < 5; i++) {
        objects.push(objectPool.get());
      }

      // Get one more - should create new object
      const extraObj = objectPool.get();
      expect(extraObj).toBeDefined();
      expect(extraObj.active).toBe(true);

      const stats = objectPool.getStats();
      expect(stats.activeCount).toBe(6);
      expect(stats.poolSize).toBe(0);
    });

    it('should not exceed maximum size', () => {
      // Fill pool to max capacity
      const objects = [];
      for (let i = 0; i < 20; i++) {
        objects.push(objectPool.get());
      }

      // Try to get one more
      const extraObj = objectPool.get();
      expect(extraObj).toBeDefined(); // Should still work (reuse oldest)

      const stats = objectPool.getStats();
      expect(stats.totalSize).toBeLessThanOrEqual(20);
    });

    it('should reuse oldest active object when at capacity', () => {
      // Fill to capacity
      const objects = [];
      for (let i = 0; i < 20; i++) {
        objects.push(objectPool.get());
      }

      const firstObj = objects[0];
      
      // Get one more - should reuse first object
      const reusedObj = objectPool.get();
      
      expect(firstObj.resetCalled).toBe(true);
      expect(reusedObj).toBe(firstObj);
    });

    it('should not release inactive objects', () => {
      const obj = objectPool.get();
      objectPool.release(obj);
      
      // Try to release again
      obj.resetCalled = false;
      objectPool.release(obj);
      
      expect(obj.resetCalled).toBe(false); // Should not reset again
    });
  });

  describe('Pool Growth and Cleanup', () => {
    it('should grow pool when requested', () => {
      objectPool.grow(5);

      const stats = objectPool.getStats();
      expect(stats.poolSize).toBe(10); // 5 initial + 5 growth
    });

    it('should not grow beyond maximum size', () => {
      objectPool.grow(50); // Try to grow beyond max

      const stats = objectPool.getStats();
      expect(stats.totalSize).toBeLessThanOrEqual(20);
    });

    it('should cleanup excess objects', () => {
      // Grow pool
      objectPool.grow(10);
      
      // Now cleanup
      objectPool.cleanup();

      const stats = objectPool.getStats();
      expect(stats.poolSize).toBeLessThanOrEqual(10); // Should reduce to reasonable size
    });

    it('should release all active objects', () => {
      const objects = [];
      for (let i = 0; i < 3; i++) {
        objects.push(objectPool.get());
      }

      objectPool.releaseAll();

      objects.forEach(obj => {
        expect(obj.active).toBe(false);
        expect(obj.resetCalled).toBe(true);
      });

      const stats = objectPool.getStats();
      expect(stats.activeCount).toBe(0);
    });
  });

  describe('Auto Cleanup', () => {
    it('should setup auto cleanup with scene', () => {
      const mockScene = createMockScene();
      const poolWithScene = new ObjectPool(factory, { enableAutoCleanup: true }, mockScene);

      expect(mockScene.time.addEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          delay: expect.any(Number),
          callback: expect.any(Function),
          loop: true
        })
      );

      poolWithScene.destroy();
    });

    it('should not setup auto cleanup without scene', () => {
      const poolWithoutScene = new ObjectPool(factory, { enableAutoCleanup: true });
      
      // Should not throw and should work normally
      expect(poolWithoutScene).toBeDefined();
      poolWithoutScene.destroy();
    });
  });

  describe('Statistics', () => {
    it('should provide accurate statistics', () => {
      const obj1 = objectPool.get();
      const obj2 = objectPool.get();

      const stats = objectPool.getStats();
      expect(stats.poolSize).toBe(3); // 5 - 2
      expect(stats.activeCount).toBe(2);
      expect(stats.totalSize).toBe(5);
      expect(stats.utilizationRate).toBe(0.4); // 2/5
    });

    it('should handle zero total size', () => {
      // Create empty pool
      const emptyPool = new ObjectPool(factory, { initialSize: 0 });
      
      const stats = emptyPool.getStats();
      expect(stats.utilizationRate).toBe(0);

      emptyPool.destroy();
    });
  });

  describe('Cleanup', () => {
    it('should destroy all objects on pool destruction', () => {
      const obj1 = objectPool.get();
      const obj2 = objectPool.get();

      objectPool.destroy();

      expect(obj1.destroyCalled).toBe(true);
      expect(obj2.destroyCalled).toBe(true);
    });
  });
});

describe('PoolManager', () => {
  let poolManager: PoolManager;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    poolManager = new PoolManager(mockScene);
  });

  afterEach(() => {
    poolManager.destroy();
  });

  describe('Pool Management', () => {
    it('should create named pools', () => {
      const pool = poolManager.createPool('test-pool', () => new MockPoolableObject());

      expect(pool).toBeDefined();
      expect(poolManager.getPool('test-pool')).toBe(pool);
    });

    it('should get objects from named pools', () => {
      poolManager.createPool('test-pool', () => new MockPoolableObject());
      
      const obj = poolManager.get('test-pool');
      expect(obj).toBeDefined();
      expect(obj?.active).toBe(true);
    });

    it('should release objects to named pools', () => {
      poolManager.createPool('test-pool', () => new MockPoolableObject());
      
      const obj = poolManager.get('test-pool');
      if (obj) {
        poolManager.release('test-pool', obj);
        expect(obj.active).toBe(false);
      }
    });

    it('should handle non-existent pools gracefully', () => {
      const obj = poolManager.get('non-existent');
      expect(obj).toBeNull();

      // Should not throw
      expect(() => {
        poolManager.release('non-existent', new MockPoolableObject());
      }).not.toThrow();
    });
  });

  describe('Statistics', () => {
    it('should provide statistics for all pools', () => {
      poolManager.createPool('pool1', () => new MockPoolableObject());
      poolManager.createPool('pool2', () => new MockPoolableObject());

      const stats = poolManager.getAllStats();
      expect(stats.has('pool1')).toBe(true);
      expect(stats.has('pool2')).toBe(true);
    });
  });

  describe('Bulk Operations', () => {
    it('should cleanup all pools', () => {
      const pool1 = poolManager.createPool('pool1', () => new MockPoolableObject());
      const pool2 = poolManager.createPool('pool2', () => new MockPoolableObject());

      const cleanupSpy1 = vi.spyOn(pool1, 'cleanup');
      const cleanupSpy2 = vi.spyOn(pool2, 'cleanup');

      poolManager.cleanupAll();

      expect(cleanupSpy1).toHaveBeenCalled();
      expect(cleanupSpy2).toHaveBeenCalled();
    });

    it('should release all objects from all pools', () => {
      const pool1 = poolManager.createPool('pool1', () => new MockPoolableObject());
      const pool2 = poolManager.createPool('pool2', () => new MockPoolableObject());

      // Get some objects
      poolManager.get('pool1');
      poolManager.get('pool2');

      const releaseAllSpy1 = vi.spyOn(pool1, 'releaseAll');
      const releaseAllSpy2 = vi.spyOn(pool2, 'releaseAll');

      poolManager.releaseAll();

      expect(releaseAllSpy1).toHaveBeenCalled();
      expect(releaseAllSpy2).toHaveBeenCalled();
    });
  });
});

describe('PoolableParticle', () => {
  let particle: PoolableParticle;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    particle = new PoolableParticle(mockScene);
  });

  afterEach(() => {
    particle.destroy();
  });

  describe('Lifecycle', () => {
    it('should reset to initial state', () => {
      particle.active = true;
      particle.setup(100, 200, 0xFF0000, 5);
      
      particle.reset();

      expect(particle.active).toBe(false);
      expect(mockScene.add.graphics().clear).toHaveBeenCalled();
      expect(mockScene.add.graphics().setPosition).toHaveBeenCalledWith(0, 0);
      expect(mockScene.add.graphics().setVisible).toHaveBeenCalledWith(false);
    });

    it('should setup particle properties', () => {
      particle.setup(100, 200, 0xFF0000, 5);

      expect(mockScene.add.graphics().fillStyle).toHaveBeenCalledWith(0xFF0000);
      expect(mockScene.add.graphics().fillCircle).toHaveBeenCalledWith(0, 0, 5);
      expect(mockScene.add.graphics().setPosition).toHaveBeenCalledWith(100, 200);
      expect(mockScene.add.graphics().setVisible).toHaveBeenCalledWith(true);
    });

    it('should animate particle', () => {
      particle.animate(mockScene, 200, 300, 1000);

      expect(mockScene.tweens.add).toHaveBeenCalledWith(
        expect.objectContaining({
          x: 200,
          y: 300,
          duration: 1000,
          ease: 'Power2.easeOut'
        })
      );
    });

    it('should stop animation on reset', () => {
      particle.animate(mockScene, 200, 300, 1000);
      particle.reset();

      expect(mockScene.tweens.add().stop).toHaveBeenCalled();
    });
  });
});

describe('PoolableText', () => {
  let poolableText: PoolableText;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    poolableText = new PoolableText(mockScene);
  });

  afterEach(() => {
    poolableText.destroy();
  });

  describe('Lifecycle', () => {
    it('should reset to initial state', () => {
      poolableText.active = true;
      poolableText.setup(100, 200, 'Test Text');
      
      poolableText.reset();

      expect(poolableText.active).toBe(false);
      expect(mockScene.add.text().setText).toHaveBeenCalledWith('');
      expect(mockScene.add.text().setPosition).toHaveBeenCalledWith(0, 0);
      expect(mockScene.add.text().setVisible).toHaveBeenCalledWith(false);
    });

    it('should setup text properties', () => {
      const style = {
        fontFamily: 'Arial',
        fontSize: '20px',
        color: '#FF0000'
      };

      poolableText.setup(100, 200, 'Test Text', style);

      expect(mockScene.add.text().setText).toHaveBeenCalledWith('Test Text');
      expect(mockScene.add.text().setPosition).toHaveBeenCalledWith(100, 200);
      expect(mockScene.add.text().setVisible).toHaveBeenCalledWith(true);
      expect(mockScene.add.text().setStyle).toHaveBeenCalledWith(style);
    });

    it('should setup without custom style', () => {
      poolableText.setup(100, 200, 'Test Text');

      expect(mockScene.add.text().setText).toHaveBeenCalledWith('Test Text');
      expect(mockScene.add.text().setStyle).not.toHaveBeenCalled();
    });
  });
});

describe('Performance Integration', () => {
  let poolManager: PoolManager;
  let mockScene: any;

  beforeEach(() => {
    mockScene = createMockScene();
    poolManager = new PoolManager(mockScene);
  });

  afterEach(() => {
    poolManager.destroy();
  });

  it('should handle high-frequency object creation and release', () => {
    const pool = poolManager.createPool('stress-test', () => new MockPoolableObject());

    // Simulate high-frequency usage
    const objects = [];
    for (let i = 0; i < 1000; i++) {
      const obj = poolManager.get('stress-test');
      if (obj) {
        objects.push(obj);
      }
      
      // Release some objects randomly
      if (objects.length > 50 && Math.random() > 0.7) {
        const objToRelease = objects.pop();
        if (objToRelease) {
          poolManager.release('stress-test', objToRelease);
        }
      }
    }

    // Should not crash and should maintain reasonable pool size
    const stats = poolManager.getAllStats().get('stress-test');
    expect(stats).toBeDefined();
    expect(stats.totalSize).toBeGreaterThan(0);
  });

  it('should handle memory pressure gracefully', () => {
    const pool = poolManager.createPool('memory-test', () => new MockPoolableObject(), {
      maxSize: 10
    });

    // Create many objects to simulate memory pressure
    const objects = [];
    for (let i = 0; i < 100; i++) {
      const obj = poolManager.get('memory-test');
      if (obj) {
        objects.push(obj);
      }
    }

    // Pool should not exceed max size
    const stats = poolManager.getAllStats().get('memory-test');
    expect(stats.totalSize).toBeLessThanOrEqual(10);
  });

  it('should maintain performance under concurrent access', () => {
    const pool = poolManager.createPool('concurrent-test', () => new MockPoolableObject());

    // Simulate concurrent access
    const promises = [];
    for (let i = 0; i < 50; i++) {
      promises.push(
        new Promise<void>(resolve => {
          setTimeout(() => {
            const obj = poolManager.get('concurrent-test');
            if (obj) {
              setTimeout(() => {
                poolManager.release('concurrent-test', obj);
                resolve();
              }, Math.random() * 10);
            } else {
              resolve();
            }
          }, Math.random() * 10);
        })
      );
    }

    return Promise.all(promises).then(() => {
      // Should complete without errors
      const stats = poolManager.getAllStats().get('concurrent-test');
      expect(stats).toBeDefined();
    });
  });
});