import { easeExpOut } from 'd3-ease';
import { Selection } from 'd3-selection';
require('d3-transition');

export function endOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
}

export function snapTransition<E extends SVGElement, Datum>(
  e: Selection<E, Datum, any, any>,
  easing: (normalizedTime: number) => number = easeExpOut) {
  return e.transition().duration(100).ease(easing);
}

export function slowTransition<E extends SVGElement, Datum>(
  e: Selection<E, Datum, any, any>,
  easing: (normalizedTime: number) => number = easeExpOut) {
  return e.transition().duration(500).ease(easing);
}

export function slowNamedTransition<E extends SVGElement, Datum>(
  name: string,
  e: Selection<E, Datum, any, any>,
  easing: (normalizedTime: number) => number = easeExpOut) {
  return e.transition(name).duration(500).ease(easing);
}
