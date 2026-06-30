import type { RuleName } from '@betagouv/france-chaleur-urbaine-publicodes';
import publicodesRules from '@betagouv/france-chaleur-urbaine-publicodes';
import Engine from 'publicodes';
import { useEffect, useMemo, useState } from 'react';

import { Questionnaire } from './Questionnaire';
import { ResultsPage } from './ResultsPage';
import {
  DPE_VALUES,
  type Dpe,
  type DpeInput,
  type FormState,
  HEATING_EQUIPMENT_VALUES,
  HOUSING_TYPE_VALUES,
  INCOME_CATEGORY_VALUES,
  type IncomeCategory,
  type IncomeOption,
  type LocationSuggestion,
  OWNER_STATUS_VALUES,
  type QuestionnaireChoice,
  type RouteOutcome,
  type SimulationResult,
} from './types';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_FCU_API_BASE_URL ?? 'http://localhost:3000';
const DEFAULT_TEMPERATURE_REFERENCE = -7;
const INTRO_STEP = 0;
const RESULT_STEP = 9;

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

type HeatingCostBreakdown = {
  label: string;
  p1: number;
  p2: number;
  p4: number;
};

type ApiSimulationResult = Omit<SimulationResult, 'heatingModeComparisons'> & {
  heatingCostBreakdowns: HeatingCostBreakdown[];
};

const INITIAL_FORM_STATE = {
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

const HEATING_MODE_RULES = [
  {
    co2RuleName: 'env . Installation x PAC air-eau x Individuel . Total',
    label: 'PAC air/eau',
  },
  {
    co2RuleName: 'env . Installation x Gaz indiv avec cond x Individuel . Total',
    label: 'Chaudière gaz condensation',
  },
  {
    co2RuleName: 'env . Installation x Fioul indiv x Individuel . Total',
    label: 'Chaudière fioul',
  },
] as const satisfies {
  co2RuleName: RuleName;
  label: string;
}[];

const HOME_FEATURES = [
  {
    description: (
      <>
        <strong>Les informations présentées sont des estimations</strong> et peuvent varier en fonction des caractéristiques des logement et
        des équipements.
      </>
    ),
    iconClassName: 'fr-icon-bar-chart-2-fill',
    title: 'Estimation',
  },
  {
    description: (
      <>
        Les aides estimées dans les calculs impliquent le <strong>remplacement de la chaudière gaz ou fioul</strong>.
      </>
    ),
    iconClassName: 'fr-icon-money-euro-box-fill',
    title: 'Aides incluses',
  },
  {
    description: <>Les calculs sont simplifiés et ne remplacent pas un devis par un professionnel RGE.</>,
    iconClassName: 'fr-icon-calculator-fill',
    title: 'Calculs simplifiés',
  },
] as const;

export function App() {
  const initialState = useMemo(() => getInitialJourneyState(), []);
  const [currentStep, setCurrentStep] = useState(initialState.currentStep);
  const [formState, setFormState] = useState<FormState>(initialState.formState);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [incomeOptions, setIncomeOptions] = useState<IncomeOption[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isIncomeOptionsLoading, setIsIncomeOptionsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const occupants = Number(formState.occupants);
  const routeOutcome = getRouteOutcome(formState);

  useEffect(() => {
    const searchParams = getSearchParams(formState, currentStep);
    window.history.replaceState(null, '', getUrlWithSearchParams(searchParams));
  }, [currentStep, formState]);

  useEffect(() => {
    setErrorMessage(null);
    if (formState.location.length < 3 || formState.selectedLocation?.label === formState.location) {
      setLocationSuggestions([]);
      setIsLocationLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLocationLoading(true);

    fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(formState.location)}&type=municipality&autocomplete=1&limit=5`, {
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Location search failed');
        }
        return response.json() as Promise<{ features: BanMunicipalityFeature[] }>;
      })
      .then((data) => {
        setLocationSuggestions(data.features.map(toLocationSuggestion));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setErrorMessage('La recherche de commune est momentanément indisponible.');
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLocationLoading(false);
        }
      });

    return () => abortController.abort();
  }, [formState.location, formState.selectedLocation]);

  useEffect(() => {
    if (!formState.selectedLocation || !Number.isFinite(occupants) || occupants < 1) {
      setIncomeOptions([]);
      setIsIncomeOptionsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsIncomeOptionsLoading(true);
    setErrorMessage(null);

    fetch(`${DEFAULT_API_BASE_URL}/api/pac/income-options`, {
      body: JSON.stringify({
        departmentCode: formState.selectedLocation.departmentCode,
        occupants: Math.floor(occupants),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Income options request failed');
        }
        return response.json() as Promise<IncomeOption[]>;
      })
      .then((options) => {
        setIncomeOptions(options);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setIncomeOptions([]);
        setErrorMessage('Les catégories de revenus sont momentanément indisponibles.');
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsIncomeOptionsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [formState.selectedLocation, occupants]);

  useEffect(() => {
    if (currentStep !== RESULT_STEP || routeOutcome !== 'continue' || result || errorMessage || isSubmitting) {
      return;
    }

    void runSimulation(formState, setResult, setErrorMessage, setIsSubmitting);
  }, [currentStep, errorMessage, formState, isSubmitting, result, routeOutcome]);

  const handleChoiceChange = (changes: Partial<FormState>, nextStep: number) => {
    setResult(null);
    setFormState((previousState) => ({ ...previousState, ...changes }));
    setCurrentStep(nextStep);
  };

  const handleQuestionnaireChoice = (choice: QuestionnaireChoice) => {
    if (choice.field === 'ownerStatus') {
      handleChoiceChange({ ownerStatus: choice.value }, choice.value === 'tenant' ? 1 : 2);
      return;
    }

    if (choice.field === 'housingType') {
      handleChoiceChange({ housingType: choice.value }, choice.value === 'apartment' ? 2 : 3);
      return;
    }

    if (choice.field === 'heatingEquipment') {
      handleChoiceChange({ heatingEquipment: choice.value }, choice.value === 'electric-radiator' ? 3 : 4);
      return;
    }

    handleChoiceChange({ dpe: choice.value }, 6);
  };

  const handleFormChange = (changes: Partial<FormState>) => {
    setFormState((previousState) => ({ ...previousState, ...changes }));
  };

  const handleLocationChange = (location: string) => {
    handleFormChange({ location, selectedLocation: null });
  };

  const handleLocationSelect = (selectedLocation: LocationSuggestion) => {
    handleFormChange({ location: selectedLocation.label, selectedLocation });
    setLocationSuggestions([]);
  };

  const handleStep = (action: 'previous' | 'next') => {
    setResult(null);
    setErrorMessage(null);
    setCurrentStep(action === 'previous' ? getPreviousStep(currentStep, formState) : Math.min(currentStep + 1, RESULT_STEP));
  };

  const handleEditStep = (step: number) => {
    setResult(null);
    setErrorMessage(null);
    setCurrentStep(step);
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setFormState(INITIAL_FORM_STATE);
    setLocationSuggestions([]);
    setIncomeOptions([]);
    setResult(null);
    setErrorMessage(null);
  };

  const handleBack = () => {
    window.history.back();
  };

  return (
    <main className="fr-background-default--grey simulator-pac">
      <div className="fr-container fr-py-4w">
        <button className="fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-arrow-left-line fr-mb-3v" type="button" onClick={handleBack}>
          Retour
        </button>
        <div>
          <h1 className="fr-h2">
            Vous avez une chaudière au gaz ou au fioul ?<br />
            Combien ça coûte et combien on économise avec une pompe à chaleur air/eau ?
          </h1>
        </div>
        {currentStep !== RESULT_STEP && <p>Quelques questions sur votre logement pour estimer le coût, les aides et vos économies.</p>}
        {currentStep === INTRO_STEP && <HomeScreen onStart={() => setCurrentStep(1)} />}
        {currentStep === RESULT_STEP && (
          <ResultsPage
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            result={result}
            onPrevious={() => handleStep('previous')}
            onRestart={handleRestart}
            onRetry={() => void runSimulation(formState, setResult, setErrorMessage, setIsSubmitting)}
          />
        )}
        {currentStep > INTRO_STEP && currentStep < RESULT_STEP && (
          <Questionnaire
            currentStep={currentStep}
            errorMessage={errorMessage}
            formState={formState}
            incomeOptions={incomeOptions}
            isIncomeOptionsLoading={isIncomeOptionsLoading}
            isLocationLoading={isLocationLoading}
            locationSuggestions={locationSuggestions}
            routeOutcome={routeOutcome}
            onFormChange={handleFormChange}
            onChoiceSelect={handleQuestionnaireChoice}
            onEditStep={handleEditStep}
            onHandleStep={handleStep}
            onLocationChange={handleLocationChange}
            onLocationSelect={handleLocationSelect}
          />
        )}
      </div>
    </main>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section aria-labelledby="home-title">
      <p className="fr-badge fr-badge--info fr-badge--no-icon fr-py-1v">
        <span className="fr-icon-time-fill fr-mr-1v" aria-hidden="true" />
        Moins d’une minute
      </p>
      <div className="fr-grid-row fr-mt-5v">
        {HOME_FEATURES.map((feature) => (
          <article className="fr-col-12 fr-col-lg-4 fr-p-3w fr-grid-row home-feature" key={feature.title}>
            <div className="fr-col-auto">
              <span className={`${feature.iconClassName} fr-icon--lg`} aria-hidden="true" />
            </div>
            <div className="fr-col fr-pl-3v">
              <h2 className="fr-h4">{feature.title}</h2>
              <p className="fr-mb-0">{feature.description}</p>
            </div>
          </article>
        ))}
      </div>
      <button className="fr-my-6v fr-btn fr-btn--icon-right fr-icon-arrow-right-line" type="button" onClick={onStart}>
        Démarrer la simulation
      </button>
      <p className="fr-mt-3v">
        Vous pouvez accéder à un simulateur plus détaillé sur{' '}
        <a href="https://france-chaleur-urbaine.beta.gouv.fr/" className="fr-link" target="_blank" rel="noreferrer">
          France Chaleur Urbaine
        </a>
        .
      </p>
    </section>
  );
}

function getInitialJourneyState() {
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

function getInitialSelectedLocation(searchParams: URLSearchParams) {
  const label = searchParams.get('location') ?? searchParams.get('address');
  const departmentCode = searchParams.get('departmentCode');
  const postcode = searchParams.get('postcode');

  if (!label || !departmentCode || !postcode) {
    return null;
  }

  return {
    city: searchParams.get('city') ?? '',
    departmentCode,
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

  if (routeOutcome === 'apartment') {
    return 2;
  }

  if (routeOutcome === 'tenant') {
    return 1;
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

function getSearchParams(formState: FormState, currentStep: number) {
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
    searchParams.set('departmentCode', formState.selectedLocation.departmentCode);
    searchParams.set('postcode', formState.selectedLocation.postcode);
  }

  return searchParams;
}

function getUrlWithSearchParams(searchParams: URLSearchParams) {
  const serializedSearchParams = searchParams.toString();

  return serializedSearchParams ? `${window.location.pathname}?${serializedSearchParams}` : window.location.pathname;
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

function getRouteOutcome(formState: FormState): RouteOutcome {
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

function getPreviousStep(currentStep: number, formState: FormState) {
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

async function runSimulation(
  formState: FormState,
  setResult: (result: SimulationResult | null) => void,
  setErrorMessage: (errorMessage: string | null) => void,
  setIsSubmitting: (isSubmitting: boolean) => void
) {
  setResult(null);
  setErrorMessage(null);

  if (!isSimulationReady(formState)) {
    setErrorMessage('Complétez toutes les informations avant de lancer le calcul.');
    return;
  }

  const selectedLocation = formState.selectedLocation;
  setIsSubmitting(true);

  try {
    const response = await fetch(`${DEFAULT_API_BASE_URL}/api/pac/simulation`, {
      body: JSON.stringify({
        departmentCode: selectedLocation.departmentCode,
        dpe: getSimulationDpe(formState.dpe),
        incomeCategory: formState.incomeCategory,
        occupants: Number(formState.occupants),
        surface: Number(formState.surface),
      }),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
    });

    if (!response.ok) {
      throw new Error('Simulation request failed');
    }

    const apiResult = (await response.json()) as ApiSimulationResult;

    setResult({
      ...apiResult,
      heatingModeComparisons: getHeatingModeComparisons(apiResult.heatingCostBreakdowns, formState, selectedLocation),
    });
  } catch {
    setErrorMessage('Le calcul est momentanément indisponible.');
  } finally {
    setIsSubmitting(false);
  }
}

function toLocationSuggestion(feature: BanMunicipalityFeature): LocationSuggestion {
  const departmentCode = feature.properties.context.split(',')[0] ?? feature.properties.postcode.slice(0, 2);

  return {
    city: feature.properties.city,
    departmentCode,
    label: `${feature.properties.postcode} ${feature.properties.city}`,
    postcode: feature.properties.postcode,
  };
}

type SimulationFormState = FormState & {
  dpe: DpeInput;
  incomeCategory: IncomeCategory;
  selectedLocation: LocationSuggestion;
};

function isSimulationReady(formState: FormState): formState is SimulationFormState {
  return formState.selectedLocation !== null && formState.dpe !== null && formState.incomeCategory !== null;
}

function getHeatingModeComparisons(
  breakdowns: HeatingCostBreakdown[],
  formState: SimulationFormState,
  selectedLocation: LocationSuggestion
) {
  const engine = new Engine<RuleName>(publicodesRules, {
    logger: {
      error: () => undefined,
      log: () => undefined,
      warn: () => undefined,
    },
  });

  engine.setSituation({
    'code département': `'${selectedLocation.departmentCode}'`,
    DPE: `'${getSimulationDpe(formState.dpe)}'`,
    'Inclure la climatisation': 'non',
    'méthode résidentiel': "'DPE'",
    "Nombre d'habitants moyen par appartement": Number(formState.occupants),
    "nombre de logements dans l'immeuble concerné": 1,
    "Paramètres économiques . Aides . Éligibilité x Je dispose actuellement d'une chaudière gaz ou fioul": 'oui',
    'Paramètres économiques . Aides . Éligibilité x Je suis un particulier': 'oui',
    'Paramètres économiques . Aides . Éligibilité x Prise en compte des aides': 'oui',
    'Paramètres économiques . Aides . Éligibilité x Ressources du ménage': `'${formState.incomeCategory}'`,
    'Production eau chaude sanitaire': 'oui',
    'ratios . GNRL Appartement ou maison': "'Maison'",
    'surface logement type tertiaire': Number(formState.surface),
    'température de référence chaud commune': DEFAULT_TEMPERATURE_REFERENCE,
    'type de bâtiment': "'résidentiel'",
    'type de production ECS': "'Avec équipement chauffage'",
  });

  return HEATING_MODE_RULES.map((heatingMode) => {
    const breakdown = breakdowns.find((heatingCostBreakdown) => heatingCostBreakdown.label === heatingMode.label);

    return {
      co2: roundNumber(getRuleValue(engine, heatingMode.co2RuleName)),
      label: heatingMode.label,
      p1: breakdown?.p1 ?? 0,
    };
  });
}

function getSimulationDpe(dpe: DpeInput): Dpe {
  return dpe === 'unknown' ? 'D' : dpe;
}

function getRuleValue(engine: Engine<RuleName>, ruleName: RuleName) {
  return Number(engine.evaluate(ruleName).nodeValue ?? 0);
}

function roundNumber(value: number) {
  return Math.round(value * 100) / 100;
}
