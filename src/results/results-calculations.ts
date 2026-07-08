import type { HeatingEquipment, HeatingModeComparison, SimulationResult } from '@/types';

import { GAS_BOILER_LABEL, HEAT_PUMP_GROSS_PRICE_RANGE, HEAT_PUMP_LABEL, OIL_BOILER_LABEL } from './constants';
import { roundToNearest } from './formatters';
import type { AnnualBillRow, CurrencyRange } from './types';

export function getAnnualBillRows(result: SimulationResult, currentHeatingEquipment: HeatingEquipment | null) {
  const currentHeatingMode = getCurrentHeatingMode(result, currentHeatingEquipment);

  return [
    currentHeatingMode,
    {
      amount: result.heatPumpAnnualBill,
      co2: getComparisonCo2(result.heatingModeComparisons, HEAT_PUMP_LABEL),
      co2ClassName: 'annual-bill-co2-pac',
      colorClassName: 'annual-bill-pac',
      label: HEAT_PUMP_LABEL,
      labelClassName: 'annual-bill-label-pac',
    },
  ] satisfies AnnualBillRow[];
}

export function getAvoidedCo2(comparisons: HeatingModeComparison[]) {
  const heatPumpComparison = comparisons.find((comparison) => comparison.label === HEAT_PUMP_LABEL);
  const boilerComparisonWithHighestCo2 = comparisons
    .filter((comparison) => comparison.label !== HEAT_PUMP_LABEL)
    .sort((firstComparison, secondComparison) => secondComparison.co2 - firstComparison.co2)[0];

  return heatPumpComparison && boilerComparisonWithHighestCo2 ? boilerComparisonWithHighestCo2.co2 - heatPumpComparison.co2 : 0;
}

export function getHeatPumpNetPriceRange(result: SimulationResult) {
  const roundedAidTotal = getRoundedAidTotal(result);

  return {
    highValue: HEAT_PUMP_GROSS_PRICE_RANGE.highValue - roundedAidTotal,
    lowValue: HEAT_PUMP_GROSS_PRICE_RANGE.lowValue - roundedAidTotal,
  } satisfies CurrencyRange;
}

export function getEstimatedPaybackYearRange(heatPumpNetPriceRange: CurrencyRange, annualSavings: number) {
  if (annualSavings <= 0) {
    return null;
  }

  return {
    highValue: Math.round(heatPumpNetPriceRange.highValue / annualSavings),
    lowValue: Math.round(heatPumpNetPriceRange.lowValue / annualSavings),
  } satisfies CurrencyRange;
}

export function getRoundedAidTotal(result: SimulationResult) {
  return Math.round(result.heatPumpMaprimerenovAid) + roundToNearest(result.heatPumpBoilerReplacementBonus, 100);
}

function getCurrentHeatingMode(result: SimulationResult, currentHeatingEquipment: HeatingEquipment | null): AnnualBillRow {
  if (currentHeatingEquipment === 'oil-boiler') {
    return {
      amount: result.oilBoilerAnnualBill,
      co2: getComparisonCo2(result.heatingModeComparisons, OIL_BOILER_LABEL),
      co2ClassName: 'annual-bill-co2-oil',
      colorClassName: 'annual-bill-oil',
      description: 'Mode de chauffage actuel',
      label: OIL_BOILER_LABEL,
    };
  }

  return {
    amount: result.gasBoilerAnnualBill,
    co2: getComparisonCo2(result.heatingModeComparisons, GAS_BOILER_LABEL),
    co2ClassName: 'annual-bill-co2-gas',
    colorClassName: 'annual-bill-gas',
    description: 'Mode de chauffage actuel',
    label: GAS_BOILER_LABEL,
  };
}

function getComparisonCo2(comparisons: HeatingModeComparison[], label: string) {
  return comparisons.find((comparison) => comparison.label === label)?.co2 ?? 0;
}
