import { OutcomeCode, SessionOutcomeCode } from './outcome.class';

export type Month = Date;

export interface SessionRecord {
  trng_pk: number;
  trng_outcome: SessionOutcomeCode;
  trng_trty_fk: number;
  month: Month;
  trem_outcome: OutcomeCode;
  empl_gender: true | false;
  empl_permanent: true | false;
  instructors: number[];
}
