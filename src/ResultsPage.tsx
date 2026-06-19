import type { HeatingModeComparison, RouteOutcome, SimulationResult } from './types';

const WATTWATCHERS_URL = 'https://www.wattwatchers.fr/';
const HEAT_NETWORK_URL = 'https://france-chaleur-urbaine.beta.gouv.fr/chaleur-renouvelable';

type ResultsPageProps = {
  errorMessage: string | null;
  isSubmitting: boolean;
  outcome: RouteOutcome;
  result: SimulationResult | null;
  onPrevious: () => void;
  onRestart: () => void;
  onRetry: () => void;
};

export function ResultsPage({ errorMessage, isSubmitting, outcome, result, onPrevious, onRestart, onRetry }: ResultsPageProps) {
  return (
    <>
      <h2 id="step-title">Résultat de la simulation</h2>
      {outcome === 'continue' ? (
        <SimulationResultContent
          errorMessage={errorMessage}
          isSubmitting={isSubmitting}
          result={result}
          onPrevious={onPrevious}
          onRestart={onRestart}
          onRetry={onRetry}
        />
      ) : (
        <RecommendationContent outcome={outcome} />
      )}
    </>
  );
}

function RecommendationContent({ outcome }: { outcome: Exclude<RouteOutcome, 'continue'> }) {
  const recommendation = getRecommendation(outcome);

  return (
    <section className="step-content">
      <p className="fr-text--lead">{recommendation.description}</p>
      <div className="fr-grid-row fr-grid-row--center fr-mt-6v">
        <a className="fr-btn" href={recommendation.url}>
          {recommendation.ctaLabel}
        </a>
      </div>
    </section>
  );
}

type SimulationResultContentProps = {
  errorMessage: string | null;
  isSubmitting: boolean;
  result: SimulationResult | null;
  onPrevious: () => void;
  onRestart: () => void;
  onRetry: () => void;
};

function SimulationResultContent({ errorMessage, isSubmitting, result, onPrevious, onRestart, onRetry }: SimulationResultContentProps) {
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

function Results({ result }: { result: SimulationResult }) {
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

function AnnualBillsChart({ annualBillRows, maxAnnualBill }: { annualBillRows: AnnualBillRow[]; maxAnnualBill: number }) {
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

function getRecommendation(outcome: Exclude<RouteOutcome, 'continue'>) {
  if (outcome === 'apartment') {
    return {
      ctaLabel: 'Découvrir la chaleur renouvelable',
      description:
        'Rendez-vous sur le service public France Chaleur Urbaine pour découvrir le système de chauffage économique et écologique le plus adapté à votre bâtiment. ',
      title: 'Un autre accompagnement est plus adapté',
      url: HEAT_NETWORK_URL,
    };
  }

  return {
    ctaLabel: 'Aller sur Watt Watchers',
    description: 'L’installation d’une PAC Air/Eau n’est pas recommandée dans votre maison, des solutions alternatives existent.',
    title: 'Un autre service peut vous accompagner',
    url: WATTWATCHERS_URL,
  };
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
