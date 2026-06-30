import { Stepper } from '@/Questionnaire';

import type { HeatingModeComparison, SimulationResult } from './types';

const BOILER_REPLACEMENT_PRICE = 5000;

type ResultsPageProps = {
  errorMessage: string | null;
  isSubmitting: boolean;
  result: SimulationResult | null;
  onPrevious: () => void;
  onRestart: () => void;
  onRetry: () => void;
};

/**
 * Displays the detailed PAC comparison report at the end of the simulator journey.
 */
export function ResultsPage({ errorMessage, isSubmitting, result, onPrevious, onRestart, onRetry }: ResultsPageProps) {
  return (
    <SimulationResultContent
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      result={result}
      onPrevious={onPrevious}
      onRestart={onRestart}
      onRetry={onRetry}
    />
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

/**
 * Handles loading, error and success states for the simulation result page.
 */
function SimulationResultContent({ errorMessage, isSubmitting, result, onPrevious, onRestart, onRetry }: SimulationResultContentProps) {
  return (
    <section className="step-content result-panel" aria-labelledby="step-title">
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
 * Presents the PAC result as a decision report with costs, energy and aid details.
 */
function Results({ result }: ResultsProps) {
  const annualBillRows = getAnnualBillRows(result);
  const maxAnnualBill = Math.max(...annualBillRows.map((annualBillRow) => annualBillRow.amount), 1);
  const estimatedAid = result.heatPumpMaprimerenovAid + result.heatPumpBoilerReplacementBonus;
  const boilerAverageAnnualBill = (result.gasBoilerAnnualBill + result.oilBoilerAnnualBill) / 2;
  const annualSavings = Math.max(boilerAverageAnnualBill - result.heatPumpAnnualBill, 0);
  const fifteenYearSavings = annualSavings * 15 + BOILER_REPLACEMENT_PRICE - result.heatPumpNetPrice;
  const heatPumpComparison = result.heatingModeComparisons.find((comparison) => comparison.label === 'PAC air/eau');
  const boilerComparisonWithHighestCo2 = result.heatingModeComparisons
    .filter((comparison) => comparison.label !== 'PAC air/eau')
    .sort((firstComparison, secondComparison) => secondComparison.co2 - firstComparison.co2)[0];
  const avoidedCo2 =
    heatPumpComparison && boilerComparisonWithHighestCo2 ? Math.max(boilerComparisonWithHighestCo2.co2 - heatPumpComparison.co2, 0) : 0;

  return (
    <section className="simulation-summary">
      <Stepper currentStep={8} />
      <p>
        En remplaçant votre <strong>chaudière à gaz</strong> par une <strong>pompe à chaleur air/eau</strong>, veuillez-trouver-ci dessous
        les gains économiques et écologiques pour une maison individuelle de 100 m2.
      </p>
      <ResultSummaryGrid result={result} annualSavings={annualSavings} avoidedCo2={avoidedCo2} />
      <AdvisorCallout />
      <CostAndAidDetails result={result} />
      <AnnualBillsChart annualBillRows={annualBillRows} maxAnnualBill={maxAnnualBill} />
      <FifteenYearComparison
        annualSavings={annualSavings}
        boilerAnnualBill={boilerAverageAnnualBill}
        fifteenYearSavings={fifteenYearSavings}
        heatPumpAnnualBill={result.heatPumpAnnualBill}
        heatPumpNetPrice={result.heatPumpNetPrice}
      />
      <AdvisorCallout />
      <MethodNotes />
    </section>
  );
}

type ResultSummaryGridProps = {
  annualSavings: number;
  avoidedCo2: number;
  result: SimulationResult;
};

/**
 * Shows the four headline indicators used to qualify the recommendation.
 */
function ResultSummaryGrid({ annualSavings, avoidedCo2, result }: ResultSummaryGridProps) {
  return (
    <div className="summary-grid">
      <SummaryCard
        description={`sur un prix de la PAC air/eau moyen entre ${formatCurrencyRange(result.heatPumpGrossPrice, 1000)}`}
        label="Coût d’installation (aides déduites)"
        value={formatCurrencyRange(result.heatPumpNetPrice, 500)}
        variant="primary"
      />
      <SummaryCard
        description="sur vos factures, soit un investissement amorti en ≈ 10 ans"
        label="Économies sur vos factures"
        suffix="/ an"
        value={`- ${formatCurrencyRange(annualSavings, 100)}`}
        variant="saving"
      />
      <SummaryCard
        description="Empreinte carbone moyenne d’un français : 9 t"
        label="CO² évité par an"
        value={`- ${formatNumber(avoidedCo2 / 1000)} t`}
        variant="co2"
      />
      <SummaryCard
        description={`à confirmer auprès d’un professionnel RGE`}
        label="Puissance PAC recommandée"
        value={`≈ ${formatNumber(result.heatPumpProposedPower)} kW`}
        variant="power"
      />
    </div>
  );
}

type SummaryCardProps = {
  description: string;
  label: string;
  suffix?: string;
  value: string;
  variant: 'co2' | 'power' | 'primary' | 'saving';
};

/**
 * Displays one headline metric in the result summary grid.
 */
function SummaryCard({ description, label, suffix, value, variant }: SummaryCardProps) {
  return (
    <article className={`summary-card summary-card-${variant}`}>
      {getSummaryCardIcon(variant)}
      <div className="summary-card-content">
        <h3>{label}</h3>
        <p>{description}</p>
      </div>
      <strong>
        {value}
        {suffix && <span>{suffix}</span>}
      </strong>
    </article>
  );
}

/**
 * Renders custom pictograms matching the result design reference.
 */
function getSummaryCardIcon(variant: SummaryCardProps['variant']) {
  if (variant === 'co2') {
    return <SummaryCardPictogram href="/artwork/pictograms/environment/leaf.svg" />;
  }

  if (variant === 'power') {
    return <SummaryCardPictogram href="/artwork/pictograms/environment/sun.svg" />;
  }

  return null;
}

type SummaryCardPictogramProps = {
  href: string;
};

/**
 * Displays a local DSFR pictogram with its decorative, minor and major layers.
 */
function SummaryCardPictogram({ href }: SummaryCardPictogramProps) {
  return (
    <svg className="fr-artwork summary-card-picto" aria-hidden="true" viewBox="0 0 80 80">
      <use className="fr-artwork-decorative" href={`${href}#artwork-decorative`} />
      <use className="fr-artwork-minor" href={`${href}#artwork-minor`} />
      <use className="fr-artwork-major" href={`${href}#artwork-major`} />
    </svg>
  );
}

/**
 * Promotes the France Rénov' advisory service between result sections.
 */
function AdvisorCallout() {
  return (
    <aside className="advisor-callout" aria-label="Accompagnement France Rénov’">
      <div>
        <h3>Vous souhaitez aller plus loin ?</h3>
        <p>
          Un conseiller France Rénov’ vous accompagne <strong>gratuitement et en toute neutralité</strong>.
        </p>
        <a className="fr-btn" href="https://france-renov.gouv.fr/preparer-projet/trouver-conseiller">
          Trouver un conseiller France Rénov’
        </a>
      </div>
      <img className="advisor-logo" src="/france-renov-logo.svg" alt="France Rénov’" />
    </aside>
  );
}

type CostAndAidDetailsProps = {
  result: SimulationResult;
};

/**
 * Details the installation price, aid estimates and remaining household cost.
 */
function CostAndAidDetails({ result }: CostAndAidDetailsProps) {
  const costRows = [
    {
      label: "Prix moyen d'une PAC air/eau (coût d'installation)",
      value: formatCurrency(result.heatPumpGrossPrice),
      valueClassName: 'cost-positive',
    },
    {
      label: "Aides MaPrimeRénov' estimées",
      value: `- ${formatCurrency(result.heatPumpMaprimerenovAid)}`,
      valueClassName: 'cost-negative',
    },
    {
      label: 'Aides Coup de Pouce Chauffage estimées',
      value: `- ${formatCurrency(result.heatPumpBoilerReplacementBonus)}`,
      valueClassName: 'cost-negative',
    },
    {
      label: 'Reste à charge estimé',
      value: formatCurrency(result.heatPumpNetPrice),
      valueClassName: 'cost-total',
    },
  ] satisfies CostRow[];

  return (
    <section className="result-section" aria-labelledby="cost-and-aid-title">
      <SectionHeading iconClassName="fr-icon-money-euro-circle-line" id="cost-and-aid-title" title="Coût d’installation et aides" />
      <p>
        Le montant des aides dépend de vos revenus. Plus d’infos sur <a href="https://france-renov.gouv.fr/aides">france-renov.gouv.fr</a>.
      </p>
      <div className="cost-table">
        {costRows.map((costRow) => (
          <div className="cost-row" key={costRow.label}>
            <span>{costRow.label}</span>
            <strong className={costRow.valueClassName}>{costRow.value}</strong>
          </div>
        ))}
      </div>
      <div className="fr-alert fr-alert--info">
        <p>Vous pouvez financer le reste à charge avec un éco-prêt à taux zéro (éco-PTZ), sans avance de trésorerie. En savoir plus</p>
      </div>
    </section>
  );
}

type CostRow = {
  label: string;
  value: string;
  valueClassName: string;
};

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
 * Compares yearly energy bills for the current boiler options and a PAC.
 */
function AnnualBillsChart({ annualBillRows, maxAnnualBill }: AnnualBillsChartProps) {
  return (
    <section className="result-section annual-bills" aria-labelledby="annual-bills-title">
      <div className="annual-bills-heading">
        <SectionHeading iconClassName="fr-icon-bar-chart-box-line" id="annual-bills-title" title="Votre facture énergétique annuelle" />
        <span>Comparaison entre votre chaudière actuelle et une PAC, chauffage et eau chaude compris, hors entretien.</span>
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

type FifteenYearComparisonProps = {
  annualSavings: number;
  boilerAnnualBill: number;
  fifteenYearSavings: number;
  heatPumpAnnualBill: number;
  heatPumpNetPrice: number;
};

/**
 * Projects the installation choice over fifteen years, including installation cost.
 */
function FifteenYearComparison({
  annualSavings,
  boilerAnnualBill,
  fifteenYearSavings,
  heatPumpAnnualBill,
  heatPumpNetPrice,
}: FifteenYearComparisonProps) {
  return (
    <section className="result-section" aria-labelledby="fifteen-year-title">
      <SectionHeading
        iconClassName="fr-icon-scales-3-line"
        id="fifteen-year-title"
        title="PAC ou nouvelle chaudière : le coût sur 15 ans"
      />
      <p>
        Tôt ou tard, votre chaudière devra être remplacée. À budget d’installation comparable, voici ce que chaque choix vous coûte au fil
        des années, installation et factures cumulées.
      </p>
      <div className="comparison-table">
        <div className="comparison-row comparison-row-heading">
          <span />
          <strong>Remplacer la chaudière à l’identique</strong>
          <strong className="comparison-pac-cell comparison-pac-cell-top">Installer une pompe à chaleur</strong>
        </div>
        <div className="comparison-row">
          <span>Coût d’installation</span>
          <strong>≈ {formatCurrency(BOILER_REPLACEMENT_PRICE)}</strong>
          <strong className="comparison-pac-cell">{formatCurrency(heatPumpNetPrice)}</strong>
        </div>
        <div className="comparison-row">
          <span>Facture annuelle</span>
          <strong>{formatAnnualRange(boilerAnnualBill)}</strong>
          <strong className="comparison-pac-cell">{formatAnnualRange(heatPumpAnnualBill)}</strong>
        </div>
        <div className="comparison-row comparison-row-saving">
          <span />
          <span />
          <strong className="comparison-pac-cell comparison-pac-cell-bottom">
            ≈ {formatCurrency(annualSavings)} / an d’économies annuelles
          </strong>
        </div>
      </div>
      <div className="fr-callout fr-callout--green-emeraude" style={{ backgroundColor: '#F8FAFF' }}>
        <p>
          À budget comparable, <b>la pompe à chaleur revient moins cher</b> dès la première année. Au bout de 15 ans, vous auriez dépensé
          environ <strong>{formatCurrency(fifteenYearSavings)} de moins</strong> qu’avec une nouvelle chaudière.
        </p>
      </div>
    </section>
  );
}

/**
 * Lists the limits of the result to keep the estimate decision-safe.
 */
function MethodNotes() {
  const notes = [
    {
      description: 'Les informations présentées sont des estimations et peuvent varier selon votre logement.',
      iconClassName: 'fr-icon-bar-chart-box-line',
      title: 'Estimation',
    },
    {
      description: 'Les aides estimées dans les calculs impliquent le remplacement de la chaudière gaz ou fioul.',
      iconClassName: 'fr-icon-money-euro-circle-line',
      title: 'Aides incluses',
    },
    {
      description: 'Les calculs sont simplifiés et ne remplacent pas un devis par un professionnel RGE.',
      iconClassName: 'fr-icon-file-text-line',
      title: 'Calculs simplifiés',
    },
    {
      description: 'Faites accompagner votre projet par un professionnel pour réussir vos travaux.',
      iconClassName: 'fr-icon-chat-check-line',
      title: 'Faites-vous accompagner',
    },
  ] satisfies MethodNote[];

  return (
    <section className="method-notes" aria-label="Précisions sur les calculs">
      {notes.map((note) => (
        <article className="method-note" key={note.title}>
          <span className={note.iconClassName} aria-hidden="true" />
          <div>
            <h3>{note.title}</h3>
            <p>{note.description}</p>
          </div>
        </article>
      ))}
    </section>
  );
}

type MethodNote = {
  description: string;
  iconClassName: string;
  title: string;
};

type SectionHeadingProps = {
  iconClassName: string;
  id: string;
  title: string;
};

/**
 * Renders a compact section title with a DSFR icon.
 */
function SectionHeading({ iconClassName, id, title }: SectionHeadingProps) {
  return (
    <h3 id={id}>
      <span className={iconClassName} aria-hidden="true" /> {title}
    </h3>
  );
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

function formatCurrencyRange(value: number, roundingStep: number) {
  const lowValue = roundToNearest(value * 0.9, roundingStep);
  const highValue = roundToNearest(value * 1.1, roundingStep);

  return `${formatAmount(lowValue)} à ${formatCurrency(highValue)}`;
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

function formatAmount(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value);
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}
