import { getDepartmentCode, getSimulationDpe } from './journey';
import type { DpeInput, FormState, IncomeOption, LocationSuggestion, SimulationResult } from './types';

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

type SimulationFormState = FormState & {
  dpe: DpeInput;
  incomeCategory: NonNullable<FormState['incomeCategory']>;
  selectedLocation: LocationSuggestion;
};

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

export async function fetchIncomeOptions(selectedLocation: LocationSuggestion, occupants: number, signal: AbortSignal) {
  const response = await postJson(
    `${DEFAULT_API_BASE_URL}/api/pac/income-options`,
    {
      departmentCode: selectedLocation.departmentCode,
      occupants: Math.floor(occupants),
    },
    signal
  );

  return response.json() as Promise<IncomeOption[]>;
}

export async function fetchHeatingSimulation(formState: SimulationFormState) {
  const response = await postJson(`${DEFAULT_API_BASE_URL}/api/pac/simulation`, {
    departmentCode: formState.selectedLocation.departmentCode,
    dpe: getSimulationDpe(formState.dpe),
    incomeCategory: formState.incomeCategory,
    occupants: Number(formState.occupants),
    surface: Number(formState.surface),
  });

  return response.json() as Promise<SimulationResult>;
}

async function postJson(url: string, body: unknown, signal?: AbortSignal) {
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

  return response;
}

function toLocationSuggestion(feature: BanMunicipalityFeature): LocationSuggestion {
  return {
    city: feature.properties.city,
    departmentCode: getDepartmentCode(feature.properties.postcode),
    label: `${feature.properties.postcode} ${feature.properties.city}`,
    postcode: feature.properties.postcode,
  };
}
