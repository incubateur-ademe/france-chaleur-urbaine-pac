import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSimulateurPacEventPayload, resetSimulateurPacTrackingForTests, trackSimulateurPacEvent } from './tracking';

const originalSendBeacon = navigator.sendBeacon;

describe('PAC simulator tracking', () => {
  beforeEach(() => {
    resetSimulateurPacTrackingForTests();
    window.history.replaceState(null, '', '/host-page?private=value');
  });

  afterEach(() => {
    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: originalSendBeacon,
    });
    vi.unstubAllGlobals();
  });

  it('keeps tracking disabled in test mode by default', () => {
    const sendBeacon = vi.fn((trackingUrl: string | URL, trackingData?: BodyInit | null) => {
      void trackingUrl;
      void trackingData;
      return true;
    });
    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    });

    trackSimulateurPacEvent('simulateur_pac:form_started', { current_step: 0 });

    expect(sendBeacon).not.toHaveBeenCalled();
  });

  it('sends whitelisted events with page context through sendBeacon', async () => {
    const sendBeacon = vi.fn((trackingUrl: string | URL, trackingData?: BodyInit | null) => {
      void trackingUrl;
      void trackingData;
      return true;
    });
    Object.defineProperty(globalThis.navigator, 'sendBeacon', {
      configurable: true,
      value: sendBeacon,
    });

    trackSimulateurPacEvent(
      'simulateur_pac:results_requested',
      {
        current_step: 8,
        department_code: '75',
      },
      { enableInTest: true }
    );

    expect(sendBeacon).toHaveBeenCalledTimes(1);
    const beaconBody = sendBeacon.mock.calls[0]?.[1];
    if (!(beaconBody instanceof Blob)) {
      throw new Error('Expected tracking payload to be sent as a JSON blob');
    }

    const payload = JSON.parse(await beaconBody.text());
    expect(payload).toStrictEqual({
      distinctId: expect.any(String),
      event: 'simulateur_pac:results_requested',
      properties: {
        current_step: 8,
        department_code: '75',
        referrer_host: window.location.hostname,
        source_host: window.location.hostname,
        source_path: '/host-page',
      },
    });
  });

  it('reuses the same anonymous visitor id within the current page lifecycle', () => {
    const firstPayload = createSimulateurPacEventPayload('simulateur_pac:form_started');
    const secondPayload = createSimulateurPacEventPayload('simulateur_pac:results_requested');

    expect(secondPayload.distinctId).toStrictEqual(firstPayload.distinctId);
  });
});
