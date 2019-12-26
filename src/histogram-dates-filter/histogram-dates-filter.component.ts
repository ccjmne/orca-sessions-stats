import { IComponentOptions, IWindowService, IAugmentedJQuery } from 'angular';
import { Discriminator, PopulationCode } from 'src/population.class';
import { Dimension, Group } from 'crossfilter2';
import { SessionRecord } from 'src/record.class';
import { StackedBarsComponent } from 'src/stacked-bars/stacked-bars.component';
import { Stack, stack, stackOrderNone, stackOffsetNone, hsl } from 'd3';
import { Outcome } from 'src/outcome.class';

type Entry = { from: Date, to: Date } & Partial<Record<PopulationCode, number>>;

export const histogramDatesFilterComponent: IComponentOptions = {
  template: require('./histogram-dates-filter.component.html'),
  bindings: {
    discriminator: '<',
    outcome: '<',
    dates: '<'
  },
  controller: class HistogramDatesFilterController extends StackedBarsComponent<Entry> {
    public $inject: string[] = ['$element', '$window'];

    // angular bindings
    public discriminator: Discriminator;
    public outcome: Outcome;
    public dates: Dimension<SessionRecord, Date>;

    // template bindings
    protected group: Group<SessionRecord, Date, Partial<Record<PopulationCode, number>>>;

    // abstract overrides
    protected stacker: Stack<any, Entry, string>;
    protected data: Entry[];
    protected colour(i: number): string {
      const { h, s, l } = hsl(this.outcome && this.outcome.colour);
      return String(hsl(h, s * (i ? .75 : 1), l * (i ? .75 : 1)));
    }

    constructor($element: IAugmentedJQuery, $window: IWindowService) {
      super($element, $window);
    }

    public $onInit(): void {
      super.$onInit();
    }

    public $onChanges(): void {
      if (this.dates && this.discriminator) {
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

        this.refresh();
      }
    }

    public refresh(): void {
      this.data = this.group.all().map(({ key: from, value: values }) => ({
        ...values,
        from: new Date(from),
        to: new Date(new Date(from).getFullYear(), new Date(from).getMonth() + 1, 0)
      }));

      super.refresh();
    }

    public $onDestroy(): void {
      if (this.group) {
        this.group.dispose();
      }
    }
  }
};
