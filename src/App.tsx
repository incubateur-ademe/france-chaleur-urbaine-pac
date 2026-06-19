import type { RuleName } from '@betagouv/france-chaleur-urbaine-publicodes';
import publicodesRules from '@betagouv/france-chaleur-urbaine-publicodes';
import Engine from 'publicodes';
import { useEffect, useMemo, useState } from 'react';

const OWNER_STATUS_VALUES = ['owner', 'tenant'] as const;
const HOUSING_TYPE_VALUES = ['house', 'apartment'] as const;
const HEATING_EQUIPMENT_VALUES = ['gas-boiler', 'oil-boiler', 'electric-radiator'] as const;
const DPE_VALUES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'unknown'] as const;
const INCOME_CATEGORY_VALUES = ['Très modeste', 'Modeste', 'Intermédiaire', 'Supérieur'] as const;
const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_TEMPERATURE_REFERENCE = -7;
const RESULT_STEP = 9;
const TOTAL_STEPS = 8;
const WATTWATCHERS_URL = 'https://www.wattwatchers.fr/';
const HEAT_NETWORK_URL = 'https://france-chaleur-urbaine.beta.gouv.fr/chaleur-renouvelable';

type OwnerStatus = (typeof OWNER_STATUS_VALUES)[number];
type HousingType = (typeof HOUSING_TYPE_VALUES)[number];
type HeatingEquipment = (typeof HEATING_EQUIPMENT_VALUES)[number];
type DpeInput = (typeof DPE_VALUES)[number];
type Dpe = Exclude<DpeInput, 'unknown'>;
type IncomeCategory = (typeof INCOME_CATEGORY_VALUES)[number];
type RouteOutcome = 'continue' | 'tenant' | 'apartment' | 'electric-radiator';

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

type AddressSuggestion = {
  city: string;
  cityCode: string;
  departmentCode: string;
  label: string;
  latitude: number;
  longitude: number;
  postcode: string;
};

type SimulationResult = {
  oilBoilerAnnualBill: number;
  gasBoilerAnnualBill: number;
  heatPumpAnnualBill: number;
  heatingModeComparisons: HeatingModeComparison[];
  heatPumpBoilerReplacementBonus: number;
  heatPumpGrossPrice: number;
  heatPumpMaprimerenovAid: number;
  heatPumpNetPrice: number;
  heatPumpProposedPower: number;
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

type HeatingModeComparison = {
  co2: number;
  label: string;
  p1: number;
};

type IncomeOption = {
  help: string;
  label: string;
  value: IncomeCategory;
};

type FormState = {
  address: string;
  dpe: DpeInput;
  heatingEquipment: HeatingEquipment | null;
  housingType: HousingType | null;
  incomeCategory: IncomeCategory;
  occupants: string;
  ownerStatus: OwnerStatus | null;
  selectedAddress: AddressSuggestion | null;
  surface: string;
};

const INITIAL_FORM_STATE = {
  address: '',
  dpe: 'D',
  heatingEquipment: null,
  housingType: null,
  incomeCategory: 'Modeste',
  occupants: '2',
  ownerStatus: null,
  selectedAddress: null,
  surface: '90',
} satisfies FormState;

const PUBLICODES_ENGINE_OPTIONS = {
  logger: {
    error: () => undefined,
    log: () => undefined,
    warn: () => undefined,
  },
};

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

/**
 * Runs the step-by-step heat pump eligibility and simulation journey.
 */
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
    window.history.replaceState(null, '', `${window.location.pathname}?${searchParams.toString()}`);
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

    fetch(`${import.meta.env.VITE_FCU_API_BASE_URL ?? DEFAULT_API_BASE_URL}/api/pac/income-options`, {
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

  const handleOwnerStatusChange = (ownerStatus: OwnerStatus) => {
    setResult(null);
    setFormState((previousState) => ({ ...previousState, ownerStatus }));
    setCurrentStep(ownerStatus === 'tenant' ? RESULT_STEP : 2);
  };

  const handleHousingTypeChange = (housingType: HousingType) => {
    setResult(null);
    setFormState((previousState) => ({ ...previousState, housingType }));
    setCurrentStep(housingType === 'apartment' ? RESULT_STEP : 3);
  };

  const handleHeatingEquipmentChange = (heatingEquipment: HeatingEquipment) => {
    setResult(null);
    setFormState((previousState) => ({ ...previousState, heatingEquipment }));
    setCurrentStep(heatingEquipment === 'electric-radiator' ? RESULT_STEP : 4);
  };

  const handlePreviousStep = () => {
    setResult(null);
    setErrorMessage(null);
    setCurrentStep(getPreviousStep(currentStep, formState));
  };

  const handleNextStep = () => {
    setResult(null);
    setErrorMessage(null);
    setCurrentStep(Math.min(currentStep + 1, RESULT_STEP));
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
    <main className="fr-container app-shell">
      <section className="fr-py-6w">
        <p className="fr-badge fr-badge--blue-ecume">Comparateur PAC</p>
        <h1>Estimez votre projet de pompe à chaleur</h1>
        <p className="fr-text--lead">Répondez à quelques questions pour obtenir une estimation adaptée à votre logement.</p>
      </section>

      <section className="journey-panel fr-mb-8w" aria-labelledby="step-title">
        {currentStep < RESULT_STEP ? <Stepper currentStep={currentStep} /> : <h2 id="step-title">Résultat de la simulation</h2>}

        {routeOutcome !== 'continue' && currentStep === RESULT_STEP ? (
          <RecommendationScreen outcome={routeOutcome} onPrevious={handlePreviousStep} onRestart={handleRestart} />
        ) : (
          <>
            {currentStep === 1 && <OwnerStatusStep selectedValue={formState.ownerStatus} onSelect={handleOwnerStatusChange} />}
            {currentStep === 2 && <HousingTypeStep selectedValue={formState.housingType} onSelect={handleHousingTypeChange} />}
            {currentStep === 3 && (
              <HeatingEquipmentStep selectedValue={formState.heatingEquipment} onSelect={handleHeatingEquipmentChange} />
            )}
            {currentStep === 4 && (
              <AddressStep
                address={formState.address}
                addressSuggestions={addressSuggestions}
                isAddressLoading={isAddressLoading}
                selectedAddress={formState.selectedAddress}
                onAddressChange={(address) =>
                  setFormState((previousState) => ({
                    ...previousState,
                    address,
                    selectedAddress: null,
                  }))
                }
                onAddressSelect={(selectedAddress) => {
                  setFormState((previousState) => ({
                    ...previousState,
                    address: selectedAddress.label,
                    selectedAddress,
                  }));
                  setAddressSuggestions([]);
                }}
                onNext={handleNextStep}
                onPrevious={handlePreviousStep}
              />
            )}
            {currentStep === 5 && (
              <DpeStep
                selectedValue={formState.dpe}
                onSelect={(dpe) => setFormState((previousState) => ({ ...previousState, dpe }))}
                onNext={handleNextStep}
                onPrevious={handlePreviousStep}
              />
            )}
            {currentStep === 6 && (
              <NumberStep
                inputId="occupants"
                label="Nombre d’habitants du logement"
                min={1}
                value={formState.occupants}
                onChange={(occupantsValue) => setFormState((previousState) => ({ ...previousState, occupants: occupantsValue }))}
                onNext={handleNextStep}
                onPrevious={handlePreviousStep}
              />
            )}
            {currentStep === 7 && (
              <NumberStep
                inputId="surface"
                label="Surface du logement"
                min={1}
                suffix="m²"
                value={formState.surface}
                onChange={(surfaceValue) => setFormState((previousState) => ({ ...previousState, surface: surfaceValue }))}
                onNext={handleNextStep}
                onPrevious={handlePreviousStep}
              />
            )}
            {currentStep === 8 && (
              <IncomeCategoryStep
                incomeOptions={incomeOptions}
                isIncomeOptionsLoading={isIncomeOptionsLoading}
                selectedValue={formState.incomeCategory}
                onSelect={(incomeCategory) => setFormState((previousState) => ({ ...previousState, incomeCategory }))}
                onNext={handleNextStep}
                onPrevious={handlePreviousStep}
              />
            )}
            {currentStep === RESULT_STEP && (
              <SimulationResultStep
                errorMessage={errorMessage}
                isSubmitting={isSubmitting}
                result={result}
                onPrevious={handlePreviousStep}
                onRestart={handleRestart}
                onRetry={() => void runSimulation(formState, setResult, setErrorMessage, setIsSubmitting)}
              />
            )}
          </>
        )}

        {errorMessage && currentStep !== RESULT_STEP && (
          <div className="fr-alert fr-alert--error fr-mt-4w">
            <p>{errorMessage}</p>
          </div>
        )}
      </section>
    </main>
  );
}

type StepperProps = {
  currentStep: number;
};

/**
 * Displays the DSFR stepper for the current journey step.
 */
function Stepper({ currentStep }: StepperProps) {
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

type OwnerStatusStepProps = {
  selectedValue: OwnerStatus | null;
  onSelect: (ownerStatus: OwnerStatus) => void;
};

/**
 * Asks whether the visitor owns or rents the home.
 */
function OwnerStatusStep({ selectedValue, onSelect }: OwnerStatusStepProps) {
  return (
    <ChoiceStep
      legend="Quelle est votre situation ?"
      name="ownerStatus"
      options={[
        { label: 'Propriétaire', value: 'owner' },
        { label: 'Locataire', value: 'tenant' },
      ]}
      selectedValue={selectedValue}
      onSelect={onSelect}
    />
  );
}

type HousingTypeStepProps = {
  selectedValue: HousingType | null;
  onSelect: (housingType: HousingType) => void;
};

/**
 * Asks for the housing type before the PAC journey continues.
 */
function HousingTypeStep({ selectedValue, onSelect }: HousingTypeStepProps) {
  return (
    <ChoiceStep
      legend="Quel est le type de votre logement ?"
      name="housingType"
      options={[
        { label: 'Maison individuelle', value: 'house' },
        { label: 'Appartement', value: 'apartment' },
      ]}
      selectedValue={selectedValue}
      onSelect={onSelect}
    />
  );
}

type HeatingEquipmentStepProps = {
  selectedValue: HeatingEquipment | null;
  onSelect: (heatingEquipment: HeatingEquipment) => void;
};

/**
 * Asks for the current heating equipment.
 */
function HeatingEquipmentStep({ selectedValue, onSelect }: HeatingEquipmentStepProps) {
  return (
    <ChoiceStep
      legend="Quel est votre équipement actuel ?"
      name="heatingEquipment"
      options={[
        { label: 'Chaudière au gaz', value: 'gas-boiler' },
        { label: 'Chaudière au fioul', value: 'oil-boiler' },
        { label: 'Radiateur électrique', value: 'electric-radiator' },
      ]}
      selectedValue={selectedValue}
      onSelect={onSelect}
    />
  );
}

type AddressStepProps = {
  address: string;
  addressSuggestions: AddressSuggestion[];
  isAddressLoading: boolean;
  selectedAddress: AddressSuggestion | null;
  onAddressChange: (address: string) => void;
  onAddressSelect: (selectedAddress: AddressSuggestion) => void;
  onNext: () => void;
  onPrevious: () => void;
};

/**
 * Lets the visitor search and select an official address.
 */
function AddressStep({
  address,
  addressSuggestions,
  isAddressLoading,
  selectedAddress,
  onAddressChange,
  onAddressSelect,
  onNext,
  onPrevious,
}: AddressStepProps) {
  return (
    <div className="step-content">
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="address">
          Votre adresse
          <span className="fr-hint-text">Sélectionnez une adresse dans la liste pour continuer.</span>
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
              <li key={`${suggestion.cityCode}-${suggestion.label}`}>
                <button className="fr-btn fr-btn--tertiary-no-outline" type="button" onClick={() => onAddressSelect(suggestion)}>
                  {suggestion.label}
                </button>
              </li>
            ))}
          </ul>
        )}
        {selectedAddress && <p className="fr-valid-text">Adresse sélectionnée : {selectedAddress.label}</p>}
      </div>
      <StepActions isNextDisabled={!selectedAddress} onNext={onNext} onPrevious={onPrevious} />
    </div>
  );
}

type DpeStepProps = {
  selectedValue: DpeInput;
  onSelect: (dpe: DpeInput) => void;
  onNext: () => void;
  onPrevious: () => void;
};

/**
 * Captures the home's DPE label, including an unknown option.
 */
function DpeStep({ selectedValue, onSelect, onNext, onPrevious }: DpeStepProps) {
  return (
    <div className="step-content">
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend fr-text--regular">Votre DPE</legend>
        <div className="dpe-options">
          {DPE_VALUES.map((dpeValue) => (
            <div className="fr-radio-group fr-radio-rich" key={dpeValue}>
              <input
                checked={selectedValue === dpeValue}
                id={`dpe-${dpeValue}`}
                name="dpe"
                onChange={() => onSelect(dpeValue)}
                type="radio"
              />
              <label className="fr-label" htmlFor={`dpe-${dpeValue}`}>
                <span className={`dpe-tag dpe-${dpeValue.toLowerCase()}`}>{dpeValue === 'unknown' ? 'Je ne sais pas' : dpeValue}</span>
              </label>
            </div>
          ))}
        </div>
      </fieldset>
      <StepActions onNext={onNext} onPrevious={onPrevious} />
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
  onNext: () => void;
  onPrevious: () => void;
};

/**
 * Captures a numeric simulation parameter.
 */
function NumberStep({ inputId, label, min, suffix, value, onChange, onNext, onPrevious }: NumberStepProps) {
  const numericValue = Number(value);
  const isNextDisabled = !Number.isFinite(numericValue) || numericValue < min;

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
      <StepActions isNextDisabled={isNextDisabled} onNext={onNext} onPrevious={onPrevious} />
    </div>
  );
}

type IncomeCategoryStepProps = {
  incomeOptions: IncomeOption[];
  isIncomeOptionsLoading: boolean;
  selectedValue: IncomeCategory;
  onSelect: (incomeCategory: IncomeCategory) => void;
  onNext: () => void;
  onPrevious: () => void;
};

/**
 * Captures the MaPrimeRénov' income category.
 */
function IncomeCategoryStep({
  incomeOptions,
  isIncomeOptionsLoading,
  selectedValue,
  onSelect,
  onNext,
  onPrevious,
}: IncomeCategoryStepProps) {
  const displayedOptions = incomeOptions.length > 0 ? incomeOptions : getFallbackIncomeOptions();

  return (
    <div className="step-content">
      <fieldset className="fr-fieldset">
        <legend className="fr-fieldset__legend fr-text--regular">Catégorie MaPrimeRénov’</legend>
        {isIncomeOptionsLoading && <p className="fr-hint-text">Chargement des plafonds de revenus…</p>}
        <div className="income-options">
          {displayedOptions.map((incomeOption) => (
            <div className="fr-radio-group" key={incomeOption.value}>
              <input
                checked={selectedValue === incomeOption.value}
                id={`income-${incomeOption.value}`}
                name="incomeCategory"
                onChange={() => onSelect(incomeOption.value)}
                type="radio"
              />
              <label className="fr-label" htmlFor={`income-${incomeOption.value}`}>
                {incomeOption.label}
                <span className="fr-hint-text">{incomeOption.help}</span>
              </label>
            </div>
          ))}
        </div>
      </fieldset>
      <StepActions nextLabel="Voir le résultat" onNext={onNext} onPrevious={onPrevious} />
    </div>
  );
}

type ChoiceStepProps<TValue extends string> = {
  legend: string;
  name: string;
  options: {
    label: string;
    value: TValue;
  }[];
  selectedValue: TValue | null;
  onSelect: (value: TValue) => void;
};

/**
 * Displays DSFR radio choices that move the journey forward immediately.
 */
function ChoiceStep<TValue extends string>({ legend, name, options, selectedValue, onSelect }: ChoiceStepProps<TValue>) {
  return (
    <fieldset className="fr-fieldset choice-fieldset">
      <legend className="fr-fieldset__legend fr-text--regular">{legend}</legend>
      <div className="choice-options">
        {options.map((option) => (
          <div className="fr-radio-group fr-radio-rich" key={option.value}>
            <input
              checked={selectedValue === option.value}
              id={`${name}-${option.value}`}
              name={name}
              onChange={() => onSelect(option.value)}
              type="radio"
            />
            <label className="fr-label" htmlFor={`${name}-${option.value}`}>
              {option.label}
            </label>
          </div>
        ))}
      </div>
    </fieldset>
  );
}

type StepActionsProps = {
  isNextDisabled?: boolean;
  nextLabel?: string;
  onNext: () => void;
  onPrevious: () => void;
};

/**
 * Displays journey navigation controls.
 */
function StepActions({ isNextDisabled = false, nextLabel = 'Continuer', onNext, onPrevious }: StepActionsProps) {
  return (
    <div className="step-actions">
      <button className="fr-btn fr-btn--secondary" type="button" onClick={onPrevious}>
        Précédent
      </button>
      <button className="fr-btn" disabled={isNextDisabled} type="button" onClick={onNext}>
        {nextLabel}
      </button>
    </div>
  );
}

type RecommendationScreenProps = {
  outcome: Exclude<RouteOutcome, 'continue'>;
  onPrevious: () => void;
  onRestart: () => void;
};

/**
 * Redirects visitors to the service better suited to their situation.
 */
function RecommendationScreen({ outcome, onPrevious, onRestart }: RecommendationScreenProps) {
  const recommendation = getRecommendation(outcome);

  return (
    <section className="step-content recommendation-panel">
      <h3>{recommendation.title}</h3>
      <p className="fr-text--lead">{recommendation.description}</p>
      <div className="step-actions">
        <button className="fr-btn fr-btn--secondary" type="button" onClick={onPrevious}>
          Précédent
        </button>
        <button className="fr-btn fr-btn--tertiary" type="button" onClick={onRestart}>
          Recommencer
        </button>
        <a className="fr-btn" href={recommendation.url}>
          {recommendation.ctaLabel}
        </a>
      </div>
    </section>
  );
}

type SimulationResultStepProps = {
  errorMessage: string | null;
  isSubmitting: boolean;
  result: SimulationResult | null;
  onPrevious: () => void;
  onRestart: () => void;
  onRetry: () => void;
};

/**
 * Displays the simulation loading, error and success states.
 */
function SimulationResultStep({ errorMessage, isSubmitting, result, onPrevious, onRestart, onRetry }: SimulationResultStepProps) {
  return (
    <section className="step-content result-panel">
      {isSubmitting && <p className="fr-text--lead">Calcul en cours…</p>}
      {errorMessage && (
        <div className="fr-alert fr-alert--error">
          <p>{errorMessage}</p>
        </div>
      )}
      {result && <Results result={result} />}
      <div className="step-actions">
        <button className="fr-btn fr-btn--secondary" type="button" onClick={onPrevious}>
          Précédent
        </button>
        <button className="fr-btn fr-btn--tertiary" type="button" onClick={onRestart}>
          Recommencer
        </button>
        {errorMessage && (
          <button className="fr-btn" disabled={isSubmitting} type="button" onClick={onRetry}>
            Relancer le calcul
          </button>
        )}
      </div>
    </section>
  );
}

type ResultsProps = {
  result: SimulationResult;
};

/**
 * Displays the API simulation result.
 */
function Results({ result }: ResultsProps) {
  const annualBillRows = getAnnualBillRows(result);
  const maxAnnualBill = Math.max(...annualBillRows.map((annualBillRow) => annualBillRow.amount), 1);
  const estimatedAid = result.heatPumpMaprimerenovAid + result.heatPumpBoilerReplacementBonus;
  const boilerAverageAnnualBill = (result.gasBoilerAnnualBill + result.oilBoilerAnnualBill) / 2;
  const annualSavings = Math.max(boilerAverageAnnualBill - result.heatPumpAnnualBill, 0);
  const paybackYears = annualSavings > 0 ? Math.ceil(result.heatPumpNetPrice / annualSavings) : null;
  const heatPumpComparison = result.heatingModeComparisons.find((comparison) => comparison.label === 'PAC air/eau');
  const boilerComparisonWithHighestCo2 = result.heatingModeComparisons
    .filter((comparison) => comparison.label !== 'PAC air/eau')
    .sort((firstComparison, secondComparison) => secondComparison.co2 - firstComparison.co2)[0];
  const avoidedCo2 =
    heatPumpComparison && boilerComparisonWithHighestCo2 ? Math.max(boilerComparisonWithHighestCo2.co2 - heatPumpComparison.co2, 0) : 0;

  return (
    <section className="simulation-summary">
      <div className="summary-grid">
        <article className="summary-card summary-card-main">
          <span>Reste à charge estimé</span>
          <strong>{formatCurrency(result.heatPumpNetPrice)}</strong>
          <dl>
            <div>
              <dt>Prix moyen brut</dt>
              <dd>{formatCurrency(result.heatPumpGrossPrice)}</dd>
            </div>
            <div>
              <dt>Aides estimées</dt>
              <dd>- {formatCurrency(estimatedAid)}</dd>
            </div>
          </dl>
        </article>

        <article className="summary-card summary-card-highlight">
          <span>Économie d’énergie estimée</span>
          <strong>≈ {formatCurrency(annualSavings)} / an</strong>
          <p>{paybackYears ? `Retour sur investissement en ≈ ${paybackYears} ans` : 'Retour sur investissement à préciser'}</p>
        </article>

        <article className="summary-card summary-card-compact">
          <span>Puissance PAC recommandée</span>
          <strong>{formatNumber(result.heatPumpProposedPower)} kW</strong>
        </article>

        <article className="summary-card summary-card-compact">
          <span>CO² évité par an</span>
          <strong>- {formatNumber(avoidedCo2)} t</strong>
        </article>
      </div>

      <AnnualBillsChart annualBillRows={annualBillRows} maxAnnualBill={maxAnnualBill} />

      <article className="boiler-callout">
        <h3>Et si vous deviez remplacer votre chaudière ?</h3>
        <p>
          Une nouvelle chaudière, c’est un investissement d’environ 5 000 €, mais une facture qui reste à{' '}
          {formatAnnualRange(boilerAverageAnnualBill)} par an. À budget égal, la PAC économise ≈ {formatCurrency(annualSavings)} / an.
        </p>
      </article>
    </section>
  );
}

type AnnualBillRow = {
  amount: number;
  colorClassName: string;
  co2: number;
  label: string;
};

type AnnualBillsChartProps = {
  annualBillRows: AnnualBillRow[];
  maxAnnualBill: number;
};

/**
 * Displays yearly heating bills as horizontal comparison bars.
 */
function AnnualBillsChart({ annualBillRows, maxAnnualBill }: AnnualBillsChartProps) {
  return (
    <section className="annual-bills" aria-labelledby="annual-bills-title">
      <div className="annual-bills-heading">
        <h3 id="annual-bills-title">Factures annuelles (chauffage et eau chaude)</h3>
        <span>estimation hors entretien</span>
      </div>
      <div className="annual-bills-list">
        {annualBillRows.map((annualBillRow) => (
          <div className="annual-bill-row" key={annualBillRow.label}>
            <strong>{annualBillRow.label}</strong>
            <div className="annual-bill-track" aria-hidden="true">
              <div
                className={`annual-bill-value ${annualBillRow.colorClassName}`}
                style={{ width: `${Math.max((annualBillRow.amount / maxAnnualBill) * 100, 4)}%` }}
              />
            </div>
            <span>{formatAnnualRange(annualBillRow.amount)}</span>
            <small>{formatNumber(annualBillRow.co2)} tCO²/an</small>
          </div>
        ))}
      </div>
      <div className="annual-bills-scale" aria-hidden="true">
        <span>0</span>
        <span>{formatCurrency(maxAnnualBill / 2)}</span>
        <span>{formatCurrency(maxAnnualBill)}</span>
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
    dpe: getSearchParamValue(searchParams, 'dpe', DPE_VALUES) ?? INITIAL_FORM_STATE.dpe,
    heatingEquipment: getSearchParamValue(searchParams, 'equipment', HEATING_EQUIPMENT_VALUES),
    housingType: getSearchParamValue(searchParams, 'housing', HOUSING_TYPE_VALUES),
    incomeCategory: getSearchParamValue(searchParams, 'incomeCategory', INCOME_CATEGORY_VALUES) ?? INITIAL_FORM_STATE.incomeCategory,
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
  const cityCode = searchParams.get('cityCode');
  const departmentCode = searchParams.get('departmentCode');
  const latitude = Number(searchParams.get('latitude'));
  const longitude = Number(searchParams.get('longitude'));
  const postcode = searchParams.get('postcode');

  if (!label || !cityCode || !departmentCode || !postcode || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
    return null;
  }

  return {
    city: searchParams.get('city') ?? '',
    cityCode,
    departmentCode,
    label,
    latitude,
    longitude,
    postcode,
  } satisfies AddressSuggestion;
}

function getInitialStep(searchParams: URLSearchParams, formState: FormState) {
  const requestedStep = Number(searchParams.get('step'));
  const fallbackStep = getLastAvailableStep(formState);

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

  return RESULT_STEP;
}

function getSearchParams(formState: FormState, currentStep: number) {
  const searchParams = new URLSearchParams();
  searchParams.set('step', String(currentStep));

  setOptionalSearchParam(searchParams, 'situation', formState.ownerStatus);
  setOptionalSearchParam(searchParams, 'housing', formState.housingType);
  setOptionalSearchParam(searchParams, 'equipment', formState.heatingEquipment);
  setOptionalSearchParam(searchParams, 'address', formState.address);
  setOptionalSearchParam(searchParams, 'dpe', formState.dpe);
  setOptionalSearchParam(searchParams, 'occupants', formState.occupants);
  setOptionalSearchParam(searchParams, 'surface', formState.surface);
  setOptionalSearchParam(searchParams, 'incomeCategory', formState.incomeCategory);

  if (formState.selectedAddress) {
    searchParams.set('city', formState.selectedAddress.city);
    searchParams.set('cityCode', formState.selectedAddress.cityCode);
    searchParams.set('departmentCode', formState.selectedAddress.departmentCode);
    searchParams.set('latitude', String(formState.selectedAddress.latitude));
    searchParams.set('longitude', String(formState.selectedAddress.longitude));
    searchParams.set('postcode', formState.selectedAddress.postcode);
  }

  return searchParams;
}

function setOptionalSearchParam(searchParams: URLSearchParams, key: string, value: string | null) {
  if (!value) {
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

function getRecommendation(outcome: Exclude<RouteOutcome, 'continue'>) {
  if (outcome === 'apartment') {
    return {
      ctaLabel: 'Découvrir la chaleur renouvelable',
      description: 'Pour un appartement, le raccordement à une solution de chaleur renouvelable collective est le parcours le plus adapté.',
      title: 'Un autre accompagnement est plus adapté',
      url: HEAT_NETWORK_URL,
    };
  }

  return {
    ctaLabel: 'Aller sur Watt Watchers',
    description: 'Votre situation correspond mieux à un accompagnement dédié aux économies d’énergie et aux usages du logement.',
    title: 'Un autre service peut vous accompagner',
    url: WATTWATCHERS_URL,
  };
}

async function runSimulation(
  formState: FormState,
  setResult: (result: SimulationResult | null) => void,
  setErrorMessage: (errorMessage: string | null) => void,
  setIsSubmitting: (isSubmitting: boolean) => void
) {
  setResult(null);
  setErrorMessage(null);

  if (!formState.selectedAddress) {
    setErrorMessage('Sélectionnez une adresse dans la liste.');
    return;
  }

  const selectedAddress = formState.selectedAddress;
  setIsSubmitting(true);

  try {
    const response = await fetch(`${import.meta.env.VITE_FCU_API_BASE_URL ?? DEFAULT_API_BASE_URL}/api/pac/simulation`, {
      body: JSON.stringify({
        cityCode: selectedAddress.cityCode,
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

function getFallbackIncomeOptions() {
  return INCOME_CATEGORY_VALUES.map((incomeCategory) => ({
    help: 'Sélectionnez cette option si elle correspond à votre catégorie MaPrimeRénov’.',
    label: incomeCategory,
    value: incomeCategory,
  }));
}

function getAnnualBillRows(result: SimulationResult) {
  return [
    {
      amount: result.heatPumpAnnualBill,
      co2: getComparisonCo2(result.heatingModeComparisons, 'PAC air/eau'),
      colorClassName: 'annual-bill-pac',
      label: 'PAC air/eau',
    },
    {
      amount: result.gasBoilerAnnualBill,
      co2: getComparisonCo2(result.heatingModeComparisons, 'Chaudière gaz condensation'),
      colorClassName: 'annual-bill-gas',
      label: 'Chaudière gaz',
    },
    {
      amount: result.oilBoilerAnnualBill,
      co2: getComparisonCo2(result.heatingModeComparisons, 'Chaudière fioul'),
      colorClassName: 'annual-bill-oil',
      label: 'Chaudière fioul',
    },
  ] satisfies AnnualBillRow[];
}

function getComparisonCo2(comparisons: HeatingModeComparison[], label: string) {
  return comparisons.find((comparison) => comparison.label === label)?.co2 ?? 0;
}

function toAddressSuggestion(feature: BanFeature): AddressSuggestion {
  return {
    city: feature.properties.city,
    cityCode: feature.properties.citycode,
    departmentCode: feature.properties.context.split(',')[0] ?? feature.properties.postcode.slice(0, 2),
    label: feature.properties.label,
    latitude: feature.geometry.coordinates[1],
    longitude: feature.geometry.coordinates[0],
    postcode: feature.properties.postcode,
  };
}

function getHeatingModeComparisons(breakdowns: HeatingCostBreakdown[], formState: FormState, selectedAddress: AddressSuggestion) {
  const engine = new Engine<RuleName>(publicodesRules, PUBLICODES_ENGINE_OPTIONS);

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

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    currency: 'EUR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function formatAnnualRange(value: number) {
  const lowValue = Math.round((value * 0.9) / 10) * 10;
  const highValue = Math.round((value * 1.1) / 10) * 10;

  return `${formatCurrency(lowValue)} - ${formatCurrency(highValue)}/an`;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value);
}
