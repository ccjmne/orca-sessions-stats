import { OutcomeCode } from './outcome.class';

export type Month = Date;

export interface SessionRecord {
  trem_pk: number;
  instructors: number[];
  empl_gender: true | false;
  trem_outcome: OutcomeCode;
  trng_trty_fk: number;
  trng_date: Date;
  month: Month;
  empl_permanent: true | false;
}
