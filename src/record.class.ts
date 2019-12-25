import { OutcomeCode } from './infos-selector/infos-selector.class';
import { PopulationClass } from './population-discriminator/population-discriminator.class';

export interface SessionRecord {
  trem_pk: number;
  instructors: number[];
  empl_gender: true | false;
  trem_outcome: OutcomeCode;
  trng_trty_fk: number;
  trng_date: Date;
  empl_permanent: true | false;
}

export type ByDate = Record<OutcomeCode, Record<PopulationClass, number>>;
