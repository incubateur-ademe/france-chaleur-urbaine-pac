import { useEffect, useRef } from 'react';

import {
  type ChoiceStepConfig,
  DPE_STEP_CONFIG,
  HEATING_EQUIPMENT_STEP_CONFIG,
  HOUSING_TYPE_STEP_CONFIG,
  OWNER_STATUS_STEP_CONFIG,
  QUESTIONNAIRE_STEPS,
  RECOMMENDATIONS,
  TOTAL_STEPS,
} from './constants';
import {
  type FormState,
  INCOME_CATEGORY_VALUES,
  type IncomeOption,
  type LocationSuggestion,
  type QuestionnaireChoice,
  type RouteOutcome,
} from './types';

const STEP_CONFIGS = QUESTIONNAIRE_STEPS;

type QuestionnaireProps = {
  currentStep: number;
  formState: FormState;
  incomeOptions: IncomeOption[];
  isIncomeOptionsLoading: boolean;
  isLocationLoading: boolean;
  locationSuggestions: LocationSuggestion[];
  routeOutcome: RouteOutcome;
  onChoiceSelect: (choice: QuestionnaireChoice) => void;
  onEditStep: (step: number) => void;
  onFormChange: (changes: Partial<FormState>) => void;
  onHandleStep: (action: 'previous' | 'next') => void;
  onLocationChange: (location: string) => void;
  onLocationSelect: (selectedLocation: LocationSuggestion) => void;
};

export function Questionnaire({
  currentStep,
  formState,
  incomeOptions,
  isIncomeOptionsLoading,
  isLocationLoading,
  locationSuggestions,
  routeOutcome,
  onChoiceSelect,
  onEditStep,
  onFormChange,
  onHandleStep,
  onLocationChange,
  onLocationSelect,
}: QuestionnaireProps) {
  const activeQuestionRef = useRef<HTMLElement>(null);
  const recommendationCalloutRef = useRef<HTMLDivElement>(null);
  const resultActionCalloutRef = useRef<HTMLDivElement>(null);
  const displayedIncomeOptions = incomeOptions.length > 0 ? incomeOptions : getFallbackIncomeOptions();
  const isNextDisabled = getIsNextDisabled(currentStep, formState);
  const recommendationOutcome = getRecommendationOutcome(currentStep, routeOutcome);
  const completedStepSummaries = getCompletedStepSummaries(formState, currentStep);
  const shouldShowStepAction = !recommendationOutcome && getShouldShowStepAction(currentStep, formState);
  const shouldShowResultAction = shouldShowStepAction && currentStep === TOTAL_STEPS && !isNextDisabled;

  useEffect(() => {
    if (currentStep < 1 || currentStep > TOTAL_STEPS) {
      return;
    }

    // Keep the active question visible when the journey moves between steps.
    activeQuestionRef.current?.scrollIntoView({ block: 'start' });
  }, [currentStep]);

  useEffect(() => {
    if (!recommendationOutcome) {
      return;
    }

    // Blocking recommendations appear after a choice without changing steps.
    recommendationCalloutRef.current?.scrollIntoView({ block: 'start' });
  }, [recommendationOutcome]);

  useEffect(() => {
    if (!shouldShowResultAction) {
      return;
    }

    // The final action appears after the last required answer is selected.
    resultActionCalloutRef.current?.scrollIntoView({ block: 'start' });
  }, [shouldShowResultAction]);

  return (
    <>
      <Stepper currentStep={currentStep} />
      <div className="question-stack">
        {completedStepSummaries.map((summary) => (
          <CompletedStepCard key={summary.step} summary={summary} onEditStep={onEditStep} />
        ))}
        <section ref={activeQuestionRef} className="question-card active-question-card fr-p-5v" aria-labelledby="active-question-title">
          <h2 className="fr-sr-only" id="active-question-title">
            {STEP_CONFIGS[currentStep - 1].title}
          </h2>
          <p className="fr-text-title--blue-france uppercase">
            {STEP_CONFIGS[currentStep - 1].title} - QUESTION {currentStep}/{TOTAL_STEPS}
          </p>
          {renderActiveStep({
            currentStep,
            displayedIncomeOptions,
            formState,
            isIncomeOptionsLoading,
            isLocationLoading,
            locationSuggestions,
            onChoiceSelect,
            onFormChange,
            onLocationChange,
            onLocationSelect,
          })}
          {recommendationOutcome && <RecommendationCallout calloutRef={recommendationCalloutRef} outcome={recommendationOutcome} />}
          {shouldShowStepAction && currentStep !== TOTAL_STEPS && (
            <StepActions isNextDisabled={isNextDisabled} nextLabel="Continuer" onHandleStep={onHandleStep} />
          )}
        </section>
        {shouldShowResultAction && (
          <article ref={resultActionCalloutRef} className="question-card result-step scroll-target-callout">
            <h3 className="fr-callout__title">Vos réponses sont complètes</h3>
            <p className="fr-callout__text">Nous avons tout ce qu'il faut pour estimer votre projet de pompe à chaleur.</p>
            <StepActions nextLabel="Voir mes résultats" onHandleStep={onHandleStep} />
          </article>
        )}
      </div>
    </>
  );
}

export function Stepper({ currentStep }: { currentStep: number }) {
  const nextStepTitle = STEP_CONFIGS[currentStep]?.kicker;

  return (
    <div className="fr-stepper fr-mb-0">
      <h2 className="fr-stepper__title">
        {currentStep === TOTAL_STEPS ? (
          <span>Vos résultats</span>
        ) : (
          <span className="fr-stepper__state">
            Étape {currentStep} sur {TOTAL_STEPS}
          </span>
        )}
      </h2>
      <div className="fr-stepper__steps" data-fr-current-step={currentStep} data-fr-steps={TOTAL_STEPS} />
      {nextStepTitle && (
        <p className="fr-stepper__details">
          <span className="fr-text--bold">Étape suivante :</span> {nextStepTitle}
        </p>
      )}
    </div>
  );
}

type ActiveStepRenderProps = {
  currentStep: number;
  displayedIncomeOptions: IncomeOption[];
  formState: FormState;
  isIncomeOptionsLoading: boolean;
  isLocationLoading: boolean;
  locationSuggestions: LocationSuggestion[];
  onChoiceSelect: (choice: QuestionnaireChoice) => void;
  onFormChange: (changes: Partial<FormState>) => void;
  onLocationChange: (location: string) => void;
  onLocationSelect: (selectedLocation: LocationSuggestion) => void;
};

function renderActiveStep({
  currentStep,
  displayedIncomeOptions,
  formState,
  isIncomeOptionsLoading,
  isLocationLoading,
  locationSuggestions,
  onChoiceSelect,
  onFormChange,
  onLocationChange,
  onLocationSelect,
}: ActiveStepRenderProps) {
  if (currentStep === 1) {
    return (
      <ChoiceStep
        {...OWNER_STATUS_STEP_CONFIG}
        selectedValue={formState.ownerStatus}
        onSelect={(ownerStatus) => onChoiceSelect({ field: 'ownerStatus', value: ownerStatus })}
      />
    );
  }

  if (currentStep === 2) {
    return (
      <ChoiceStep
        {...HOUSING_TYPE_STEP_CONFIG}
        selectedValue={formState.housingType}
        onSelect={(housingType) => onChoiceSelect({ field: 'housingType', value: housingType })}
      />
    );
  }

  if (currentStep === 3) {
    return (
      <ChoiceStep
        {...HEATING_EQUIPMENT_STEP_CONFIG}
        selectedValue={formState.heatingEquipment}
        onSelect={(heatingEquipment) => onChoiceSelect({ field: 'heatingEquipment', value: heatingEquipment })}
      />
    );
  }

  if (currentStep === 4) {
    return (
      <LocationStep
        isLocationLoading={isLocationLoading}
        location={formState.location}
        locationSuggestions={locationSuggestions}
        selectedLocation={formState.selectedLocation}
        onLocationChange={onLocationChange}
        onLocationSelect={onLocationSelect}
      />
    );
  }

  if (currentStep === 5) {
    return (
      <ChoiceStep {...DPE_STEP_CONFIG} selectedValue={formState.dpe} onSelect={(dpe) => onChoiceSelect({ field: 'dpe', value: dpe })} />
    );
  }

  if (currentStep === 6) {
    return (
      <NumberStep
        inputId="surface"
        label="Quelle est la surface chauffée du logement ?"
        help="Surface habitable chauffée, en m². Vous la trouverez sur votre DPE ou acte notarié."
        min={1}
        suffix="m²"
        value={formState.surface}
        onChange={(surface) => onFormChange({ surface })}
      />
    );
  }

  if (currentStep === 7) {
    return (
      <NumberStep
        inputId="occupants"
        label="Combien de personnes vivent dans le logement ?"
        help="Adultes et enfants compris, résidents habituels uniquement. Ce chiffre influence la consommation d'eau chaude."
        min={1}
        suffix="personnes"
        value={formState.occupants}
        onChange={(occupants) => onFormChange({ occupants })}
      />
    );
  }

  return (
    <>
      {isIncomeOptionsLoading && <p className="fr-hint-text">Chargement des plafonds de revenus…</p>}
      <ChoiceStep
        legend="Dans quelle tranche se situent les revenus du foyer ?"
        hint="Il s'agit ici de la somme des revenus de votre foyer, vous pouvez le vérifier sur votre dernier avis d'imposition (revenu fiscal de référence)."
        name="incomeCategory"
        options={displayedIncomeOptions}
        selectedValue={formState.incomeCategory}
        onSelect={(incomeCategory) => onFormChange({ incomeCategory })}
      />
    </>
  );
}

type CompletedStepSummary = {
  label: string;
  step: number;
  value: string;
};

function CompletedStepCard({ summary, onEditStep }: { summary: CompletedStepSummary; onEditStep: (step: number) => void }) {
  return (
    <article className="question-card question-card-completed">
      <span className="fr-icon-checkbox-circle-fill question-card-check" aria-hidden="true" />
      <div>
        <p className="fr-text-title--blue-france uppercase fr-mb-0 fr-text--sm">{summary.label}</p>
        <p className="question-summary-value">{summary.value}</p>
      </div>
      <button className="fr-btn fr-btn--sm fr-btn--tertiary-no-outline" type="button" onClick={() => onEditStep(summary.step)}>
        Modifier
      </button>
    </article>
  );
}

type LocationStepProps = {
  isLocationLoading: boolean;
  location: string;
  locationSuggestions: LocationSuggestion[];
  selectedLocation: LocationSuggestion | null;
  onLocationChange: (location: string) => void;
  onLocationSelect: (selectedLocation: LocationSuggestion) => void;
};

function LocationStep({
  isLocationLoading,
  location,
  locationSuggestions,
  selectedLocation,
  onLocationChange,
  onLocationSelect,
}: LocationStepProps) {
  return (
    <div className="step-content">
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="location">
          Quel est votre code postal ?
        </label>
        <input
          className="fr-input"
          id="location"
          name="location"
          placeholder="75001 ou Paris"
          type="search"
          value={location}
          onChange={(event) => onLocationChange(event.target.value)}
          required
        />
        {isLocationLoading && <p className="fr-hint-text">Recherche en cours…</p>}
        {locationSuggestions.length > 0 && (
          <ul className="location-suggestions">
            {locationSuggestions.map((suggestion) => (
              <li key={suggestion.label}>
                <button className="fr-btn fr-btn--tertiary-no-outline" type="button" onClick={() => onLocationSelect(suggestion)}>
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedLocation && <p className="fr-valid-text">Commune sélectionnée : {selectedLocation.label}</p>}
      </div>
    </div>
  );
}

type NumberStepProps = {
  inputId: string;
  label: string;
  help?: string;
  min: number;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
};

function NumberStep({ inputId, label, help, min, suffix, value, onChange }: NumberStepProps) {
  return (
    <div className="step-content">
      <div className="fr-input-group">
        <label className="fr-label" htmlFor={inputId}>
          {label}
        </label>
        <div className="fr-hint-text fr-my-3v">{help}</div>
        <div className="input-with-suffix">
          <input
            className="fr-input"
            id={inputId}
            min={min}
            name={inputId}
            type="number"
            value={value}
            onChange={(event) => onChange(event.target.value)}
            required
          />
          {suffix && <span>{suffix}</span>}
        </div>
      </div>
    </div>
  );
}

type ChoiceStepProps<TValue extends string> = ChoiceStepConfig<TValue> & {
  selectedValue: TValue | null;
  onSelect: (value: TValue) => void;
};

function ChoiceStep<TValue extends string>({
  legend,
  hint,
  name,
  options,
  radioVariant = 'rich',
  selectedValue,
  onSelect,
}: ChoiceStepProps<TValue>) {
  const radioGroupClassName = radioVariant === 'rich' ? 'fr-radio-group fr-radio-rich' : 'fr-radio-group';

  return (
    <fieldset className="fr-fieldset">
      <legend className="fr-fieldset__legend--regular fr-fieldset__legend">
        {legend}
        {hint && <span className="fr-hint-text">{hint}</span>}
      </legend>
      {options.map((option) => (
        <div
          className={`fr-mb-0 fr-fieldset__element fr-fieldset__element--inline${option.fieldsetElementClassName ? ` ${option.fieldsetElementClassName}` : ''}`}
          key={option.value}
        >
          <div className={radioGroupClassName}>
            <input
              checked={selectedValue === option.value}
              id={`${name}-${option.value}`}
              name={name}
              onChange={() => onSelect(option.value)}
              type="radio"
            />
            <label className="fr-label" htmlFor={`${name}-${option.value}`}>
              {option.badgeClassName ? (
                <span className={`dpe-badge ${option.badgeClassName}`}>
                  <span className="dpe-badge-letter">{option.label}</span>
                </span>
              ) : (
                option.label
              )}
              {option.help && <span className="fr-hint-text">{option.help}</span>}
            </label>
          </div>
        </div>
      ))}
    </fieldset>
  );
}

type StepActionsProps = {
  isNextDisabled?: boolean;
  nextLabel?: string;
  onHandleStep: (action: 'previous' | 'next') => void;
};

function StepActions({ isNextDisabled = false, nextLabel = 'Continuer', onHandleStep }: StepActionsProps) {
  return (
    <div className="step-actions fr-mt-3v">
      <button
        className={`fr-btn fr-btn--icon-right fr-icon-arrow-right-line ${nextLabel === 'Voir mes résultats' && 'fr-btn--lg'}`}
        disabled={isNextDisabled}
        type="button"
        onClick={() => onHandleStep('next')}
      >
        {nextLabel}
      </button>
    </div>
  );
}

type RecommendationCalloutProps = {
  calloutRef: React.RefObject<HTMLDivElement | null>;
  outcome: Exclude<RouteOutcome, 'continue'>;
};

function RecommendationCallout({ calloutRef, outcome }: RecommendationCalloutProps) {
  const recommendation = RECOMMENDATIONS[outcome];

  return (
    <div ref={calloutRef} className="fr-callout fr-callout--blue-cumulus scroll-target-callout">
      <p className="fr-text--lg fr-text--bold fr-text-title--blue-france fr-mb-3v">
        <span className="fr-icon-info-fill fr-mr-3v" />
        {recommendation.title}
      </p>
      <p className="fr-callout__text">
        {recommendation.descriptionBeforeLink}{' '}
        <a href={recommendation.url} className="fr-link" target="_blank" rel="noopener">
          {recommendation.linkLabel}
        </a>
        {recommendation.descriptionAfterLink ? ` ${recommendation.descriptionAfterLink}` : ''}
      </p>
      <a className="fr-btn fr-btn--icon-right fr-icon-arrow-right-line" href={recommendation.url} target="_blank" rel="noreferrer">
        Aller sur {recommendation.ctaLabel}
      </a>
    </div>
  );
}

function getCompletedStepSummaries(formState: FormState, currentStep: number) {
  const summaries: (CompletedStepSummary | null)[] = STEP_CONFIGS.map((stepConfig, stepIndex) => {
    const summaryValue = stepConfig.getSummaryValue(formState);
    const step = stepIndex + 1;

    return summaryValue
      ? {
          label: stepConfig.kicker,
          step,
          value: summaryValue,
        }
      : null;
  });

  return summaries.filter((summary): summary is CompletedStepSummary => summary !== null && summary.step < currentStep);
}

function getShouldShowStepAction(currentStep: number, formState: FormState) {
  const stepConfig = STEP_CONFIGS[currentStep - 1];

  if (!stepConfig) {
    return false;
  }

  const shouldShowNextAction = 'shouldShowNextAction' in stepConfig && stepConfig.shouldShowNextAction === true;

  return shouldShowNextAction || stepConfig.getSummaryValue(formState) !== null;
}

function getRecommendationOutcome(currentStep: number, routeOutcome: RouteOutcome) {
  if (routeOutcome === 'tenant' && currentStep === 1) {
    return routeOutcome;
  }
  if (routeOutcome === 'apartment' && currentStep === 2) {
    return routeOutcome;
  }
  if (routeOutcome === 'electric-radiator' && currentStep === 3) {
    return routeOutcome;
  }

  return null;
}

function getFallbackIncomeOptions() {
  return INCOME_CATEGORY_VALUES.map((incomeCategory) => ({
    help: 'Sélectionnez si cela correspond à votre catégorie MaPrimeRénov’.',
    label: incomeCategory,
    value: incomeCategory,
  }));
}

function getIsNextDisabled(currentStep: number, formState: FormState) {
  const stepConfig = STEP_CONFIGS[currentStep - 1];

  return stepConfig ? stepConfig.getSummaryValue(formState) === null : true;
}
