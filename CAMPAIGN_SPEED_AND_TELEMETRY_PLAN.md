# Campaign Mode Speed & Telemetry Analysis Plan

## 📊 User Feedback Summary

1. **Campaign Mode is Too Slow**
   - Getting bored playing
   - Still on Level 1 in Campaign while could be on Level 9 in Classic
   - Classic mode is more fun because it's faster

2. **Telemetry Check**
   - Did telemetry work?
   - Can we see gaming behavior from the test session?

---

## 🔍 Speed Analysis

### Current Speed Comparison

**Campaign Mode (EnhancedGame.ts)**:
- Base: `dropInterval = 1000ms` (1 second)
- Formula: `Math.max(200, dropInterval - (level * 50))`
- Level 1: 1000ms
- Level 2: 950ms  
- Level 5: 750ms
- Level 10: 500ms

**Classic Mode (Game.ts)**:
- Base: `dropInterval = 800ms` (0.8 seconds) 
- Formula: `Math.max(1000 - (level * 100), 100)`
- Level 1: ~800ms
- Level 2: ~700ms
- Level 5: ~400ms
- Level 9: ~200ms (minimum)

**Key Issues**:
1. Campaign starts 25% slower (1000ms vs 800ms)
2. Campaign speeds up half as fast (-50ms/level vs -100ms/level)
3. SeasonalLevel.baseDropTime exists (1200ms, 1100ms, 1000ms) but may not be used
4. Campaign reaches minimum speed much later (Level 20 vs Level 9)

---

## 🎯 Speed Improvement Plan

### Recommended Solution: Match Classic Mode Speed Curve

**Option 1: Quick Fix - Match Classic Exactly**
- Change base from 1000ms → 800ms
- Change ramp from -50ms/level → -100ms/level
- **Pros**: Simple, proven (Classic mode works)
- **Cons**: May be too fast for story-focused Campaign

**Option 2: Balanced - Slightly Faster Than Classic** ⭐ RECOMMENDED
- Change base from 1000ms → 700ms (30% faster)
- Change ramp from -50ms/level → -80ms/level
- Keep minimum at 200ms
- **Pros**: Faster and engaging, still maintains Campaign feel
- **Cons**: Need to test water mechanics balance

**Option 3: Use SeasonalLevel.baseDropTime**
- Check if SeasonalLevel.baseDropTime is being used
- If not, integrate it into drop speed calculation
- **Pros**: Respects level design intentions
- **Cons**: Those values (1200ms, 1100ms) are even SLOWER - need to reduce them

### Recommended: Option 2
- Makes Campaign mode faster and more engaging
- Keeps it distinct from Classic (slightly slower, more thoughtful)
- Easier to implement and test

---

## 📈 Telemetry Analysis Plan

### How to Check Telemetry Data

**Method 1: Browser Console (If Debugger Available)**
- Open DevTools Console
- Check for telemetry debugger object
- Call methods to inspect data

**Method 2: localStorage Inspection** (Most Reliable)
1. Open Browser DevTools (F12)
2. Go to Application tab (Chrome) or Storage tab (Firefox)
3. Expand localStorage
4. Find key: `dam-attack:player-profile`
5. Inspect JSON data

**What to Look For**:
- `sessionId`: Unique session identifier
- `events`: Array of telemetry events
- `levelSummaries`: Level data with traits
- `aggregatedTraits`: Calculated player traits

### Expected Telemetry Data Structure

```json
{
  "profileId": "profile-...",
  "totalSessions": 1,
  "aggregatedTraits": {
    "risk_taking": 0.5-1.0,
    "precision": 0.0-1.0,
    "recovery": 0.0-1.0,
    "pattern_mastery": 0.0-1.0,
    ...
  },
  "recentLevelSummaries": [
    {
      "level": 1,
      "piecesPlaced": 50-100,
      "linesCleared": 5-10,
      "traits": { ... }
    }
  ]
}
```

---

## 🔧 Implementation Plan

### Phase 1: Speed Improvement (Priority 1)

**Steps**:
1. **Analyze current speed system**
   - [ ] Check if SeasonalLevel.baseDropTime is used
   - [ ] Verify current drop interval calculation
   - [ ] Compare with Classic mode speed

2. **Implement speed increase**
   - [ ] Change base dropInterval: 1000ms → 700ms
   - [ ] Change speed ramp: -50ms/level → -80ms/level  
   - [ ] Keep minimum at 200ms
   - [ ] Test speed feels right

3. **Optional: Use SeasonalLevel.baseDropTime**
   - [ ] Check if it's currently used
   - [ ] If used, reduce baseDropTime values in SeasonalManager
   - [ ] If not used, consider integrating it

4. **Test & Validate**
   - [ ] Play Level 1 - should feel faster
   - [ ] Compare to Classic mode
   - [ ] Check water mechanics still balanced
   - [ ] Verify level completion feels good

### Phase 2: Telemetry Verification (Priority 2)

**Steps**:
1. **Check if data exists**
   - [ ] Inspect localStorage for player profile
   - [ ] Verify events were recorded
   - [ ] Check level summaries exist
   - [ ] Verify traits were calculated

2. **Analyze collected data**
   - [ ] Review event counts (should have many piece_placed events)
   - [ ] Check level summary statistics
   - [ ] Review calculated traits
   - [ ] Compare actual gameplay time with telemetry

3. **Debug if needed**
   - [ ] If no data: Check console for errors
   - [ ] If partial data: Check event recording hooks
   - [ ] If traits not calculated: Check trait calculation logic

---

## 📋 Decision Points

### Speed Improvement
- **Question**: Use SeasonalLevel.baseDropTime or override with fixed values?
- **Decision**: Need to check if baseDropTime is currently used
- **Action**: If used, reduce those values. If not, use fixed faster values.

### Telemetry
- **Question**: Did telemetry work in the test session?
- **Decision**: Need to check localStorage to verify
- **Action**: Inspect data, analyze behavior patterns, report findings

---

## ✅ Success Criteria

### Speed Improvement
- [ ] Campaign Level 1 feels engaging (not boring)
- [ ] Speed progression feels natural
- [ ] Comparable to Classic mode speed (within 20%)
- [ ] Water mechanics still balanced
- [ ] Level completion feels achievable

### Telemetry Verification
- [ ] Data exists in localStorage
- [ ] Events were recorded (piece_placed, line_cleared, etc.)
- [ ] Level summaries exist
- [ ] Traits were calculated
- [ ] Data structure matches expected format

---

## 🎯 Next Steps

1. **First**: Check telemetry data to verify it worked
2. **Then**: Implement speed improvements
3. **Finally**: Test both speed and telemetry together

**Ready to proceed with implementation?** 🚀
