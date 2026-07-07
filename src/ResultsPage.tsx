import type React from 'react';

import leafArtwork from '@/assets/artwork/pictograms/environment/leaf.svg?raw';
import sunArtwork from '@/assets/artwork/pictograms/environment/sun.svg?raw';
import franceRenovLogoUrl from '@/assets/france-renov-logo.svg';
import { HOME_FEATURES } from '@/HomeScreen';
import { CompletedStepCard, type CompletedStepSummary, getCompletedStepSummaries, Stepper } from '@/Questionnaire';

import { RESULT_STEP } from './questionnaire';
import type { FormState, FranceRenovSpace, HeatingEquipment, HeatingModeComparison, SimulationResult } from './types';

const BOILER_REPLACEMENT_PRICE = 5000;

type ResultsPageProps = {
  currentHeatingEquipment: HeatingEquipment | null;
  formState: FormState;
  franceRenovSpace: FranceRenovSpace | null;
  isFranceRenovSpaceLoading: boolean;
  isSubmitting: boolean;
  result: SimulationResult | null;
  surface: string;
  onEditStep: (step: number) => void;
};

export function ResultsPage({
  currentHeatingEquipment,
  formState,
  franceRenovSpace,
  isFranceRenovSpaceLoading,
  isSubmitting,
  result,
  surface,
  onEditStep,
}: ResultsPageProps) {
  return (
    <section className="step-content" aria-labelledby="step-title">
      {isSubmitting && <p className="fr-text--lead">Calcul en cours…</p>}
      {result && (
        <Results
          currentHeatingEquipment={currentHeatingEquipment}
          formState={formState}
          franceRenovSpace={franceRenovSpace}
          isFranceRenovSpaceLoading={isFranceRenovSpaceLoading}
          result={result}
          surface={surface}
          onEditStep={onEditStep}
        />
      )}
    </section>
  );
}

function Results({
  currentHeatingEquipment,
  formState,
  franceRenovSpace,
  isFranceRenovSpaceLoading,
  result,
  surface,
  onEditStep,
}: {
  currentHeatingEquipment: HeatingEquipment | null;
  formState: FormState;
  franceRenovSpace: FranceRenovSpace | null;
  isFranceRenovSpaceLoading: boolean;
  result: SimulationResult;
  surface: string;
  onEditStep: (step: number) => void;
}) {
  const annualBillRows = getAnnualBillRows(result, currentHeatingEquipment);
  const completedStepSummaries = getCompletedStepSummaries(formState, RESULT_STEP);
  const maxAnnualBill = Math.max(...annualBillRows.map((annualBillRow) => annualBillRow.amount), 1);
  const boilerAverageAnnualBill = (result.gasBoilerAnnualBill + result.oilBoilerAnnualBill) / 2;
  const annualSavings = Math.max(boilerAverageAnnualBill - result.heatPumpAnnualBill, 0);
  const heatPumpComparison = result.heatingModeComparisons.find((comparison) => comparison.label === 'PAC air/eau');
  const boilerComparisonWithHighestCo2 = result.heatingModeComparisons
    .filter((comparison) => comparison.label !== 'PAC air/eau')
    .sort((firstComparison, secondComparison) => secondComparison.co2 - firstComparison.co2)[0];
  const avoidedCo2 =
    heatPumpComparison && boilerComparisonWithHighestCo2 ? Math.max(boilerComparisonWithHighestCo2.co2 - heatPumpComparison.co2, 0) : 0;
  const heatPumpNetPrice = getHeatPumpNetPrice(result);

  return (
    <section className="simulation-summary">
      <Stepper currentStep={8} />
      <ResultAnswersSummary summaries={completedStepSummaries} onEditStep={onEditStep} />
      <p className="fr-text--lg fr-mb-0">
        En remplaçant votre <strong>chaudière à gaz</strong> par une <strong>pompe à chaleur air/eau</strong>, veuillez-trouver-ci dessous
        les gains économiques et écologiques pour une maison individuelle de {surface} m².
      </p>
      <ResultSummaryGrid result={result} annualSavings={annualSavings} avoidedCo2={avoidedCo2} heatPumpNetPrice={heatPumpNetPrice} />
      <AdvisorCallout franceRenovSpace={franceRenovSpace} isFranceRenovSpaceLoading={isFranceRenovSpaceLoading} />
      <CostAndAidDetails result={result} heatPumpNetPrice={heatPumpNetPrice} />
      <AnnualBillsChart annualBillRows={annualBillRows} maxAnnualBill={maxAnnualBill} />
      <FifteenYearComparison
        annualSavings={annualSavings}
        boilerAnnualBill={boilerAverageAnnualBill}
        heatPumpAnnualBill={result.heatPumpAnnualBill}
        heatPumpNetPrice={heatPumpNetPrice}
      />
      <AdvisorCallout franceRenovSpace={franceRenovSpace} isFranceRenovSpaceLoading={isFranceRenovSpaceLoading} />
      <MethodNotes />
    </section>
  );
}

type ResultAnswersSummaryProps = {
  summaries: CompletedStepSummary[];
  onEditStep: (step: number) => void;
};

function ResultAnswersSummary({ summaries, onEditStep }: ResultAnswersSummaryProps) {
  return (
    <section className="result-answers" aria-labelledby="result-answers-title">
      <h2 className="fr-h6 fr-mb-0" id="result-answers-title">
        Vos réponses
      </h2>
      <div className="result-answers-grid">
        {summaries.map((summary) => (
          <CompletedStepCard key={summary.step} summary={summary} onEditStep={onEditStep} layout="condensed" />
        ))}
      </div>
    </section>
  );
}

function ResultSummaryGrid({
  annualSavings,
  avoidedCo2,
  heatPumpNetPrice,
  result,
}: {
  annualSavings: number;
  avoidedCo2: number;
  heatPumpNetPrice: number;
  result: SimulationResult;
}) {
  return (
    <div className="summary-grid">
      <SummaryCard
        description={`sur un prix de la PAC air/eau moyen entre ${formatCurrencyRange(result.heatPumpGrossPrice, 1000)}`}
        label="Coût d’installation (aides déduites)"
        value={formatCurrencyRange(heatPumpNetPrice, 1000)}
        variant="primary"
      />
      <SummaryCard
        description={
          <>
            sur vos factures, soit un investissement amorti en ≈ 10 ans
            <span aria-describedby="tooltip" className="fr-icon--sm fr-icon-information-fill fr-ml-1v" />
            <span className="fr-tooltip fr-placement" id="tooltip" role="tooltip">
              En comparaison d'un remplacement de votre chaudière à l'identique
            </span>
          </>
        }
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
  description: React.ReactNode;
  label: string;
  suffix?: string;
  value: string;
  variant: 'co2' | 'power' | 'primary' | 'saving';
};

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

function getSummaryCardIcon(variant: SummaryCardProps['variant']) {
  if (variant === 'co2') {
    return <SummaryCardPictogram svgContent={leafArtwork} />;
  }

  if (variant === 'power') {
    return <SummaryCardPictogram svgContent={sunArtwork} />;
  }

  return null;
}

type SummaryCardPictogramProps = {
  svgContent: string;
};

function SummaryCardPictogram({ svgContent }: SummaryCardPictogramProps) {
  return <span className="fr-artwork summary-card-picto" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgContent }} />;
}

type AdvisorCalloutProps = {
  franceRenovSpace: FranceRenovSpace | null;
  isFranceRenovSpaceLoading: boolean;
};

function AdvisorCallout({ franceRenovSpace, isFranceRenovSpaceLoading }: AdvisorCalloutProps) {
  return (
    <aside className="advisor-callout" aria-label="Accompagnement France Rénov’">
      <div>
        <h3>Vous souhaitez aller plus loin ?</h3>
        {isFranceRenovSpaceLoading ? (
          <p>Recherche du conseiller France Rénov’ de votre commune…</p>
        ) : (
          <AdvisorDetails franceRenovSpace={franceRenovSpace} />
        )}
      </div>
      <img className="advisor-logo" src={franceRenovLogoUrl} alt="France Rénov’" />
    </aside>
  );
}

function AdvisorDetails({ franceRenovSpace }: { franceRenovSpace: FranceRenovSpace | null }) {
  if (!franceRenovSpace) {
    return (
      <>
        <p>
          Un conseiller France Rénov’ vous accompagne <strong>gratuitement et en toute neutralité</strong>.
        </p>
        <a className="fr-btn fr-btn--lg" href="https://france-renov.gouv.fr/preparer-projet/trouver-conseiller">
          Trouver un conseiller France Rénov’
        </a>
      </>
    );
  }

  return (
    <>
      <p className="fr-text--lg fr-mb-2w">
        Votre espace France Rénov’ : <strong>{franceRenovSpace.name}</strong>
      </p>
      <address className="fr-mb-3v">
        {franceRenovSpace.address && (
          <div className="fr-grid-row fr-py-2v">
            <div className="fr-col-auto">
              <span className="fr-icon-map-pin-2-fill fr-m-3v" aria-hidden="true" />
            </div>
            <div className="fr-col">
              <span>
                {franceRenovSpace.address}, {franceRenovSpace.zipcode} {franceRenovSpace.city}
              </span>
            </div>
          </div>
        )}
        {franceRenovSpace.phone && (
          <div className="fr-grid-row fr-py-2v">
            <div className="fr-col-auto">
              <span className="fr-icon-phone-fill fr-m-3v" aria-hidden="true" />
            </div>
            <div className="fr-col">
              <a href={`tel:${franceRenovSpace.phone}`}>{formatPhoneNumber(franceRenovSpace.phone)}</a>
              {franceRenovSpace.secondaryPhone && (
                <>
                  <br />
                  <a href={`tel:${franceRenovSpace.secondaryPhone}`}>{formatPhoneNumber(franceRenovSpace.secondaryPhone)}</a>
                </>
              )}
            </div>
          </div>
        )}
        {franceRenovSpace.email && (
          <div className="fr-grid-row fr-py-2v">
            <div className="fr-col-auto">
              <span className="fr-icon-mail-fill fr-m-3v" aria-hidden="true" />
            </div>
            <div className="fr-col">
              <a href={`mailto:${franceRenovSpace.email}`}>{franceRenovSpace.email}</a>
            </div>
          </div>
        )}
      </address>
      <a
        className="fr-btn fr-btn--lg fr-btn--icon-right fr-icon-external-link-line"
        href={franceRenovSpace.website ? getExternalUrl(franceRenovSpace.website) : `mailto:${franceRenovSpace.email}`}
        target={franceRenovSpace.website ? '_blank' : undefined}
        rel={franceRenovSpace.website ? 'noopener noreferrer' : undefined}
      >
        Contacter mon conseiller France Rénov’
      </a>
    </>
  );
}

function CostAndAidDetails({ heatPumpNetPrice, result }: { heatPumpNetPrice: number; result: SimulationResult }) {
  const costRows = [
    {
      label: "Prix moyen d'une PAC air/eau (coût d'installation)",
      value: formatCurrencyRange(result.heatPumpGrossPrice, 1000),
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
      value: formatCurrencyRange(heatPumpNetPrice, 1000),
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

function AnnualBillsChart({ annualBillRows, maxAnnualBill }: { annualBillRows: AnnualBillRow[]; maxAnnualBill: number }) {
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
                <span className="fr-icon--sm fr-icon-leaf-fill" aria-hidden="true" /> {formatNumber(annualBillRow.co2 / 1000)} t
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
      <p className="fr-text--sm">
        La facture des énergies fossiles est soumise aux aléas géopolitiques ce qui est moins le cas de l'électricité
      </p>
    </section>
  );
}

type FifteenYearComparisonProps = {
  annualSavings: number;
  boilerAnnualBill: number;
  heatPumpAnnualBill: number;
  heatPumpNetPrice: number;
};

function FifteenYearComparison({ annualSavings, boilerAnnualBill, heatPumpAnnualBill, heatPumpNetPrice }: FifteenYearComparisonProps) {
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
          <span className="fr-text--lg fr-text--bold fr-mb-0">Remplacer la chaudière à l’identique</span>
          <span className="comparison-pac-cell comparison-pac-cell-top fr-text-title--blue-france fr-text--lg fr-text--bold fr-mb-0">
            Installer une pompe à chaleur
          </span>
        </div>
        <div className="comparison-row">
          <span>Coût d’installation</span>
          <span>≈ {formatCurrency(BOILER_REPLACEMENT_PRICE)}</span>
          <span className="comparison-pac-cell">{formatCurrencyRange(heatPumpNetPrice, 1000)}</span>
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
            ≈ <strong className="fr-text--xl">{formatCurrency(annualSavings)}</strong> / an d’économies annuelles
          </span>
        </div>
      </div>
      <div className="fr-callout fr-callout--green-emeraude" style={{ backgroundColor: '#F8FAFF' }}>
        <p>
          <strong>la pompe à chaleur revient moins cher</strong> dès la première année. Au bout de 15 ans, vous aurez dépensé environ{' '}
          <strong className="fr-text-default--success">{formatCurrency(annualSavings * 15)} de moins</strong> sur vos factures qu’avec une
          nouvelle chaudière.
        </p>
      </div>
    </section>
  );
}

function MethodNotes() {
  return (
    <div className="fr-grid-row fr-mt-5v">
      {HOME_FEATURES.map((feature) => (
        <article className="fr-col-12 fr-col-lg-6 fr-p-3w fr-grid-row home-feature" key={feature.title}>
          <div className="fr-col-auto">
            <span className={`${feature.iconClassName} fr-icon--lg`} aria-hidden="true" />
          </div>
          <div className="fr-col fr-pl-3v">
            <h2 className="fr-h6 fr-mb-3v fr-mt-1v">{feature.title}</h2>
            <p className="fr-mb-0">{feature.description}</p>
          </div>
        </article>
      ))}
    </div>
  );
}

function SectionHeading({ iconClassName, title }: { iconClassName: string; title: string }) {
  return (
    <h2 className="fr-h5">
      <span className={iconClassName} aria-hidden="true" /> {title}
    </h2>
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

function getHeatPumpNetPrice(result: SimulationResult) {
  return result.heatPumpGrossPrice - result.heatPumpMaprimerenovAid - result.heatPumpBoilerReplacementBonus;
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

function formatPhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

function getExternalUrl(url: string) {
  return url.startsWith('http') ? url : `https://${url}`;
}

function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}
