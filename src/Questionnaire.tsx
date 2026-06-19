import {
  type AddressSuggestion,
  DPE_VALUES,
  type DpeInput,
  type FormState,
  type HeatingEquipment,
  type HousingType,
  INCOME_CATEGORY_VALUES,
  type IncomeOption,
  type OwnerStatus,
  type QuestionnaireChoice,
} from './types';

const TOTAL_STEPS = 8;

const STEP_TITLES = [
  'Votre situation',
  'Votre logement',
  'Votre équipement',
  'Votre adresse',
  'Votre DPE',
  'Nombre d’habitants',
  'Surface du logement',
  'Catégorie MaPrimeRénov’',
] as const;

type ChoiceStepConfig<TValue extends string> = {
  legend: string;
  name: string;
  options: readonly {
    badgeClassName?: string;
    help?: string;
    label: string;
    value: TValue;
  }[];
};

const OWNER_STATUS_STEP_CONFIG = {
  legend: 'Quelle est votre situation ?',
  name: 'ownerStatus',
  options: [
    { label: 'Propriétaire', value: 'owner' },
    { label: 'Locataire', value: 'tenant' },
  ],
} satisfies ChoiceStepConfig<OwnerStatus>;

const HOUSING_TYPE_STEP_CONFIG = {
  legend: 'Quel est le type de votre logement ?',
  name: 'housingType',
  options: [
    { label: 'Maison individuelle', value: 'house' },
    { label: 'Appartement', value: 'apartment' },
  ],
} satisfies ChoiceStepConfig<HousingType>;

const HEATING_EQUIPMENT_STEP_CONFIG = {
  legend: 'Quel est votre équipement actuel ?',
  name: 'heatingEquipment',
  options: [
    { label: 'Chaudière au gaz', value: 'gas-boiler' },
    { label: 'Chaudière au fioul', value: 'oil-boiler' },
    { label: 'Radiateur électrique', value: 'electric-radiator' },
  ],
} satisfies ChoiceStepConfig<HeatingEquipment>;

const DPE_STEP_CONFIG = {
  legend: 'Quel est la classe energétique du logement ?',
  name: 'dpe',
  options: DPE_VALUES.map((dpeValue) => ({
    badgeClassName: dpeValue === 'unknown' ? undefined : `dpe-badge-${dpeValue.toLowerCase()}`,
    label: dpeValue === 'unknown' ? 'Je ne sais pas' : dpeValue,
    value: dpeValue,
  })),
} satisfies ChoiceStepConfig<DpeInput>;

type QuestionnaireProps = {
  addressSuggestions: AddressSuggestion[];
  currentStep: number;
  errorMessage: string | null;
  formState: FormState;
  incomeOptions: IncomeOption[];
  isAddressLoading: boolean;
  isIncomeOptionsLoading: boolean;
  onAddressChange: (address: string) => void;
  onAddressSelect: (selectedAddress: AddressSuggestion) => void;
  onChoiceSelect: (choice: QuestionnaireChoice) => void;
  onFormChange: (changes: Partial<FormState>) => void;
  onHandleStep: (action: 'previous' | 'next') => void;
};

export function Questionnaire({
  addressSuggestions,
  currentStep,
  errorMessage,
  formState,
  incomeOptions,
  isAddressLoading,
  isIncomeOptionsLoading,
  onAddressChange,
  onAddressSelect,
  onChoiceSelect,
  onFormChange,
  onHandleStep,
}: QuestionnaireProps) {
  const displayedIncomeOptions = incomeOptions.length > 0 ? incomeOptions : getFallbackIncomeOptions();
  const isNextDisabled = getIsNextDisabled(currentStep, formState);

  return (
    <>
      <Stepper currentStep={currentStep} />
      {currentStep === 1 && (
        <ChoiceStep
          {...OWNER_STATUS_STEP_CONFIG}
          selectedValue={formState.ownerStatus}
          onSelect={(ownerStatus) => onChoiceSelect({ field: 'ownerStatus', value: ownerStatus })}
        />
      )}
      {currentStep === 2 && (
        <ChoiceStep
          {...HOUSING_TYPE_STEP_CONFIG}
          selectedValue={formState.housingType}
          onSelect={(housingType) => onChoiceSelect({ field: 'housingType', value: housingType })}
        />
      )}
      {currentStep === 3 && (
        <ChoiceStep
          {...HEATING_EQUIPMENT_STEP_CONFIG}
          selectedValue={formState.heatingEquipment}
          onSelect={(heatingEquipment) => onChoiceSelect({ field: 'heatingEquipment', value: heatingEquipment })}
        />
      )}
      {currentStep === 4 && (
        <AddressStep
          address={formState.address}
          addressSuggestions={addressSuggestions}
          isAddressLoading={isAddressLoading}
          selectedAddress={formState.selectedAddress}
          onAddressChange={onAddressChange}
          onAddressSelect={onAddressSelect}
        />
      )}
      {currentStep === 5 && (
        <ChoiceStep {...DPE_STEP_CONFIG} selectedValue={formState.dpe} onSelect={(dpe) => onChoiceSelect({ field: 'dpe', value: dpe })} />
      )}
      {currentStep === 6 && (
        <NumberStep
          inputId="occupants"
          label="Nombre d’habitants du logement"
          min={1}
          value={formState.occupants}
          onChange={(occupants) => onFormChange({ occupants })}
        />
      )}
      {currentStep === 7 && (
        <NumberStep
          inputId="surface"
          label="Surface du logement"
          min={1}
          suffix="m²"
          value={formState.surface}
          onChange={(surface) => onFormChange({ surface })}
        />
      )}
      {currentStep === 8 && (
        <>
          {isIncomeOptionsLoading && <p className="fr-hint-text">Chargement des plafonds de revenus…</p>}
          <ChoiceStep
            legend="Quel est le revenu fiscal de référence du ménage ?"
            name="incomeCategory"
            options={displayedIncomeOptions}
            selectedValue={formState.incomeCategory}
            onSelect={(incomeCategory) => onFormChange({ incomeCategory })}
          />
        </>
      )}
      <StepActions
        isNextDisabled={isNextDisabled}
        nextLabel={currentStep === 8 ? 'Voir le résultat' : 'Continuer'}
        onHandleStep={onHandleStep}
      />
      {errorMessage && (
        <div className="fr-alert fr-alert--error fr-mt-4w">
          <p>{errorMessage}</p>
        </div>
      )}
    </>
  );
}

function Stepper({ currentStep }: { currentStep: number }) {
  const currentStepTitle = STEP_TITLES[currentStep - 1];
  const nextStepTitle = STEP_TITLES[currentStep];

  return (
    <div className="fr-stepper">
      <h2 className="fr-stepper__title" id="step-title">
        {currentStepTitle}
        <span className="fr-stepper__state">
          Étape {currentStep} sur {TOTAL_STEPS}
        </span>
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

type AddressStepProps = {
  address: string;
  addressSuggestions: AddressSuggestion[];
  isAddressLoading: boolean;
  selectedAddress: AddressSuggestion | null;
  onAddressChange: (address: string) => void;
  onAddressSelect: (selectedAddress: AddressSuggestion) => void;
};

function AddressStep({
  address,
  addressSuggestions,
  isAddressLoading,
  selectedAddress,
  onAddressChange,
  onAddressSelect,
}: AddressStepProps) {
  return (
    <div className="step-content">
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="address">
          Quel est votre adresse ?<span className="fr-hint-text">Sélectionnez une adresse dans la liste pour continuer.</span>
        </label>
        <input
          className="fr-input"
          id="address"
          name="address"
          type="search"
          value={address}
          onChange={(event) => onAddressChange(event.target.value)}
          required
        />
        {isAddressLoading && <p className="fr-hint-text">Recherche en cours…</p>}
        {addressSuggestions.length > 0 && (
          <ul className="address-suggestions">
            {addressSuggestions.map((suggestion) => (
              <li key={suggestion.label}>
                <button className="fr-btn fr-btn--tertiary-no-outline" type="button" onClick={() => onAddressSelect(suggestion)}>
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedAddress && <p className="fr-valid-text">Adresse sélectionnée : {selectedAddress.label}</p>}
      </div>
    </div>
  );
}

type NumberStepProps = {
  inputId: string;
  label: string;
  min: number;
  suffix?: string;
  value: string;
  onChange: (value: string) => void;
};

function NumberStep({ inputId, label, min, suffix, value, onChange }: NumberStepProps) {
  return (
    <div className="step-content">
      <div className="fr-input-group">
        <label className="fr-label" htmlFor={inputId}>
          {label}
        </label>
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

function ChoiceStep<TValue extends string>({ legend, name, options, selectedValue, onSelect }: ChoiceStepProps<TValue>) {
  return (
    <fieldset className="fr-fieldset">
      <legend className="fr-fieldset__legend fr-text--regular">{legend}</legend>
      {options.map((option) => (
        <div className="fr-fieldset__element" key={option.value}>
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
    <div className="fr-mt-6w fr-grid-row fr-grid-row--center fr-grid-row--gutters">
      <div className="fr-col-auto">
        <button
          className="fr-btn fr-btn--secondary fr-btn--icon-left fr-icon-arrow-left-line"
          type="button"
          onClick={() => onHandleStep('previous')}
        >
          Précédent
        </button>
      </div>
      <div className="fr-col-auto">
        <button
          className="fr-btn fr-col-auto fr-btn--icon-right fr-icon-arrow-right-line"
          disabled={isNextDisabled}
          type="button"
          onClick={() => onHandleStep('next')}
        >
          {nextLabel}
        </button>
      </div>
    </div>
  );
}

function getFallbackIncomeOptions() {
  return INCOME_CATEGORY_VALUES.map((incomeCategory) => ({
    help: 'Sélectionnez cette option si elle correspond à votre catégorie MaPrimeRénov’.',
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
    return formState.selectedAddress === null;
  }

  if (currentStep === 5) {
    return formState.dpe === null;
  }

  if (currentStep === 6) {
    return !isValidNumberInput(formState.occupants, 1);
  }

  if (currentStep === 7) {
    return !isValidNumberInput(formState.surface, 1);
  }

  return formState.incomeCategory === null;
}

function isValidNumberInput(value: string, min: number) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue >= min;
}
