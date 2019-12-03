'use strict';

import { IComponentOptions, IComponentController, IWindowService, IAugmentedJQuery } from 'angular';

import { fromEvent } from 'rxjs';
import { takeUntil, debounceTime } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { select, scaleTime, axisBottom, scaleLinear, axisLeft, easeCubicInOut as easing, extent, timeFormat, max, format, ScaleTime, ScaleLinear, Axis, Selection } from 'd3';

export const sessionStatsComponent: IComponentOptions = {
  template: `<svg style="width: 100%; height: 100%;"></svg>`,
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

    private stats: { date: Date, count: number, target: number }[] = [
      { date: new Date('2018-01-01'), count: 20, target: 15 },
      { date: new Date('2018-03-01'), count: 16, target: 15 },
      { date: new Date('2018-05-01'), count: 12, target: 15 },
      { date: new Date('2018-07-01'), count: 13, target: 15 },
      { date: new Date('2018-09-01'), count: 10, target: 15 },
      { date: new Date('2018-11-01'), count: 16, target: 15 },
      { date: new Date('2019-01-01'), count: 14, target: 15 },
      { date: new Date('2019-03-01'), count: 15, target: 15 }
    ];

    private snapTransition = (e: Selection<SVGElement, unknown, null, any>) => e.transition().duration(100).ease(easing);
    private slowTransition = (e: Selection<SVGElement, unknown, null, any>) => e.transition().duration(500).ease(easing);

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
      this.refresh();
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
          .scale(this.y.scale.domain([0, this.stats.reduce((acc: number, entry) => max([acc, entry.count, entry.target]), 0)]).nice())
          .tickSize(6)
          .tickFormat(format('d'))
          .bind({}));
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
