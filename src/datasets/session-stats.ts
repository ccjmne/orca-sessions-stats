import { endOfMonth } from 'src/utils';

export interface OutcomeEntry {
  total: number;
  male: number;
  female: number;
  permanent: number;
  temporary: number;
}

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
