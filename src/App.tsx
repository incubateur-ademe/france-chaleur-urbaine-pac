import { useEffect, useMemo, useState } from 'react';

import { fetchHeatingSimulation, fetchIncomeOptions, searchMunicipalities } from './api';
import { HomeScreen } from './HomeScreen';
import {
  getInitialJourneyState,
  getPreviousStep,
  getRouteOutcome,
  getSearchParams,
  getUrlWithSearchParams,
  INITIAL_FORM_STATE,
  INTRO_STEP,
  RESULT_STEP,
} from './journey';
import { Questionnaire } from './Questionnaire';
import { ResultsPage } from './ResultsPage';
import type { FormState, IncomeOption, LocationSuggestion, QuestionnaireChoice, SimulationResult } from './types';

export function App() {
  const initialState = useMemo(() => getInitialJourneyState(), []);
  const [currentStep, setCurrentStep] = useState(initialState.currentStep);
  const [formState, setFormState] = useState<FormState>(initialState.formState);
  const [locationSuggestions, setLocationSuggestions] = useState<LocationSuggestion[]>([]);
  const [incomeOptions, setIncomeOptions] = useState<IncomeOption[]>([]);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [isIncomeOptionsLoading, setIsIncomeOptionsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const occupants = Number(formState.occupants);
  const routeOutcome = getRouteOutcome(formState);

  useEffect(() => {
    const searchParams = getSearchParams(formState, currentStep);
    window.history.replaceState(null, '', getUrlWithSearchParams(searchParams));
  }, [currentStep, formState]);

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
    setCurrentStep(action === 'previous' ? getPreviousStep(currentStep, formState) : Math.min(currentStep + 1, RESULT_STEP));
  };

  const handleEditStep = (step: number) => {
    setResult(null);
    setCurrentStep(step);
  };

  const handleRestart = () => {
    setCurrentStep(1);
    setFormState(INITIAL_FORM_STATE);
    setLocationSuggestions([]);
    setIncomeOptions([]);
    setResult(null);
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
            currentHeatingEquipment={formState.heatingEquipment}
            isSubmitting={isSubmitting}
            result={result}
            onPrevious={() => handleStep('previous')}
            onRestart={handleRestart}
          />
        )}
        {currentStep > INTRO_STEP && currentStep < RESULT_STEP && (
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
      </div>
    </main>
  );
}

async function runSimulation(
  formState: FormState,
  setResult: (result: SimulationResult | null) => void,
  setIsSubmitting: (isSubmitting: boolean) => void
) {
  setResult(null);

  function isSimulationReady(formState: FormState): formState is SimulationFormState {
    return formState.selectedLocation !== null && formState.dpe !== null && formState.incomeCategory !== null;
  }
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

type SimulationFormState = FormState & {
  dpe: NonNullable<FormState['dpe']>;
  incomeCategory: NonNullable<FormState['incomeCategory']>;
  selectedLocation: LocationSuggestion;
};
