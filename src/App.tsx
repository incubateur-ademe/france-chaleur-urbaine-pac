import type { RuleName } from '@betagouv/france-chaleur-urbaine-publicodes';
import publicodesRules from '@betagouv/france-chaleur-urbaine-publicodes';
import Engine from 'publicodes';
import { useEffect, useMemo, useState } from 'react';

import { Questionnaire } from './Questionnaire';
import { ResultsPage } from './ResultsPage';
import {
  type AddressSuggestion,
  DPE_VALUES,
  type Dpe,
  type DpeInput,
  type FormState,
  HEATING_EQUIPMENT_VALUES,
  HOUSING_TYPE_VALUES,
  INCOME_CATEGORY_VALUES,
  type IncomeCategory,
  type IncomeOption,
  OWNER_STATUS_VALUES,
  type QuestionnaireChoice,
  type RouteOutcome,
  type SimulationResult,
} from './types';

const DEFAULT_API_BASE_URL = import.meta.env.VITE_FCU_API_BASE_URL ?? 'http://localhost:3000';
const DEFAULT_TEMPERATURE_REFERENCE = -7;
const INTRO_STEP = 0;
const RESULT_STEP = 9;

type BanFeature = {
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
  address: '',
  dpe: null,
  heatingEquipment: null,
  housingType: null,
  incomeCategory: null,
  occupants: '2',
  ownerStatus: null,
  selectedAddress: null,
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

export function App() {
  const initialState = useMemo(() => getInitialJourneyState(), []);
  const [currentStep, setCurrentStep] = useState(initialState.currentStep);
  const [formState, setFormState] = useState<FormState>(initialState.formState);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [incomeOptions, setIncomeOptions] = useState<IncomeOption[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
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
    if (formState.address.length < 3 || formState.selectedAddress?.label === formState.address) {
      setAddressSuggestions([]);
      setIsAddressLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsAddressLoading(true);

    fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(formState.address)}&limit=5`, {
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Address search failed');
        }
        return response.json() as Promise<{ features: BanFeature[] }>;
      })
      .then((data) => {
        setAddressSuggestions(data.features.map(toAddressSuggestion));
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setErrorMessage('La recherche d’adresse est momentanément indisponible.');
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsAddressLoading(false);
        }
      });

    return () => abortController.abort();
  }, [formState.address, formState.selectedAddress]);

  useEffect(() => {
    if (!formState.selectedAddress || !Number.isFinite(occupants) || occupants < 1) {
      setIncomeOptions([]);
      setIsIncomeOptionsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsIncomeOptionsLoading(true);
    setErrorMessage(null);

    fetch(`${DEFAULT_API_BASE_URL}/api/pac/income-options`, {
      body: JSON.stringify({
        departmentCode: formState.selectedAddress.departmentCode,
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
  }, [formState.selectedAddress, occupants]);

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
      handleChoiceChange({ ownerStatus: choice.value }, choice.value === 'tenant' ? RESULT_STEP : 2);
      return;
    }

    if (choice.field === 'housingType') {
      handleChoiceChange({ housingType: choice.value }, choice.value === 'apartment' ? RESULT_STEP : 3);
      return;
    }

    if (choice.field === 'heatingEquipment') {
      handleChoiceChange({ heatingEquipment: choice.value }, choice.value === 'electric-radiator' ? RESULT_STEP : 4);
      return;
    }

    handleChoiceChange({ dpe: choice.value }, 6);
  };

  const handleFormChange = (changes: Partial<FormState>) => {
    setFormState((previousState) => ({ ...previousState, ...changes }));
  };

  const handleAddressChange = (address: string) => {
    handleFormChange({ address, selectedAddress: null });
  };

  const handleAddressSelect = (selectedAddress: AddressSuggestion) => {
    handleFormChange({ address: selectedAddress.label, selectedAddress });
    setAddressSuggestions([]);
  };

  const handleStep = (action: 'previous' | 'next') => {
    setResult(null);
    setErrorMessage(null);
    setCurrentStep(action === 'previous' ? getPreviousStep(currentStep, formState) : Math.min(currentStep + 1, RESULT_STEP));
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setFormState(INITIAL_FORM_STATE);
    setAddressSuggestions([]);
    setIncomeOptions([]);
    setResult(null);
    setErrorMessage(null);
  };

  return (
    <main className="fr-container fr-background-default--grey ">
      <div className="fr-p-4w">
        <h1 className="fr-h2" id="home-title">
          Évaluez les gains économiques et écologiques de l’installation d’une PAC en remplacement de votre chaudière
        </h1>
        {currentStep === INTRO_STEP && <HomeScreen onStart={() => setCurrentStep(1)} />}
        {currentStep === RESULT_STEP && (
          <ResultsPage
            errorMessage={errorMessage}
            isSubmitting={isSubmitting}
            outcome={routeOutcome}
            result={result}
            onPrevious={() => handleStep('previous')}
            onRestart={handleRestart}
            onRetry={() => void runSimulation(formState, setResult, setErrorMessage, setIsSubmitting)}
          />
        )}
        {currentStep > INTRO_STEP && currentStep < RESULT_STEP && (
          <Questionnaire
            addressSuggestions={addressSuggestions}
            currentStep={currentStep}
            errorMessage={errorMessage}
            formState={formState}
            incomeOptions={incomeOptions}
            isAddressLoading={isAddressLoading}
            isIncomeOptionsLoading={isIncomeOptionsLoading}
            onAddressChange={handleAddressChange}
            onAddressSelect={handleAddressSelect}
            onFormChange={handleFormChange}
            onChoiceSelect={handleQuestionnaireChoice}
            onHandleStep={handleStep}
          />
        )}
      </div>
    </main>
  );
}

function HomeScreen({ onStart }: { onStart: () => void }) {
  return (
    <section>
      <div className="fr-alert fr-alert--info">
        <h2 className="fr-alert__title">Précautions</h2>
        <p>
          <strong>Ce simulateur est dédié à la maison individuelle</strong> et propose une simulation de la facture d’énergie et des
          émissions de CO₂ liées au chauffage et à l’eau chaude sanitaire pour des foyers qui souhaiteraient passer d’une chaudière gaz ou
          fioul à une pompe à chaleur air/eau.
        </p>
        <p>
          <strong>
            Les informations présentées sont des estimations et peuvent varier en fonction des caractéristiques des logements et des
            équipements.
          </strong>
        </p>
        <p>Les aides prises en compte dans les calculs impliquent le remplacement de la chaudière gaz ou fioul.</p>
        <p>
          Les calculs sont simplifiés. Vous pouvez accéder à un simulateur plus détaillé sur France Chaleur Urbaine. Pour concrétiser votre
          projet, faites réaliser plusieurs devis et prenez conseil auprès du conseiller ENR de votre territoire.
        </p>
      </div>
      <div className="fr-grid-row fr-grid-row--center fr-mt-6v">
        <button className="fr-btn" type="button" onClick={onStart}>
          Démarrer ma simulation
        </button>
      </div>
    </section>
  );
}

function getInitialJourneyState() {
  const searchParams = new URLSearchParams(window.location.search);
  const selectedAddress = getInitialSelectedAddress(searchParams);
  const formState = {
    ...INITIAL_FORM_STATE,
    address: searchParams.get('address') ?? INITIAL_FORM_STATE.address,
    dpe: getSearchParamValue(searchParams, 'dpe', DPE_VALUES),
    heatingEquipment: getSearchParamValue(searchParams, 'equipment', HEATING_EQUIPMENT_VALUES),
    housingType: getSearchParamValue(searchParams, 'housing', HOUSING_TYPE_VALUES),
    incomeCategory: getSearchParamValue(searchParams, 'incomeCategory', INCOME_CATEGORY_VALUES),
    occupants: searchParams.get('occupants') ?? INITIAL_FORM_STATE.occupants,
    ownerStatus: getSearchParamValue(searchParams, 'situation', OWNER_STATUS_VALUES),
    selectedAddress,
    surface: searchParams.get('surface') ?? INITIAL_FORM_STATE.surface,
  } satisfies FormState;

  return {
    currentStep: getInitialStep(searchParams, formState),
    formState,
  };
}

function getInitialSelectedAddress(searchParams: URLSearchParams) {
  const label = searchParams.get('address');
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
  } satisfies AddressSuggestion;
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

  if (routeOutcome !== 'continue') {
    return RESULT_STEP;
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

  if (!formState.selectedAddress) {
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
  setOptionalSearchParam(searchParams, 'address', formState.address);
  setOptionalSearchParam(searchParams, 'dpe', formState.dpe);
  setChangedSearchParam(searchParams, 'occupants', formState.occupants, INITIAL_FORM_STATE.occupants);
  setChangedSearchParam(searchParams, 'surface', formState.surface, INITIAL_FORM_STATE.surface);
  setOptionalSearchParam(searchParams, 'incomeCategory', formState.incomeCategory);

  if (formState.selectedAddress) {
    searchParams.set('city', formState.selectedAddress.city);
    searchParams.set('departmentCode', formState.selectedAddress.departmentCode);
    searchParams.set('postcode', formState.selectedAddress.postcode);
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

  const selectedAddress = formState.selectedAddress;
  setIsSubmitting(true);

  try {
    const response = await fetch(`${DEFAULT_API_BASE_URL}/api/pac/simulation`, {
      body: JSON.stringify({
        departmentCode: selectedAddress.departmentCode,
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
      heatingModeComparisons: getHeatingModeComparisons(apiResult.heatingCostBreakdowns, formState, selectedAddress),
    });
  } catch {
    setErrorMessage('Le calcul est momentanément indisponible.');
  } finally {
    setIsSubmitting(false);
  }
}

function toAddressSuggestion(feature: BanFeature): AddressSuggestion {
  return {
    city: feature.properties.city,
    departmentCode: feature.properties.context.split(',')[0] ?? feature.properties.postcode.slice(0, 2),
    label: feature.properties.label,
    postcode: feature.properties.postcode,
  };
}

type SimulationFormState = FormState & {
  dpe: DpeInput;
  incomeCategory: IncomeCategory;
  selectedAddress: AddressSuggestion;
};

function isSimulationReady(formState: FormState): formState is SimulationFormState {
  return formState.selectedAddress !== null && formState.dpe !== null && formState.incomeCategory !== null;
}

function getHeatingModeComparisons(breakdowns: HeatingCostBreakdown[], formState: SimulationFormState, selectedAddress: AddressSuggestion) {
  const engine = new Engine<RuleName>(publicodesRules, {
    logger: {
      error: () => undefined,
      log: () => undefined,
      warn: () => undefined,
    },
  });

  engine.setSituation({
    'code département': `'${selectedAddress.departmentCode}'`,
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
