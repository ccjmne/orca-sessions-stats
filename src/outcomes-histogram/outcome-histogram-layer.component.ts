'use strict';

import { IComponentOptions, IWindowService, IAugmentedJQuery, IOnChangesObject } from 'angular';

import { takeUntil } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { stack, stackOffsetNone, stackOrderNone, Stack, max, hsl } from 'd3';

import { StackedBarsComponent } from 'src/stacked-bars/stacked-bars.component';
import { PopulationDiscriminator, PopulationClass, D_MALE_FEMALE } from 'src/population-discriminator/population-discriminator.class';
import { InfosSelector } from 'src/infos-selector/infos-selector.class';
import { ByDate } from 'src/record.class';
import { Grouping } from 'crossfilter2';
import { endOfMonth, slowTransition } from 'src/utils';

export type Dated<T> = T & { from: Date, to: Date };

export const outcomeHistogramLayerComponent: IComponentOptions = {
  template: `<svg style='width: 100%'></svg>`,
  bindings: {
    discriminator: '<',
    info: '<',
    entries: '<'
  },
  controller: class OutcomeHistogramLayerComponent extends StackedBarsComponent<Dated<ByDate>> {

    public $inject: string[] = ['$element', '$window'];

    // angular bindings
    public discriminator: PopulationDiscriminator;
    public info: InfosSelector;
    public entries: Grouping<Date, ByDate>[];

    // overrides
    protected stacker: Stack<any, Dated<ByDate>, PopulationClass>;
    protected data: Dated<ByDate>[];

    protected get domainY(): [number, number] {
      return this.discriminator === D_MALE_FEMALE
        ? [0, max((this.data).map(({ [this.info.outcome]: { male, female } }) => male + female))] // TODO: use total?
        : [0, max((this.data).map(({ [this.info.outcome]: { permanent, temporary } }) => permanent + temporary))]; // TODO: use total?
    }

    protected colour(i: number): string {
      return `url(#bg-gradient-${this.info.outcome}-${i})`;
    }
    protected desaturated(i: number): string {
      return `url(#bg-gradient-${this.info.outcome}-${i}-desaturated)`;
    }

    protected stroke(): string {
      return this.info.colour;
    }

    constructor($element: IAugmentedJQuery, $window: IWindowService) {
      super($element, $window);
    }

    public $onInit(): void {
      super.$onInit();
      super.refresh();

      // this.highlighted$.pipe(
      //   takeUntil(componentDestroyed(this))
      // ).subscribe(highlighted => this.onHighlight && this.onHighlight({ highlighted }));
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (changes['entries']) {
        this.data = this.entries
          .map(({ key: date, value: byDate }) => ({ ...byDate, from: new Date(date), to: endOfMonth(new Date(date)) }));
      }

      if (changes['discriminator']) {
        this.stacker = stack<Dated<ByDate>, PopulationClass>()
          .keys(this.discriminator.keys)
          .value((v, key) => v[this.info.outcome][key])
          .order(stackOrderNone)
          .offset(stackOffsetNone);
      }

      if (this.defs) {
        const gradients = this.defs.selectAll('linearGradient.regular')
          .data(this.discriminator.colours.map(colour => [colour, this.info.colour]))
          .join('linearGradient')
          .attr('class', 'regular')
          .attr('id', (_, i) => `bg-gradient-${this.info.outcome}-${i}`);

        this.defs.selectAll('linearGradient.desaturated')
          .data(this.discriminator.colours.map(colour => {
            const { h: ch, l: cl } = hsl(colour);
            const { h, l } = hsl(this.info.colour);
            return [String(hsl(ch, 0, cl)), String(hsl(h, 0, l))];
          }))
          .join('linearGradient')
          .attr('class', 'desaturated')
          .attr('id', (_, i) => `bg-gradient-${this.info.outcome}-${i}-desaturated`)
          .selectAll<SVGStopElement, any>('stop')
          .data(d => d)
          .join('stop')
          .attr('offset', '70%')
          .attr('stop-color', colour => colour);

        slowTransition(gradients.selectAll<SVGStopElement, any>('stop')
          .data(d => d)
          .join('stop')
          .attr('offset', '70%')
        ).attr('stop-color', colour => colour);
      }

      if (
        Object.values(changes).every(change => !change.isFirstChange())
        && this.info && this.data && this.stacker
      ) {
        super.refresh();
      }
    }
  }
};
