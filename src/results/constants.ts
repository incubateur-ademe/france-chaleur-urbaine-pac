import type { CurrencyRange } from './types';

export const BOILER_REPLACEMENT_PRICE = 5000;

export const HEAT_PUMP_GROSS_PRICE_RANGE = {
  highValue: 17000,
  lowValue: 12000,
} satisfies CurrencyRange;

export const HEAT_PUMP_LABEL = 'PAC air/eau';
export const GAS_BOILER_LABEL = 'Chaudière gaz';
export const OIL_BOILER_LABEL = 'Chaudière fioul';
