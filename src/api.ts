import type { FranceRenovSpace, IncomeOption, LocationSuggestion, SimulationFormState, SimulationResult } from './types';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_FCU_API_BASE_URL ?? 'http://localhost:3000';
const FRANCE_RENOV_SPACES_RESOURCE_ID = 'bc99b9d4-1b70-48e1-9958-98cceacd0c93';

type BanMunicipalityFeature = {
  geometry: {
    coordinates: [number, number];
  };
  properties: {
    city: string;
    citycode: string;
    context: string;
    label: string;
    postcode: string;
  };
};

type FranceRenovSpaceRow = {
  'Adresse Structure': string;
  'Code Postal Structure': string;
  'Commune Structure': string;
  'Email Structure': string;
  'Nom Structure': string;
  'Site Internet Structure': string | null;
  'Telephone Structure': string;
  'Telephone 2 Structure': string | null;
};

type HeatingSimulationApiResult = Omit<SimulationResult, 'heatPumpNetPrice'>;

export async function searchMunicipalities(location: string, signal: AbortSignal) {
  const response = await fetch(
    `https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(location)}&type=municipality&autocomplete=1&limit=5`,
    {
      signal,
    }
  );

  if (!response.ok) {
    throw new Error('Location search failed');
  }

  const data = (await response.json()) as { features: BanMunicipalityFeature[] };

  return data.features.map(toLocationSuggestion);
}

export async function fetchFranceRenovSpace(citycode: string, signal: AbortSignal) {
  const searchParams = new URLSearchParams({
    'Code Insee Commune__exact': citycode,
    page_size: '1',
  });

  const response = await fetch(`https://tabular-api.data.gouv.fr/api/resources/${FRANCE_RENOV_SPACES_RESOURCE_ID}/data/?${searchParams}`, {
    signal,
  });

  if (!response.ok) {
    throw new Error('France Rénov space search failed');
  }

  const result = (await response.json()) as { data: FranceRenovSpaceRow[] };

  return result.data[0] ? toFranceRenovSpace(result.data[0]) : null;
}

export async function fetchIncomeOptions(selectedLocation: LocationSuggestion, occupants: number, signal: AbortSignal) {
  return postJson<IncomeOption[]>(
    `${DEFAULT_API_BASE_URL}/api/pac/income-options`,
    {
      departmentCode: selectedLocation.departmentCode,
      occupants: Math.floor(occupants),
    },
    signal
  );
}

export async function fetchHeatingSimulation(formState: SimulationFormState) {
  const result = await postJson<HeatingSimulationApiResult>(`${DEFAULT_API_BASE_URL}/api/pac/simulation`, {
    departmentCode: formState.selectedLocation.departmentCode,
    dpe: formState.dpe === 'unknown' ? 'D' : formState.dpe,
    incomeCategory: formState.incomeCategory,
    occupants: Number(formState.occupants),
    surface: Number(formState.surface),
  });

  return {
    ...result,
    heatPumpNetPrice: Math.max(0, result.heatPumpGrossPrice - result.heatPumpMaprimerenovAid - result.heatPumpCoupDePouce),
  } satisfies SimulationResult;
}

async function postJson<TResponse>(url: string, body: unknown, signal?: AbortSignal) {
  const response = await fetch(url, {
    body: JSON.stringify(body),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal,
  });

  if (!response.ok) {
    throw new Error('API request failed');
  }

  return response.json() as Promise<TResponse>;
}

function toLocationSuggestion(feature: BanMunicipalityFeature): LocationSuggestion {
  return {
    city: feature.properties.city,
    citycode: feature.properties.citycode,
    departmentCode: feature.properties.postcode.slice(0, 2),
    label: `${feature.properties.postcode} ${feature.properties.city}`,
    postcode: feature.properties.postcode,
  };
}

function toFranceRenovSpace(row: FranceRenovSpaceRow): FranceRenovSpace {
  return {
    address: row['Adresse Structure'].trim(),
    city: row['Commune Structure'],
    email: row['Email Structure'],
    name: row['Nom Structure'],
    phone: row['Telephone Structure'],
    secondaryPhone: row['Telephone 2 Structure'],
    website: row['Site Internet Structure'],
    zipcode: row['Code Postal Structure'],
  };
}
