'use strict';

import { IComponentOptions, IWindowService, IAugmentedJQuery, IOnChangesObject } from 'angular';

import { takeUntil } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { stack, stackOrderNone, Stack, hsl, stackOffsetDiverging } from 'd3';

import { StackedBarsComponent } from 'src/stacked-bars/stacked-bars.component';
import { PopulationDiscriminator, PopulationClass } from 'src/population-discriminator/population-discriminator.class';
import { InfosSelector, OutcomeCode } from 'src/infos-selector/infos-selector.class';
import { ByDate } from 'src/record.class';
import { Grouping } from 'crossfilter2';
import { endOfMonth, slowTransition } from 'src/utils';

export type Dated<T> = T & { from: Date, to: Date };

export const outcomesHistogramComponent: IComponentOptions = {
  template: `<svg style="width: 100%; height: 100%;"></svg>`,
  bindings: {
    discriminator: '<',
    infos: '<',
    entries: '<',
    onHighlight: '&'
  },
  controller: class OutcomesHistogramComponent extends StackedBarsComponent<Dated<ByDate>, [OutcomeCode, PopulationClass]> {

    public $inject: string[] = ['$element', '$window'];

    // angular bindings
    public discriminator: PopulationDiscriminator;
    public infos: InfosSelector[];
    public entries: Grouping<Date, ByDate>[];
    public onHighlight: (e: { dates: Dated<{}> | null }) => {};

    // overrides
    protected stacker: Stack<any, Dated<ByDate>, [OutcomeCode, PopulationClass]>;
    protected data: Dated<ByDate>[];

    protected colour(i: number): string {
      return `url(#bg-gradient-${i})`;
    }
    protected desaturated(i: number): string {
      return `url(#bg-gradient-${i}-desaturated)`;
    }

    constructor($element: IAugmentedJQuery, $window: IWindowService) {
      super($element, $window);
    }

    public $onInit(): void {
      super.$onInit();
      super.refresh();

      this.highlighted$.pipe(
        takeUntil(componentDestroyed(this))
      ).subscribe(highlighted => this.onHighlight && this.onHighlight({ dates: highlighted }));
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (changes['entries']) {
        this.data = this.entries
          .map(({ key: date, value: byDate }) => ({ ...byDate, from: new Date(date), to: endOfMonth(new Date(date)) }));
      }

      if (changes['discriminator'] || changes['infos']) {
        const keys = [].concat(...this.infos.map(({ outcome }) => this.discriminator.keys.map(population => [outcome, population])));
        const colours = [].concat(...this.infos.map(({ colour }) => this.discriminator.colours.map(popColour => [popColour, colour])));

        // stacks according to discriminator: positive for first population class, negative for (potential) second
        this.stacker = stack<Dated<ByDate>, [OutcomeCode, PopulationClass]>()
          .keys(keys)
          .value((v, [outcome, pop]) => this.discriminator.keys.indexOf(pop) ? -v[outcome][pop] : v[outcome][pop])
          .order(stackOrderNone)
          .offset(stackOffsetDiverging);

        slowTransition(this.defs.selectAll('linearGradient.regular')
          .data<[string, string]>(colours)
          .join('linearGradient')
          .attr('class', 'regular')
          .attr('id', (_, i) => `bg-gradient-${i}`)
          .selectAll<SVGStopElement, any>('stop')
          .data((d: [string, string]) => d)
          .join('stop')
          .attr('offset', '70%')
        ).attr('stop-color', colour => colour);

        this.defs.selectAll('linearGradient.desaturated')
          .data<[string, string]>(colours)
          .join('linearGradient')
          .attr('class', 'desaturated')
          .attr('id', (_, i) => `bg-gradient-${i}-desaturated`)
          .selectAll<SVGStopElement, any>('stop')
          .data((d: [string, string]) => d)
          .join('stop')
          .attr('offset', '70%')
          .attr('stop-color', colour => {
            const { h, l } = hsl(colour);
            return String(hsl(h, 0, l));
          });
      }

      if (
        Object.values(changes).every(change => !change.isFirstChange())
        && this.infos && this.data && this.stacker
      ) {
        super.refresh();
      }
    }
  }
};
