export type CurrencyRange = {
  highValue: number;
  lowValue: number;
};

export type AnnualBillRow = {
  amount: number;
  colorClassName: string;
  co2: number;
  co2ClassName: string;
  description?: string;
  labelClassName?: string;
  label: string;
};
