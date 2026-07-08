import type { CurrencyRange } from './types';

export function formatCurrency(value: number, roundingStep?: number) {
  return new Intl.NumberFormat('fr-FR', {
    currency: 'EUR',
    maximumFractionDigits: 0,
    style: 'currency',
  }).format(roundingStep ? roundToNearest(value, roundingStep) : value);
}

export function formatCurrencyValueRange(currencyRange: CurrencyRange) {
  return `${formatNumber(currencyRange.lowValue)} à ${formatCurrency(currencyRange.highValue)}`;
}

export function formatRoundedCurrencyRange(value: number, roundingStep: number) {
  const lowValue = roundToNearest(value * 0.9, roundingStep);
  const highValue = roundToNearest(value * 1.1, roundingStep);

  return `${formatCurrency(lowValue)} à ${formatCurrency(highValue)}`;
}

export function formatAnnualRange(value: number) {
  const lowValue = Math.round((value * 0.9) / 10) * 10;
  const highValue = Math.round((value * 1.1) / 10) * 10;

  return `${formatCurrency(lowValue)} - ${formatCurrency(highValue)}`;
}

export function formatNumber(value: number) {
  return new Intl.NumberFormat('fr-FR', {
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatPhoneNumber(phoneNumber: string) {
  return phoneNumber.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
}

export function getExternalUrl(url: string) {
  return url.startsWith('http') ? url : `https://${url}`;
}

export function roundToNearest(value: number, step: number) {
  return Math.round(value / step) * step;
}
