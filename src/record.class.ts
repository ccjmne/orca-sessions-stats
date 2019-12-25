import { OutcomeCode } from './outcome.class';

export interface SessionRecord {
  trem_pk: number;
  instructors: number[];
  empl_gender: true | false;
  trem_outcome: OutcomeCode;
  trng_trty_fk: number;
  trng_date: Date;
  empl_permanent: true | false;
}
