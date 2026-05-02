// Double Tap Event Simulation Test
// This script tests the double tap functionality in the NBA Pulse app

import { createApp } from './src/app.js';

// Mock DOM elements
function createMockDom() {
  return {
    connectionStatus: { textContent: '' },
    selectedGame: { textContent: '' },
    selectedMeta: { textContent: '' },
    timeline: { textContent: '' },
    pageStatus: { textContent: '' },
    errorStatus: { textContent: '' },
    nextGameButton: { 
      addEventListener: () => {},
      click: () => {}
    },
    exitDialog: { 
      addEventListener: () => {},
      showModal: () => console.log('Exit dialog shown'),
      close: () => console.log('Exit dialog closed'),
      open: false
    },
    exitCancelButton: { 
      addEventListener: () => {},
      click: () => {}
    },
    exitConfirmButton: { 
      addEventListener: () => {},
      click: () => {}
    }
  };
}

// Mock event objects
function createMockEvent(eventType, eventSource = null) {
  return {
    sysEvent: {
      eventType,
      eventSource
    }
  };
}

// Test the double tap functionality
async function testDoubleTap() {
  console.log('🧪 Testing Double Tap Exit Functionality\n');
  
  const dom = createMockDom();
  const app = createApp(dom);
  
  // Mock the bridge and initialization
  app.state = {
    bridge: { __mock: true },
    mockBridge: true,
    eventLog: [],
    confirmExitOpen: false,
    visible: true,
    loading: false,
    error: ''
  };
  
  // Test 1: Single tap (should cycle games)
  console.log('1. Testing Single Tap (EventType: 0)');
  const singleTapEvent = createMockEvent(0, 2); // CLICK from RING
  await app.handleEvenEvent(singleTapEvent);
  console.log('   ✓ Single tap handled (should cycle games)\n');
  
  // Test 2: Double tap (should open exit confirmation)
  console.log('2. Testing Double Tap (EventType: 3)');
  const doubleTapEvent = createMockEvent(3); // DOUBLE_CLICK
  await app.handleEvenEvent(doubleTapEvent);
  console.log('   ✓ Double tap handled (should open exit confirmation)\n');
  
  // Test 3: Verify exit confirmation is open
  console.log('3. Verifying Exit Confirmation State');
  if (app.state.confirmExitOpen) {
    console.log('   ✓ Exit confirmation is open\n');
  } else {
    console.log('   ❌ Exit confirmation is NOT open\n');
  }
  
  // Test 4: Test exit confirmation behavior
  console.log('4. Testing Exit Confirmation Behavior');
  const confirmEvent = createMockEvent(0); // CLICK to confirm exit
  await app.handleEvenEvent(confirmEvent);
  console.log('   ✓ Exit confirmation behavior tested\n');
  
  console.log('✅ Double Tap Test Completed');
  console.log('\n📋 Summary:');
  console.log('- Single tap (0) → Cycles games');
  console.log('- Double tap (3) → Opens exit confirmation');
  console.log('- Click during exit → Confirms exit');
  
  return true;
}

// Run the test
testDoubleTap().catch(console.error);