import type { HeatingEquipment } from '@/types';

import { formatAnnualRange, formatCurrency, formatNumber } from './formatters';
import { SectionHeading } from './SectionHeading';
import type { AnnualBillRow } from './types';

export function AnnualBillsChart({
  annualBillRows,
  currentHeatingEquipment,
}: {
  annualBillRows: AnnualBillRow[];
  currentHeatingEquipment: HeatingEquipment | null;
}) {
  const maxAnnualBill = annualBillRows[0].amount;

  return (
    <section className="result-section annual-bills" aria-labelledby="annual-bills-title">
      <div className="annual-bills-heading">
        <SectionHeading iconClassName="fr-icon-line-chart-fill" title="Votre facture énergétique annuelle" />
        <span>
          Comparaison entre {currentHeatingEquipment === 'other' ? 'une' : 'votre'} chaudière actuelle et une PAC,{' '}
          <strong>chauffage et eau chaude</strong> compris, hors entretien.
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
              <strong>{formatAnnualRange(annualBillRow.amount)}</strong>
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
