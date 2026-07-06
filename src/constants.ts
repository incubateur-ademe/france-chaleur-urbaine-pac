import {
  DPE_VALUES,
  type DpeInput,
  type FormState,
  type HeatingEquipment,
  type HousingType,
  type LocationSuggestion,
  type OwnerStatus,
  type RouteOutcome,
} from './types';

export const WATTWATCHERS_URL = 'https://www.wattwatchers.fr/?utm_source=electrifionslafrance';
export const FCU_URL = 'https://france-chaleur-urbaine.beta.gouv.fr/chaleur-renouvelable?utm_source=electrifionslafrance';

export const RECOMMENDATIONS = {
  apartment: {
    ctaLabel: 'France Chaleur Urbaine',
    descriptionAfterLink: 'pour découvrir le système de chauffage économique et écologique le plus adapté à votre bâtiment.',
    descriptionBeforeLink: 'Mais pas de panique, rendez-vous sur le service public',
    linkLabel: 'France Chaleur Urbaine',
    title: 'Oups, ce simulateur est conçu pour les maisons individuelles !',
    url: FCU_URL,
  },
  'electric-radiator': {
    ctaLabel: 'sur Watt Watchers',
    descriptionAfterLink: '',
    descriptionBeforeLink: 'Pas de panique, des solutions alternatives existent : pour les découvrir, rendez-vous sur',
    linkLabel: 'Watt Watchers',
    title: 'Malheureusement, l’installation d’une PAC air/eau n’est pas recommandée dans votre maison.',
    url: WATTWATCHERS_URL,
  },
  tenant: {
    ctaLabel: 'Watt Watchers',
    descriptionAfterLink: '',
    descriptionBeforeLink:
      'Mais il existe de nombreuses autres solutions pour faire des économies énergies. Notre partenaire de confiance peut vous guider : rendez-vous sur',
    linkLabel: 'Watt watchers',
    title: "Oups, le remplacement d'une chaudière par une pompe à chaleur dépend de votre propriétaire !",
    url: WATTWATCHERS_URL,
  },
} satisfies Record<
  Exclude<RouteOutcome, 'continue'>,
  {
    ctaLabel: string;
    descriptionAfterLink: string;
    descriptionBeforeLink: string;
    linkLabel: string;
    title: string;
    url: string;
  }
>;

export const QUESTIONNAIRE_STEPS = [
  {
    getSummaryValue: getOwnerStatusSummary,
    kicker: 'Statut d’occupation',
    title: "Statut d'occupation",
  },
  {
    getSummaryValue: getHousingTypeSummary,
    kicker: 'Type de logement',
    title: 'Votre logement',
  },
  {
    getSummaryValue: getHeatingEquipmentSummary,
    kicker: 'Chauffage actuel',
    title: 'Votre mode de chauffage',
  },
  {
    getSummaryValue: getLocationStepSummary,
    kicker: 'Code postal',
    shouldShowNextAction: true,
    title: 'Votre code postal',
  },
  {
    getSummaryValue: getDpeSummary,
    kicker: 'Classe Énergétique',
    title: 'Votre DPE',
  },
  {
    getSummaryValue: getSurfaceSummary,
    kicker: 'Surface chauffée',
    shouldShowNextAction: true,
    title: 'Surface chauffée',
  },
  {
    getSummaryValue: getOccupantsSummary,
    kicker: 'Composition du foyer',
    shouldShowNextAction: true,
    title: 'Composition du foyer',
  },
  {
    getSummaryValue: getIncomeCategorySummary,
    kicker: 'Revenus du foyer',
    shouldShowNextAction: true,
    title: 'Votre situation',
  },
] as const;

export const TOTAL_STEPS = QUESTIONNAIRE_STEPS.length;

export type ChoiceStepConfig<TValue extends string> = {
  legend: string;
  hint?: string;
  name: string;
  radioVariant?: 'rich' | 'simple';
  options: readonly {
    badgeClassName?: string;
    fieldsetElementClassName?: string;
    help?: string;
    label: string;
    value: TValue;
  }[];
};

export const OWNER_STATUS_STEP_CONFIG = {
  legend: 'Êtes-vous propriétaire ?',
  name: 'ownerStatus',
  options: [
    { label: 'Je suis propriétaire', value: 'owner' },
    { label: 'Je suis locataire', value: 'tenant' },
  ],
} satisfies ChoiceStepConfig<OwnerStatus>;

export const OWNER_STATUS_LABELS = {
  owner: 'Propriétaire',
  tenant: 'Locataire',
} satisfies Record<OwnerStatus, string>;

export const HOUSING_TYPE_STEP_CONFIG = {
  legend: 'Votre logement est-il une maison ou un appartement ?',
  name: 'housingType',
  options: [
    { label: 'Une maison individuelle', value: 'house' },
    { label: 'Un appartement', value: 'apartment' },
  ],
} satisfies ChoiceStepConfig<HousingType>;

export const HOUSING_TYPE_LABELS = {
  apartment: 'Appartement',
  house: 'Maison individuelle',
} satisfies Record<HousingType, string>;

export const HEATING_EQUIPMENT_STEP_CONFIG = {
  legend: 'Comment votre logement est-il chauffé aujourd’hui ?',
  name: 'heatingEquipment',
  options: [
    { label: 'Chaudière au gaz', value: 'gas-boiler' },
    { label: 'Chaudière au fioul', value: 'oil-boiler' },
    { label: 'Radiateur électrique', value: 'electric-radiator' },
  ],
} satisfies ChoiceStepConfig<HeatingEquipment>;

export const HEATING_EQUIPMENT_LABELS = {
  'electric-radiator': 'Radiateur électrique',
  'gas-boiler': 'Chaudière au gaz',
  'oil-boiler': 'Chaudière au fioul',
} satisfies Record<HeatingEquipment, string>;

export const DPE_STEP_CONFIG = {
  hint: 'Vous avez un doute ? Choisissez la lettre qui vous semble la plus juste.',
  legend: 'Quelle est la classe énergétique (DPE) du logement ?',
  name: 'dpe',
  options: DPE_VALUES.map((dpeValue) => ({
    badgeClassName: dpeValue === 'unknown' ? undefined : `dpe-badge-${dpeValue.toLowerCase()}`,
    fieldsetElementClassName: dpeValue === 'unknown' ? 'dpe-unknown-fieldset-element' : undefined,
    label: dpeValue === 'unknown' ? 'Je ne sais pas (une étiquette D sera enregistrée)' : dpeValue,
    value: dpeValue,
  })),
  radioVariant: 'simple',
} satisfies ChoiceStepConfig<DpeInput>;

function getOwnerStatusSummary(formState: FormState) {
  return formState.ownerStatus ? OWNER_STATUS_LABELS[formState.ownerStatus] : null;
}

function getHousingTypeSummary(formState: FormState) {
  return formState.housingType ? HOUSING_TYPE_LABELS[formState.housingType] : null;
}

function getHeatingEquipmentSummary(formState: FormState) {
  return formState.heatingEquipment ? HEATING_EQUIPMENT_LABELS[formState.heatingEquipment] : null;
}

function getLocationStepSummary(formState: FormState) {
  return formState.selectedLocation ? getLocationSummary(formState.selectedLocation) : null;
}

function getDpeSummary(formState: FormState) {
  return formState.dpe ? (formState.dpe === 'unknown' ? 'Je ne sais pas (D)' : `Classe ${formState.dpe}`) : null;
}

function getSurfaceSummary(formState: FormState) {
  return isValidNumberInput(formState.surface, 1) ? `${formState.surface} m²` : null;
}

function getOccupantsSummary(formState: FormState) {
  if (!isValidNumberInput(formState.occupants, 1)) {
    return null;
  }

  const occupantsNumber = Number(formState.occupants);

  return `${formState.occupants} personne${occupantsNumber > 1 ? 's' : ''}`;
}

function getIncomeCategorySummary(formState: FormState) {
  return formState.incomeCategory;
}

function getLocationSummary(selectedLocation: LocationSuggestion) {
  return selectedLocation.city ? `${selectedLocation.postcode} ${selectedLocation.city}` : selectedLocation.label;
}

function isValidNumberInput(value: string, min: number) {
  const numericValue = Number(value);

  return Number.isFinite(numericValue) && numericValue >= min;
}
