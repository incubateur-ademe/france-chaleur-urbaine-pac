import type { HeatingEquipment } from '@/types';

import { BOILER_REPLACEMENT_PRICE } from './constants';
import { formatAnnualRange, formatCurrency, formatCurrencyValueRange, roundToNearest } from './formatters';
import { SectionHeading } from './SectionHeading';
import type { AnnualBillRow, CurrencyRange } from './types';

type FifteenYearComparisonProps = {
  annualSavings: number;
  annualBillRows: AnnualBillRow[];
  heatPumpAnnualBill: number;
  heatPumpNetPriceRange: CurrencyRange;
  currentHeatingEquipment: HeatingEquipment | null;
};

export function FifteenYearComparison({
  currentHeatingEquipment,
  annualSavings,
  annualBillRows,
  heatPumpAnnualBill,
  heatPumpNetPriceRange,
}: FifteenYearComparisonProps) {
  return (
    <section className="result-section" aria-labelledby="fifteen-year-title">
      <SectionHeading iconClassName="fr-icon-scales-3-line" title="PAC ou nouvelle chaudière : le coût sur 15 ans" />
      <p>
        Tôt ou tard, {currentHeatingEquipment === 'other' ? 'une' : 'votre'} chaudière devra être remplacée. Voici ce que chaque choix vous
        coûte au fil des années, installation et factures cumulées.
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
          <span className="comparison-pac-cell">{formatCurrencyValueRange(heatPumpNetPriceRange)}</span>
        </div>
        <div className="comparison-row">
          <span className="fr-text--start">Facture annuelle</span>
          <span>{formatAnnualRange(annualBillRows[0].amount)}</span>
          <span className="comparison-pac-cell">{formatAnnualRange(heatPumpAnnualBill)}</span>
        </div>
        <div className="comparison-row comparison-row-saving">
          <span />
          <span />
          <span className="comparison-pac-cell comparison-pac-cell-bottom">
            ≈ <strong className="fr-text--xl">{formatCurrency(annualSavings, 10)}</strong> / an d’économies annuelles
            <small>avec l’installation d’une pompe à chaleur</small>
          </span>
        </div>
      </div>
      <div className="fr-callout fr-callout--green-emeraude" style={{ backgroundColor: '#F8FAFF' }}>
        <p>
          Au bout de 15 ans, vous aurez dépensé environ{' '}
          <strong className="fr-text-default--success fr-text--lg">
            {formatCurrency(roundToNearest(annualSavings, 10) * 15, 10)} de moins
          </strong>{' '}
          sur vos factures qu’avec une nouvelle chaudière.
        </p>
      </div>
    </section>
  );
}
