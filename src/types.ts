export const OWNER_STATUS_VALUES = ['owner', 'tenant'] as const;
export const HOUSING_TYPE_VALUES = ['house', 'apartment'] as const;
export const HEATING_EQUIPMENT_VALUES = ['gas-boiler', 'oil-boiler', 'electric-radiator'] as const;
export const DPE_VALUES = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'unknown'] as const;
export const INCOME_CATEGORY_VALUES = ['Très modeste', 'Modeste', 'Intermédiaire', 'Supérieur'] as const;

export type OwnerStatus = (typeof OWNER_STATUS_VALUES)[number];
export type HousingType = (typeof HOUSING_TYPE_VALUES)[number];
export type HeatingEquipment = (typeof HEATING_EQUIPMENT_VALUES)[number];
export type DpeInput = (typeof DPE_VALUES)[number];
export type Dpe = Exclude<DpeInput, 'unknown'>;
export type IncomeCategory = (typeof INCOME_CATEGORY_VALUES)[number];
export type RouteOutcome = 'continue' | 'tenant' | 'apartment' | 'electric-radiator';

export type QuestionnaireChoice =
  | { field: 'dpe'; value: DpeInput }
  | { field: 'heatingEquipment'; value: HeatingEquipment }
  | { field: 'housingType'; value: HousingType }
  | { field: 'ownerStatus'; value: OwnerStatus };

export type LocationSuggestion = {
  city: string;
  departmentCode: string;
  label: string;
  postcode: string;
};

export type HeatingModeComparison = {
  co2: number;
  label: string;
  p1: number;
};

export type SimulationResult = {
  oilBoilerAnnualBill: number;
  gasBoilerAnnualBill: number;
  heatPumpAnnualBill: number;
  heatingModeComparisons: HeatingModeComparison[];
  heatPumpBoilerReplacementBonus: number;
  heatPumpGrossPrice: number;
  heatPumpMaprimerenovAid: number;
  heatPumpNetPrice: number;
  heatPumpProposedPower: number;
};

export type IncomeOption = {
  help: string;
  label: string;
  value: IncomeCategory;
};

export type FormState = {
  dpe: DpeInput | null;
  heatingEquipment: HeatingEquipment | null;
  housingType: HousingType | null;
  incomeCategory: IncomeCategory | null;
  location: string;
  occupants: string;
  ownerStatus: OwnerStatus | null;
  selectedLocation: LocationSuggestion | null;
  surface: string;
};
