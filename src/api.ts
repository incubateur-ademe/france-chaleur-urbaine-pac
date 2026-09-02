import type { FranceRenovSpace, IncomeOption, LocationSuggestion, SimulationFormState, SimulationResult } from './types';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_FCU_API_BASE_URL ?? 'http://localhost:3000';

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
  return postJson<FranceRenovSpace | null>(
    `${DEFAULT_API_BASE_URL}/api/pac/france-renov-space`,
    {
      cityCode: citycode,
    },
    signal
  );
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
