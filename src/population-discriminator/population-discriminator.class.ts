export type PopulationClass = 'male' | 'female' | 'permanent' | 'temporary' | 'total';

export interface PopulationDiscriminator {
  label: 'Hommes / Femmes' | 'CDI / CDD' | 'Tous ensemble';
  type: 'gender' | 'employment status' | 'none';
  keys: PopulationClass[];
  keysValues: any[];
  individualLabels: string[];
  colours: string[];
}

// export const MALE: Population = { key: 'male', name: 'Hommes', colour: 'hsl(170, 55%, 35%)' };
// export const FEMALE: Population = { key: 'female', name: 'Femmes', colour: 'hsl(170, 40%, 55%)' };
// export const PERMANENT: Population = { key: 'permanent', name: 'CDI', colour: 'hsl(260, 55%, 35%)' };
// export const TEMPORARY: Population = { key: 'temporary', name: 'CDD', colour: 'hsl(260, 40%, 55%)' };


export const D_MALE_FEMALE: PopulationDiscriminator = {
  label: 'Hommes / Femmes',
  type: 'gender',
  keys: ['male', 'female'],
  keysValues: [true, false],
  individualLabels: ['Hommes', 'Femmes'],
  colours: ['hsl(170, 55%, 35%)', 'hsl(170, 40%, 55%)']
};

export const D_PERMANENT_TEMPORARY: PopulationDiscriminator = {
  label: 'CDI / CDD',
  type: 'employment status',
  keys: ['permanent', 'temporary'],
  keysValues: [true, false],
  individualLabels: ['Permanents (CDI)', 'Temporaires (CDD)'],
  colours: ['hsl(260, 55%, 35%)', 'hsl(260, 40%, 55%)']
};

export const D_ALL_TOGETHER: PopulationDiscriminator = {
  label: 'Tous ensemble',
  type: 'none',
  keys: ['total'],
  keysValues: [],
  individualLabels: ['Tous ensemble'],
  colours: ['hsl(208, 55%, 35%)']
};

export const DISCRIMINATORS: PopulationDiscriminator[] = [D_MALE_FEMALE, D_PERMANENT_TEMPORARY, D_ALL_TOGETHER];
