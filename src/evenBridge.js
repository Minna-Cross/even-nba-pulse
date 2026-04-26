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
  const safeView = sanitizeBridgeView(view);

  if (!started) {
    const payload = {
      containerTotalNum: 4,
      textObject: [
        visibleContainer(CONTAINERS.header, 0, 0, DISPLAY.width, 58, safeView.header, 0),
        visibleContainer(CONTAINERS.body, 0, 58, DISPLAY.width, 198, safeView.body, 0),
        visibleContainer(CONTAINERS.footer, 0, 256, DISPLAY.width, 32, safeView.footer, 0),
        captureContainer()
      ]
    };
    const result = await bridge.createStartUpPageContainer(payload);

    if (result !== 0) {
      throw new Error(
        `createStartUpPageContainer failed with code ${result}. ` +
          'Try shortening text content and confirm container geometry matches your device profile.'
      );
    }

    return true;
  }

  await upgradeTextContainer(bridge, CONTAINERS.header, safeView.header);
  await upgradeTextContainer(bridge, CONTAINERS.body, safeView.body);
  await upgradeTextContainer(bridge, CONTAINERS.footer, safeView.footer);

  return true;
}

async function upgradeTextContainer(bridge, container, content) {
  const result = await bridge.textContainerUpgrade({
    containerID: container.id,
    containerName: container.name,
    contentOffset: 0,
    contentLength: 2000,
    content
  });

  if (typeof result === 'number' && result !== 0) {
    throw new Error(`textContainerUpgrade failed for ${container.name} with code ${result}`);
  }
}

function sanitizeBridgeView(view) {
  return {
    header: sanitizeBridgeText(view.header, 400),
    body: sanitizeBridgeText(view.body, 1500),
    footer: sanitizeBridgeText(view.footer, 220)
  };
}

function sanitizeBridgeText(text, maxLength) {
  const safeText = String(text ?? '')
    .replace(/•/g, '-')
    .replace(/[^\x09\x0A\x0D\x20-\x7E]/g, '')
    .trim();

  if (safeText.length <= maxLength) return safeText;

  return `${safeText.slice(0, Math.max(0, maxLength - 1))}…`;
}

function visibleContainer(container, x, y, width, height, content, capture) {
  return {
    xPosition: x,
    yPosition: y,
    width,
    height,
    borderWidth: 0,
    borderColor: 5,
    borderRadius: 0,
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
    borderRadius: 0,
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

export function subscribeToEvenEvents(bridge, onEvent) {
  if (!bridge || bridge.__mock || typeof bridge.onEvenHubEvent !== 'function') {
    return () => {};
  }

  return bridge.onEvenHubEvent(onEvent);
}
