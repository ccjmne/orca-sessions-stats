'use strict';

import { IComponentOptions, IComponentController, IWindowService, IAugmentedJQuery, IOnChangesObject } from 'angular';

import { fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { select, scaleTime, axisBottom, scaleLinear, axisLeft, easeExpOut as easing, extent, timeFormat, max, format, ScaleTime, ScaleLinear, Axis, Selection, stack, stackOffsetNone, stackOrderNone, Stack, Series, hsl } from 'd3';

import { validatedByMonth } from 'src/datasets/validated-by-month';

export const sessionStatsComponent: IComponentOptions = {
  template: `<svg style='width: 100%; height: 100%;'></svg>`,
  bindings: {
    mode: '<'
  },
  controller: ['$element', '$window', class SessionsStatsController implements IComponentController {
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

    public mode: boolean;

    private stats = validatedByMonth;
    private stacker: Stack<any, { date: Date; male: number; female: number; }, string>;

    private snapTransition = (e: Selection<SVGElement, unknown, null, any>) => e.transition().duration(100).ease(easing);
    private slowTransition = <Datum>(e: Selection<SVGElement, Datum, any, any>) => e.transition().duration(500).ease(easing);

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
      this.stacker = stack<{ date: Date, male: number, female: number }>()
        .keys(['male', 'female'])
        .order(stackOrderNone)
        .offset(stackOffsetNone);

      this.root = select(this.svg)
        .append('g')
        .attr('transform', `translate(${this.margin.left}, ${this.margin.top})`);

      this.buildSkeleton();
      this.refresh();
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (changes['mode'] && !changes['mode'].isFirstChange()) {
        this.refresh();
      }
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

    private refresh(): void {
      this.slowTransition(this.x.elem)
        .call(this.x.axis.scale(this.x.scale.domain(extent(this.stats, ({ date }: { date: Date }) => date)).nice())
          .tickSize(10)
          .tickFormat((date: Date) => (date instanceof Date ? date.getMonth() ? timeFormat('%B') : timeFormat('%Y') : () => null)(date))
          .bind({})
        );

      this.slowTransition(this.y.elem)
        .call(this.y.axis
          .scale(this.y.scale.domain([0, this.stats.reduce((acc: number, entry) => max([acc, entry.total]), 0)]).nice())
          .tickSize(6)
          .tickFormat(format('d'))
          .bind({}));

      const stacked = this.mode
        ? this.stacker(this.stats.map(({ date, genders: { male, female } }) => ({ date, male, female })))
        : this.stacker(this.stats.map(({ date, statuses: { permanent, temporary } }) => ({ date, male: permanent, female: temporary })));

      const { h, s, l } = this.mode ? hsl('crimson') : hsl('teal');
      const [colour, desaturated] = [hsl(h, s, l), hsl(h, s * .6, l * .8)];

      const groups = this.root.selectAll<SVGElement, { date: Date, male: number, female: number }>('g.stack')
        .data(stacked)
        .join('g')
        .attr('class', 'stack');

      this.slowTransition(groups)
        .style('fill', (_, idx) => String(idx ? desaturated : colour));

      this.slowTransition(groups
        .selectAll<SVGElement, Series<any, { date: Date, male: number, female: number }>>('rect')
        .data(d => d)
        .join('rect')
      ).attr('x', d => this.x.scale(d.data.date))
        .attr('y', d => this.y.scale(d[1]))
        .attr('height', d => this.y.scale(d[0]) - this.y.scale(d[1]))
        .attr('width', ({ data: { date } }) => this.x.scale(this.getEndOfMonth(date)) - this.x.scale(date));
    }

    private getEndOfMonth(date: Date): Date {
      return new Date(Date.UTC(date.getFullYear(), date.getMonth() + 1, 0));
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
  }]
};
