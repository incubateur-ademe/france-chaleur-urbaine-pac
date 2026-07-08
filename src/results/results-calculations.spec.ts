import { describe, expect, it } from 'vitest';

import type { SimulationResult } from '@/types';

import { getAnnualBillRows, getAnnualSavings, getAvoidedCo2, getHeatPumpNetPriceRange } from './results-calculations';

const SIMULATION_RESULT = {
  gasBoilerAnnualBill: 1800,
  heatingModeComparisons: [
    { co2: 500, label: 'PAC air/eau', p1: 900 },
    { co2: 2500, label: 'Chaudière gaz condensation', p1: 1800 },
    { co2: 3200, label: 'Chaudière fioul', p1: 2200 },
  ],
  heatPumpAnnualBill: 900,
  heatPumpBoilerReplacementBonus: 4049,
  heatPumpGrossPrice: 14000,
  heatPumpMaprimerenovAid: 3000.4,
  heatPumpNetPrice: 7000,
  heatPumpProposedPower: 8,
  oilBoilerAnnualBill: 2200,
} satisfies SimulationResult;

describe('results calculations', () => {
  it('computes the heat pump net price range from the fixed gross range and rounded aids', () => {
    expect(getHeatPumpNetPriceRange(SIMULATION_RESULT)).toEqual({
      highValue: 10000,
      lowValue: 5000,
    });
  });

  it('builds current and heat pump annual bill rows', () => {
    const annualBillRows = getAnnualBillRows(SIMULATION_RESULT, 'gas-boiler');

    expect(annualBillRows).toMatchObject([
      { amount: 1800, co2: 2500, label: 'Chaudière gaz' },
      { amount: 900, co2: 500, label: 'PAC air/eau' },
    ]);
    expect(getAnnualSavings(annualBillRows, SIMULATION_RESULT.heatPumpAnnualBill)).toBe(900);
  });

  it('computes avoided CO2 against the highest emitting boiler comparison', () => {
    expect(getAvoidedCo2(SIMULATION_RESULT.heatingModeComparisons)).toBe(2700);
  });
});
