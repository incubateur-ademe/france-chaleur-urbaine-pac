import { useEffect, useMemo, useState } from 'react';

import pacImageUrl from '@/assets/pac.webp';

import { fetchFranceRenovSpace, fetchHeatingSimulation, fetchIncomeOptions, searchMunicipalities } from './api';
import { HomeScreen } from './HomeScreen';
import { Questionnaire } from './Questionnaire';
import {
  getInitialJourneyState,
  getNextStepFromChoice,
  getPreviousStep,
  getRouteOutcome,
  getSearchParams,
  INITIAL_FORM_STATE,
  RESULT_STEP,
} from './questionnaire';
import { ResultsPage } from './ResultsPage';
import type {
  FormState,
  FranceRenovSpace,
  IncomeOption,
  LocationSuggestion,
  QuestionnaireChoice,
  SimulationFormState,
  SimulationResult,
} from './types';

export function App() {
  const initialState = useMemo(() => getInitialJourneyState(), []);
  const [currentStep, setCurrentStep] = useState(initialState.currentStep);
  const [formState, setFormState] = useState<FormState>(initialState.formState);
  const { clearLocationSuggestions, isLocationLoading, locationSuggestions } = useLocationSuggestions(formState);
  const { clearIncomeOptions, incomeOptions, isIncomeOptionsLoading } = useIncomeOptions(formState);
  const { franceRenovSpace, isFranceRenovSpaceLoading } = useFranceRenovSpace(formState, currentStep);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const routeOutcome = getRouteOutcome(formState);
  const currentPathWithSearch = useMemo(() => {
    const searchParams = getSearchParams(formState, currentStep);
    const serializedSearchParams = searchParams.toString();

    return serializedSearchParams ? `${window.location.pathname}?${serializedSearchParams}` : window.location.pathname;
  }, [currentStep, formState]);

  useEffect(() => {
    window.history.replaceState(null, '', currentPathWithSearch);
  }, [currentPathWithSearch]);

  useEffect(() => {
    if (currentStep !== RESULT_STEP || routeOutcome !== 'continue' || result || isSubmitting) {
      return;
    }

    runSimulation(formState, setResult, setIsSubmitting);
  }, [currentStep, formState, isSubmitting, result, routeOutcome]);

  const handleChoiceChange = (changes: Partial<FormState>, nextStep: number) => {
    setResult(null);
    setFormState((previousState) => ({ ...previousState, ...changes }));
    setCurrentStep(nextStep);
  };

  const handleQuestionnaireChoice = (choice: QuestionnaireChoice) => {
    if (choice.field === 'ownerStatus') {
      handleChoiceChange({ ownerStatus: choice.value }, getNextStepFromChoice(choice));
      return;
    }

    if (choice.field === 'housingType') {
      handleChoiceChange({ housingType: choice.value }, getNextStepFromChoice(choice));
      return;
    }

    if (choice.field === 'heatingEquipment') {
      handleChoiceChange({ heatingEquipment: choice.value }, getNextStepFromChoice(choice));
      return;
    }

    handleChoiceChange({ dpe: choice.value }, getNextStepFromChoice(choice));
  };

  const handleFormChange = (changes: Partial<FormState>) => {
    setFormState((previousState) => ({ ...previousState, ...changes }));
  };

  const handleLocationChange = (location: string) => {
    handleFormChange({ location, selectedLocation: null });
  };

  const handleLocationSelect = (selectedLocation: LocationSuggestion) => {
    handleFormChange({ location: selectedLocation.label, selectedLocation });
    clearLocationSuggestions();
  };

  const handleStep = (action: 'previous' | 'next') => {
    setResult(null);
    setCurrentStep(action === 'previous' ? getPreviousStep(currentStep, formState) : Math.min(currentStep + 1, RESULT_STEP));
  };

  const handleEditStep = (step: number) => {
    setResult(null);
    setCurrentStep(step);
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setFormState(INITIAL_FORM_STATE);
    clearLocationSuggestions();
    clearIncomeOptions();
    setResult(null);
  };

  const handleBack = () => {
    if (currentStep === 0) {
      window.history.back();
      return;
    }
    if (currentStep === 1) {
      setResult(null);
      setFormState(INITIAL_FORM_STATE);
      setCurrentStep(0);
      return;
    }
    setResult(null);
    setCurrentStep(getPreviousStep(currentStep, formState));
  };
  const isResultStep = currentStep === RESULT_STEP;
  return (
    <main className="simulator-pac">
      <div className={isResultStep ? 'fr-grid-row fr-grid-row--middle fr-grid-row--gutters' : ''}>
        <div className={isResultStep ? 'fr-col' : ''}>
          <h1 className="fr-h3">
            Vous avez une chaudière au gaz ou au fioul ?<br />
            Combien ça coûte et combien on économise avec une pompe à chaleur air/eau ?
          </h1>
        </div>
        {isResultStep && (
          <div className="fr-col-auto">
            <img src={pacImageUrl} width={120} height={168} alt="PAC air-eau" />
          </div>
        )}
      </div>
      {!isResultStep && <p>Quelques questions sur votre logement pour estimer le coût, les aides et vos économies.</p>}
      {currentStep === 0 && <HomeScreen onStart={() => setCurrentStep(1)} />}
      {isResultStep && (
        <ResultsPage
          currentHeatingEquipment={formState.heatingEquipment}
          formState={formState}
          franceRenovSpace={franceRenovSpace}
          isFranceRenovSpaceLoading={isFranceRenovSpaceLoading}
          isSubmitting={isSubmitting}
          result={result}
          surface={formState.surface}
          onEditStep={handleEditStep}
        />
      )}
      {currentStep > 0 && currentStep < RESULT_STEP && (
        <Questionnaire
          currentStep={currentStep}
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
      {currentStep !== 0 && (
        <div className="fr-grid-row fr-grid-row--middle fr-mt-10v">
          <button className="fr-btn fr-btn--tertiary fr-btn--icon-left fr-icon-arrow-left-line fr-mr-3v" type="button" onClick={handleBack}>
            Question précédente
          </button>
          {isResultStep && (
            <button className="fr-btn fr-btn--tertiary" type="button" onClick={handleRestart}>
              Recommencer
            </button>
          )}
        </div>
      )}
    </main>
  );
}

function useLocationSuggestions(formState: FormState) {
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const clearLocationSuggestions = () => setLocationSuggestions([]);

  useEffect(() => {
    if (formState.location.length < 3 || formState.selectedLocation?.label === formState.location) {
      setLocationSuggestions([]);
      setIsLocationLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsLocationLoading(true);

    searchMunicipalities(formState.location, abortController.signal)
      .then((suggestions) => {
        setLocationSuggestions(suggestions);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsLocationLoading(false);
        }
      });

    return () => abortController.abort();
  }, [formState.location, formState.selectedLocation]);

  return { clearLocationSuggestions, isLocationLoading, locationSuggestions };
}

function useIncomeOptions(formState: FormState) {
  const [incomeOptions, setIncomeOptions] = useState<IncomeOption[]>([]);
  const [isIncomeOptionsLoading, setIsIncomeOptionsLoading] = useState(false);
  const clearIncomeOptions = () => setIncomeOptions([]);
  const occupants = Number(formState.occupants);

  useEffect(() => {
    if (!formState.selectedLocation || !Number.isFinite(occupants) || occupants < 1) {
      setIncomeOptions([]);
      setIsIncomeOptionsLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsIncomeOptionsLoading(true);

    fetchIncomeOptions(formState.selectedLocation, occupants, abortController.signal)
      .then((options) => {
        setIncomeOptions(options);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setIncomeOptions([]);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsIncomeOptionsLoading(false);
        }
      });

    return () => abortController.abort();
  }, [formState.selectedLocation, occupants]);

  return { clearIncomeOptions, incomeOptions, isIncomeOptionsLoading };
}

function useFranceRenovSpace(formState: FormState, currentStep: number) {
  const [franceRenovSpace, setFranceRenovSpace] = useState<FranceRenovSpace | null>(null);
  const [isFranceRenovSpaceLoading, setIsFranceRenovSpaceLoading] = useState(false);
  const citycode = formState.selectedLocation?.citycode ?? '';

  useEffect(() => {
    if (currentStep !== RESULT_STEP || !citycode) {
      setFranceRenovSpace(null);
      setIsFranceRenovSpaceLoading(false);
      return;
    }

    const abortController = new AbortController();
    setIsFranceRenovSpaceLoading(true);

    fetchFranceRenovSpace(citycode, abortController.signal)
      .then((space) => {
        setFranceRenovSpace(space);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }
        setFranceRenovSpace(null);
      })
      .finally(() => {
        if (!abortController.signal.aborted) {
          setIsFranceRenovSpaceLoading(false);
        }
      });

    return () => abortController.abort();
  }, [citycode, currentStep]);

  return { franceRenovSpace, isFranceRenovSpaceLoading };
}

function isSimulationReady(formState: FormState): formState is SimulationFormState {
  return formState.selectedLocation !== null && formState.dpe !== null && formState.incomeCategory !== null;
}

async function runSimulation(
  formState: FormState,
  setResult: (result: SimulationResult | null) => void,
  setIsSubmitting: (isSubmitting: boolean) => void
) {
  setResult(null);

  if (!isSimulationReady(formState)) {
    return;
  }

  setIsSubmitting(true);

  try {
    setResult(await fetchHeatingSimulation(formState));
  } catch {
  } finally {
    setIsSubmitting(false);
  }
}
