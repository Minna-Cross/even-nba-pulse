# Double Tap Exit Fix - Even Realities NBA Pulse

## Problem Statement

The current implementation has inconsistent exit behavior between ring gestures and expected user experience. The design requires double tap to exit, but the ring hardware may be mapping this to long press instead.

## Current Event Mapping

Based on Even Hub SDK documentation:

```typescript
declare enum OsEventTypeList {
    CLICK_EVENT = 0,        // Single tap/click
    SCROLL_TOP_EVENT = 1,   // Scroll up
    SCROLL_BOTTOM_EVENT = 2,// Scroll down
    DOUBLE_CLICK_EVENT = 3, // Double tap (should exit)
    FOREGROUND_ENTER_EVENT = 4,
    FOREGROUND_EXIT_EVENT = 5,
    ABNORMAL_EXIT_EVENT = 6,
    SYSTEM_EXIT_EVENT = 7,
    IMU_DATA_REPORT = 8
}
```

Touch events from ring/glasses are identified by `eventSource` field:
- `TOUCH_EVENT_FROM_RING` (2)
- `TOUCH_EVENT_FROM_GLASSES_R` (1) 
- `TOUCH_EVENT_FROM_GLASSES_L` (3)

## Critical Bug Fix

**Issue**: Double tap from ring/glasses was not working because of event handling priority.

**Root Cause**: The original code checked for CLICK/touch events BEFORE checking for DOUBLE_CLICK events. Since double taps from hardware have both `eventType: 3` AND `isTouch: true`, they were being caught by the CLICK/touch condition and treated as single taps.

**Solution**: Reordered event handling to check for DOUBLE_CLICK first, before the general CLICK/touch condition.

### Code Changes

**Before (buggy)**:
```javascript
// CLICK/touch handled first → double tap caught here
if (eventType === EVENT.CLICK || isTouch) {
  await nextGame();
  return;
}

// DOUBLE_CLICK never reached for touch events
case EVENT.DOUBLE_CLICK:
  openExitConfirmation();
  break;
```

**After (fixed)**:
```javascript
// DOUBLE_CLICK handled first (even from touch devices)
if (eventType === EVENT.DOUBLE_CLICK) {
  console.log('[DOUBLE-TAP] Opening exit confirmation');
  openExitConfirmation();
  return;
}

// Then handle CLICK/touch events
if (eventType === EVENT.CLICK || isTouch) {
  await nextGame();
  return;
}
```

## Files Modified

- `src/app.js` - Enhanced event handling and debugging
- `double-tap-fix.patch` - Complete patch file for reference

## Branch
`fix/double-tap-exit`

This fix provides the foundation for proper double tap exit functionality while maintaining full backward compatibility and adding comprehensive debugging to identify any hardware-specific issues.
