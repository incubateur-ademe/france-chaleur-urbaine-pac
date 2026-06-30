import { Stepper } from '@/Questionnaire';

import type { HeatingEquipment, HeatingModeComparison, SimulationResult } from './types';

const BOILER_REPLACEMENT_PRICE = 5000;

type ResultsPageProps = {
  currentHeatingEquipment: HeatingEquipment | null;
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
export function ResultsPage({
  currentHeatingEquipment,
  errorMessage,
  isSubmitting,
  result,
  onPrevious,
  onRestart,
  onRetry,
}: ResultsPageProps) {
  return (
    <SimulationResultContent
      currentHeatingEquipment={currentHeatingEquipment}
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
  currentHeatingEquipment: HeatingEquipment | null;
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
function SimulationResultContent({
  currentHeatingEquipment,
  errorMessage,
  isSubmitting,
  result,
  onPrevious,
  onRestart,
  onRetry,
}: SimulationResultContentProps) {
  return (
    <section className="step-content result-panel" aria-labelledby="step-title">
      {isSubmitting && <p className="fr-text--lead">Calcul en cours…</p>}
      {errorMessage && (
        <div className="fr-alert fr-alert--error">
          <p>{errorMessage}</p>
        </div>
      )}
      {result && <Results currentHeatingEquipment={currentHeatingEquipment} result={result} />}
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
  currentHeatingEquipment: HeatingEquipment | null;
  result: SimulationResult;
};

/**
 * Presents the PAC result as a decision report with costs, energy and aid details.
 */
function Results({ currentHeatingEquipment, result }: ResultsProps) {
  const annualBillRows = getAnnualBillRows(result, currentHeatingEquipment);
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
      rowClassName: 'cost-row-total fr-text--bold',
      value: formatCurrency(result.heatPumpNetPrice),
      valueClassName: 'cost-total',
    },
  ] satisfies CostRow[];

  return (
    <section className="result-section" aria-labelledby="cost-and-aid-title">
      <SectionHeading iconClassName="fr-icon-money-euro-box-fill" title="Coût d’installation et aides" />
      <p className="fr-mb-0">
        Le montant des aides dépend de vos revenus. Plus d’infos sur <a href="https://france-renov.gouv.fr/aides">france-renov.gouv.fr</a>.
      </p>
      <div className="cost-table">
        {costRows.map((costRow) => (
          <div className={`cost-row ${costRow.rowClassName ?? ''}`} key={costRow.label}>
            <span>{costRow.label}</span>
            <strong className={costRow.valueClassName}>{costRow.value}</strong>
          </div>
        ))}
      </div>
      <p className="ptz fr-p-3v">
        <span className="fr-icon-info-fill fr-text-title--blue-france fr-mr-3v" aria-hidden="true" />
        Vous pouvez financer le reste à charge avec un éco-prêt à taux zéro (éco-PTZ), sans avance de trésorerie.{' '}
        <a href="https://france-renov.gouv.fr/aides/eco-pret-taux-zero" className="fr-link" target="_blank" rel="noopener">
          En savoir plus
        </a>
      </p>
    </section>
  );
}

type CostRow = {
  label: string;
  rowClassName?: string;
  value: string;
  valueClassName: string;
};

type AnnualBillRow = {
  amount: number;
  colorClassName: string;
  co2: number;
  co2ClassName: string;
  description?: string;
  labelClassName?: string;
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
        <SectionHeading iconClassName="fr-icon-line-chart-fill" title="Votre facture énergétique annuelle" />
        <span>
          Comparaison entre votre chaudière actuelle et une PAC, <strong>chauffage et eau chaude</strong> compris, hors entretien.
        </span>
      </div>
      <div className="annual-bills-list">
        {annualBillRows.map((annualBillRow) => (
          <div className="annual-bill-row" key={annualBillRow.label}>
            <div className="annual-bill-label">
              <strong className={annualBillRow.labelClassName}>{annualBillRow.label}</strong>
              {annualBillRow.description && <small>{annualBillRow.description}</small>}
            </div>
            <div className="annual-bill-track" aria-hidden="true">
              <div
                className={`annual-bill-value ${annualBillRow.colorClassName}`}
                style={{ width: `${Math.max((annualBillRow.amount / maxAnnualBill) * 100, 4)}%` }}
              />
            </div>
            <div className="annual-bill-metrics">
              <strong>{formatAnnualBillRange(annualBillRow.amount)}</strong>
              <small className={annualBillRow.co2ClassName}>
                <span className="fr-icon-leaf-fill" aria-hidden="true" /> {formatNumber(annualBillRow.co2 / 1000)} t
              </small>
            </div>
          </div>
        ))}
      </div>
      <div className="annual-bills-footer">
        <div className="annual-bills-scale" aria-hidden="true">
          <span>0</span>
          <span>{formatCurrency(maxAnnualBill / 2)}</span>
          <span>{formatCurrency(maxAnnualBill)}</span>
        </div>
        <p className="annual-bills-caption">factures /an + CO² émis /an</p>
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
      <SectionHeading iconClassName="fr-icon-scales-3-line" title="PAC ou nouvelle chaudière : le coût sur 15 ans" />
      <p>
        Tôt ou tard, votre chaudière devra être remplacée. À budget d’installation comparable, voici ce que chaque choix vous coûte au fil
        des années, installation et factures cumulées.
      </p>
      <div className="comparison-table">
        <div className="comparison-row">
          <span />
          <span>Remplacer la chaudière à l’identique</span>
          <span className="comparison-pac-cell comparison-pac-cell-top fr-text-title--blue-france">Installer une pompe à chaleur</span>
        </div>
        <div className="comparison-row">
          <span>Coût d’installation</span>
          <span>≈ {formatCurrency(BOILER_REPLACEMENT_PRICE)}</span>
          <span className="comparison-pac-cell">{formatCurrency(heatPumpNetPrice)}</span>
        </div>
        <div className="comparison-row">
          <span className="fr-text--start">Facture annuelle</span>
          <span>{formatAnnualRange(boilerAnnualBill)}</span>
          <span className="comparison-pac-cell">{formatAnnualRange(heatPumpAnnualBill)}</span>
        </div>
        <div className="comparison-row comparison-row-saving">
          <span />
          <span />
          <span className="comparison-pac-cell comparison-pac-cell-bottom">
            ≈ <strong>{formatCurrency(annualSavings)}</strong> / an d’économies annuelles
          </span>
        </div>
      </div>
      <div className="fr-callout fr-callout--green-emeraude" style={{ backgroundColor: '#F8FAFF' }}>
        <p>
          À budget comparable, <b>la pompe à chaleur revient moins cher</b> dès la première année. Au bout de 15 ans, vous auriez dépensé
          environ <strong className="fr-text-default--success">{formatCurrency(fifteenYearSavings)} de moins</strong> qu’avec une nouvelle
          chaudière.
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
      iconClassName: 'fr-icon-bar-chart-2-fill',
      title: 'Estimation',
    },
    {
      description: 'Les aides estimées dans les calculs impliquent le remplacement de la chaudière gaz ou fioul.',
      iconClassName: 'fr-icon-money-euro-box-fill',
      title: 'Aides incluses',
    },
    {
      description: 'Les calculs sont simplifiés et ne remplacent pas un devis par un professionnel RGE.',
      iconClassName: 'fr-icon-calculator-fill',
      title: 'Calculs simplifiés',
    },
    {
      description: 'Faites accompagner votre projet par un professionnel pour réussir vos travaux.',
      iconClassName: 'fr-icon-chat-3-fill',
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

function SectionHeading({ iconClassName, title }: { iconClassName: string; title: string }) {
  return (
    <h3>
      <span className={iconClassName} aria-hidden="true" /> {title}
    </h3>
  );
}

function getAnnualBillRows(result: SimulationResult, currentHeatingEquipment: HeatingEquipment | null) {
  const currentHeatingMode = getCurrentHeatingMode(result, currentHeatingEquipment);

  return [
    currentHeatingMode,
    {
      amount: result.heatPumpAnnualBill,
      co2: getComparisonCo2(result.heatingModeComparisons, 'PAC air/eau'),
      co2ClassName: 'annual-bill-co2-pac',
      colorClassName: 'annual-bill-pac',
      label: 'PAC air/eau',
      labelClassName: 'annual-bill-label-pac',
    },
  ] satisfies AnnualBillRow[];
}

function getCurrentHeatingMode(result: SimulationResult, currentHeatingEquipment: HeatingEquipment | null): AnnualBillRow {
  if (currentHeatingEquipment === 'oil-boiler') {
    return {
      amount: result.oilBoilerAnnualBill,
      co2: getComparisonCo2(result.heatingModeComparisons, 'Chaudière fioul'),
      co2ClassName: 'annual-bill-co2-oil',
      colorClassName: 'annual-bill-oil',
      description: 'Mode de chauffage actuel',
      label: 'Chaudière fioul',
    };
  }

  return {
    amount: result.gasBoilerAnnualBill,
    co2: getComparisonCo2(result.heatingModeComparisons, 'Chaudière gaz condensation'),
    co2ClassName: 'annual-bill-co2-gas',
    colorClassName: 'annual-bill-gas',
    description: 'Mode de chauffage actuel',
    label: 'Chaudière gaz',
  };
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

function formatAnnualBillRange(value: number) {
  const lowValue = Math.round((value * 0.9) / 10) * 10;
  const highValue = Math.round((value * 1.1) / 10) * 10;

  return `${formatCurrency(lowValue)} - ${formatCurrency(highValue)}`;
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
