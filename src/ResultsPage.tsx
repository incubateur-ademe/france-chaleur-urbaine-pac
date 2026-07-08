import { CompletedStepCard, type CompletedStepSummary, getCompletedStepSummaries, Stepper } from '@/Questionnaire';
import { AdvisorCallout } from '@/results/AdvisorCallout';
import { AnnualBillsChart } from '@/results/AnnualBillsChart';
import { CostAndAidDetails } from '@/results/CostAndAidDetails';
import { FifteenYearComparison } from '@/results/FifteenYearComparison';
import { MethodNotes } from '@/results/MethodNotes';
import { ResultSummaryGrid } from '@/results/ResultSummaryGrid';
import { getAnnualBillRows, getAvoidedCo2, getHeatPumpNetPriceRange } from '@/results/results-calculations';

import { RESULT_STEP } from './questionnaire';
import type { FormState, FranceRenovSpace, HeatingEquipment, SimulationResult } from './types';

type ResultsPageProps = {
  currentHeatingEquipment: HeatingEquipment | null;
  formState: FormState;
  franceRenovSpace: FranceRenovSpace | null;
  isFranceRenovSpaceRequested: boolean;
  isFranceRenovSpaceLoading: boolean;
  isSubmitting: boolean;
  result: SimulationResult | null;
  surface: string;
  onEditStep: (step: number) => void;
  onFindFranceRenovSpace: () => void;
};

/**
 * Wraps the loading and nullable result states for the simulation results page.
 */
export function ResultsPage({
  currentHeatingEquipment,
  formState,
  franceRenovSpace,
  isFranceRenovSpaceRequested,
  isFranceRenovSpaceLoading,
  isSubmitting,
  result,
  surface,
  onEditStep,
  onFindFranceRenovSpace,
}: ResultsPageProps) {
  return (
    <section className="step-content" aria-labelledby="step-title">
      {isSubmitting && <p className="fr-text--lead">Calcul en cours…</p>}
      {result && (
        <ResultsContent
          currentHeatingEquipment={currentHeatingEquipment}
          formState={formState}
          franceRenovSpace={franceRenovSpace}
          isFranceRenovSpaceRequested={isFranceRenovSpaceRequested}
          isFranceRenovSpaceLoading={isFranceRenovSpaceLoading}
          result={result}
          surface={surface}
          onEditStep={onEditStep}
          onFindFranceRenovSpace={onFindFranceRenovSpace}
        />
      )}
    </section>
  );
}

type ResultsContentProps = {
  currentHeatingEquipment: HeatingEquipment | null;
  formState: FormState;
  franceRenovSpace: FranceRenovSpace | null;
  isFranceRenovSpaceRequested: boolean;
  isFranceRenovSpaceLoading: boolean;
  result: SimulationResult;
  surface: string;
  onEditStep: (step: number) => void;
  onFindFranceRenovSpace: () => void;
};

function ResultsContent({
  currentHeatingEquipment,
  formState,
  franceRenovSpace,
  isFranceRenovSpaceRequested,
  isFranceRenovSpaceLoading,
  result,
  surface,
  onEditStep,
  onFindFranceRenovSpace,
}: ResultsContentProps) {
  const annualBillRows = getAnnualBillRows(result, currentHeatingEquipment);
  const completedStepSummaries = getCompletedStepSummaries(formState, RESULT_STEP);
  const annualSavings = annualBillRows[0].amount - result.heatPumpAnnualBill;
  const avoidedCo2 = getAvoidedCo2(result.heatingModeComparisons);
  const heatPumpNetPriceRange = getHeatPumpNetPriceRange(result);

  return (
    <>
      <Stepper currentStep={8} />
      <section className="simulation-summary">
        <ResultAnswersSummary summaries={completedStepSummaries} onEditStep={onEditStep} />
        <p className="fr-text--lg fr-mb-0">
          En remplaçant {getCurrentHeatingEquipmentText(currentHeatingEquipment)} par une <strong>pompe à chaleur air/eau</strong>, veuillez
          trouver ci-dessous les gains économiques et écologiques pour une maison individuelle de {surface} m².
        </p>
        <ResultSummaryGrid
          annualSavings={annualSavings}
          avoidedCo2={avoidedCo2}
          heatPumpNetPriceRange={heatPumpNetPriceRange}
          result={result}
        />
        <AdvisorCallout
          franceRenovSpace={franceRenovSpace}
          isFranceRenovSpaceLoading={isFranceRenovSpaceLoading}
          isFranceRenovSpaceRequested={isFranceRenovSpaceRequested}
          onFindFranceRenovSpace={onFindFranceRenovSpace}
        />
        <CostAndAidDetails result={result} heatPumpNetPriceRange={heatPumpNetPriceRange} />
        <AnnualBillsChart annualBillRows={annualBillRows} currentHeatingEquipment={currentHeatingEquipment} />
        {currentHeatingEquipment !== 'oil-boiler' && (
          <FifteenYearComparison
            annualSavings={annualSavings}
            annualBillRows={annualBillRows}
            heatPumpAnnualBill={result.heatPumpAnnualBill}
            heatPumpNetPriceRange={heatPumpNetPriceRange}
            currentHeatingEquipment={currentHeatingEquipment}
          />
        )}
        <AdvisorCallout
          franceRenovSpace={franceRenovSpace}
          isFranceRenovSpaceLoading={isFranceRenovSpaceLoading}
          isFranceRenovSpaceRequested={isFranceRenovSpaceRequested}
          onFindFranceRenovSpace={onFindFranceRenovSpace}
        />
        <MethodNotes />
      </section>
    </>
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

function getCurrentHeatingEquipmentText(currentHeatingEquipment: HeatingEquipment | null) {
  if (currentHeatingEquipment === 'oil-boiler') {
    return (
      <>
        votre <strong>chaudière à fioul</strong>
      </>
    );
  }

  if (currentHeatingEquipment === 'gas-boiler') {
    return (
      <>
        votre <strong>chaudière à gaz</strong>
      </>
    );
  }

  return (
    <>
      une <strong>chaudière à gaz</strong>
    </>
  );
}
