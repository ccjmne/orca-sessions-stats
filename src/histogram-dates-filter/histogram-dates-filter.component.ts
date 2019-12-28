import { IComponentOptions, IWindowService, IAugmentedJQuery, IScope, IOnChangesObject } from 'angular';
import { Discriminator, PopulationCode } from 'src/population.class';
import { Dimension, Group } from 'crossfilter2';
import { SessionRecord } from 'src/record.class';
import { Stack, stack, stackOrderNone, stackOffsetNone, hsl } from 'd3';
import { Outcome } from 'src/outcome.class';
import { REFRESH_EVENT } from 'src/refresh-event.class';
import { takeUntil } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';
import { StackedBarchartComponent } from 'src/stacked-barchart/stacked-barchart.component';

type Entry = { date: Date } & Partial<Record<PopulationCode, number>>;

export const histogramDatesFilterComponent: IComponentOptions = {
  template: require('./histogram-dates-filter.component.html'),
  bindings: {
    discriminator: '<',
    outcome: '<',
    dates: '<',
    onSelect: '&'
  },
  controller: class HistogramDatesFilterController extends StackedBarchartComponent<Entry> {

    public $inject: string[] = ['$scope', '$element', '$window'];

    // angular bindings
    public discriminator: Discriminator;
    public outcome: Outcome;
    public dates: Dimension<SessionRecord, Date>;
    public onSelect: (e: { selected: { date: Date } | null }) => any;

    // abstract overrides
    protected stacker: Stack<any, Entry, string>;
    protected data: Entry[];
    protected colour(i: number): string {
      const { h, s, l } = hsl(this.outcome && this.outcome.colour);
      return String(hsl(h, s * (i ? .75 : 1), l * (i ? .75 : 1)));
    }

    // data
    private group: Group<SessionRecord, Date, Partial<Record<PopulationCode, number>>>;

    constructor($scope: IScope, $element: IAugmentedJQuery, $window: IWindowService) {
      super($element, $window);
      $scope.$on(REFRESH_EVENT, () => this.refresh());
    }

    public $onInit(): void {
      super.$onInit();

      this.selected$.pipe(
        takeUntil(componentDestroyed(this))
      ).subscribe(selected => this.onSelect && this.onSelect({ selected }));
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (this.dates && this.discriminator) {
        if (changes['dates'] || changes['discriminator']) {
          if (this.group) {
            this.group.dispose();
          }

          this.group = this.dates.group<Date, Partial<Record<PopulationCode, number>>>().reduce(
            (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]++), acc),
            (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]--), acc),
            () => this.discriminator.populations.map(({ id }) => id).reduce((acc, pop) => ({ ...acc, [pop]: 0 }), {})
          );

          this.stacker = stack<Entry, PopulationCode>()
            .keys(this.discriminator.populations.map(({ id }) => id))
            .value((values, key) => values[key])
            .order(stackOrderNone)
            .offset(stackOffsetNone);
        }

        this.refresh();
      }
    }

    public refresh(): void {
      if (!this.group) {
        return;
      }

      this.data = this.group.all().map(({ key: date, value: values }) => ({ ...values, date: new Date(date) }));
      super.refresh();
    }

    public $onDestroy(): void {
      if (this.group) {
        this.group.dispose();
      }
    }
  }
};
