import { IComponentOptions, IWindowService, IAugmentedJQuery, IScope, IOnChangesObject } from 'angular';

import { takeUntil } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { Stack, stackOrderNone, stackOffsetNone, stack } from 'd3-shape';
import { hsl } from 'd3-color';
import { Dimension, Group } from 'crossfilter2';

import { slowTransition } from 'src/utils';

import { Discriminator, PopulationCode, PopulationClass } from 'src/population.class';
import { SessionRecord, Month } from 'src/record.class';
import { Outcome } from 'src/outcome.class';
import { REFRESH_EVENT } from 'src/refresh-event.class';

import { StackedBarchartComponent, MONTHS } from '../stacked-barchart/stacked-barchart.component';

type Entry = { month: Month } & Partial<Record<PopulationCode, number>>;

export const histogramDatesFilterComponent: IComponentOptions = {
  template: require('./histogram-dates-filter.component.html'),
  bindings: {
    discriminator: '<',
    outcome: '<',
    dates: '<',
    onSelect: '&'
  },
  controller: class HistogramDatesFilterController extends StackedBarchartComponent<Entry> {

    public static $inject: string[] = ['$scope', '$element', '$window'];

    // angular bindings
    public discriminator: Discriminator;
    public outcome: Outcome;
    public dates: Dimension<SessionRecord, Month>;
    public onSelect: (e: { month: Month | null }) => any;

    // abstract overrides
    protected stacker: Stack<any, Entry, string>;
    protected data: Array<Partial<Entry>>;
    protected colour(i: number): string {
      const { h, s, l } = hsl(this.outcome && this.outcome.colour);
      return String(hsl(h, s * (i ? .75 : 1), l * (i ? .75 : 1)));
    }

    // data
    private group: Group<SessionRecord, Month, Partial<Record<PopulationCode, number>>>;

    constructor(private $scope: IScope, $element: IAugmentedJQuery, $window: IWindowService) {
      super($element, $window);
    }

    public $onInit(): void {
      super.$onInit();
      this.$scope.$on(REFRESH_EVENT, () => this.refresh());

      this.selected$.pipe(
        takeUntil(componentDestroyed(this))
      ).subscribe(selected => this.onSelect && this.onSelect(selected));
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (this.dates && this.discriminator) {
        if (changes['dates'] || changes['discriminator']) {
          if (this.group) {
            this.group.dispose();
          }

          this.group = this.dates.group<Month, Partial<Record<PopulationCode, number>>>().reduce(
            (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]++), acc),
            (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]--), acc),
            () => this.discriminator.populations.map(({ id }) => id).reduce((acc, pop) => ({ ...acc, [pop]: 0 }), {})
          );

          this.stacker = stack<Entry, PopulationCode>()
            .keys(this.discriminator.populations.map(({ id }) => id))
            .value((values, key) => values[key] || 0)
            .order(stackOrderNone)
            .offset(stackOffsetNone);
        }

        this.refresh();
      }

      if (changes['discriminator'] || changes['outcome']) {
        this.drawLegend();
      }
    }

    private drawLegend(): void {
      if (!this.discriminator) {
        return;
      }

      const legendHeight = 15;

      this.legend.selectAll<SVGRectElement, PopulationClass>('rect')
        .data(this.discriminator.populations.length > 1 ? this.discriminator.populations : [])
        .join(
          enter => enter.append('rect')
            .attr('x', (_, i) => i ? 0 : -legendHeight)
            .attr('width', legendHeight)
            .attr('height', legendHeight)
            .style('fill', (_, i) => this.colour(i))
            .style('opacity', 0)
            .call(e => slowTransition(e).style('opacity', 1)),
          update => update.call(u => slowTransition(u).style('opacity', 1).style('fill', (_, i) => this.colour(i))),
          exit => exit.call(e => slowTransition(e).style('opacity', 0))
        );

      this.legend.selectAll<SVGTextElement, PopulationClass>('text')
        .data(this.discriminator.populations.length > 1 ? this.discriminator.populations : [])
        .join(
          enter => enter.append('text')
            .attr('x', (_, i) => i ? (legendHeight + 5) : -(legendHeight + 5))
            .attr('y', () => legendHeight / 2)
            .style('fill', (_, i) => this.colour(i))
            .attr('text-anchor', (_, i) => i ? 'start' : 'end')
            .style('font-family', 'sans-serif')
            .style('font-weight', 'bold')
            .style('alignment-baseline', 'central')
            .text(({ display }) => display)
            .style('opacity', 0)
            .call(e => slowTransition(e).style('opacity', 1)),
          update => update
            .text(({ display }) => display)
            .call(u => slowTransition(u).style('opacity', 1).style('fill', (_, i) => this.colour(i))),
          exit => exit.call(e => slowTransition(e).style('opacity', 0).remove())
        );
    }

    public refresh(): void {
      if (!this.group) {
        return;
      }

      const groups = this.group.all().reduce((acc, { key: month, value }) => ({ ...acc, [month]: { ...value, month } }), {});
      this.data = MONTHS.map(month => groups[month] || { month });
      super.refresh();
    }

    public $onDestroy(): void {
      if (this.group) {
        this.group.dispose();
      }
    }
  }
};
