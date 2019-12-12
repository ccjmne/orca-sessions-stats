import { IComponentController, IWindowService, IAugmentedJQuery } from 'angular';

import { fromEvent, merge, ReplaySubject, Subject } from 'rxjs';
import { takeUntil, debounceTime, map, distinctUntilChanged, mapTo } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { select, scaleTime, axisBottom, scaleLinear, axisLeft, timeFormat, format, ScaleTime, ScaleLinear, Axis, Selection, Stack, Series, SeriesPoint, min, max, bisector, hsl } from 'd3';

import { slowTransition } from 'src/utils';

export abstract class StackedBarsComponent<StackSeriesDatum extends { from: Date, to: Date }> implements IComponentController {

  protected highlighted$: Subject<StackSeriesDatum | null> = new ReplaySubject(1);

  // SVG elements
  private svg: SVGElement;
  private root: Selection<SVGGElement, unknown, null, any>;
  private hoverZone: Selection<SVGRectElement, unknown, null, any>;
  private x: {
    // grid: Selection<SVGGElement, unknown, null, any>,
    elem: Selection<SVGGElement, unknown, null, any>,
    scale: ScaleTime<number, number>,
    axis: Axis<Date | number | { valueOf(): number }>
  };
  private y: {
    grid: Selection<SVGGElement, unknown, null, any>,
    elem: Selection<SVGGElement, unknown, null, any>,
    scale: ScaleLinear<number, number>,
    axis: Axis<number | { valueOf(): number }>
  };

  private largestStacks: number = 0;
  private bisectorX = bisector<StackSeriesDatum, Date>(d => d.from).left;

  // Abstract properties
  protected abstract stacker: Stack<any, StackSeriesDatum, string>;
  protected abstract data: StackSeriesDatum[];
  protected abstract colour(i: number): string;
  protected abstract get domainY(): [number, number];

  constructor($element: IAugmentedJQuery, $window: IWindowService) {
    fromEvent($window, 'resize').pipe(
      debounceTime(200),
      takeUntil(componentDestroyed(this)),
    ).subscribe(() => {
      this.updateSkeleton();
      this.refresh();
    });

    this.svg = $element[0].querySelector('svg');
  }

  public $onInit(): void {
    this.root = select(this.svg)
      .append('g')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

    this.buildSkeleton();
  }

  public $onDestroy(): void { }

  private buildSkeleton(): void {
    this.x = {
      // grid: this.root.append('g').attr('class', 'x grid').style('color', '#ccc').attr('transform', `translate(0, 0)`),  // TODO: use stylesheet
      elem: this.root.append('g').attr('class', 'x axis').attr('transform', `translate(0, ${this.chartHeight})`),
      scale: scaleTime().range([0, this.chartWidth]).nice(),
      axis: axisBottom(scaleTime().range([0, this.chartWidth]).nice()).ticks(this.chartWidth / 120)
    };

    this.y = {
      grid: this.root.append('g').attr('class', 'y grid').style('color', '#ccc').attr('transform', `translate(${this.chartWidth}, 0)`),  // TODO: use stylesheet
      elem: this.root.append('g').attr('class', 'y axis'),
      scale: scaleLinear().range([this.chartHeight, 0]).nice(),
      axis: axisLeft(scaleLinear().range([this.chartHeight, 0]).nice()).ticks(this.chartHeight / 30)
    };

    this.hoverZone = select(this.svg).append('rect')
      .attr('class', 'hover-zone')
      .style('cursor', 'pointer')
      .style('pointer-events', 'bounding-box')
      .style('visibility', 'hidden')
      .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`)
      .attr('width', this.chartWidth)
      .attr('height', this.chartHeight);

    merge(
      fromEvent(this.hoverZone.node(), 'mousemove').pipe(map((e: MouseEvent) => this.getDatumAt(e))),
      fromEvent(this.hoverZone.node(), 'mouseleave').pipe(mapTo(null))
    ).pipe(
      distinctUntilChanged(),
      takeUntil(componentDestroyed(this))
    ).subscribe(this.highlighted$);

    this.highlighted$.pipe(
      map(entry => this.data.indexOf(entry)),
      takeUntil(componentDestroyed(this))
    ).subscribe(highlightedIdx => this.root.selectAll('g.stack').datum((_, idx) => {
      const { h, l } = hsl(this.colour(idx));
      return String(hsl(h, 0, l));
    }).selectAll<SVGRectElement, string>('rect').style('fill', function(_, idx): string {
      return (highlightedIdx === -1 || highlightedIdx === idx)
        ? null // don't override colour
        : select<any, string>(this.parentNode).datum(); // desaturise
    }));
  }

  private updateSkeleton(): void {
    this.x.elem.attr('transform', `translate(0, ${this.chartHeight})`);
    this.x.scale.range([0, this.chartWidth]).nice();
    this.x.axis.ticks(this.chartWidth / 120);

    this.y.grid.attr('transform', `translate(${this.chartWidth}, 0)`);
    this.y.scale.range([this.chartHeight, 0]).nice();
    this.y.axis.ticks(this.chartHeight / 30);

    this.hoverZone
      .attr('width', this.chartWidth)
      .attr('height', this.chartHeight);
  }

  protected refresh(): void {
    if (!this.data || !this.stacker) {
      return;
    }

    slowTransition(this.x.elem)
      .call(this.x.axis.scale(this.x.scale.domain([min((this.data).map(({ from }) => from)), max((this.data).map(({ to }) => to))]).nice())
        .tickSize(6)
        .tickFormat((date: Date) => (date instanceof Date ? date.getMonth() ? timeFormat('%B') : timeFormat('%Y') : () => null)(date))
        .bind({})
      );

    slowTransition(this.y.elem)
      .call(this.y.axis
        .scale(this.y.scale.domain(this.domainY).nice())
        .tickSize(6)
        .tickFormat(format('d'))
        .bind({}));

    // slowTransition(this.x.grid)
    //   .call(this.x.axis.scale(this.x.scale.domain([min((this.data).map(({ from }) => from)), max((this.data).map(({ to }) => to))]).nice())
    //     .tickSize(this.chartHeight)
    //     .tickFormat(() => '')
    //     .bind({})
    //   );

    slowTransition(this.y.grid)
      .call(this.y.axis
        .scale(this.y.scale.domain(this.domainY).nice())
        .tickSize(this.chartWidth)
        .tickFormat(() => '')
        .bind({}));

    const stacks = this.stacker(this.data);
    this.largestStacks = Math.max(this.largestStacks, stacks.length);

    const groups = this.root.selectAll<SVGElement, StackSeriesDatum>('g.stack')
      .data([...stacks, ...Array.from({ length: this.largestStacks - stacks.length }, () => [])]) // fix 'exit' elements not being transitioned
      .join('g')
      .attr('class', 'stack') as Selection<SVGElement, SeriesPoint<StackSeriesDatum>[], SVGElement, any[]>;

    slowTransition(groups)
      .style('fill', (_, i) => this.colour(i));

    groups
      .selectAll<SVGElement, Series<any, StackSeriesDatum>>('rect')
      .data(d => d)
      .join(
        enter => enter.append('rect')
          .attr('opacity', 0)
          .attr('x', ({ data: { from } }) => this.x.scale(from))
          .attr('y', d => this.y.scale(d[1]) - this.y.scale(d[0]))
          .attr('width', ({ data: { from, to } }) => this.x.scale(to) - this.x.scale(from))
          .attr('height', 0)
          .call(e => slowTransition(e)
            .attr('opacity', 1)
            .attr('y', d => this.y.scale(d[1]))
            .attr('height', d => this.y.scale(d[0]) - this.y.scale(d[1]))
          ),
        update => update.call(u => slowTransition(u)
          .attr('opacity', 1)
          .attr('x', ({ data: { from } }) => this.x.scale(from))
          .attr('y', d => this.y.scale(d[1]))
          .attr('width', ({ data: { from, to } }) => this.x.scale(to) - this.x.scale(from))
          .attr('height', d => this.y.scale(d[0]) - this.y.scale(d[1]))
        ),
        exit => exit.call(e => slowTransition(e)
          .attr('opacity', 0)
          .attr('y', d => this.y.scale(d[1]) - this.y.scale(d[0]))
          .attr('height', 0)
          .remove()
        )
      );
  }

  private getDatumAt(e: MouseEvent): StackSeriesDatum {
    return this.data[this.bisectorX(this.data, this.x.scale.invert(e.clientX - (e.target as Element).getBoundingClientRect().left), 1) - 1];
  }

  private get margin() {
    return { top: 20, right: 20, bottom: 40, left: 40 };
  }

  private get chartWidth() {
    return this.width - this.margin.left - this.margin.right;
  }

  private get chartHeight() {
    return this.height - this.margin.top - this.margin.bottom;
  }

  private get width() {
    return this.svg.clientWidth;
  }

  private get height() {
    return this.svg.clientHeight;
  }
}
