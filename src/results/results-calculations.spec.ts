import { describe, expect, it } from 'vitest';

import type { SimulationResult } from '@/types';

import { getAnnualBillRows, getAvoidedCo2, getEstimatedPaybackYearRange, getHeatPumpNetPriceRange } from './results-calculations';

const SIMULATION_RESULT = {
  gasBoilerAnnualBill: 1800,
  heatingModeComparisons: [
    { co2: 500, label: 'PAC air/eau', p1: 900 },
    { co2: 2500, label: 'Chaudière gaz', p1: 1800 },
    { co2: 3200, label: 'Chaudière fioul', p1: 2200 },
  ],
  heatPumpAnnualBill: 900,
  heatPumpCoupDePouce: 4049,
  heatPumpGrossPrice: 14000,
  heatPumpMaprimerenovAid: 3000.4,
  heatPumpNetPrice: 6950.6,
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
  });

  it('computes avoided CO2 against the highest emitting boiler comparison', () => {
    expect(getAvoidedCo2(SIMULATION_RESULT.heatingModeComparisons)).toBe(2700);
  });

  it('computes estimated payback years from the low and high net prices and annual savings', () => {
    expect(getEstimatedPaybackYearRange({ highValue: 10000, lowValue: 5000 }, 900)).toEqual({
      highValue: 11,
      lowValue: 6,
    });
    expect(getEstimatedPaybackYearRange({ highValue: 10000, lowValue: 5000 }, 0)).toBeNull();
  });
});
