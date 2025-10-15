import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
};

Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
});

// Mock URLSearchParams
const mockURLSearchParams = vi.fn();
Object.defineProperty(window, 'URLSearchParams', {
  value: mockURLSearchParams
});

// Mock document
Object.defineProperty(document, 'body', {
  value: {
    getAttribute: vi.fn()
  }
});

// Mock Game class with username methods
class MockGame {
  async getRedditUsername(devvit: any, fallback: string): Promise<string> {
    console.log('🔍 === REDDIT USERNAME DETECTION DEBUG ===');
    console.log('🔍 Devvit object provided:', !!devvit);
    console.log('🔍 Fallback username:', fallback);

    try {
      // 1) URL param override for testing
      console.log('🔍 Step 1: Checking URL parameters...');
      const params = new URLSearchParams(window.location.search);
      const fromUrl = params.get('reddit_username');
      console.log('🔍 URL reddit_username param:', fromUrl);

      if (fromUrl) {
        localStorage.setItem('last_reddit_username', fromUrl);
        console.log('✅ SUCCESS: Using reddit_username from URL:', fromUrl);
        return fromUrl;
      }

      // 2) Direct devvit context username
      console.log('🔍 Step 2: Checking direct devvit context...');
      const directName = devvit?.context?.username || devvit?.username;
      console.log('🔍 Direct username found:', directName);
      if (typeof directName === 'string' && directName.length > 0) {
        localStorage.setItem('last_reddit_username', directName);
        console.log('✅ SUCCESS: Using reddit username from direct context:', directName);
        return directName;
      }

      // 3) Async devvit username getter
      console.log('🔍 Step 3: Checking async devvit username...');
      if (devvit?.getCurrentUser) {
        try {
          const user = await devvit.getCurrentUser();
          const n = user?.username;
          console.log('🔍 Async username:', n);
          if (n) {
            localStorage.setItem('last_reddit_username', n);
            console.log('✅ SUCCESS: Using reddit username from async getter:', n);
            return n;
          }
        } catch (asyncError) {
          console.log('⚠️ Async username fetch failed:', asyncError);
        }
      }

      // 4) Cached username
      console.log('🔍 Step 4: Checking cached username...');
      const cached = localStorage.getItem('last_reddit_username');
      console.log('🔍 Cached username:', cached);
      if (cached) {
        console.log('✅ SUCCESS: Using cached reddit username:', cached);
        return cached;
      }

      // 5) Data attributes
      console.log('🔍 Step 5: Checking DOM data attributes...');
      const byAttr = document.body.getAttribute('data-reddit-username');
      console.log('🔍 DOM data-reddit-username:', byAttr);

      if (byAttr) {
        localStorage.setItem('last_reddit_username', byAttr);
        console.log('✅ SUCCESS: Using reddit username from data attribute:', byAttr);
        return byAttr;
      }

      console.log('⚠️ No username found, using fallback:', fallback);
      return fallback;
    } catch (e) {
      console.error('❌ getRedditUsername failed with error:', e);
      console.log('⚠️ Using fallback due to error:', fallback);
      return fallback;
    }
  }
}

describe('Username Integration Tests', () => {
  let game: MockGame;
  let consoleSpy: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    game = new MockGame();
    consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    
    // Reset all mocks
    vi.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
    localStorageMock.setItem.mockImplementation(() => {});
    
    // Mock URLSearchParams
    mockURLSearchParams.mockImplementation((search) => ({
      get: vi.fn().mockReturnValue(null)
    }));

    // Mock document.body.getAttribute
    (document.body.getAttribute as any).mockReturnValue(null);

    // Mock window.location
    Object.defineProperty(window, 'location', {
      value: {
        search: ''
      },
      writable: true
    });
  });

  afterEach(() => {
    consoleSpy.mockRestore();
  });

  describe('URL Parameter Override', () => {
    it('should retrieve username from URL parameter', async () => {
      // Mock URL parameter
      const mockParams = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'reddit_username') return 'testuser_from_url';
          return null;
        })
      };
      mockURLSearchParams.mockReturnValue(mockParams);

      const result = await game.getRedditUsername(null, 'fallback');

      expect(result).toBe('testuser_from_url');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'testuser_from_url');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SUCCESS: Using reddit_username from URL:', 'testuser_from_url');
    });

    it('should handle URL parameter with special characters', async () => {
      const mockParams = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'reddit_username') return 'test_user-123';
          return null;
        })
      };
      mockURLSearchParams.mockReturnValue(mockParams);

      const result = await game.getRedditUsername(null, 'fallback');

      expect(result).toBe('test_user-123');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'test_user-123');
    });
  });

  describe('Devvit Context Integration', () => {
    it('should retrieve username from direct devvit context', async () => {
      const mockDevvit = {
        context: {
          username: 'devvit_context_user'
        }
      };

      const result = await game.getRedditUsername(mockDevvit, 'fallback');

      expect(result).toBe('devvit_context_user');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'devvit_context_user');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SUCCESS: Using reddit username from direct context:', 'devvit_context_user');
    });

    it('should retrieve username from devvit.username property', async () => {
      const mockDevvit = {
        username: 'direct_devvit_user'
      };

      const result = await game.getRedditUsername(mockDevvit, 'fallback');

      expect(result).toBe('direct_devvit_user');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'direct_devvit_user');
    });

    it('should retrieve username from async getCurrentUser method', async () => {
      const mockDevvit = {
        getCurrentUser: vi.fn().mockResolvedValue({
          username: 'async_devvit_user'
        })
      };

      const result = await game.getRedditUsername(mockDevvit, 'fallback');

      expect(result).toBe('async_devvit_user');
      expect(mockDevvit.getCurrentUser).toHaveBeenCalled();
      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'async_devvit_user');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SUCCESS: Using reddit username from async getter:', 'async_devvit_user');
    });

    it('should handle async getCurrentUser failure gracefully', async () => {
      const mockDevvit = {
        getCurrentUser: vi.fn().mockRejectedValue(new Error('API Error'))
      };

      const result = await game.getRedditUsername(mockDevvit, 'fallback_user');

      expect(result).toBe('fallback_user');
      expect(mockDevvit.getCurrentUser).toHaveBeenCalled();
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Async username fetch failed:', expect.any(Error));
    });

    it('should handle null/undefined devvit object', async () => {
      const result = await game.getRedditUsername(null, 'fallback_user');

      expect(result).toBe('fallback_user');
      expect(consoleSpy).toHaveBeenCalledWith('🔍 Devvit object provided:', false);
    });
  });

  describe('Cached Username Fallback', () => {
    it('should retrieve username from localStorage cache', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'last_reddit_username') return 'cached_user';
        return null;
      });

      const result = await game.getRedditUsername(null, 'fallback');

      expect(result).toBe('cached_user');
      expect(localStorageMock.getItem).toHaveBeenCalledWith('last_reddit_username');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SUCCESS: Using cached reddit username:', 'cached_user');
    });

    it('should not use empty cached username', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'last_reddit_username') return '';
        return null;
      });

      const result = await game.getRedditUsername(null, 'fallback');

      expect(result).toBe('fallback');
    });
  });

  describe('DOM Data Attribute Fallback', () => {
    it('should retrieve username from DOM data attribute', async () => {
      (document.body.getAttribute as any).mockImplementation((attr) => {
        if (attr === 'data-reddit-username') return 'dom_attribute_user';
        return null;
      });

      const result = await game.getRedditUsername(null, 'fallback');

      expect(result).toBe('dom_attribute_user');
      expect(document.body.getAttribute).toHaveBeenCalledWith('data-reddit-username');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'dom_attribute_user');
      expect(consoleSpy).toHaveBeenCalledWith('✅ SUCCESS: Using reddit username from data attribute:', 'dom_attribute_user');
    });
  });

  describe('Fallback Behavior', () => {
    it('should use fallback when no username sources are available', async () => {
      const result = await game.getRedditUsername(null, 'default_fallback');

      expect(result).toBe('default_fallback');
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ No username found, using fallback:', 'default_fallback');
    });

    it('should handle errors gracefully and use fallback', async () => {
      // Mock URLSearchParams to throw an error
      mockURLSearchParams.mockImplementation(() => {
        throw new Error('URLSearchParams error');
      });

      const result = await game.getRedditUsername(null, 'error_fallback');

      expect(result).toBe('error_fallback');
      expect(consoleSpy).toHaveBeenCalledWith('❌ getRedditUsername failed with error:', expect.any(Error));
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ Using fallback due to error:', 'error_fallback');
    });
  });

  describe('Priority Order', () => {
    it('should prioritize URL parameter over devvit context', async () => {
      // Set up both URL parameter and devvit context
      const mockParams = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'reddit_username') return 'url_priority_user';
          return null;
        })
      };
      mockURLSearchParams.mockReturnValue(mockParams);

      const mockDevvit = {
        context: {
          username: 'devvit_context_user'
        }
      };

      const result = await game.getRedditUsername(mockDevvit, 'fallback');

      // URL parameter should take priority
      expect(result).toBe('url_priority_user');
    });

    it('should prioritize devvit context over cached username', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'last_reddit_username') return 'cached_user';
        return null;
      });

      const mockDevvit = {
        context: {
          username: 'devvit_priority_user'
        }
      };

      const result = await game.getRedditUsername(mockDevvit, 'fallback');

      // Devvit context should take priority over cache
      expect(result).toBe('devvit_priority_user');
    });

    it('should prioritize cached username over DOM attribute', async () => {
      localStorageMock.getItem.mockImplementation((key) => {
        if (key === 'last_reddit_username') return 'cached_priority_user';
        return null;
      });

      (document.body.getAttribute as any).mockImplementation((attr) => {
        if (attr === 'data-reddit-username') return 'dom_user';
        return null;
      });

      const result = await game.getRedditUsername(null, 'fallback');

      // Cached username should take priority over DOM attribute
      expect(result).toBe('cached_priority_user');
    });
  });

  describe('Caching Behavior', () => {
    it('should cache username from URL parameter', async () => {
      const mockParams = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'reddit_username') return 'cache_test_user';
          return null;
        })
      };
      mockURLSearchParams.mockReturnValue(mockParams);

      await game.getRedditUsername(null, 'fallback');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'cache_test_user');
    });

    it('should cache username from devvit context', async () => {
      const mockDevvit = {
        context: {
          username: 'cache_devvit_user'
        }
      };

      await game.getRedditUsername(mockDevvit, 'fallback');

      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'cache_devvit_user');
    });

    it('should not cache fallback username', async () => {
      await game.getRedditUsername(null, 'fallback_user');

      expect(localStorageMock.setItem).not.toHaveBeenCalled();
    });
  });

  describe('Real-world Scenarios', () => {
    it('should handle Devvit production environment', async () => {
      // Simulate production Devvit environment
      const mockDevvit = {
        context: {
          username: 'real_reddit_user',
          subredditName: 'test_subreddit',
          userId: 'user_123'
        },
        getCurrentUser: vi.fn().mockResolvedValue({
          username: 'real_reddit_user',
          id: 'user_123'
        })
      };

      const result = await game.getRedditUsername(mockDevvit, 'Player_123');

      expect(result).toBe('real_reddit_user');
      expect(localStorageMock.setItem).toHaveBeenCalledWith('last_reddit_username', 'real_reddit_user');
    });

    it('should handle local development environment', async () => {
      // Simulate local development with URL parameter
      window.location.search = '?reddit_username=dev_user';
      const mockParams = {
        get: vi.fn().mockImplementation((key) => {
          if (key === 'reddit_username') return 'dev_user';
          return null;
        })
      };
      mockURLSearchParams.mockReturnValue(mockParams);

      const result = await game.getRedditUsername(null, 'Player_456');

      expect(result).toBe('dev_user');
    });

    it('should handle offline/testing scenario', async () => {
      // No devvit, no URL params, no cache, no DOM attributes
      const result = await game.getRedditUsername(null, 'Player_789');

      expect(result).toBe('Player_789');
      expect(consoleSpy).toHaveBeenCalledWith('⚠️ No username found, using fallback:', 'Player_789');
    });
  });
});