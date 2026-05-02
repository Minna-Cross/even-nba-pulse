// Simple Double Tap Test
// Tests the core event handling logic without DOM dependencies

import { getEvenEventType, isTouchFromRingOrGlasses } from './src/app.js';

// Mock event objects
function createMockEvent(eventType, eventSource = null) {
  return {
    sysEvent: {
      eventType,
      eventSource
    }
  };
}

console.log('🧪 Testing Core Event Handling Logic\n');

// Test 1: Single tap from ring
console.log('1. Single Tap from Ring (EventType: 0, Source: 2)');
const singleTapEvent = createMockEvent(0, 2);
const eventType1 = getEvenEventType(singleTapEvent);
const isTouch1 = isTouchFromRingOrGlasses(singleTapEvent);
console.log(`   EventType: ${eventType1}, IsTouch: ${isTouch1}`);
console.log('   ✓ Should trigger next game\n');

// Test 2: Double tap
console.log('2. Double Tap (EventType: 3)');
const doubleTapEvent = createMockEvent(3);
const eventType2 = getEvenEventType(doubleTapEvent);
const isTouch2 = isTouchFromRingOrGlasses(doubleTapEvent);
console.log(`   EventType: ${eventType2}, IsTouch: ${isTouch2}`);
console.log('   ✓ Should open exit confirmation\n');

// Test 3: Touch from glasses
console.log('3. Touch from Glasses (EventType: 0, Source: 1)');
const glassesEvent = createMockEvent(0, 1);
const eventType3 = getEvenEventType(glassesEvent);
const isTouch3 = isTouchFromRingOrGlasses(glassesEvent);
console.log(`   EventType: ${eventType3}, IsTouch: ${isTouch3}`);
console.log('   ✓ Should trigger next game\n');

// Test 4: System event (should be ignored)
console.log('4. System Event (EventType: 7)');
const systemEvent = createMockEvent(7);
const eventType4 = getEvenEventType(systemEvent);
const isTouch4 = isTouchFromRingOrGlasses(systemEvent);
console.log(`   EventType: ${eventType4}, IsTouch: ${isTouch4}`);
console.log('   ✓ Should be handled appropriately\n');

console.log('✅ Core Event Handling Test Completed');
console.log('\n📋 Event Type Mapping:');
console.log('0: CLICK (Single tap)');
console.log('1: SCROLL_TOP');
console.log('2: SCROLL_BOTTOM');
console.log('3: DOUBLE_CLICK (Double tap)');
console.log('4: FOREGROUND_ENTER');
console.log('5: FOREGROUND_EXIT');
console.log('6: ABNORMAL_EXIT');

console.log('\n📋 Touch Sources:');
console.log('1: GLASSES_R');
console.log('2: RING');
console.log('3: GLASSES_L');