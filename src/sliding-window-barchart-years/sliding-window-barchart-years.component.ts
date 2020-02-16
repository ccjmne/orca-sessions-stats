import { IComponentOptions, IAugmentedJQuery, IOnChangesObject, IScope, IWindowService } from 'angular';

import { fromEvent } from 'rxjs';
import { takeUntil, debounceTime, startWith } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { axisLeft, axisTop, axisBottom } from 'd3-axis';
import { hsl } from 'd3-color';
import { ScaleBand, scaleLinear, scaleBand } from 'd3-scale';
import { Selection, select } from 'd3-selection';
import { Stack, stackOrderNone, stack, stackOffsetNone, SeriesPoint, Series } from 'd3-shape';
import { Dimension, Group, Grouping } from 'crossfilter2';

import { slowTransition, slowNamedTransition } from 'src/utils';

import { REFRESH_EVENT } from 'src/refresh-event.class';
import { Discriminator, PopulationCode, PopulationClass } from 'src/population.class';
import { Outcome } from 'src/outcome.class';
import { SessionRecord } from 'src/record.class';

type Year = number;
type DatumValue = Partial<Record<PopulationCode, number>>;
type Datum = Grouping<Year, DatumValue>;

export const slidingWindowBarchartYearsComponent: IComponentOptions = {
  template: `<svg style="width: 100%;"></svg>`,
  bindings: {
    hasLegend: '<?legend',
    discriminator: '<',
    outcome: '<',
    years: '<', // years dimension
    selected: '<' // currently highlighted year
  },
  controller: class SlidingWindowBarchartYearsController {

    public static $inject: string[] = ['$scope', '$element', '$window'];

    // angular bindings
    public discriminator: Discriminator;
    public outcome: Outcome;
    public years: Dimension<SessionRecord, Year>;
    public selected: Year;
    public hasLegend: boolean = true;

    // template bindings
    private svg: SVGSVGElement;
    private root: Selection<SVGGElement, unknown, null, undefined>;
    private legend: Selection<SVGGElement, unknown, null, undefined>;
    private bars: Selection<SVGGElement, unknown, null, undefined>;
    private xAxis: Selection<SVGGElement, unknown, null, undefined>;
    private xGrid: Selection<SVGGElement, unknown, null, undefined>;
    private yAxis: Selection<SVGGElement, unknown, null, undefined>;
    private scaleY: ScaleBand<number>;

    // data
    private group: Group<SessionRecord, number, DatumValue>;
    private data: Datum[];
    private stacker: Stack<any, Grouping<number, DatumValue>, string>;
    private mostStacks: number = 0;

    constructor(private $scope: IScope, $element: IAugmentedJQuery, private $window: IWindowService) {
      this.svg = $element[0].querySelector('svg');
      this.legend = select(this.svg).append('g')
        .attr('transform', `translate(${this.margin.left + this.chartWidth / 2}, 5)`);
      $element[0].style.minHeight = '100%';
      $element[0].style.display = 'inline-block';
    }

    public $onInit(): void {
      this.buildSkeleton();

      this.$scope.$on(REFRESH_EVENT, () => this.refresh());

      fromEvent(this.$window, 'resize').pipe(
        startWith({}),
        debounceTime(200),
        takeUntil(componentDestroyed(this)),
      ).subscribe(() => this.refresh());
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (this.years && this.discriminator) {
        if (changes['years'] || changes['discriminator']) {
          if (this.group) {
            this.group.dispose();
          }

          this.group = this.years.group<Year, DatumValue>().reduce(
            (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]++), acc),
            (acc, d) => (this.discriminator.populations.forEach(({ id, is }) => is(d) && acc[id]--), acc),
            () => this.discriminator.populations.map(({ id }) => id).reduce((acc, pop) => ({ ...acc, [pop]: 0 }), {})
          ).order(value => this.discriminator.populations.reduce((sum, { id }) => sum + value[id], 0));
        }

        this.stacker = stack<Grouping<number, DatumValue>>()
          .keys(this.discriminator.populations.map(({ id }) => id))
          .value(({ value }, key) => value[key])
          .order(stackOrderNone)
          .offset(stackOffsetNone);

        this.refresh();
      }

      if (changes['discriminator'] || changes['outcome']) {
        this.drawLegend();
      }
    }

    private buildSkeleton(): void {
      this.root = select(this.svg)
        .append('g')
        .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);
      this.xGrid = this.root.append('g').attr('class', 'x grid').attr('color', '#bbb').style('shape-rendering', 'optimizeSpeed'); // TODO: use stylesheet
      this.yAxis = this.root.append('g').attr('class', 'y axis');
      this.scaleY = scaleBand<number>().paddingOuter(.2).paddingInner(.2);
      this.xAxis = this.root.append('g').attr('class', 'x axis');
      this.bars = this.root.append('g').attr('transform', 'translate(1)');
    }

    private desaturiseExcluded(selected: Year): void {
      if (!this.data) {
        return;
      }

      const selectedValue = this.data.find(({ key: year }) => year === selected);

      const isSame = this.isSame;
      const idx = this.data.findIndex(a => this.isSame(a, selectedValue));
      slowNamedTransition('colour', this.root.selectAll('g.stack').datum((_, i) => {
        const { h, l } = hsl(this.colour(i));
        return String(hsl(h, 0, l));
      }).selectAll<SVGRectElement, SeriesPoint<Datum>>('rect'))
        .style('fill', function({ data: current }): string {
          return (idx === -1 || isSame(current, selectedValue))
            ? null // don't override colour
            : select<any, string>(this.parentNode).datum(); // desaturise
        });
    }

    private isSame(a: Datum | null, b: Datum | null): boolean {
      return (a === null || b === null) ? a === b : a.key === b.key;
    }

    private drawLegend(): void {
      if (!this.hasLegend || !this.discriminator) {
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
          update => update.call(u => slowTransition(u).style('opacity', 1)).style('fill', (_, i) => this.colour(i)),
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

    private refresh(): void {
      if (!this.group || !this.root) { // TODO: better initialisation mechanism
        return;
      }

      const zero: (year: Year) => Grouping<Year, DatumValue> = year => ({
        key: year,
        value: this.discriminator.populations.reduce((acc, { id: pop }) => ({ ...acc, [pop]: 0 }), {})
      });

      this.data = [0, -1, -2]
        .map(diff => (this.selected || 2018) + diff)
        .map(year => this.group.all().find(({ key: yr }) => yr === year) || zero(year));

      this.svg.setAttribute('height', String(this.height));

      this.scaleY.range([0, this.chartHeight]).domain(this.domainY());

      const scaleX = scaleLinear()
        .range([0, this.chartWidth])
        .domain(this.domainX());

      slowTransition(this.root).attr('transform', `translate(${(this.margin.left || 0) + 6 + 3}, ${this.margin.top})`);

      slowTransition(this.yAxis).call(
        axisLeft<number>(this.scaleY).tickFormat(String).tickSizeOuter(0).bind({})
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
        .data<Series<Grouping<number, DatumValue>, string>>(
          // fix 'exit' elements not being transitioned
          stacks.concat(Array.from({ length: this.mostStacks - stacks.length }, () => [] as Series<Grouping<number, DatumValue>, string>))
        )
        .join<SVGGElement>('g')
        .attr('class', 'stack');

      slowTransition(groups as Selection<SVGGElement, any, any, any>)
        .attr('fill', (_, i) => this.colour(i));

      groups.selectAll<SVGRectElement, unknown>('rect')
        .data<SeriesPoint<Grouping<number, DatumValue>>>(
          (d: SeriesPoint<Grouping<number, DatumValue>>[]) => d,
          ({ data: { key } }: SeriesPoint<Grouping<number, DatumValue>>) => String(key)
        )
        .join(
          enter => enter.append('rect')
            .attr('opacity', 0)
            .attr('x', () => scaleX.range()[1])
            .attr('y', d => this.scaleY(d.data.key))
            .attr('width', 0)
            .attr('height', this.scaleY.bandwidth())
            .call(e => slowTransition(e)
              .attr('opacity', 1)
              .attr('x', d => scaleX(d[0]))
              .attr('width', d => scaleX(d[1]) - scaleX(d[0]))
            ),
          update => update.call(u => slowTransition(u)
            .attr('opacity', 1)
            .attr('x', d => scaleX(d[0]))
            .attr('y', d => this.scaleY(d.data.key))
            .attr('width', d => scaleX(d[1]) - scaleX(d[0]))
            .attr('height', this.scaleY.bandwidth())
          ),
          exit => exit.call(e => slowTransition(e)
            .attr('opacity', 0)
            .attr('x', () => scaleX.range()[1])
            .attr('width', 0)
            .remove()
          )
        );

      this.desaturiseExcluded(this.selected);
      slowTransition(this.legend).attr('transform', `translate(${this.margin.left + this.chartWidth / 2}, 5)`);
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
      return { top: 20 + (this.hasLegend ? 25 : 0), right: 30, bottom: 0, left: 30 };
    }

    private get chartWidth(): number {
      return this.width - this.margin.left - this.margin.right;
    }

    private get chartHeight(): number {
      return 3 * 25; // 25px per bar
    }

    private get width(): number {
      return this.svg.clientWidth || 250;
    }

    private get height(): number {
      return this.chartHeight + this.margin.top + this.margin.bottom;
    }
  }
};
