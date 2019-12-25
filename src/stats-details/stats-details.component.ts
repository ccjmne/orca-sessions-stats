import { IComponentOptions, IComponentController, IOnChangesObject, IAugmentedJQuery, IWindowService } from 'angular';

import { fromEvent } from 'rxjs';
import { debounceTime, takeUntil } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { axisBottom, scaleLinear, axisTop, Selection, select, Axis, ScaleLinear, max, scaleBand, ScaleBand, axisLeft, format, interpolate } from 'd3';

import { slowTransition } from 'src/utils';
import { PopulationDiscriminator, PopulationClass } from 'src/population-discriminator/population-discriminator.class';
import { ByDate } from 'src/record.class';
import { Dated } from 'src/outcomes-histogram/outcome-histogram-layer.component';
import { OutcomeCode, InfosSelector } from 'src/infos-selector/infos-selector.class';

export const statsDetailsComponent = {
  template: require('./stats-details.component.html'),
  controllerAs: '$ctrl',
  bindings: {
    entry: '<',
    discriminator: '<',
    infos: '<'
  },
  controller: class StatsDetailsComponent implements IComponentController {

    public static $inject: string[] = ['$element', '$window'];

    // angular bindings
    public entry: Dated<ByDate>;
    public infos: InfosSelector[];
    public discriminator: PopulationDiscriminator;

    // template-ish references
    private svg: SVGSVGElement;
    private root: Selection<SVGGElement, unknown, null, undefined>;

    private scale: ScaleLinear<number, number>;

    private above: {
      elem: Selection<SVGGElement, unknown, null, any>,
      definition: Axis<number>
    };

    private below: {
      elem: Selection<SVGGElement, unknown, null, any>,
      definition: Axis<number>
    };

    private grid: {
      elem: Selection<SVGGElement, unknown, null, any>,
      definition: Axis<number>
    };

    private scaleOutcomes: ScaleBand<OutcomeCode>;
    private outcomesAxis: {
      elem: Selection<SVGGElement, unknown, null, any>
      definition: Axis<OutcomeCode>
    };

    private legend: Selection<SVGGElement, unknown, null, undefined>;

    private percent = format('.0%');

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

    public $onChanges(changes: IOnChangesObject): void {
      if (this.scale) { // TODO: better initialisation mechanism
        this.updateSkeleton();
        this.refresh();
      }
    }

    public $onDestroy(): void { }

    public getAttributes(): PopulationClass[] {
      return this.discriminator.keys;
    }

    private buildSkeleton(): void {
      this.scale = scaleLinear().range([0, this.chartWidth]);
      this.grid = {
        elem: this.root.append('g').attr('class', 'grid').style('color', '#ccc'), // TODO: use stylesheet
        definition: axisBottom<number>(this.scale)
          .tickFormat(() => '')
          .tickSize(this.chartHeight)
      };
      this.above = {
        elem: this.root.append('g').attr('class', 'x axis above'),
        definition: axisTop<number>(this.scale)
          .tickFormat(d => String(Math.abs(d)))
          .tickSize(6)
          .tickSizeOuter(0)
      };
      this.below = {
        elem: this.root.append('g').attr('class', 'x axis below').attr('transform', `translate(0, ${this.chartHeight})`),
        definition: axisBottom<number>(this.scale)
          .tickFormat(d => String(Math.abs(d)))
          .tickSize(6)
          .tickSizeOuter(0)
      };

      this.scaleOutcomes = scaleBand<OutcomeCode>()
        .paddingInner(.25)
        .paddingOuter(.25)
        .range([0, this.chartHeight]);

      this.outcomesAxis = {
        elem: this.root.append('g').attr('class', 'y axis').attr('transform', `translate(0, 0)`),
        definition: axisLeft<OutcomeCode>(this.scaleOutcomes)
          .tickSize(6)
          .tickSizeOuter(0)
          .tickFormat(d => this.infos.find(({ outcome }) => d === outcome).label)
      };

      this.legend = select(this.svg).append('g').attr('transform', `translate(${this.margin.left + this.chartWidth / 2}, 0)`);
    }

    private updateSkeleton(): void {
      this.scale.range([0, this.chartWidth]);
      this.scaleOutcomes.range([0, this.chartHeight]);

      this.grid.definition.ticks(this.chartWidth / 60).tickSize(this.chartHeight).tickSizeOuter(0);
      this.above.definition.ticks(this.chartWidth / 60);
      this.below.definition.ticks(this.chartWidth / 60);

      this.legend.attr('transform', `translate(${this.margin.left + this.chartWidth / 2}, 0)`);
    }

    private refresh(): void {
      if (!this.entry) {
        return;
      }

      const positive = max(
        [].concat(...this.getAttributes().map(key => this.infos.map(({ outcome }) => this.entry[outcome][key])))
      );

      this.scale.domain([-positive, positive]).nice(this.chartWidth / 60);
      this.scaleOutcomes.domain(this.infos.map(({ outcome }) => outcome));

      slowTransition(this.grid.elem).call(this.grid.definition.scale(this.scale).bind({}));

      // slowTransition(this.above.elem).call(this.above.definition.scale(this.scale).bind({}));
      slowTransition(this.below.elem).call(this.below.definition.scale(this.scale).bind({}));

      slowTransition(this.outcomesAxis.elem).call(this.outcomesAxis.definition.scale(this.scaleOutcomes).bind({}));

      const outcomesGroups = this.root
        .selectAll('g.outcome')
        .data(this.infos.map(({ outcome }) => outcome))
        .join('g')
        .attr('class', 'outcome')
        .attr('transform', `translate(${this.chartWidth / 2}, 0)`);

      slowTransition(outcomesGroups
        .selectAll<SVGRectElement, OutcomeCode>('rect.population')
        .data(outcome => this.getAttributes().map(attr => ({ attr, outcome })))
        .join('rect')
        .attr('class', ({ outcome }) => `population ${outcome}`)
      )
        .attr('x', ({ attr: key, outcome }, i) => i ? 0 : -(this.scale(this.entry[outcome][key]) - this.scale(0)))
        .attr('y', ({ outcome }) => this.scaleOutcomes(outcome))
        .attr('width', ({ attr: key, outcome }) => this.scale(this.entry[outcome][key]) - this.scale(0))
        .attr('height', this.scaleOutcomes.bandwidth())
        .attr('fill', (_, i) => this.discriminator.colours[i]);

      outcomesGroups
        .selectAll<SVGGElement, OutcomeCode>('rect.text-bg')
        .data(outcome => this.getAttributes().map(attr => ({ attr, outcome })))
        .join('rect')
        .attr('class', 'text-bg')
        .attr('x', (_, i) => i ? 5 : -5 - 40)
        .attr('y', ({ outcome }) => this.scaleOutcomes(outcome) + this.scaleOutcomes.bandwidth() / 6)
        .attr('width', 40)
        .attr('height', this.scaleOutcomes.bandwidth() * 4 / 6)
        .attr('rx', 5)
        .attr('fill', 'rgba(255, 255, 255, .5)');

      const self = this;
      (slowTransition(outcomesGroups
        .selectAll<SVGGElement, OutcomeCode>('text.percent')
        .data(outcome => this.getAttributes().map(attr => ({ attr, outcome })))
        .join('text')
        .attr('alignment-baseline', 'central')
        .attr('class', ({ outcome }) => `percent ${outcome}`)
        .attr('x', (_, i) => i ? 8 : -8)
        .attr('y', ({ outcome }) => this.scaleOutcomes(outcome) + this.scaleOutcomes.bandwidth() / 2)
        .style('font-size', '13px') // TODO: use stylesheet
        .style('font-family', 'sans-serif') // TODO: use stylesheet
        .attr('text-anchor', (_, i) => i ? 'start' : 'end')
      ) as unknown as {
          // textTween not defined in @types/d3 just yet
          // TODO: create PR to add textTween to @types/d3
          textTween: (factory: (datum: { attr: PopulationClass, outcome: string }, idx: number) => (time: any) => string) => any
        }).textTween(function({ attr: key, outcome }) {
          const i = interpolate(this._current || 0, self.entry[outcome][key] / self.entry[outcome].total || 0);
          return t => self.percent(this._current = i(t));
        });

      const keys = this.getAttributes();


      const legendWidth = 15;

      // Add one dot in the legend for each name.
      this.legend.selectAll('rect')
        .data(keys)
        .join('rect')
        .attr('x', (_, i) => i ? 0 : -legendWidth)
        .attr('width', legendWidth)
        .attr('height', legendWidth)
        .style('fill', (_, i) => this.discriminator.colours[i]);

      // Add one dot in the legend for each name.
      this.legend.selectAll('text')
        .data(keys)
        .join('text')
        .attr('x', (_, i) => i ? (legendWidth + 5) : -(legendWidth + 5))
        .attr('y', () => legendWidth / 2)
        .style('fill', (_, i) => this.discriminator.colours[i])
        .text((_, i) => this.discriminator.individualLabels[i])
        .attr('text-anchor', (_, i) => i ? 'start' : 'end')
        .style('font-family', 'sans-serif')
        .style('font-weight', 'bold')
        .style('alignment-baseline', 'central');
    }

    private get margin() {
      return { top: 20, right: 20, bottom: 20, left: 60 };
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
} as IComponentOptions;
