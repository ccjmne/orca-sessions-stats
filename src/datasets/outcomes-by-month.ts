import { endOfMonth } from 'src/utils';

export const outcomesByMonth = Array
  .from({ length: 36 }, (_, i) => ({
    date: new Date(2018, i, 1),
    total: Math.round(150 + Math.random() * 50)
  }))
  .map(({ date, total }) => ({ date, total, validated: Math.round(total * .6 + Math.random() * .4) }))
  .map(({ date, total, validated }) => ({ date, total, validated, flunked: Math.round(total - validated) * Math.random() }))
  .map(({ date: from, total, validated, flunked }) => ({
    dates: [from, endOfMonth(from)] as [Date, Date],
    total,
    validated,
    flunked,
    absent: total - validated - flunked
  }));
