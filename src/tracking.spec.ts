import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createSimulateurPacEventPayload, resetSimulateurPacTrackingForTests, trackSimulateurPacEvent } from './tracking';

describe('PAC simulator tracking', () => {
  beforeEach(() => {
    resetSimulateurPacTrackingForTests();
    window.history.replaceState(null, '', '/host-page?private=value');
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('keeps tracking disabled in test mode by default', () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);

    trackSimulateurPacEvent('simulateur_pac:form_started', { current_step: 0 });

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('sends whitelisted events with page context through fetch keepalive', () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response());
    vi.stubGlobal('fetch', fetchMock);

    trackSimulateurPacEvent(
      'simulateur_pac:results_requested',
      {
        current_step: 8,
        department_code: '75',
      },
      { enableInTest: true }
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining('/api/pac/events'),
      expect.objectContaining({
        headers: {
          'Content-Type': 'application/json',
        },
        keepalive: true,
        method: 'POST',
      })
    );

    const fetchBody = fetchMock.mock.calls[0]?.[1]?.body;
    if (typeof fetchBody !== 'string') {
      throw new Error('Expected tracking payload to be sent as JSON');
    }

    const payload = JSON.parse(fetchBody);
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
