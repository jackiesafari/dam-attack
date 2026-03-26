# Telemetry Testing Guide - Phase 1

## 🧪 Testing the Telemetry System

This guide explains how to test the telemetry foundation that was implemented in Phase 1.

---

## 🚀 Quick Start Testing

### 1. Run the Game

```bash
cd dam-attack
npm run dev
```

Or build and run:
```bash
npm run build
# Then run your devvit playtest or local server
```

### 2. Start Campaign Mode

- Navigate to Campaign Mode in the game
- Play through at least one level (complete or fail)
- The telemetry system will automatically collect data

---

## 🔍 Checking Telemetry Data

### Method 1: Browser Console (Recommended)

1. **Open Browser DevTools** (F12 or Cmd+Option+I)
2. **Navigate to Console tab**
3. **Access the telemetry debugger** (if exposed - see below)

### Method 2: localStorage Inspection

1. **Open Browser DevTools**
2. **Navigate to Application tab** (Chrome) or **Storage tab** (Firefox)
3. **Expand localStorage**
4. **Find key**: `dam-attack:player-profile`
5. **View the stored data** (JSON format)

### Method 3: Console Logging

The telemetry system includes console logging. Check the console for:
- Event recording messages (if enabled)
- Error messages (if any issues occur)

---

## 📊 What to Look For

### After Playing a Level:

1. **Level Summary Should Include:**
   - `piecesPlaced` > 0
   - `linesCleared` >= 0
   - `maxStackHeight` > 0
   - `timeElapsed` > 0
   - `traits` object with 8 traits (all 0-1 values)

2. **Session Data Should Include:**
   - `sessionId` (unique string)
   - `events` array (with event objects)
   - `levelSummaries` map (with level data)

3. **Player Profile Should Include:**
   - `totalSessions` >= 1
   - `aggregatedTraits` (8 traits)
   - `lastUpdated` timestamp

---

## ✅ Expected Events

During normal gameplay, you should see these events recorded:

1. **level_start** - When level begins
2. **piece_placed** - Every piece placement (many events)
3. **line_cleared** - Every line clear
4. **stack_height_change** - Every 10 pieces
5. **near_death** - If stack gets high (optional)
6. **recovery** - If player recovers from danger (optional)
7. **level_end** - When level ends
8. **death** - If player fails (optional)

---

## 🐛 Troubleshooting

### No Data in localStorage?

- **Check**: Make sure you're playing Campaign Mode (not Classic Mode)
- **Check**: Play through at least one level (don't just start and quit)
- **Check**: Browser console for errors
- **Check**: localStorage is enabled in browser

### Traits All 0.5?

- This is expected for the first level
- Traits need data to calculate (holes, recoveries, etc.)
- Play more levels to see trait variations

### Events Not Recording?

- **Check**: Browser console for errors
- **Check**: TelemetryCollector is initialized (should happen automatically)
- **Check**: You're in Campaign Mode (`EnhancedGame` scene)

### localStorage Errors?

- **Check**: localStorage quota (shouldn't be an issue, but check)
- **Check**: Browser privacy settings (some browsers block localStorage)
- **Check**: Incognito/Private mode (localStorage works but data is cleared)

---

## 📝 Manual Testing Checklist

- [ ] Start Campaign Mode
- [ ] Play through Level 1
- [ ] Complete or fail the level
- [ ] Check localStorage for `dam-attack:player-profile`
- [ ] Verify player profile exists
- [ ] Check level summary data
- [ ] Verify traits are calculated (not all 0.5)
- [ ] Play multiple levels
- [ ] Verify session data accumulates
- [ ] Check event counts (should have many `piece_placed` events)

---

## 🔬 Advanced Testing

### Testing Specific Traits

To test specific traits, intentionally play in certain ways:

1. **Precision**: Try to avoid holes (high precision) or create many holes (low precision)
2. **Risk Taking**: Keep stack low (low risk) or let it get high (high risk)
3. **Recovery**: Let stack get high then recover (should record recovery)
4. **Pattern Mastery**: Try to get tetris clears (high pattern mastery)
5. **Planning Ahead**: Set up multi-line clears (high planning)
6. **Piece Efficiency**: Clear many lines with few pieces (high efficiency)

### Testing Event Recording

1. **Play normally** - Should see piece_placed, line_cleared events
2. **Let stack get high** - Should see near_death event
3. **Recover** - Should see recovery event
4. **Complete level** - Should see level_end event
5. **Fail level** - Should see death and level_end events

---

## 📈 Expected Data Structure

### Player Profile (localStorage)
```json
{
  "profileId": "profile-...",
  "createdAt": 1234567890,
  "lastUpdated": 1234567890,
  "totalSessions": 1,
  "totalLevelsCompleted": 0,
  "aggregatedTraits": {
    "risk_taking": 0.5,
    "recovery": 0.5,
    "precision": 0.5,
    "pattern_mastery": 0.5,
    "speed_tolerance": 0.5,
    "planning_ahead": 0.5,
    "piece_efficiency": 0.5,
    "adaptation": 0.5
  },
  "recentLevelSummaries": [],
  "sessionHistory": ["session-..."]
}
```

### Level Summary
```json
{
  "level": 1,
  "piecesPlaced": 50,
  "linesCleared": 10,
  "holesCreated": 5,
  "maxStackHeight": 0.75,
  "averageStackHeight": 0.45,
  "nearDeathEvents": 2,
  "successfulRecoveries": 1,
  "singleClears": 8,
  "doubleClears": 1,
  "tripleClears": 1,
  "tetrisClears": 0,
  "plannedClears": 2,
  "timeElapsed": 45000,
  "deaths": 0,
  "traits": {
    "risk_taking": 0.45,
    "recovery": 0.5,
    "precision": 0.9,
    "pattern_mastery": 0.3,
    "speed_tolerance": 0.7,
    "planning_ahead": 0.2,
    "piece_efficiency": 0.2,
    "adaptation": 0.7
  }
}
```

---

## 🎯 Success Criteria

Phase 1 testing is successful if:

- ✅ Events are being recorded during gameplay
- ✅ Data persists in localStorage
- ✅ Level summaries are created
- ✅ Traits are calculated after level ends
- ✅ No console errors related to telemetry
- ✅ Data structure matches expected format
- ✅ Multiple levels can be played and tracked

---

## 🚨 Known Limitations (Phase 1)

1. **Speed Tolerance** - Uses simplified proxy (precision + recovery)
2. **Adaptation** - Uses simplified proxy (precision + recovery)
3. **Hole Detection** - Not yet tracking individual hole creation events
4. **Pattern Setup** - Not yet detecting planned clears (uses heuristic)
5. **No Analytics Dashboard** - Data must be inspected manually (localStorage/console)

These will be improved in later phases.

---

## 📞 Next Steps After Testing

Once testing is complete:

1. **Report any bugs or issues**
2. **Verify data quality** (are traits reasonable?)
3. **Check performance** (does telemetry slow down gameplay?)
4. **Proceed to Phase 2** (Archetype classification)

---

**Happy Testing!** 🎮📊
