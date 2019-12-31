import { OutcomeCode } from './outcome.class';

export type Month = Date;
export type SessionOutcome = 'COMPLETED' | 'CANCELLED' | 'PENDING';

export interface SessionRecord {
  trng_pk: number;
  trng_outcome: SessionOutcome;
  instructors: number[];
  empl_gender: true | false;
  trem_outcome: OutcomeCode;
  trng_trty_fk: number;
  trng_date: Date;
  month: Month;
  empl_permanent: true | false;
}
