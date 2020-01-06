import { IComponentOptions, IWindowService, IAugmentedJQuery, IScope, IOnChangesObject } from 'angular';

import { takeUntil } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { Stack, stackOrderNone, stackOffsetNone, stack } from 'd3-shape';
import { hsl } from 'd3-color';
import { timeMonth } from 'd3-time';
import { Dimension, Group } from 'crossfilter2';

import { Discriminator, PopulationCode } from 'src/population.class';
import { SessionRecord, Month } from 'src/record.class';
import { Outcome } from 'src/outcome.class';
import { REFRESH_EVENT } from 'src/refresh-event.class';

import { StackedBarchartComponent } from 'src/stacked-barchart/stacked-barchart.component';

type Entry = { month: Month } & Partial<Record<PopulationCode, number>>;

export const histogramDatesFilterComponent: IComponentOptions = {
  template: require('./histogram-dates-filter.component.html'),
  bindings: {
    year: '<',
    discriminator: '<',
    outcome: '<',
    dates: '<',
    onSelect: '&'
  },
  controller: class HistogramDatesFilterController extends StackedBarchartComponent<Entry> {

    public static $inject: string[] = ['$scope', '$element', '$window'];

    // angular bindings
    public year: number;
    public discriminator: Discriminator;
    public outcome: Outcome;
    public dates: Dimension<SessionRecord, Month>;
    public onSelect: (e: { month: Month | null }) => any;

    // abstract overrides
    protected stacker: Stack<any, Entry, string>;
    protected data: Array<Entry>;
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
    }

    public refresh(): void {
      if (!this.group || !this.year) {
        return;
      }

      const groups = this.group.all().reduce((acc, { key: month, value }) => ({ ...acc, [month.getTime()]: { ...value, month } }), {});
      this.data = timeMonth
        .range(new Date(this.year, 0, 1), new Date(this.year + 1, 0, 0))
        .map(month => groups[month.getTime()] || { month });

      super.refresh();
    }

    public $onDestroy(): void {
      if (this.group) {
        this.group.dispose();
      }
    }
  }
};
