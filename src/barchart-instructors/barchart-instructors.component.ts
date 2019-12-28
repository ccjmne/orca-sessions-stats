import { IComponentOptions, IAugmentedJQuery, IOnChangesObject, IScope } from 'angular';
import { stack, stackOrderNone, stackOffsetNone, Stack, scaleBand, select, Series, SeriesPoint, scaleLinear, hsl, Selection, axisLeft, axisTop, axisBottom } from 'd3';
import { Dimension, Group, Grouping } from 'crossfilter2';

import { slowTransition } from 'src/utils';

import { REFRESH_EVENT } from 'src/refresh-event.class';
import { SessionRecord } from 'src/record.class';
import { Discriminator, PopulationCode } from 'src/population.class';
import { Outcome } from 'src/outcome.class';

type Instructor = Partial<Record<PopulationCode, number>>;

export const barchartInstructorsComponent: IComponentOptions = {
  template: `<svg></svg>`,
  bindings: {
    discriminator: '<',
    outcome: '<',
    instructors: '<'
  },
  controller: class BarchartInstructorController {

    public $inject: string[] = ['$scope', '$element'];

    // angular bindings
    public discriminator: Discriminator;
    public outcome: Outcome;
    public instructors: Dimension<SessionRecord, number>;

    // template bindings
    private svg: SVGSVGElement;
    private root: Selection<SVGGElement, unknown, null, undefined>;
    private bars: Selection<SVGGElement, unknown, null, undefined>;
    private xAxis: Selection<SVGGElement, unknown, null, undefined>;
    private xGrid: Selection<SVGGElement, unknown, null, undefined>;
    private yAxis: Selection<SVGGElement, unknown, null, undefined>;

    // data
    private group: Group<SessionRecord, number, Instructor>;
    private data: Grouping<number, Partial<Record<PopulationCode, number>>>[];
    private stacker: Stack<any, Grouping<number, Instructor>, string>;
    private mostStacks: number = 0;

    constructor($scope: IScope, $element: IAugmentedJQuery) {
      this.svg = $element[0].querySelector('svg');
      $scope.$on(REFRESH_EVENT, () => this.refresh());
    }

    public $onInit(): void {
      this.buildSkeleton();
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (this.instructors && this.discriminator) {
        if (changes['instructors'] || changes['discriminator']) {
          if (this.group) {
            this.group.dispose();
          }

          this.group = this.instructors.group<number, Partial<Record<PopulationCode, number>>>().reduce(
            (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]++), acc),
            (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]--), acc),
            () => this.discriminator.populations.map(({ id }) => id).reduce((acc, pop) => ({ ...acc, [pop]: 0 }), {})
          ).order(value => this.discriminator.populations.reduce((sum, { id }) => sum + value[id], 0));
        }

        this.stacker = stack<Grouping<number, Instructor>>()
          .keys(this.discriminator.populations.map(({ id }) => id))
          .value(({ value }, key) => value[key])
          .order(stackOrderNone)
          .offset(stackOffsetNone);

        if (this.root) { // TODO: better initialisation check
          this.refresh();
        }
      }
    }

    private buildSkeleton(): void {
      this.root = select(this.svg)
        .append('g')
        .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
      this.xGrid = this.root.append('g').attr('class', 'x grid').attr('color', '#bbb'); // TODO: use stylesheet
      this.bars = this.root.append('g').attr('transform', 'translate(1)');
      this.yAxis = this.root.append('g').attr('class', 'y axis');
      this.xAxis = this.root.append('g').attr('class', 'x axis');
    }

    private refresh(): void {
      this.data = this.group.top(Infinity).filter(({ value }) => this.discriminator.populations.some(({ id }) => value[id] > 0));
      this.svg.setAttribute('height', String(this.height));

      const scaleY = scaleBand<number>()
        .range([0, this.chartHeight])
        .domain(this.domainY())
        .paddingOuter(.2)
        .paddingInner(.2);

      const scaleX = scaleLinear()
        .range([0, this.chartWidth])
        .domain(this.domainX());

      slowTransition(this.yAxis).call(
        axisLeft<number>(scaleY).tickSizeOuter(0).bind({})
      );

      slowTransition(this.xAxis).call(
        axisTop<number>(scaleX.nice()).ticks(this.chartWidth / 40).tickSizeOuter(0).bind({})
      );

      slowTransition(this.xGrid).call(
        axisBottom<number>(scaleX.nice()).ticks(this.chartWidth / 40).tickSize(this.chartHeight).tickSizeOuter(0).bind({})
      );

      const stacks = this.stacker(this.data);
      this.mostStacks = Math.max(this.mostStacks, stacks.length);

      const groups = this.bars
        .selectAll('g.stack')
        .data<Series<Grouping<number, Instructor>, string>>(
          // fix 'exit' elements not being transitioned
          stacks.concat(Array.from({ length: this.mostStacks - stacks.length }, () => [] as Series<Grouping<number, Instructor>, string>))
        )
        .join<SVGGElement>('g')
        .attr('class', 'stack');

      slowTransition(groups as Selection<SVGGElement, any, any, any>)
        .attr('fill', (_, i) => this.colour(i));

      groups.selectAll<SVGRectElement, unknown>('rect')
        .data<SeriesPoint<Grouping<number, Instructor>>>(
          (d: SeriesPoint<Grouping<number, Instructor>>[]) => d,
          ({ data: { key } }: SeriesPoint<Grouping<number, Instructor>>) => String(key)
        )
        .join(
          enter => enter.append('rect')
            .attr('opacity', 0)
            .attr('x', () => scaleX.range()[1])
            .attr('y', d => scaleY(d.data.key))
            .attr('width', 0)
            .attr('height', scaleY.bandwidth())
            .call(e => slowTransition(e)
              .attr('opacity', 1)
              .attr('x', d => scaleX(d[0]))
              .attr('width', d => scaleX(d[1]) - scaleX(d[0]))
            ),
          update => update.call(u => slowTransition(u)
            .attr('opacity', 1)
            .attr('x', d => scaleX(d[0]))
            .attr('y', d => scaleY(d.data.key))
            .attr('width', d => scaleX(d[1]) - scaleX(d[0]))
            .attr('height', scaleY.bandwidth())
          ),
          exit => exit.call(e => slowTransition(e)
            .attr('opacity', 0)
            .attr('x', () => scaleX.range()[1])
            .attr('width', 0)
          )
        );
    }

    private domainX(): [number, number] {
      if (!this.group.size()) {
        return [0, 0];
      }

      const top = this.group.top(1)[0];
      return [0, this.discriminator.populations.reduce((sum, { id }) => sum + top.value[id], 0)];
    }

    private domainY(): number[] {
      return this.data.map(({ key }) => key);
    }

    private colour(i: number): string {
      const { h, s, l } = hsl(this.outcome && this.outcome.colour);
      return String(hsl(h, s * (i ? .75 : 1), l * (i ? .75 : 1)));
    }

    public $onDestroy(): void {
      if (this.group) {
        this.group.dispose();
      }
    }

    private get margin(): { top: number, right: number, bottom: number, left: number } {
      return { top: 20, right: 20, bottom: 10, left: 60 };
    }

    private get chartWidth(): number {
      return this.width - this.margin.left - this.margin.right;
    }

    private get chartHeight(): number {
      return this.data.length * 25;
    }

    private get width(): number {
      return this.svg.clientWidth;
    }

    private get height(): number {
      return this.chartHeight + this.margin.top + this.margin.bottom;
    }
  }
};
