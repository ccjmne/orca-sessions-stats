import { IComponentOptions, IAugmentedJQuery, IOnChangesObject, IScope } from 'angular';

import { merge, fromEvent, BehaviorSubject, combineLatest } from 'rxjs';
import { map, distinctUntilChanged, takeUntil, mapTo, withLatestFrom } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { axisLeft, axisTop, axisBottom } from 'd3-axis';
import { hsl } from 'd3-color';
import { ScaleBand, scaleLinear, scaleBand } from 'd3-scale';
import { Selection, select } from 'd3-selection';
import { Stack, stackOrderNone, stack, stackOffsetNone, SeriesPoint, Series } from 'd3-shape';
import { Dimension, Group, Grouping } from 'crossfilter2';

import { slowTransition, slowNamedTransition } from 'src/utils';

import { REFRESH_EVENT } from 'src/refresh-event.class';
import { Discriminator, PopulationCode } from 'src/population.class';
import { Outcome } from 'src/outcome.class';
import { SessionRecord } from 'src/record.class';

type Instructor = Partial<Record<PopulationCode, number>>;
type Datum = Grouping<number, Partial<Record<PopulationCode, number>>>;

export const barchartInstructorsComponent: IComponentOptions = {
  template: `<svg></svg>`,
  bindings: {
    discriminator: '<',
    outcome: '<',
    instructors: '<',
    onSelect: '&'
  },
  controller: class BarchartInstructorController {

    private selected$: BehaviorSubject<Datum | null> = new BehaviorSubject(null);
    private highlighted$: BehaviorSubject<Datum | null> = new BehaviorSubject(null);

    public $inject: string[] = ['$scope', '$element'];

    // angular bindings
    public discriminator: Discriminator;
    public outcome: Outcome;
    public instructors: Dimension<SessionRecord, number>;
    public onSelect: (ctx: { instructor: number | null }) => any;

    // template bindings
    private svg: SVGSVGElement;
    private root: Selection<SVGGElement, unknown, null, undefined>;
    private bars: Selection<SVGGElement, unknown, null, undefined>;
    private highlightRect: Selection<SVGRectElement, unknown, null, undefined>;
    private hover: Selection<SVGRectElement, unknown, null, any>;
    private xAxis: Selection<SVGGElement, unknown, null, undefined>;
    private xGrid: Selection<SVGGElement, unknown, null, undefined>;
    private yAxis: Selection<SVGGElement, unknown, null, undefined>;
    private scaleY: ScaleBand<number>;

    // data
    private group: Group<SessionRecord, number, Instructor>;
    private data: Datum[];
    private stacker: Stack<any, Grouping<number, Instructor>, string>;
    private mostStacks: number = 0;

    constructor($scope: IScope, $element: IAugmentedJQuery) {
      this.svg = $element[0].querySelector('svg');
      $scope.$on(REFRESH_EVENT, () => this.refresh());
    }

    public $onInit(): void {
      this.buildSkeleton();

      this.selected$.pipe(
        takeUntil(componentDestroyed(this))
      ).subscribe(selected => this.onSelect && this.onSelect({ instructor: selected && selected.key }));
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

        this.refresh();
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
      this.highlightRect = this.bars.append('rect').attr('fill', 'rgba(0, 0, 0, .2)').attr('stroke', 'grey').attr('stroke-width', 0);
      this.hover = this.root.append('rect')
        .attr('class', 'hover-zone')
        .style('cursor', 'pointer')
        .style('pointer-events', 'all')
        .style('visibility', 'hidden')
        .attr('width', this.chartWidth)
        .attr('height', this.chartHeight);

      merge(
        fromEvent(this.hover.node(), 'mousemove').pipe(map((e: MouseEvent) => this.getDatumAt(e))),
        fromEvent(this.hover.node(), 'mouseleave').pipe(mapTo(null))
      ).pipe(
        map(entry => entry || null),
        distinctUntilChanged(this.isSame),
        takeUntil(componentDestroyed(this))
      ).subscribe(this.highlighted$);

      fromEvent(this.hover.node(), 'click').pipe(
        map((e: MouseEvent) => this.getDatumAt(e)),
        map(entry => entry || null),
        withLatestFrom(this.selected$),
        map(([cur, prev]) => this.isSame(prev, cur) ? null : cur),
        distinctUntilChanged(this.isSame),
        takeUntil(componentDestroyed(this))
      ).subscribe(this.selected$);

      this.selected$.pipe(
        takeUntil(componentDestroyed(this))
      ).subscribe(entry => this.desaturiseExcluded(entry));

      combineLatest([this.highlighted$, this.selected$]).pipe(
        map(([highlighted, selected]) => selected || highlighted),
        withLatestFrom(this.selected$.pipe(map(selected => !!selected))),
        takeUntil(componentDestroyed(this))
      ).subscribe(([entry, selected]) => this.updateHighlightRect(entry, selected));
    }

    private updateHighlightRect(entry: Datum, selected: boolean): void {
      if (!entry) {
        slowTransition(this.highlightRect).attr('opacity', 0);
        return;
      }

      slowTransition(this.highlightRect)
        .attr('y', (this.scaleY(entry.key) || 0) - this.scaleY.step() * (this.scaleY.paddingInner() / 2))
        .attr('stroke-width', selected ? 1 : 0)
        .attr('opacity', 1)
        .attr('width', this.chartWidth)
        .attr('height', this.scaleY.step());
    }

    private desaturiseExcluded(selected: Datum): void {
      if (!this.data) {
        return;
      }

      const isSame = this.isSame;
      const idx = this.data.findIndex(a => this.isSame(a, selected));
      slowNamedTransition('colour', this.root.selectAll('g.stack').datum((_, i) => {
        const { h, l } = hsl(this.colour(i));
        return String(hsl(h, 0, l));
      }).selectAll<SVGRectElement, SeriesPoint<Datum>>('rect'))
        .style('fill', function({ data: current }): string {
          return (idx === -1 || isSame(current, selected))
            ? null // don't override colour
            : select<any, string>(this.parentNode).datum(); // desaturise
        });
    }

    private isSame(a: Datum | null, b: Datum | null): boolean {
      return (a === null || b === null) ? a === b : a.key === b.key;
    }

    private getDatumAt(e: MouseEvent): Datum {
      const invert: (y: number) => number = y => Math.floor(y / this.scaleY.step());
      return this.data[invert(e.clientY - (e.target as Element).getBoundingClientRect().top)];
    }

    private refresh(): void {
      if (!this.group) {
        return;
      }

      const selected = this.selected$.getValue();
      this.data = this.group.top(Infinity)
        .filter(({ key, value }) => selected && selected.key === key || this.discriminator.populations.some(({ id }) => value[id] > 0));
      this.svg.setAttribute('height', String(this.height));

      this.scaleY.range([0, this.chartHeight]).domain(this.domainY());

      const scaleX = scaleLinear()
        .range([0, this.chartWidth])
        .domain(this.domainX());

      this.hover
        .attr('width', this.chartWidth)
        .attr('height', this.chartHeight);

      slowTransition(this.yAxis).call(
        axisLeft<number>(this.scaleY).tickSizeOuter(0).bind({})
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

      this.desaturiseExcluded(selected);
      this.updateHighlightRect(selected || this.highlighted$.getValue(), !!selected);
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
      return this.data ? this.data.length * 25 : 0;
    }

    private get width(): number {
      return this.svg.clientWidth;
    }

    private get height(): number {
      return this.chartHeight + this.margin.top + this.margin.bottom;
    }
  }
};
