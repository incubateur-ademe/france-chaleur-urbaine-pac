import type { RuleName } from '@betagouv/france-chaleur-urbaine-publicodes';
import publicodesRules from '@betagouv/france-chaleur-urbaine-publicodes';
import Engine from 'publicodes';
import { type FormEvent, useEffect, useState } from 'react';

const DPE_VALUES = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;
const INCOME_CATEGORY_VALUES = ['Très modeste', 'Modeste', 'Intermédiaire', 'Supérieur'] as const;
const DEFAULT_API_BASE_URL = 'http://localhost:3000';
const DEFAULT_TEMPERATURE_REFERENCE = -7;

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
  dpe: Dpe;
  incomeCategory: IncomeCategory;
  occupants: string;
  selectedAddress: AddressSuggestion | null;
  surface: string;
};

const INITIAL_FORM_STATE = {
  address: '',
  dpe: 'D',
  incomeCategory: 'Modeste',
  occupants: '2',
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
  const [formState, setFormState] = useState<FormState>(INITIAL_FORM_STATE);
  const [addressSuggestions, setAddressSuggestions] = useState<AddressSuggestion[]>([]);
  const [incomeOptions, setIncomeOptions] = useState<IncomeOption[]>([]);
  const [isAddressLoading, setIsAddressLoading] = useState(false);
  const [isIncomeOptionsLoading, setIsIncomeOptionsLoading] = useState(false);
  const [result, setResult] = useState<SimulationResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const occupants = Number(formState.occupants);

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
          throw new Error('Erreur API');
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
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
  };

  return (
    <main className="fr-container app-shell">
      <section className="fr-py-6w">
        <h1>Comparateur PAC</h1>
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
                  <label className="fr-label" htmlFor={`dpe-${dpeValue}`}>
                    <span className={`dpe-tag dpe-${dpeValue.toLowerCase()}`}>{dpeValue}</span>
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
            <div className="income-options">
              {isIncomeOptionsLoading && <p className="fr-hint-text">Chargement des plafonds de revenus…</p>}
              {!formState.selectedAddress && (
                <p className="fr-hint-text">Sélectionnez une adresse pour afficher les plafonds applicables.</p>
              )}
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
            </div>
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
        <ResultRow label="Aide MaPrimeRénov’ PAC air/eau" value={formatCurrency(result.heatPumpMaprimerenovAid)} />
        <ResultRow label="Coup de pouce remplacement chaudière" value={formatCurrency(result.heatPumpBoilerReplacementBonus)} />
        <ResultRow label="Prix PAC air/eau net" value={formatCurrency(result.heatPumpNetPrice)} />
        <ResultRow label="Facture PAC air/eau" value={`${formatCurrency(result.heatPumpAnnualBill)} / an`} />
        <ResultRow label="Facture chaudière gaz" value={`${formatCurrency(result.gasBoilerAnnualBill)} / an`} />
        <ResultRow label="Facture chaudière fioul" value={`${formatCurrency(result.oilBoilerAnnualBill)} / an`} />
      </dl>
      <HeatingModeChart comparisons={result.heatingModeComparisons} />
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

type HeatingModeChartProps = {
  comparisons: HeatingModeComparison[];
};

function HeatingModeChart({ comparisons }: HeatingModeChartProps) {
  const maxP1 = Math.max(...comparisons.map((comparison) => comparison.p1), 1);
  const maxCo2 = Math.max(...comparisons.map((comparison) => comparison.co2), 1);

  return (
    <section className="cost-chart" aria-labelledby="cost-chart-title">
      <h3 id="cost-chart-title">Comparaison énergie et CO2</h3>
      <div className="chart-legend" aria-hidden="true">
        <span>
          <i className="legend-swatch p1" /> P1
        </span>
        <span>
          <i className="legend-swatch co2" /> CO2
        </span>
      </div>
      <div className="chart-bars">
        {comparisons.map((comparison) => (
          <div className="chart-group" key={comparison.label}>
            <div className="chart-pair">
              <div className="chart-bar p1" style={{ height: `${Math.max((comparison.p1 / maxP1) * 100, 2)}%` }} />
              <div className="chart-bar co2" style={{ height: `${Math.max((comparison.co2 / maxCo2) * 100, 2)}%` }} />
            </div>
            <strong>{comparison.label}</strong>
            <span>{formatCurrency(comparison.p1)} / an</span>
            <small>CO2 {formatCo2(comparison.co2)} / an</small>
          </div>
        ))}
      </div>
    </section>
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

function getHeatingModeComparisons(breakdowns: HeatingCostBreakdown[], formState: FormState, selectedAddress: AddressSuggestion) {
  const engine = new Engine<RuleName>(publicodesRules, PUBLICODES_ENGINE_OPTIONS);

  engine.setSituation({
    'code département': `'${selectedAddress.departmentCode}'`,
    DPE: `'${formState.dpe}'`,
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

function formatCo2(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value);
}

function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 2,
  }).format(value);
}
