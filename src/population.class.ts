import { SessionRecord } from './record.class';

export type PopulationCode = 'male' | 'female' | 'permanent' | 'temporary' | 'all';

export interface PopulationClass {
  id: PopulationCode;
  display: string;
  is(record: SessionRecord): boolean;
}

export interface Discriminator {
  populations: [PopulationClass, PopulationClass] | [PopulationClass];
  display: string;
}

export const MALES: PopulationClass = {
  id: 'male',
  display: 'Hommes',
  is(record: SessionRecord) {
    return record.empl_gender;
  }
};

export const FEMALES: PopulationClass = {
  id: 'female',
  display: 'Femmes',
  is(record: SessionRecord) {
    return !record.empl_gender;
  }
};

export const PERMANENT: PopulationClass = {
  id: 'permanent',
  display: 'Permanents',
  is(record: SessionRecord) {
    return record.empl_permanent;
  }
};

export const TEMPORARY: PopulationClass = {
  id: 'temporary',
  display: 'Temporaires',
  is(record: SessionRecord) {
    return !record.empl_permanent;
  }
};

export const ALL: PopulationClass = {
  id: 'all',
  display: 'Tous ensemble',
  is(_: SessionRecord) {
    return true;
  }
};

export const DISCRIMINATOR_GENDER: Discriminator = {
  populations: [MALES, FEMALES],
  display: 'Genre (Hommes / Femmes)'
};

export const DISCRIMINATOR_STATUS: Discriminator = {
  populations: [PERMANENT, TEMPORARY],
  display: 'Type de contrat (CDI / CDD)'
};

export const DISCRIMINATOR_NONE: Discriminator = {
  populations: [ALL],
  display: 'Tous ensemble'
};

export const DISCRIMINATORS: Discriminator[] = [DISCRIMINATOR_NONE, DISCRIMINATOR_GENDER, DISCRIMINATOR_STATUS];
