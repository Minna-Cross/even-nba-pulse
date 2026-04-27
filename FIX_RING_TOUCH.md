# Fix: Ring Touch Navigation Not Working

## Problem

Single tap/click on the Even Realities ring was not triggering "next game" navigation as designed.

## Root Cause

The app incorrectly defined `TOUCH: 7` as an event type, but according to the Even Hub SDK:

```typescript
declare enum OsEventTypeList {
    CLICK_EVENT = 0,
    SCROLL_TOP_EVENT = 1,
    SCROLL_BOTTOM_EVENT = 2,
    DOUBLE_CLICK_EVENT = 3,
    FOREGROUND_ENTER_EVENT = 4,
    FOREGROUND_EXIT_EVENT = 5,
    ABNORMAL_EXIT_EVENT = 6,
    SYSTEM_EXIT_EVENT = 7,  // ← 7 is SYSTEM_EXIT, not TOUCH!
    IMU_DATA_REPORT = 8
}
```

Touch events from the ring and glasses are **not** sent as a separate event type. Instead:
- Ring/glasses taps send `CLICK_EVENT` (eventType: 0)
- The **`eventSource`** field in `sysEvent` identifies the touch origin:
  - `TOUCH_EVENT_FROM_RING` (2)
  - `TOUCH_EVENT_FROM_GLASSES_R` (1)
  - `TOUCH_EVENT_FROM_GLASSES_L` (3)

The app was only checking `eventType`, missing the `eventSource` field that identifies touch inputs.

## Solution

Added `isTouchFromRingOrGlasses()` function to detect touch events via `eventSource`:

```javascript
const TOUCH_SOURCE = {
  DUMMY_NULL: 0,
  GLASSES_R: 1,
  RING: 2,
  GLASSES_L: 3
};

export function isTouchFromRingOrGlasses(event) {
  const sysEvent = event?.sysEvent;
  const eventSource = sysEvent?.eventSource;
  return eventSource === TOUCH_SOURCE.RING || 
         eventSource === TOUCH_SOURCE.GLASSES_R || 
         eventSource === TOUCH_SOURCE.GLASSES_L;
}
```

Updated event handler to treat touch from ring/glasses the same as CLICK:

```javascript
async function handleEvenEvent(event) {
  const eventType = getEvenEventType(event);
  const isTouch = isTouchFromRingOrGlasses(event);
  
  // Normal mode: CLICK or touch from ring/glasses triggers next game
  if (eventType === EVENT.CLICK || isTouch) {
    await nextGame();
    return;
  }
  // ... rest of handler
}
```

## Changes

- **src/app.js**: 
  - Removed incorrect `TOUCH: 7` from EVENT enum
  - Added `TOUCH_SOURCE` constant
  - Added `isTouchFromRingOrGlasses()` export
  - Updated `handleEvenEvent()` to check both `eventType` and `eventSource`
  - Added debug logging: `console.log("[EVENT] Code:", c, "Touch:", p, ...)`

- **dist/**: Rebuilt with fix
- **even-nba-pulse.ehpk**: Repackaged with fix

## Testing

On hardware, verify:
- [ ] Ring single tap → cycles to next game
- [ ] Glasses touch (left/right) → cycles to next game
- [ ] Simulator click → still works (uses CLICK_EVENT)
- [ ] Exit confirmation: touch from ring confirms exit
- [ ] Debug logs show `Touch: true` for ring/glasses input

## Branch

`fix/ring-touch-navigation`

Pull request: https://github.com/Minna-Cross/even-nba-pulse/pull/new/fix/ring-touch-navigation
