import { useEffect, useMemo, useState } from 'react';

import { fetchHeatingSimulation, fetchIncomeOptions, searchMunicipalities } from './api';
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

export const HOME_FEATURES = [
  {
    description: (
      <>
        <strong>Les informations présentées sont des estimations</strong> et peuvent varier en fonction des caractéristiques des logement et
        des équipements.
      </>
    ),
    iconClassName: 'fr-icon-pie-chart-box-fill',
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
    iconClassName: 'fr-icon-line-chart-fill',
    title: 'Calculs simplifiés',
  },
  {
    description: <>Il est nécessaire d’en parler à un professionnel pour vous faire accompagner en toute neutralité.</>,
    iconClassName: 'fr-icon-chat-3-fill',
    title: 'Faites-vous accompagner',
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

    searchMunicipalities(formState.location, abortController.signal)
      .then((suggestions) => {
        setLocationSuggestions(suggestions);
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

    fetchIncomeOptions(formState.selectedLocation, occupants, abortController.signal)
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
            currentHeatingEquipment={formState.heatingEquipment}
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
        {HOME_FEATURES.slice(0, 3).map((feature) => (
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

  setIsSubmitting(true);

  try {
    setResult(await fetchHeatingSimulation(formState));
  } catch {
    setErrorMessage('Le calcul est momentanément indisponible.');
  } finally {
    setIsSubmitting(false);
  }
}

type SimulationFormState = FormState & {
  dpe: NonNullable<FormState['dpe']>;
  incomeCategory: NonNullable<FormState['incomeCategory']>;
  selectedLocation: LocationSuggestion;
};

function isSimulationReady(formState: FormState): formState is SimulationFormState {
  return formState.selectedLocation !== null && formState.dpe !== null && formState.incomeCategory !== null;
}
