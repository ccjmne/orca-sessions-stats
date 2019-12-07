'use strict';

import { IComponentOptions, IWindowService, IAugmentedJQuery, IOnChangesObject } from 'angular';

import { takeUntil } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { stack, stackOffsetNone, stackOrderNone, Stack, max } from 'd3';

import { outcomesByMonth } from 'src/datasets/outcomes-by-month';
import { validatedByMonth } from 'src/datasets/validated-by-month';
import { StackedBarsComponent } from 'src/stacked-bars/stacked-bars.component';

export interface T1 {
  from: Date;
  to: Date;
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
    mode: '<',
    onHighlight: '&'
  },
  controller: ['$element', '$window', class SessionsStatsController extends StackedBarsComponent<T2 | T1> {

    // angular bindings
    public mode: boolean;
    public onHighlight: (e: { highlighted: T2 | T1 | null }) => {};

    // overrides
    protected stacker: Stack<any, T1 | T2, string>;
    protected data: (T1 | T2)[];

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

      this.highlighted$.pipe(
        takeUntil(componentDestroyed(this))
      ).subscribe(highlighted => this.onHighlight && this.onHighlight({ highlighted }));
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (changes['mode']) {
        if (this.mode) { // Use T1
          this.data = validatedByMonth.map(({ from, to, genders, statuses }) => ({ from, to, gender: genders, statuses })) as T1[];
          this.stacker = stack<T1>()
            .keys(['female', 'male'])
            .value((d, k) => d.gender[k])
            .order(stackOrderNone)
            .offset(stackOffsetNone);
        } else { // Use T2
          this.data = outcomesByMonth;
          this.stacker = stack<T2>()
            .keys(['validated', 'flunked', 'absent'])
            .value((d, k) => d[k])
            .order(stackOrderNone)
            .offset(stackOffsetNone);
        }

        if (!changes['mode'].isFirstChange()) {
          super.refresh();
        }
      }
    }
  }]
};
