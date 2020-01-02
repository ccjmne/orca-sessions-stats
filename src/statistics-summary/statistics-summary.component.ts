import { IComponentOptions, IScope, IOnChangesObject, IAugmentedJQuery } from 'angular';

import { mean, sum, max } from 'd3-array';
import { Dimension, Group, Grouping } from 'crossfilter2';

import { SessionRecord } from 'src/record.class';
import { PopulationCode, Discriminator } from 'src/population.class';
import { Outcome, OutcomeCode, OUTCOMES } from 'src/outcome.class';
import { REFRESH_EVENT } from 'src/refresh-event.class';
import { select, Selection } from 'd3-selection';
import { scaleSqrt, scaleBand, ScalePower } from 'd3-scale';
import { slowTransition } from 'src/utils';
import { OutcomeStats } from 'src/outcome-pie/outcome-pie.component';

type SessionStats = Partial<Record<PopulationCode, number>>;

export const statisticsSummaryComponent: IComponentOptions = {
  template: require('./statistics-summary.component.html'),
  bindings: {
    discriminator: '<',
    outcome: '<',
    sessions: '<',
    outcomes: '<'
  },
  controller: class StatisticsSummaryController {
    public $inject: string[] = ['$scope', '$element'];

    // angular bindings
    protected discriminator: Discriminator;
    protected outcome: Outcome;
    protected sessions: Dimension<SessionRecord, number>;
    protected outcomes: Dimension<SessionRecord, OutcomeCode>;
    protected group: Group<SessionRecord, OutcomeCode, SessionStats>;
    protected sessionsGroup: Group<SessionRecord, number, number>;
    protected data: Grouping<OutcomeCode, SessionStats>[];
    size: number;
    avg: number;
    sum: number;

    public outcomeDefs = OUTCOMES;

    // template bindings
    private svg: SVGSVGElement;
    private root: Selection<SVGGElement, any, any, any>;
    xAxis: Selection<SVGGElement, any, any, any>;
    areaScale: ScalePower<number, number>;

    constructor(private $scope: IScope, $element: IAugmentedJQuery) {
      $scope.$on(REFRESH_EVENT, () => this.refresh()); // TODO: maybe unnecessary?
      this.svg = $element[0].querySelector('svg');
      this.root = select(this.svg).append('g');
      this.xAxis = this.root.append('g').attr('class', 'x axis');
      this.areaScale = scaleSqrt().range([0, 90]);
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (this.outcomes && this.discriminator) {
        if (this.group) {
          this.group.dispose();
        }

        this.group = this.outcomes.group<OutcomeCode, SessionStats>().reduce(
          (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]++), acc),
          (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]--), acc),
          () => this.discriminator.populations.map(({ id }) => id).reduce((acc, pop) => ({ ...acc, [pop]: 0 }), {})
        ).order(value => this.total(value));

        this.sessionsGroup = this.sessions.group<number, number>().reduceCount();
        this.refresh();
      }
    }

    private refresh(): void {
      this.data = this.group.top(Infinity);
      this.size = this.sessionsGroup.all().filter(({ value: trainees }) => trainees > 0).length;
      // TODO: dispose
      this.outcomes.groupAll().reduce(
        (acc, d) => (acc = acc, acc),
        (acc, d) => (acc = acc, acc),
        () => { }
      );

      const xScale = scaleBand().range([0, this.svg.clientWidth]).domain(this.data.map(({ key }) => key));
      this.areaScale.domain([0, max(this.data.map(({ value }) => this.total(value))) || 1]);

      slowTransition(this.root.selectAll<SVGCircleElement, Grouping<OutcomeCode, SessionStats>>('circle.outcome')
        .data(this.data, ({ key }) => key)
        .join('circle')
        .attr('class', 'outcome'))
        .attr('cx', ({ key }) => xScale(key) + xScale.bandwidth() / 2)
        .attr('cy', this.svg.clientHeight / 2)
        .attr('r', ({ value }) => this.areaScale(this.total(value)))
        .attr('fill', ({ key }) => OUTCOMES.find(({ id }) => id === key).colour)
        ;

      this.avg = mean(this.data, ({ value }) => this.total(value));
      this.sum = sum(this.data, ({ value }) => this.total(value));
      this.$scope.$applyAsync();
    }

    public statsFor({ id }: Outcome): OutcomeStats {
      return this.data && this.data.find(({ key }) => key === id) && this.data.find(({ key }) => key === id).value;
    }

    private total(value: SessionStats): number {
      return this.discriminator.populations.reduce((sum, { id }) => sum + value[id], 0);
    }

    public $onDestroy(): void {
      if (this.group) {
        this.group.dispose();
      }

      if (this.sessionsGroup) {
        this.sessionsGroup.dispose();
      }
    }
  }
};
