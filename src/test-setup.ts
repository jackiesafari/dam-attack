import { vi } from 'vitest';

// Mock HTMLCanvasElement.getContext for jsdom
HTMLCanvasElement.prototype.getContext = vi.fn(() => ({
  fillStyle: '',
  fillRect: vi.fn(),
  clearRect: vi.fn(),
  getImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  putImageData: vi.fn(),
  createImageData: vi.fn(() => ({ data: new Uint8ClampedArray(4) })),
  setTransform: vi.fn(),
  drawImage: vi.fn(),
  save: vi.fn(),
  restore: vi.fn(),
  beginPath: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  closePath: vi.fn(),
  stroke: vi.fn(),
  fill: vi.fn(),
  measureText: vi.fn(() => ({ width: 0 })),
  transform: vi.fn(),
  translate: vi.fn(),
  scale: vi.fn(),
  rotate: vi.fn(),
  arc: vi.fn(),
  fillText: vi.fn(),
  strokeText: vi.fn(),
})) as any;

// Mock Phaser namespace to avoid import issues
vi.mock('phaser', () => ({
  Scene: class MockScene {},
  Events: {
    EventEmitter: class MockEventEmitter {
      private listeners: Map<string, Function[]> = new Map();
      
      on(event: string, fn: Function) {
        if (!this.listeners.has(event)) {
          this.listeners.set(event, []);
        }
        this.listeners.get(event)!.push(fn);
        return this;
      }
      
      off(event: string, fn?: Function) {
        if (fn) {
          const listeners = this.listeners.get(event);
          if (listeners) {
            const index = listeners.indexOf(fn);
            if (index > -1) {
              listeners.splice(index, 1);
            }
          }
        } else {
          this.listeners.delete(event);
        }
        return this;
      }
      
      emit(event: string, ...args: any[]) {
        const listeners = this.listeners.get(event);
        if (listeners) {
          listeners.forEach(fn => fn(...args));
        }
        return this;
      }
      
      removeAllListeners() {
        this.listeners.clear();
        return this;
      }
      
      listenerCount(event: string) {
        return this.listeners.get(event)?.length || 0;
      }
    }
  },
  GameObjects: {
    Container: class MockContainer {},
    Graphics: class MockGraphics {},
    Text: class MockText {},
    Particles: {
      ParticleEmitter: class MockParticleEmitter {
        getAliveParticleCount() { return 0; }
      }
    }
  },
  Input: {
    Keyboard: {
      Key: class MockKey {}
    },
    Pointer: class MockPointer {}
  },
  Geom: {
    Rectangle: class MockRectangle {
      constructor(public x: number, public y: number, public width: number, public height: number) {}
      static Contains = vi.fn(() => true);
      static Overlaps = vi.fn(() => true);
      setTo(x: number, y: number, width: number, height: number) {
        this.x = x;
        this.y = y;
        this.width = width;
        this.height = height;
      }
    },
    Circle: class MockCircle {
      constructor(public x: number, public y: number, public radius: number) {}
      static Contains = vi.fn(() => true);
    }
  },
  Math: {
    Distance: {
      Between: vi.fn((x1: number, y1: number, x2: number, y2: number) => 
        Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2))
      )
    }
  },
  Display: {
    Color: {
      GetColor32: vi.fn(() => 0x000000),
      ValueToColor: vi.fn(() => ({ r: 0, g: 0, b: 0 })),
      Interpolate: {
        ColorWithColor: vi.fn(() => ({ r: 0, g: 0, b: 0 }))
      }
    }
  },
  Structs: {
    Size: class MockSize {
      constructor(public width: number, public height: number) {}
    }
  },
  Time: {
    TimerEvent: class MockTimerEvent {}
  },
  Tweens: {
    Tween: class MockTween {}
  }
}));

// Mock navigator.vibrate
Object.defineProperty(navigator, 'vibrate', {
  value: vi.fn(),
  writable: true,
  configurable: true
});

// Mock window.ontouchstart for touch detection
Object.defineProperty(window, 'ontouchstart', {
  value: undefined,
  writable: true,
  configurable: true
});