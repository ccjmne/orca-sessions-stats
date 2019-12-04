import { Selection, easeExpOut } from 'd3';

export function endOfMonth(date: Date): Date {
  return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
}

export function snapTransition<Datum>(e: Selection<SVGElement, Datum, any, any>, easing: (normalizedTime: number) => number = easeExpOut) {
  return e.transition().duration(100).ease(easing);
}

export function slowTransition<Datum>(e: Selection<SVGElement, Datum, any, any>, easing: (normalizedTime: number) => number = easeExpOut) {
  return e.transition().duration(500).ease(easing);
}
