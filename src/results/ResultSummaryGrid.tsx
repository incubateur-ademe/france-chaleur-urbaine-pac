import type React from 'react';

import leafArtwork from '@/assets/artwork/pictograms/environment/leaf.svg?raw';
import sunArtwork from '@/assets/artwork/pictograms/environment/sun.svg?raw';
import type { SimulationResult } from '@/types';

import { HEAT_PUMP_GROSS_PRICE_RANGE } from './constants';
import { formatCurrencyValueRange, formatNumber, formatRoundedCurrencyRange } from './formatters';
import type { CurrencyRange } from './types';

type ResultSummaryGridProps = {
  annualSavings: number;
  avoidedCo2: number;
  heatPumpNetPriceRange: CurrencyRange;
  result: SimulationResult;
};

export function ResultSummaryGrid({ annualSavings, avoidedCo2, heatPumpNetPriceRange, result }: ResultSummaryGridProps) {
  return (
    <div className="summary-grid">
      <SummaryCard
        description={`sur un prix de la PAC air/eau estimé de ${formatCurrencyValueRange(HEAT_PUMP_GROSS_PRICE_RANGE)}`}
        label="Coût d’installation (aides déduites)"
        value={formatCurrencyValueRange(heatPumpNetPriceRange)}
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
        value={`- ${formatRoundedCurrencyRange(annualSavings, 100)}`}
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

function SummaryCardPictogram({ svgContent }: { svgContent: string }) {
  return <span className="fr-artwork summary-card-picto" aria-hidden="true" dangerouslySetInnerHTML={{ __html: svgContent }} />;
}
