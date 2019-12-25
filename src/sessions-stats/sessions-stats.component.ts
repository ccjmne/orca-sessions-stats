'use strict';

import { IComponentOptions, IWindowService, IAugmentedJQuery, IOnChangesObject } from 'angular';

import { takeUntil } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { stack, stackOffsetNone, stackOrderNone, Stack, max } from 'd3';

import { StatsEntry, stats, MALE_FEMALE, PERMANENT_TEMPORARY } from 'src/datasets/session-stats';
import { StackedBarsComponent } from 'src/stacked-bars/stacked-bars.component';

export const sessionStatsComponent: IComponentOptions = {
  template: `<svg style='width: 100%; height: 100%;'></svg>`,
  bindings: {
    mode: '<',
    onHighlight: '&'
  },
  controller: ['$element', '$window', class SessionsStatsController extends StackedBarsComponent<StatsEntry> {

    // angular bindings
    public mode: string;
    public onHighlight: (e: { highlighted: StatsEntry | null }) => {};

    // overrides
    protected stacker: Stack<any, StatsEntry, string>;
    protected data: (StatsEntry)[] = stats;

    protected get domainY(): [number, number] {
      return this.mode
        ? [0, max((this.data).map(({ VALIDATED: { male, female } }) => male + female))]
        : [0, max((this.data).map(({ VALIDATED: { total: v }, FLUNKED: { total: f }, ABSENT: { total: a } }) => v + f + a))];
    }

    protected colour(i: number): string {
      return (this.mode === 'f/m'
        ? MALE_FEMALE
        : PERMANENT_TEMPORARY
      ).map(({ colour }) => colour)[i];
    }

    protected desaturated(): string {
      return '';
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
        switch (this.mode.toLowerCase()) {
          case 'f/m':
            this.stacker = stack<StatsEntry>()
              .keys(MALE_FEMALE.map(({ key }) => key))
              .value(({ VALIDATED }, key) => VALIDATED[key])
              .order(stackOrderNone)
              .offset(stackOffsetNone);
            break;
          case 'validated/flunked/absent':
            // this.stacker = stack<StatsEntry>()
            //   .keys(['validated', 'flunked', 'absent'])
            //   .value((d, k) => d[k.toUpperCase()].total)
            //   .order(stackOrderNone)
            //   .offset(stackOffsetNone);
            break;
          case 'permanent/temporary':
            this.stacker = stack<StatsEntry>()
              .keys(PERMANENT_TEMPORARY.map(({ key }) => key))
              .value(({ VALIDATED }, key) => VALIDATED[key])
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
