import {
  DPE_VALUES,
  type FormState,
  HEATING_EQUIPMENT_VALUES,
  HOUSING_TYPE_VALUES,
  INCOME_CATEGORY_VALUES,
  type LocationSuggestion,
  OWNER_STATUS_VALUES,
  type RouteOutcome,
} from './types';

export const INTRO_STEP = 0;
export const RESULT_STEP = 9;

export const INITIAL_FORM_STATE = {
  dpe: null,
  heatingEquipment: null,
  housingType: null,
  incomeCategory: null,
  location: '',
  occupants: '2',
  ownerStatus: null,
  selectedLocation: null,
  surface: '90',
} satisfies FormState;

export function getInitialJourneyState() {
  const searchParams = new URLSearchParams(window.location.search);
  const selectedLocation = getInitialSelectedLocation(searchParams);
  const formState = {
    ...INITIAL_FORM_STATE,
    dpe: getSearchParamValue(searchParams, 'dpe', DPE_VALUES),
    heatingEquipment: getSearchParamValue(searchParams, 'equipment', HEATING_EQUIPMENT_VALUES),
    housingType: getSearchParamValue(searchParams, 'housing', HOUSING_TYPE_VALUES),
    incomeCategory: getSearchParamValue(searchParams, 'incomeCategory', INCOME_CATEGORY_VALUES),
    location: searchParams.get('location') ?? searchParams.get('address') ?? INITIAL_FORM_STATE.location,
    occupants: searchParams.get('occupants') ?? INITIAL_FORM_STATE.occupants,
    ownerStatus: getSearchParamValue(searchParams, 'situation', OWNER_STATUS_VALUES),
    selectedLocation,
    surface: searchParams.get('surface') ?? INITIAL_FORM_STATE.surface,
  } satisfies FormState;

  return {
    currentStep: getInitialStep(searchParams, formState),
    formState,
  };
}

export function getSearchParams(formState: FormState, currentStep: number) {
  const searchParams = new URLSearchParams();

  if (currentStep === INTRO_STEP) {
    return searchParams;
  }

  searchParams.set('step', String(currentStep));

  setOptionalSearchParam(searchParams, 'situation', formState.ownerStatus);
  setOptionalSearchParam(searchParams, 'housing', formState.housingType);
  setOptionalSearchParam(searchParams, 'equipment', formState.heatingEquipment);
  setOptionalSearchParam(searchParams, 'location', formState.location);
  setOptionalSearchParam(searchParams, 'dpe', formState.dpe);
  setChangedSearchParam(searchParams, 'occupants', formState.occupants, INITIAL_FORM_STATE.occupants);
  setChangedSearchParam(searchParams, 'surface', formState.surface, INITIAL_FORM_STATE.surface);
  setOptionalSearchParam(searchParams, 'incomeCategory', formState.incomeCategory);

  if (formState.selectedLocation) {
    searchParams.set('city', formState.selectedLocation.city);
    searchParams.set('postcode', formState.selectedLocation.postcode);
  }

  return searchParams;
}

export function getUrlWithSearchParams(searchParams: URLSearchParams) {
  const serializedSearchParams = searchParams.toString();

  return serializedSearchParams ? `${window.location.pathname}?${serializedSearchParams}` : window.location.pathname;
}

export function getRouteOutcome(formState: FormState): RouteOutcome {
  if (formState.ownerStatus === 'tenant') {
    return 'tenant';
  }

  if (formState.housingType === 'apartment') {
    return 'apartment';
  }

  if (formState.heatingEquipment === 'electric-radiator') {
    return 'electric-radiator';
  }

  return 'continue';
}

export function getPreviousStep(currentStep: number, formState: FormState) {
  const routeOutcome = getRouteOutcome(formState);

  if (currentStep === RESULT_STEP && routeOutcome === 'tenant') {
    return 1;
  }

  if (currentStep === RESULT_STEP && routeOutcome === 'apartment') {
    return 2;
  }

  if (currentStep === RESULT_STEP && routeOutcome === 'electric-radiator') {
    return 3;
  }

  return Math.max(currentStep - 1, 1);
}

function getInitialSelectedLocation(searchParams: URLSearchParams) {
  const label = searchParams.get('location') ?? searchParams.get('address');
  const postcode = searchParams.get('postcode');

  if (!label || !postcode) {
    return null;
  }

  return {
    city: searchParams.get('city') ?? '',
    departmentCode: postcode.slice(0, 2),
    label,
    postcode,
  } satisfies LocationSuggestion;
}

function getInitialStep(searchParams: URLSearchParams, formState: FormState) {
  const requestedStep = Number(searchParams.get('step'));
  const fallbackStep = getLastAvailableStep(formState);

  if (!searchParams.has('step')) {
    return INTRO_STEP;
  }

  if (!Number.isFinite(requestedStep)) {
    return fallbackStep;
  }

  return Math.min(Math.max(Math.floor(requestedStep), 1), fallbackStep);
}

function getLastAvailableStep(formState: FormState) {
  const routeOutcome = getRouteOutcome(formState);

  if (routeOutcome === 'tenant') {
    return 1;
  }

  if (routeOutcome === 'apartment') {
    return 2;
  }

  if (routeOutcome === 'electric-radiator') {
    return 3;
  }

  if (!formState.ownerStatus) {
    return 1;
  }

  if (!formState.housingType) {
    return 2;
  }

  if (!formState.heatingEquipment) {
    return 3;
  }

  if (!formState.selectedLocation) {
    return 4;
  }

  if (!formState.dpe) {
    return 5;
  }

  if (!formState.incomeCategory) {
    return 8;
  }

  return RESULT_STEP;
}

function setOptionalSearchParam(searchParams: URLSearchParams, key: string, value: string | null) {
  if (!value) {
    return;
  }

  searchParams.set(key, value);
}

function setChangedSearchParam(searchParams: URLSearchParams, key: string, value: string, defaultValue: string) {
  if (value === defaultValue) {
    return;
  }

  searchParams.set(key, value);
}

function getSearchParamValue<TValue extends string>(searchParams: URLSearchParams, key: string, values: readonly TValue[]) {
  const value = searchParams.get(key);

  return values.find((allowedValue) => allowedValue === value) ?? null;
}
