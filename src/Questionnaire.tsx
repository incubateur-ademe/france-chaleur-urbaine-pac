import type React from 'react';

import {
  DPE_VALUES,
  type DpeInput,
  type FormState,
  type HeatingEquipment,
  type HousingType,
  INCOME_CATEGORY_VALUES,
  type IncomeOption,
  type LocationSuggestion,
  type OwnerStatus,
  type QuestionnaireChoice,
  type RouteOutcome,
} from './types';

const TOTAL_STEPS = 8;
const WATTWATCHERS_URL = 'https://www.wattwatchers.fr/';
const FCU_URL = 'https://france-chaleur-urbaine.beta.gouv.fr/chaleur-renouvelable';
const RECOMMENDATIONS = {
  apartment: {
    ctaLabel: 'Découvrir la chaleur renouvelable',
    description: (
      <>
        Mais pas de panique, rendez-vous sur le service public{' '}
        <a href={FCU_URL} target="_blank" className="fr-link" rel="noopener">
          France Chaleur Urbaine
        </a>{' '}
        pour découvrir le système de chauffage économique et écologique le plus adapté à votre bâtiment.
      </>
    ),
    linkLabel: 'France Chaleur Urbaine',
    title: 'Oups, ce simulateur est conçu pour les maisons individuelles !',
    url: FCU_URL,
  },
  'electric-radiator': {
    ctaLabel: 'sur Watt Watchers',
    description: (
      <>
        Pas de panique, des solutions alternatives existent : pour les découvrir, rendez-vous sur{' '}
        <a href={WATTWATCHERS_URL} className="fr-link" target="_blank" rel="noopener">
          Watt Watchers
        </a>
      </>
    ),
    linkLabel: 'Watt Watchers',
    title: 'Malheureusement, l’installation d’une PAC air/eau n’est pas recommandée dans votre maison.',
    url: WATTWATCHERS_URL,
  },
  tenant: {
    ctaLabel: 'Watt Watchers',
    description: (
      <>
        Mais il existe de nombreuses autres solutions pour faire des économies énergies. Notre partenaire de confiance peut vous guider :
        rendez-vous sur{' '}
        <a href={WATTWATCHERS_URL} className="fr-link" target="_blank" rel="noopener">
          Watt Watchers
        </a>
      </>
    ),
    linkLabel: 'Watt watchers',
    title: "Oups, le remplacement d'une chaudière par une pompe à chaleur dépend de votre propriétaire !",
    url: WATTWATCHERS_URL,
  },
} satisfies Record<
  Exclude<RouteOutcome, 'continue'>,
  {
    ctaLabel: string;
    description: React.ReactNode;
    linkLabel: string;
    title: string;
    url: string;
  }
>;

const STEP_TITLES = [
  "Statut d'occupation",
  'Votre logement',
  'Votre mode de chauffage',
  'Votre code postal',
  'Votre DPE',
  'Surface chauffée',
  'Composition du foyer',
  'Votre situation',
] as const;

const STEP_KICKERS = [
  'Statut d’occupation',
  'Type de logement',
  'Chauffage actuel',
  'Code postal',
  'Classe Énergétique',
  'Surface chauffée',
  'Composition du foyer',
  'Revenus du foyer',
] as const;
type ChoiceStepConfig<TValue extends string> = {
  legend: string;
  hint?: string;
  name: string;
  options: readonly {
    badgeClassName?: string;
    fieldsetElementClassName?: string;
    help?: string;
    label: string;
    value: TValue;
  }[];
};

const OWNER_STATUS_STEP_CONFIG = {
  legend: 'Êtes-vous propriétaire ?',
  name: 'ownerStatus',
  options: [
    { label: 'Je suis propriétaire', value: 'owner' },
    { label: 'Je suis locataire', value: 'tenant' },
  ],
} satisfies ChoiceStepConfig<OwnerStatus>;

const OWNER_STATUS_LABELS = {
  owner: 'Propriétaire',
  tenant: 'Locataire',
} satisfies Record<OwnerStatus, string>;

const HOUSING_TYPE_STEP_CONFIG = {
  legend: 'Votre logement est-il une maison ou un appartement ?',
  name: 'housingType',
  options: [
    { label: 'Une maison individuelle', value: 'house' },
    { label: 'Un appartement', value: 'apartment' },
  ],
} satisfies ChoiceStepConfig<HousingType>;

const HOUSING_TYPE_LABELS = {
  apartment: 'Appartement',
  house: 'Maison individuelle',
} satisfies Record<HousingType, string>;

const HEATING_EQUIPMENT_STEP_CONFIG = {
  legend: 'Comment votre logement est-il chauffé aujourd’hui ?',
  name: 'heatingEquipment',
  options: [
    { label: 'Chaudière au gaz', value: 'gas-boiler' },
    { label: 'Chaudière au fioul', value: 'oil-boiler' },
    { label: 'Radiateur électrique', value: 'electric-radiator' },
  ],
} satisfies ChoiceStepConfig<HeatingEquipment>;

const HEATING_EQUIPMENT_LABELS = {
  'electric-radiator': 'Radiateur électrique',
  'gas-boiler': 'Chaudière au gaz',
  'oil-boiler': 'Chaudière au fioul',
} satisfies Record<HeatingEquipment, string>;

const DPE_STEP_CONFIG = {
  hint: 'Vous avez un doute ? Choisissez la lettre qui vous semble la plus juste.',
  legend: 'Quelle est la classe énergétique (DPE) du logement ?',
  name: 'dpe',
  options: DPE_VALUES.map((dpeValue) => ({
    badgeClassName: dpeValue === 'unknown' ? undefined : `dpe-badge-${dpeValue.toLowerCase()}`,
    fieldsetElementClassName: dpeValue === 'unknown' ? 'dpe-unknown-fieldset-element' : undefined,
    label: dpeValue === 'unknown' ? 'Je ne sais pas (une étiquette D sera enregistrée)' : dpeValue,
    value: dpeValue,
  })),
} satisfies ChoiceStepConfig<DpeInput>;

type QuestionnaireProps = {
  currentStep: number;
  errorMessage: string | null;
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
  errorMessage,
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
  const displayedIncomeOptions = incomeOptions.length > 0 ? incomeOptions : getFallbackIncomeOptions();
  const isNextDisabled = getIsNextDisabled(currentStep, formState);
  const recommendationOutcome = getRecommendationOutcome(currentStep, routeOutcome);
  const completedStepSummaries = getCompletedStepSummaries(formState, currentStep);

  return (
    <>
      <Stepper currentStep={currentStep} />
      <div className="question-stack">
        {completedStepSummaries.map((summary) => (
          <CompletedStepCard key={summary.step} summary={summary} onEditStep={onEditStep} />
        ))}
        <section className="question-card fr-p-5v" aria-labelledby="active-question-title">
          <h2 className="fr-sr-only" id="active-question-title">
            {STEP_TITLES[currentStep - 1]}
          </h2>
          <p className="fr-text-title--blue-france uppercase">
            {STEP_TITLES[currentStep - 1]} - QUESTION {currentStep}/{TOTAL_STEPS}
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
          {recommendationOutcome && <RecommendationCallout outcome={recommendationOutcome} />}
          {!recommendationOutcome && getShouldShowNextAction(currentStep) && (
            <StepActions
              isNextDisabled={isNextDisabled}
              nextLabel={currentStep === 8 ? 'Voir le résultat' : 'Continuer'}
              onHandleStep={onHandleStep}
            />
          )}
        </section>
      </div>
      {errorMessage && (
        <div className="fr-alert fr-alert--error fr-mt-4w">
          <p>{errorMessage}</p>
        </div>
      )}
    </>
  );
}

export function Stepper({ currentStep }: { currentStep: number }) {
  const nextStepTitle = STEP_KICKERS[currentStep];

  return (
    <div className="fr-stepper">
      <h2 className="fr-stepper__title" id="step-title">
        {currentStep === 8 ? (
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
        legend="Dans qulle tranche se situent les revenus du foyer ?"
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
        <p className="fr-text-title--blue-france uppercase fr-mb-0">{summary.label}</p>
        <p className="question-summary-value">{summary.value}</p>
      </div>
      <button className="fr-btn fr-btn--tertiary-no-outline question-edit-button" type="button" onClick={() => onEditStep(summary.step)}>
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

function ChoiceStep<TValue extends string>({ legend, hint, name, options, selectedValue, onSelect }: ChoiceStepProps<TValue>) {
  return (
    <fieldset className="fr-fieldset">
      <legend className="fr-fieldset__legend--regular fr-fieldset__legend">
        {legend}
        {hint && <span className="fr-hint-text">{hint}</span>}
      </legend>

      {options.map((option) => (
        <div
          className={`fr-fieldset__element fr-fieldset__element--inline${option.fieldsetElementClassName ? ` ${option.fieldsetElementClassName}` : ''}`}
          key={option.value}
        >
          <div className="fr-radio-group fr-radio-rich">
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
    <div className="step-actions">
      <button
        className="fr-btn fr-btn--icon-right fr-icon-arrow-right-line"
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
  outcome: Exclude<RouteOutcome, 'continue'>;
};

function RecommendationCallout({ outcome }: RecommendationCalloutProps) {
  const recommendation = RECOMMENDATIONS[outcome];

  return (
    <div className="fr-callout  fr-callout--blue-cumulus">
      <p className="fr-text--lg fr-text--bold fr-text-title--blue-france fr-mb-3v">
        <span className="fr-icon-info-fill fr-mr-3v" />
        {recommendation.title}
      </p>
      <p className="fr-callout__text">{recommendation.description}</p>
      <a className="fr-btn fr-btn--icon-right fr-icon-arrow-right-line" href={recommendation.url} target="_blank" rel="noreferrer">
        Aller sur {recommendation.ctaLabel}
      </a>
    </div>
  );
}

function getCompletedStepSummaries(formState: FormState, currentStep: number) {
  const summaries: (CompletedStepSummary | null)[] = [
    formState.ownerStatus
      ? {
          label: STEP_KICKERS[0],
          step: 1,
          value: OWNER_STATUS_LABELS[formState.ownerStatus],
        }
      : null,
    formState.housingType
      ? {
          label: STEP_KICKERS[1],
          step: 2,
          value: HOUSING_TYPE_LABELS[formState.housingType],
        }
      : null,
    formState.heatingEquipment
      ? {
          label: STEP_KICKERS[2],
          step: 3,
          value: HEATING_EQUIPMENT_LABELS[formState.heatingEquipment],
        }
      : null,
    formState.selectedLocation
      ? {
          label: STEP_KICKERS[3],
          step: 4,
          value: getLocationSummary(formState.selectedLocation),
        }
      : null,
    formState.dpe
      ? {
          label: STEP_KICKERS[4],
          step: 5,
          value: formState.dpe === 'unknown' ? 'Je ne sais pas' : formState.dpe,
        }
      : null,
    isValidNumberInput(formState.surface, 1)
      ? {
          label: STEP_KICKERS[5],
          step: 6,
          value: `${formState.surface} m²`,
        }
      : null,
    isValidNumberInput(formState.occupants, 1)
      ? {
          label: STEP_KICKERS[6],
          step: 7,
          value: formState.occupants,
        }
      : null,
    formState.incomeCategory
      ? {
          label: STEP_KICKERS[7],
          step: 8,
          value: formState.incomeCategory,
        }
      : null,
  ];

  return summaries.filter((summary): summary is CompletedStepSummary => summary !== null && summary.step < currentStep);
}

function getLocationSummary(selectedLocation: LocationSuggestion) {
  return selectedLocation.city ? `${selectedLocation.postcode} ${selectedLocation.city}` : selectedLocation.label;
}

function getShouldShowNextAction(currentStep: number) {
  return currentStep === 4 || currentStep === 6 || currentStep === 7 || currentStep === 8;
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
  if (currentStep === 1) {
    return formState.ownerStatus === null;
  }

  if (currentStep === 2) {
    return formState.housingType === null;
  }

  if (currentStep === 3) {
    return formState.heatingEquipment === null;
  }

  if (currentStep === 4) {
    return formState.selectedLocation === null;
  }

  if (currentStep === 5) {
    return formState.dpe === null;
  }

  if (currentStep === 6) {
    return !isValidNumberInput(formState.surface, 1);
  }

  if (currentStep === 7) {
    return !isValidNumberInput(formState.occupants, 1);
  }

  return formState.incomeCategory === null;
}

function isValidNumberInput(value: string, min: number) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue >= min;
}
