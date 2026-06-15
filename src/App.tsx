import { type FormEvent, useEffect, useMemo, useState } from 'react';

const DPE_VALUES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const INCOME_CATEGORY_VALUES = ['very_low', 'low', 'middle', 'high'] as const;
const ILE_DE_FRANCE_DEPARTMENTS = new Set(['75', '77', '78', '91', '92', '93', '94', '95']);
const DEFAULT_API_BASE_URL = 'http://localhost:3000';

type Dpe = (typeof DPE_VALUES)[number];
type IncomeCategory = (typeof INCOME_CATEGORY_VALUES)[number];

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
  heatPumpGrossPrice: number;
  heatPumpNetPrice: number;
  heatPumpProposedPower: number;
};

type FormState = {
  address: string;
  dpe: Dpe;
  incomeCategory: IncomeCategory;
  occupants: string;
  selectedAddress: AddressSuggestion | null;
  surface: string;
};

const INITIAL_FORM_STATE = {
  address: '',
  dpe: 'D',
  incomeCategory: 'low',
  occupants: '2',
  selectedAddress: null,
  surface: '90',
} satisfies FormState;

const INCOME_LABELS = {
  high: 'Supérieurs',
  low: 'Modestes',
  middle: 'Intermédiaires',
  very_low: 'Très modestes',
} satisfies Record<IncomeCategory, string>;

const INCOME_THRESHOLDS = {
  ileDeFrance: {
    low: [28933, 42463, 51000, 59549, 68098],
    middle: [40404, 59394, 71060, 83637, 95631],
    very_low: [23768, 34884, 41893, 48914, 55961],
  },
  other: {
    low: [22015, 32197, 38719, 45234, 51775],
    middle: [30844, 45340, 54592, 63844, 75094],
    very_low: [17173, 25115, 30206, 35285, 40388],
  },
} as const;

const ADDITIONAL_PERSON_THRESHOLDS = {
  ileDeFrance: {
    low: 8568,
    middle: 11995,
    very_low: 6970,
  },
  other: {
    low: 6525,
    middle: 11254,
    very_low: 5094,
  },
} as const;

/**
 * Main IFPEN simulator form.
 */
export function App() {
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const occupants = Number(formState.occupants);
  const isIleDeFrance = formState.selectedAddress ? ILE_DE_FRANCE_DEPARTMENTS.has(formState.selectedAddress.departmentCode) : false;
  const incomeOptions = useMemo(
    () => getIncomeOptions(Number.isFinite(occupants) ? occupants : 1, isIleDeFrance),
    [isIleDeFrance, occupants]
  );

  useEffect(() => {
    setErrorMessage(null);
    if (formState.address.length < 3) {
      setAddressSuggestions([]);
      return;
    }

    const abortController = new AbortController();
    setIsAddressLoading(true);

    fetch(`https://api-adresse.data.gouv.fr/search/?q=${encodeURIComponent(formState.address)}&limit=5`, {
      signal: abortController.signal,
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error('Erreur lors de la recherche d’adresse');
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
  }, [formState.address]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setResult(null);
    setErrorMessage(null);

    if (!formState.selectedAddress) {
      setErrorMessage('Sélectionnez une adresse dans la liste.');
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_FCU_API_BASE_URL ?? DEFAULT_API_BASE_URL}/api/ifpen/heating-simulation`, {
        body: JSON.stringify({
          cityCode: formState.selectedAddress.cityCode,
          departmentCode: formState.selectedAddress.departmentCode,
          dpe: formState.dpe,
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
        throw new Error('Erreur API');
      }

      setResult((await response.json()) as SimulationResult);
    } catch {
      setErrorMessage('Le calcul est momentanément indisponible.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <main className="fr-container app-shell">
      <section className="fr-py-6w">
        <h1>Comparateur IFPEN</h1>
        <p className="fr-text--lead">Renseignez le logement pour estimer la puissance, le coût net d’aides et les factures comparées.</p>
      </section>

      <div className="app-layout fr-pb-8w">
        <form className="app-form" onSubmit={handleSubmit}>
          <div className="fr-input-group">
            <label className="fr-label" htmlFor="address">
              Adresse
            </label>
            <input
              className="fr-input"
              id="address"
              name="address"
              type="search"
              value={formState.address}
              onChange={(event) =>
                setFormState((previousState) => ({
                  ...previousState,
                  address: event.target.value,
                  selectedAddress: null,
                }))
              }
              required
            />
            {isAddressLoading && <p className="fr-hint-text">Recherche en cours…</p>}
            {addressSuggestions.length > 0 && (
              <ul className="address-suggestions">
                {addressSuggestions.map((suggestion) => (
                  <li key={`${suggestion.cityCode}-${suggestion.label}`}>
                    <button
                      className="fr-btn fr-btn--tertiary-no-outline"
                      type="button"
                      onClick={() => {
                        setFormState((previousState) => ({
                          ...previousState,
                          address: suggestion.label,
                          selectedAddress: suggestion,
                        }));
                        setAddressSuggestions([]);
                      }}
                    >
                      {suggestion.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">DPE</legend>
            <div className="dpe-options">
              {DPE_VALUES.map((dpeValue) => (
                <div className="fr-radio-group fr-radio-rich" key={dpeValue}>
                  <input
                    checked={formState.dpe === dpeValue}
                    id={`dpe-${dpeValue}`}
                    name="dpe"
                    onChange={() => setFormState((previousState) => ({ ...previousState, dpe: dpeValue }))}
                    type="radio"
                  />
                  <label className={`fr-label dpe-tag dpe-${dpeValue.toLowerCase()}`} htmlFor={`dpe-${dpeValue}`}>
                    {dpeValue}
                  </label>
                </div>
              ))}
            </div>
          </fieldset>
          <div className="form-grid">
            <div className="fr-input-group">
              <label className="fr-label" htmlFor="occupants">
                Nombre de personnes
              </label>
              <input
                className="fr-input"
                id="occupants"
                min="1"
                name="occupants"
                type="number"
                value={formState.occupants}
                onChange={(event) => setFormState((previousState) => ({ ...previousState, occupants: event.target.value }))}
                required
              />
            </div>

            <div className="fr-input-group">
              <label className="fr-label" htmlFor="surface">
                Surface chauffée (en m²)
              </label>
              <input
                className="fr-input"
                id="surface"
                min="1"
                name="surface"
                type="number"
                value={formState.surface}
                onChange={(event) => setFormState((previousState) => ({ ...previousState, surface: event.target.value }))}
                required
              />
            </div>
          </div>

          <fieldset className="fr-fieldset">
            <legend className="fr-fieldset__legend">Catégorie de revenus MaPrimeRénov’</legend>
            <p className="fr-hint-text">Les plafonds affichés s’adaptent à la zone détectée et au nombre de personnes du ménage.</p>
            {incomeOptions.map((incomeOption) => (
              <div className="fr-radio-group" key={incomeOption.value}>
                <input
                  checked={formState.incomeCategory === incomeOption.value}
                  id={`income-${incomeOption.value}`}
                  name="incomeCategory"
                  onChange={() => setFormState((previousState) => ({ ...previousState, incomeCategory: incomeOption.value }))}
                  type="radio"
                />
                <label className="fr-label" htmlFor={`income-${incomeOption.value}`}>
                  {incomeOption.label}
                  <span className="fr-hint-text">{incomeOption.help}</span>
                </label>
              </div>
            ))}
          </fieldset>

          {errorMessage && (
            <div className="fr-alert fr-alert--error">
              <p>{errorMessage}</p>
            </div>
          )}

          <button className="fr-btn" disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Calcul en cours…' : 'Calculer'}
          </button>
        </form>

        <aside className="result-panel">
          {result ? (
            <Results result={result} />
          ) : (
            <p className="fr-text--lead">Les résultats apparaîtront après validation du formulaire.</p>
          )}
        </aside>
      </div>
    </main>
  );
}

type ResultsProps = {
  result: SimulationResult;
};

/**
 * Displays the API simulation result.
 */
function Results({ result }: ResultsProps) {
  return (
    <section>
      <h2>Résultats</h2>
      <dl className="result-list">
        <ResultRow label="Puissance PAC air/eau proposée" value={`${formatNumber(result.heatPumpProposedPower)} kW`} />
        <ResultRow label="Prix PAC air/eau brut" value={formatCurrency(result.heatPumpGrossPrice)} />
        <ResultRow label="Prix PAC air/eau net" value={formatCurrency(result.heatPumpNetPrice)} />
        <ResultRow label="Facture PAC air/eau" value={`${formatCurrency(result.heatPumpAnnualBill)} / an`} />
        <ResultRow label="Facture chaudière gaz" value={`${formatCurrency(result.gasBoilerAnnualBill)} / an`} />
        <ResultRow label="Facture chaudière fioul" value={`${formatCurrency(result.oilBoilerAnnualBill)} / an`} />
      </dl>
    </section>
  );
}

type ResultRowProps = {
  label: string;
  value: string;
};

/**
 * Displays one simulation metric.
 */
function ResultRow({ label, value }: ResultRowProps) {
  return (
    <div className="result-row">
      <dt>{label}</dt>
      <dd>{value}</dd>
    </div>
  );
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

function getIncomeOptions(occupants: number, isIleDeFrance: boolean) {
  const zone = isIleDeFrance ? 'ileDeFrance' : 'other';
  const veryLowThreshold = getIncomeThreshold(zone, occupants, 'very_low');
  const lowThreshold = getIncomeThreshold(zone, occupants, 'low');
  const middleThreshold = getIncomeThreshold(zone, occupants, 'middle');

  return [
    {
      help: `Revenu fiscal de référence inférieur ou égal à ${formatCurrency(veryLowThreshold)}.`,
      label: INCOME_LABELS.very_low,
      value: 'very_low',
    },
    {
      help: `De ${formatCurrency(veryLowThreshold + 1)} à ${formatCurrency(lowThreshold)}.`,
      label: INCOME_LABELS.low,
      value: 'low',
    },
    {
      help: `De ${formatCurrency(lowThreshold + 1)} à ${formatCurrency(middleThreshold)}.`,
      label: INCOME_LABELS.middle,
      value: 'middle',
    },
    {
      help: `Supérieur à ${formatCurrency(middleThreshold)}.`,
      label: INCOME_LABELS.high,
      value: 'high',
    },
  ] satisfies { help: string; label: string; value: IncomeCategory }[];
}

function getIncomeThreshold(zone: 'ileDeFrance' | 'other', occupants: number, category: Exclude<IncomeCategory, 'high'>) {
  const normalizedOccupants = Math.max(1, Math.floor(occupants));
  const baseThresholds = INCOME_THRESHOLDS[zone][category];

  return normalizedOccupants <= baseThresholds.length
    ? baseThresholds[normalizedOccupants - 1]
    : baseThresholds.at(-1)! + (normalizedOccupants - baseThresholds.length) * ADDITIONAL_PERSON_THRESHOLDS[zone][category];
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    currency: 'EUR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value);
}
