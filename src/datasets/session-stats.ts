import { endOfMonth } from 'src/utils';

export interface OutcomeEntry {
  total: number;
  male: number;
  female: number;
  permanent: number;
  temporary: number;
}

export type Outcome = 'VALIDATED' | 'FLUNKED' | 'ABSENT';
export const outcomes: Array<Outcome> = ['VALIDATED', 'FLUNKED', 'ABSENT'];

export interface Population {
  key: 'male' | 'female' | 'permanent' | 'temporary';
  name: string;
  colour: string;
}

export const MALE: Population = { key: 'male', name: 'Hommes', colour: 'hsl(170, 55%, 35%)' };
export const FEMALE: Population = { key: 'female', name: 'Femmes', colour: 'hsl(170, 40%, 55%)' };
export const PERMANENT: Population = { key: 'permanent', name: 'CDI', colour: 'hsl(260, 55%, 35%)' };
export const TEMPORARY: Population = { key: 'temporary', name: 'CDD', colour: 'hsl(260, 40%, 55%)' };

export const MALE_FEMALE: [Population, Population] = [MALE, FEMALE];
export const PERMANENT_TEMPORARY: [Population, Population] = [PERMANENT, TEMPORARY];

export interface StatsEntry {
  from: Date;
  to: Date;
  sessions_count: number;
  VALIDATED: OutcomeEntry;
  FLUNKED: OutcomeEntry;
  ABSENT: OutcomeEntry;
}

function randomPortionOf(total: number, min: number = 0, max: number = 1): number {
  return Math.round(total * min + Math.random() * total * (max - min));
}

function generateOutcome(of: number): OutcomeEntry {
  const male = randomPortionOf(of, .35, .65);
  const female = of - male;

  const permanent = randomPortionOf(of, .8);
  const temporary = of - permanent;

  return { total: of, male, female, permanent, temporary };
}

export const stats: StatsEntry[] = Array
  .from({ length: 48 }, (_, i) => ({
    date: new Date(2018, i, 1),
    total: randomPortionOf(200, .75)
  }))
  .map(({ date, total }) => {
    const VALIDATED = generateOutcome(randomPortionOf(total, .6));
    const FLUNKED = generateOutcome(randomPortionOf(total - VALIDATED.total));
    const ABSENT = generateOutcome(total - VALIDATED.total - FLUNKED.total);

    const sessions_count = randomPortionOf(total, .07, .13);

    return { from: date, to: endOfMonth(date), VALIDATED, FLUNKED, ABSENT, sessions_count };
  });
