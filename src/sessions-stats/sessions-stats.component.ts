'use strict';

import { IComponentOptions, IWindowService, IAugmentedJQuery, IOnChangesObject } from 'angular';

import { stack, stackOffsetNone, stackOrderNone, Stack, extent, max, min } from 'd3';

import { StackedBarsComponent, RectDef } from 'src/stacked-bars/stacked-bars.component';

import { outcomesByMonth } from 'src/datasets/outcomes-by-month';
import { validatedByMonth } from 'src/datasets/validated-by-month';

import { endOfMonth } from 'src/utils';

export interface T1 {
  date: Date;
  gender: {
    male: number;
    female: number;
  };

  statuses: {
    permanent: number;
    temporary: number;
  };
}

export interface T2 {
  from: Date;
  to: Date;
  total: number;
  validated: number;
  flunked: number;
  absent: number;
}

export const sessionStatsComponent: IComponentOptions = {
  template: `<svg style='width: 100%; height: 100%;'></svg>`,
  bindings: {
    mode: '<'
  },
  controller: ['$element', '$window', class SessionsStatsController extends StackedBarsComponent<T2 | T1> {

    // angular bindings
    public mode: boolean;

    // overrides
    protected stacker: Stack<any, T1 | T2, string>;
    protected rect: RectDef<T1 | T2>;
    protected data: (T1 | T2)[];

    protected get domainX(): [Date, Date] {
      return this.mode
        ? extent((this.data as T1[]).map(({ date }) => date))
        : [min((this.data as T2[]).map(({ from }) => from)), max((this.data as T2[]).map(({ to }) => to))];
    }

    protected get domainY(): [number, number] {
      return this.mode
        ? [0, max((this.data as T1[]).map(({ gender: { male, female } }) => male + female))]
        : [0, max((this.data as T2[]).map(({ total }) => total))];
    }

    constructor($element: IAugmentedJQuery, $window: IWindowService) {
      super($element, $window);
    }

    public $onInit(): void {
      super.$onInit();
      super.refresh();
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (changes['mode']) {
        if (this.mode) { // Use T1
          this.data = validatedByMonth.map(({ date, genders, statuses }) => ({ date, gender: genders, statuses })) as T1[];
          this.stacker = stack<T1>()
            .keys(['female', 'male'])
            .value((d, k) => d.gender[k])
            .order(stackOrderNone)
            .offset(stackOffsetNone);
          this.rect = {
            x: (d, scale) => scale(d.data.date),
            y: (d, scale) => scale(d[1]),
            width: (d, scale) => scale(endOfMonth(d.data.date)) - scale(d.data.date),
            height: (d, scale) => scale(d[0]) - scale(d[1])
          } as RectDef<T1>;
        } else { // Use T2
          this.data = outcomesByMonth.map(({ dates, total, validated, flunked, absent }) => ({
            from: dates[0],
            to: dates[1],
            total,
            validated,
            flunked,
            absent
          })) as T2[];
          this.stacker = stack<T2>()
            .keys(['validated', 'flunked', 'absent'])
            .value((d, k) => d[k])
            .order(stackOrderNone)
            .offset(stackOffsetNone);
          this.rect = {
            x: (d, scale) => scale(d.data.from),
            y: (d, scale) => scale(d[1]),
            width: (d, scale) => scale(d.data.to) - scale(d.data.from),
            height: (d, scale) => scale(d[0]) - scale(d[1])
          } as RectDef<T2>;
        }

        if (!changes['mode'].isFirstChange()) {
          super.refresh();
        }
      }
    }

    public $onDestroy(): void {
      super.$onDestroy();
    }
  }]
};
