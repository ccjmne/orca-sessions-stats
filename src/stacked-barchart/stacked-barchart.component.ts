import { IComponentController, IWindowService, IAugmentedJQuery } from 'angular';

import { fromEvent, merge, Subject, combineLatest, BehaviorSubject } from 'rxjs';
import { takeUntil, debounceTime, map, distinctUntilChanged, mapTo, withLatestFrom } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { select, scaleTime, axisBottom, scaleLinear, axisLeft, ScaleLinear, Axis, Selection, Stack, Series, SeriesPoint, axisRight, hsl, scaleBand, timeMonth, min, max, ScaleBand, timeFormat } from 'd3';

import { slowTransition, slowNamedTransition } from 'src/utils';
import { Month } from 'src/record.class';

export abstract class StackedBarchartComponent<StackSeriesDatum extends { month: Month }, K = string> implements IComponentController {

  protected selected$: BehaviorSubject<StackSeriesDatum | null> = new BehaviorSubject(null);
  private highlighted$: Subject<StackSeriesDatum | null> = new BehaviorSubject(null);

  // SVG elements
  private svg: SVGElement;
  private root: Selection<SVGGElement, unknown, null, any>;
  private bars: Selection<SVGGElement, unknown, null, any>;
  private hover: Selection<SVGRectElement, unknown, null, any>;
  private x: {
    elem: Selection<SVGGElement, unknown, null, any>,
    scale: ScaleBand<Month>,
    axis: Axis<Month | number>
  };
  private y: {
    grid: Selection<SVGGElement, unknown, null, any>,
    elem: Selection<SVGGElement, unknown, null, any>,
    scale: ScaleLinear<number, number>,
    axis: Axis<number>,
    gridAxis: Axis<number>
  };

  private mostStacks: number = 0;
  private highlightRect: Selection<SVGRectElement, unknown, null, any>;

  // Abstract properties
  protected abstract stacker: Stack<any, StackSeriesDatum, K>;
  protected abstract data: StackSeriesDatum[];
  protected abstract colour(i: number): string;

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
    this.updateSkeleton();
  }

  public $onDestroy(): void { }

  private buildSkeleton(): void {
    this.y = {
      grid: this.root.append('g').attr('class', 'y grid').style('color', '#bbb').style('shape-rendering', 'optimizeSpeed'), // TODO: use stylesheet,
      elem: this.root.append('g').attr('class', 'y axis'),
      scale: scaleLinear(),
      axis: axisLeft<number>(scaleLinear().range([this.chartHeight, 0]).nice()).ticks(this.chartHeight / 30),
      gridAxis: axisRight<number>(scaleLinear().range([this.chartHeight, 0]).nice()).ticks(this.chartHeight / 30)
    };

    this.x = {
      elem: this.root.append('g').attr('class', 'x axis').attr('transform', `translate(0, ${this.chartHeight})`),
      scale: scaleBand<Month>().paddingInner(.2).paddingOuter(.1),
      axis: axisBottom<Month>(scaleTime().range([0, this.chartWidth]).nice()).ticks(this.chartWidth / 120).tickSizeOuter(0)
    };

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
    ).subscribe(([entry, selected]) => {
      if (!entry) {
        return slowTransition(this.highlightRect).attr('opacity', 0);
      }

      slowTransition(this.highlightRect)
        .attr('x', this.x.scale(entry.month) - this.x.scale.step() * (this.x.scale.paddingInner() / 2))
        .attr('stroke-width', selected ? 1 : 0)
        .attr('opacity', 1)
        .attr('width', this.x.scale.step())
        .attr('height', this.chartHeight);
    });
  }

  private updateSkeleton(): void {
    this.x.elem.attr('transform', `translate(0, ${this.chartHeight})`);
    this.x.scale.range([0, this.chartWidth]);
    this.x.axis.ticks(this.chartWidth / 120).tickFormat(timeFormat('%b'));

    this.y.scale.range([this.chartHeight, 0]).nice();
    this.y.axis.ticks(this.chartHeight / 30).tickSizeOuter(0).tickFormat(d => String(Math.abs(d)));
    this.y.gridAxis.ticks(this.chartHeight / 30).tickSize(this.chartWidth).tickSizeOuter(0);

    this.hover
      .attr('width', this.chartWidth)
      .attr('height', this.chartHeight);
  }

  protected refresh(): void {
    if (!this.data || !this.stacker) {
      return;
    }

    const stacks = this.stacker(this.data);
    this.y.scale.domain([0, max([].concat(...stacks.map(stack => stack.map(([_, top]) => top))))]).nice(this.chartHeight / 30);
    this.x.scale.domain(timeMonth.range(
      min(this.data.map(({ month }) => month)),
      max(this.data.map(({ month }) => new Date(month.getFullYear(), month.getMonth() + 1, 0)))
    ));

    slowTransition(this.x.elem).call(this.x.axis.scale(this.x.scale).bind({}));
    slowTransition(this.y.elem).call(this.y.axis.scale(this.y.scale).bind({}));
    slowTransition(this.y.grid).call(this.y.gridAxis.scale(this.y.scale).bind({}));

    this.mostStacks = Math.max(this.mostStacks, stacks.length);
    const groups = this.bars.selectAll<SVGElement, StackSeriesDatum>('g.stack')
      .data([...stacks, ...Array.from({ length: this.mostStacks - stacks.length }, () => [])]) // fix 'exit' elements not being transitioned
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
          .attr('x', ({ data: { month } }) => this.x.scale(month))
          .attr('y', d => this.y.scale(d[1]) - this.y.scale(d[0]))
          .attr('width', this.x.scale.bandwidth())
          .attr('height', 0)
          .call(e => slowTransition(e)
            .attr('opacity', 1)
            .attr('y', d => this.y.scale(d[1]))
            .attr('height', d => this.y.scale(d[0]) - this.y.scale(d[1]))
          ),
        update => update.call(u => slowTransition(u)
          .attr('opacity', 1)
          .attr('x', ({ data: { month } }) => this.x.scale(month))
          .attr('y', d => this.y.scale(d[1]))
          .attr('width', this.x.scale.bandwidth())
          .attr('height', d => this.y.scale(d[0]) - this.y.scale(d[1]))
        ),
        exit => exit.call(e => slowTransition(e)
          .attr('opacity', 0)
          .attr('y', 0)
          .attr('height', 0)
          .remove()
        )
      );

    this.desaturiseExcluded(this.selected$.getValue());
  }

  private desaturiseExcluded(entry: StackSeriesDatum): void {
    if (!this.data) {
      return;
    }

    const idx = this.data.findIndex(a => this.isSame(a, entry));
    slowNamedTransition('colour', this.root.selectAll('g.stack').datum((_, i) => {
      const { h, l } = hsl(this.colour(i));
      return String(hsl(h, 0, l));
    }).selectAll<SVGRectElement, string>('rect'))
      .style('fill', function(_, i): string {
        return (idx === -1 || idx === i)
          ? null // don't override colour
          : select<any, string>(this.parentNode).datum(); // desaturise
      });
  }

  private isSame(a: StackSeriesDatum | null, b: StackSeriesDatum | null): boolean {
    return (a === null || b === null) ? a === b : a.month.getTime() === b.month.getTime();
  }

  private getDatumAt(e: MouseEvent): StackSeriesDatum {
    const invert: (x: number) => number = x => Math.floor(x / this.x.scale.step());
    return this.data[invert(e.clientX - (e.target as Element).getBoundingClientRect().left)];
  }

  private get margin(): { top: number, right: number, bottom: number, left: number } {
    return { top: 10, right: 40, bottom: 20, left: 40 };
  }

  private get chartWidth(): number {
    return this.width - this.margin.left - this.margin.right;
  }

  private get chartHeight(): number {
    return this.height - this.margin.top - this.margin.bottom;
  }

  private get width(): number {
    return this.svg.clientWidth;
  }

  private get height(): number {
    return this.svg.clientHeight;
  }
}
