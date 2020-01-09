import { OutcomeCode, SessionOutcomeCode } from './outcome.class';

export type Month = number;
export type InstructorID = number | -1; // -1 denotes an external organism

export interface SessionRecord {
  trng_pk: number;
  trng_outcome: SessionOutcomeCode;
  trng_trty_fk: number;
  year: number;
  month: Month;
  trem_outcome: OutcomeCode;
  empl_gender: true | false;
  empl_permanent: true | false;
  instructors: Array<InstructorID>;
}
