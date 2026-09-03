import type { DpeInput, HeatingEquipment, HousingType, OwnerStatus, RouteOutcome } from './types';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_FCU_API_BASE_URL ?? 'http://localhost:3000';
const TRACKING_ENDPOINT_URL = `${DEFAULT_API_BASE_URL}/api/pac/events`;

export const SIMULATEUR_PAC_EVENT_NAMES = [
  'simulateur_pac:form_started',
  'simulateur_pac:results_requested',
  'simulateur_pac:france_renov_coordinates_requested',
  'simulateur_pac:france_renov_external_link_clicked',
  'simulateur_pac:fcu_outbound_link_clicked',
] as const;

export type SimulateurPacEventName = (typeof SIMULATEUR_PAC_EVENT_NAMES)[number];

export type SimulateurPacEventProperties = {
  current_step?: number;
  department_code?: string;
  dpe?: DpeInput;
  heating_equipment?: HeatingEquipment;
  housing_type?: HousingType;
  link_name?: string;
  owner_status?: OwnerStatus;
  referrer_host?: string;
  route_outcome?: RouteOutcome;
  source_host?: string;
  source_path?: string;
};

type SimulateurPacEventPayload = {
  distinctId: string;
  event: SimulateurPacEventName;
  properties: SimulateurPacEventProperties;
};

type TrackSimulateurPacEventOptions = {
  enableInTest?: boolean;
};

let distinctId: string | null = null;

/**
 * Sends anonymous PAC simulator analytics to the FCU backend.
 */
export function trackSimulateurPacEvent(
  event: SimulateurPacEventName,
  properties: SimulateurPacEventProperties = {},
  options: TrackSimulateurPacEventOptions = {}
) {
  if (import.meta.env.MODE === 'test' && !options.enableInTest) {
    return;
  }

  const payload = JSON.stringify(createSimulateurPacEventPayload(event, properties));

  sendWithFetch(payload);
}

/**
 * Exposed for focused tests; production code should call trackSimulateurPacEvent.
 */
export function createSimulateurPacEventPayload(
  event: SimulateurPacEventName,
  properties: SimulateurPacEventProperties = {}
): SimulateurPacEventPayload {
  return {
    distinctId: getDistinctId(),
    event,
    properties: {
      ...getBrowserTrackingProperties(),
      ...properties,
    },
  };
}

/**
 * Resets module state for tests that need deterministic isolation.
 */
export function resetSimulateurPacTrackingForTests() {
  distinctId = null;
}

function getDistinctId() {
  if (!distinctId) {
    distinctId = createDistinctId();
  }

  return distinctId;
}

function createDistinctId() {
  if (typeof crypto === 'object' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }

  return `simulateur-pac-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getBrowserTrackingProperties(): SimulateurPacEventProperties {
  if (typeof window !== 'object') {
    return {};
  }

  return {
    referrer_host: getHttpUrl(document.referrer)?.hostname,
    source_host: window.location.hostname || undefined,
    source_path: window.location.pathname || undefined,
  };
}

function getHttpUrl(rawUrl: string) {
  try {
    const baseUrl = typeof window === 'object' ? window.location.href : undefined;
    const parsedUrl = baseUrl ? new URL(rawUrl, baseUrl) : new URL(rawUrl);

    return parsedUrl.protocol === 'http:' || parsedUrl.protocol === 'https:' ? parsedUrl : null;
  } catch {
    return null;
  }
}

function sendWithFetch(payload: string) {
  if (typeof fetch !== 'function') {
    return;
  }

  void fetch(TRACKING_ENDPOINT_URL, {
    body: payload,
    headers: {
      'Content-Type': 'application/json',
    },
    keepalive: true,
    method: 'POST',
  }).catch(() => undefined);
}
