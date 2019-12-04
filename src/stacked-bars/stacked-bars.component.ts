import { IComponentController, IWindowService, IAugmentedJQuery } from 'angular';

import { fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { select, scaleTime, axisBottom, scaleLinear, axisLeft, timeFormat, format, ScaleTime, ScaleLinear, Axis, Selection, Stack, Series, hsl, SeriesPoint } from 'd3';

import { slowTransition } from 'src/utils';

export interface RectDef<Datum> {
  x: (data: SeriesPoint<Datum>, scale: ScaleTime<number, number>) => number;
  y: (data: SeriesPoint<Datum>, scale: ScaleLinear<number, number>) => number;
  width: (data: SeriesPoint<Datum>, scale: ScaleTime<number, number>) => number;
  height: (data: SeriesPoint<Datum>, scale: ScaleLinear<number, number>) => number;
}

export abstract class StackedBarsComponent<StackSeriesDatum> implements IComponentController {
  private svg: SVGElement;
  private root: Selection<SVGGElement, unknown, null, any>;
  private x: {
    grid: Selection<SVGGElement, unknown, null, any>,
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

  protected abstract stacker: Stack<any, StackSeriesDatum, string>;
  protected abstract rect: RectDef<StackSeriesDatum>;
  protected abstract data: StackSeriesDatum[];

  protected abstract get domainX(): [Date, Date];
  protected abstract get domainY(): [number, number];

  private largestStacks: number = 0;

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
      grid: this.root.append('g').attr('class', 'x grid').attr('transform', `translate(0, ${this.chartHeight})`),
      elem: this.root.append('g').attr('class', 'x axis').attr('transform', `translate(0, ${this.chartHeight})`),
      scale: scaleTime().range([0, this.chartWidth]).nice(),
      axis: axisBottom(scaleTime().range([0, this.chartWidth]).nice()).ticks(this.chartWidth / 120)
    };

    this.y = {
      grid: this.root.append('g').attr('class', 'y grid'),
      elem: this.root.append('g').attr('class', 'y axis'),
      scale: scaleLinear().range([this.chartHeight, 0]).nice(),
      axis: axisLeft(scaleLinear().range([this.chartHeight, 0]).nice()).ticks(this.chartHeight / 30)
    };
  }

  private updateSkeleton(): void {
    this.x.grid.attr('transform', `translate(0, ${this.chartHeight})`);
    this.x.elem.attr('transform', `translate(0, ${this.chartHeight})`);
    this.x.scale.range([0, this.chartWidth]).nice();
    this.x.axis.ticks(this.chartWidth / 120);

    this.y.scale.range([this.chartHeight, 0]).nice();
    this.y.axis.ticks(this.chartHeight / 30);
  }

  protected refresh(): void {
    if (!this.data || !this.stacker || !this.rect) {
      return;
    }

    slowTransition(this.x.elem)
      .call(this.x.axis.scale(this.x.scale.domain(this.domainX).nice())
        .tickSize(10)
        .tickFormat((date: Date) => (date instanceof Date ? date.getMonth() ? timeFormat('%B') : timeFormat('%Y') : () => null)(date))
        .bind({})
      );

    slowTransition(this.y.elem)
      .call(this.y.axis
        .scale(this.y.scale.domain(this.domainY).nice())
        .tickSize(6)
        .tickFormat(format('d'))
        .bind({}));

    // TODO: better colour management (scale and/or config)
    const { h, s, l } = hsl('teal');
    const colours = [hsl(h, s, l), hsl(h, s * .6, l * .8), hsl(h, s * .3, l * .6)];

    const stacks = this.stacker(this.data);
    this.largestStacks = Math.max(this.largestStacks, stacks.length);

    const groups = this.root.selectAll<SVGElement, StackSeriesDatum>('g.stack')
      .data([...stacks, ...Array.from({ length: this.largestStacks - stacks.length }, () => [])]) // fix 'exit' elements not being transitioned
      .join('g')
      .attr('class', 'stack');

    slowTransition(groups)
      .style('fill', (_, idx) => String(colours[idx]));

    groups
      .selectAll<SVGElement, Series<any, StackSeriesDatum>>('rect')
      .data(d => d)
      .join(
        enter => enter.append('rect')
          .attr('opacity', 0)
          .attr('x', d => this.rect.x(d, this.x.scale))
          .attr('y', d => -this.rect.height(d, this.y.scale))
          .attr('width', d => this.rect.width(d, this.x.scale))
          .attr('height', d => this.rect.height(d, this.y.scale))
          .call(e => slowTransition(e)
            .attr('opacity', 1)
            .attr('y', d => this.rect.y(d, this.y.scale))
          ),
        update => update.call(u => slowTransition(u)
          .attr('opacity', 1)
          .attr('x', d => this.rect.x(d, this.x.scale))
          .attr('y', d => this.rect.y(d, this.y.scale))
          .attr('width', d => this.rect.width(d, this.x.scale))
          .attr('height', d => this.rect.height(d, this.y.scale))
        ),
        exit => exit.call(e => slowTransition(e)
          .attr('opacity', 0)
          .attr('y', d => -this.rect.height(d, this.y.scale))
          .attr('height', 0)
          .remove()
        )
      );
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
