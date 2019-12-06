import { endOfMonth } from 'src/utils';

export const validatedByMonth = Array.from({ length: 48 }, (_, i) => ({
  date: new Date(2018, i, 1),
  total: Math.round(120 + Math.random() * 40)
})).map(({ date, total }) => ({
  date,
  total,
  male: Math.round(.4 * total + Math.random() * .2 * total),
  permanent: Math.round(total * .8 + Math.random() * .2)
})).map(({ date: from, total, male, permanent }) => ({
  from,
  to: endOfMonth(from),
  total,
  genders: {
    male,
    female: total - male
  },
  statuses: {
    permanent,
    temporary: total - permanent
  }
}));
