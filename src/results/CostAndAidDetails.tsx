import type React from 'react';

import type { SimulationResult } from '@/types';

import { HEAT_PUMP_GROSS_PRICE_RANGE } from './constants';
import { formatCurrency, formatCurrencyValueRange } from './formatters';
import { SectionHeading } from './SectionHeading';
import type { CurrencyRange } from './types';

export function CostAndAidDetails({ heatPumpNetPriceRange, result }: { heatPumpNetPriceRange: CurrencyRange; result: SimulationResult }) {
  const costRows = [
    {
      help: (
        <>
          <span aria-describedby="tooltip-pac2" className="fr-icon--sm fr-icon-information-fill fr-ml-1v" />
          <span className="fr-tooltip fr-placement" id="tooltip-pac2" role="tooltip">
            sources :{' '}
            <a className="fr-link fr-text--sm" href="https://www.statistiques.developpement-durable.gouv.fr/media/7912/download?inline">
              Étude SDES 2023
            </a>
          </span>
        </>
      ),
      label: "Prix d'une PAC air/eau (coût d'installation)",
      value: formatCurrencyValueRange(HEAT_PUMP_GROSS_PRICE_RANGE),
      valueClassName: 'cost-positive',
    },
    {
      label: "Aides MaPrimeRénov' estimées",
      value: `- ${formatCurrency(result.heatPumpMaprimerenovAid)}`,
      valueClassName: 'cost-negative',
    },
    {
      label: 'Aides Coup de Pouce Chauffage estimées',
      value: `- ${formatCurrency(result.heatPumpCoupDePouce, 100)}`,
      valueClassName: 'cost-negative',
    },
    {
      label: 'Reste à charge estimé',
      rowClassName: 'cost-row-total fr-text--bold',
      value: formatCurrencyValueRange(heatPumpNetPriceRange),
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
            <span>
              {costRow.label} {costRow.help}
            </span>
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
  help?: React.ReactNode;
  rowClassName?: string;
  value: string;
  valueClassName: string;
};
