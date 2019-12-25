export interface PopulationClass {
  id: string;
  display: string;
}

export interface Discriminator {
  populations: [PopulationClass, PopulationClass] | PopulationClass;
  display: string;
}

export const MALES: PopulationClass = {
  id: 'male',
  display: 'Hommes'
};

export const FEMALES: PopulationClass = {
  id: 'female',
  display: 'Femmes'
};

export const PERMANENT: PopulationClass = {
  id: 'permanent',
  display: 'Permanents (CDI)'
};

export const TEMPORARY: PopulationClass = {
  id: 'temporary',
  display: 'Temporary (CDD)'
};

export const ALL: PopulationClass = {
  id: 'all',
  display: 'Tous ensemble'
};

export const DISCRIMINATOR_GENDER: Discriminator = {
  populations: [MALES, FEMALES],
  display: 'Hommes / Femmes'
};

export const DISCRIMINATOR_STATUS: Discriminator = {
  populations: [PERMANENT, TEMPORARY],
  display: 'CDI / CDD'
};

export const DISCRIMINATOR_NONE: Discriminator = {
  populations: ALL,
  display: 'Tous ensemble'
};

export const DISCRIMINATORS: Discriminator[] = [DISCRIMINATOR_NONE, DISCRIMINATOR_GENDER, DISCRIMINATOR_STATUS];
