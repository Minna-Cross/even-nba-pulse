import { CONTAINERS, DISPLAY } from './lib/constants.js';

export async function connectEvenBridge() {
  const hasNativeBridge = Boolean(window.flutter_inappwebview?.callHandler);

  if (!hasNativeBridge) {
    return {
      bridge: createMockBridge(),
      mockBridge: true
    };
  }

  try {
    const sdk = await import('@evenrealities/even_hub_sdk');
    const bridge = await sdk.waitForEvenAppBridge();
    return { bridge, mockBridge: false };
  } catch (error) {
    console.warn('Falling back to mock bridge', error);
    return {
      bridge: createMockBridge(),
      mockBridge: true
    };
  }
}

export async function pushGlassesView(bridge, started, view) {
  if (!bridge || bridge.__mock) return started;

  if (!started) {
    const result = await bridge.createStartUpPageContainer({
      containerTotalNum: 4,
      textObject: [
        visibleContainer(CONTAINERS.header, 0, 0, DISPLAY.width, 58, view.header, 0),
        visibleContainer(CONTAINERS.body, 0, 58, DISPLAY.width, 198, view.body, 0),
        visibleContainer(CONTAINERS.footer, 0, 256, DISPLAY.width, 32, view.footer, 0),
        captureContainer()
      ]
    });

    if (result !== 0) {
      throw new Error(`createStartUpPageContainer failed with code ${result}`);
    }

    return true;
  }

  await bridge.textContainerUpgrade({
    containerID: CONTAINERS.header.id,
    containerName: CONTAINERS.header.name,
    contentOffset: 0,
    contentLength: 2000,
    content: view.header
  });

  await bridge.textContainerUpgrade({
    containerID: CONTAINERS.body.id,
    containerName: CONTAINERS.body.name,
    contentOffset: 0,
    contentLength: 2000,
    content: view.body
  });

  await bridge.textContainerUpgrade({
    containerID: CONTAINERS.footer.id,
    containerName: CONTAINERS.footer.name,
    contentOffset: 0,
    contentLength: 2000,
    content: view.footer
  });

  return true;
}

export function subscribeToEvenEvents(bridge, onEvent) {
  if (!bridge || bridge.__mock || typeof bridge.onEvenHubEvent !== 'function') {
    return () => {};
  }

  return bridge.onEvenHubEvent(onEvent);
}

function visibleContainer(container, x, y, width, height, content, capture) {
  return {
    xPosition: x,
    yPosition: y,
    width,
    height,
    borderWidth: 0,
    borderColor: 5,
    paddingLength: 2,
    containerID: container.id,
    containerName: container.name,
    content,
    isEventCapture: capture
  };
}

function captureContainer() {
  return {
    xPosition: 0,
    yPosition: 0,
    width: DISPLAY.width,
    height: DISPLAY.height,
    borderWidth: 0,
    borderColor: 0,
    paddingLength: 0,
    containerID: CONTAINERS.capture.id,
    containerName: CONTAINERS.capture.name,
    content: ' ',
    isEventCapture: 1
  };
}

function createMockBridge() {
  return {
    __mock: true,
    async createStartUpPageContainer() {
      return 0;
    },
    async textContainerUpgrade() {
      return true;
    },
    onEvenHubEvent() {
      return () => {};
    }
  };
}
