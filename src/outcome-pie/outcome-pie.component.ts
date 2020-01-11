import { IComponentOptions, IOnChangesObject, IAugmentedJQuery, IScope } from 'angular';

import { hsl, color } from 'd3-color';
import { interpolate } from 'd3-interpolate';
import { ScalePower } from 'd3-scale';
import { select, local, Selection } from 'd3-selection';
import { pie, PieArcDatum, arc, DefaultArcObject, Pie } from 'd3-shape';
import { Transition } from 'd3-transition';

import { slowTransition, slowNamedTransition } from 'src/utils';

import { PopulationCode, Discriminator, PopulationClass } from 'src/population.class';
import { Outcome } from 'src/outcome.class';
import { REFRESH_EVENT } from 'src/refresh-event.class';

export type OutcomeStats = Partial<Record<PopulationCode, number>>;

const slice = local<Partial<DefaultArcObject>>();

export const outcomePieComponent: IComponentOptions = {
  template: require('./outcome-pie.component.html'),
  bindings: {
    discriminator: '<',
    outcome: '<',
    stats: '<',
    areaScale: '<'
  },
  controller: class OutcomePieController {

    public static $inject: string[] = ['$scope', '$element'];

    // angular bindings
    public discriminator: Discriminator;
    public outcome: Outcome;
    public stats: OutcomeStats;
    public areaScale: ScalePower<number, number>;

    // template bindings
    private svg: SVGSVGElement;
    private root: Selection<SVGGElement, any, any, any>;
    private legend: Selection<SVGGElement, unknown, null, undefined>;
    private piePos: Selection<SVGGElement, any, any, any>;
    private numericPos: Selection<SVGTextElement, any, any, any>;

    private pie: Pie<any, PopulationClass>;

    constructor($scope: IScope, private $element: IAugmentedJQuery) {
      $scope.$on(REFRESH_EVENT, () => this.refresh());
      this.svg = $element[0].querySelector('svg');
      this.root = select(this.svg).append('g')
        .attr('transform', `translate(${this.margin.left + this.chartWidth / 2}, ${this.margin.top + this.chartHeight / 2})`);
      this.legend = select(this.svg).append('g')
        .attr('transform', `translate(${this.margin.left + this.chartWidth / 2}, 5)`);
      this.piePos = this.root.append('g');
      this.numericPos = this.root.append('text');
      this.pie = pie<PopulationClass>()
        .value(({ id }) => this.stats[id])
        .sortValues(null);
    }

    public $onInit(): void {
      this.svg.setAttribute('width', String(this.width));
      this.svg.setAttribute('height', String(this.height));
    }

    public $onChanges(changes: IOnChangesObject): void {
      if (changes['outcome']) {
        this.$element[0].style.setProperty('--colour', this.outcome.colour);
      }

      if (changes['stats']) {
        this.refresh();
      }

      if (changes['discriminator']) {
        this.drawLegend();
      }
    }

    public $onDestroy(): void { }

    private refresh(): void {
      if (!this.outcome || !this.stats || !this.areaScale || !this.discriminator) {
        return;
      }

      const arcs = this.pie(this.discriminator.populations);
      const innerRadius = this.areaScale.range()[0];
      const outerRadius = this.areaScale(this.total());
      const arcGen = arc<Partial<DefaultArcObject>>().innerRadius(innerRadius);
      const centroidGen = arc<Partial<DefaultArcObject>>();
      const vanish: Partial<DefaultArcObject> = { innerRadius, outerRadius: innerRadius, startAngle: 0, endAngle: 0 };

      function animateSlice(
        animation: 'enter' | 'update' | 'exit',
        e: Selection<SVGPathElement, PieArcDatum<PopulationClass>, SVGGElement, unknown>
      ): Transition<SVGPathElement, PieArcDatum<PopulationClass>, SVGGElement, unknown> {
        return slowTransition(e).attrTween('d', function(d) {
          const from = animation === 'enter' ? vanish : slice.get(this);
          const to = animation === 'exit' ? vanish : {
            ...d,
            startAngle: Math.PI * 2 - d.startAngle,
            endAngle: Math.PI * 2 - d.endAngle,
            outerRadius
          };

          const i = interpolate(from, to);
          return t => arcGen((slice.set(this, i(t)) as Partial<DefaultArcObject>)); // TODO: PR into @types/local#set
        });
      }

      const fontSize = 50;
      const threshold = fontSize;

      const self = this;
      function sumOthers(idx: number): number {
        return self.discriminator.populations.filter((_, i) => i !== idx).reduce((sum, { id }) => sum + self.stats[id], 0);
      }

      function animateLabel(
        animation: 'enter' | 'update' | 'exit',
        e: Selection<SVGTextElement, PieArcDatum<PopulationClass>, SVGGElement, unknown>
      ): Transition<SVGTextElement, PieArcDatum<PopulationClass>, SVGGElement, unknown> {
        return (slowTransition(e)
          .style('opacity', ({ value }, idx) => animation === 'exit' || !value || (outerRadius >= threshold && !sumOthers(idx)) ? 0 : 1)
          .attrTween('x', function(d, idx) {
            const oRadius = sumOthers(idx) ? outerRadius : innerRadius;
            const from = animation === 'enter' ? vanish : slice.get(this);
            const to = animation === 'exit' ? vanish : {
              ...d,
              startAngle: Math.PI * 2 - d.startAngle,
              endAngle: Math.PI * 2 - d.endAngle,
              outerRadius: oRadius,
              innerRadius: oRadius < threshold ? innerRadius : innerRadius + (oRadius - innerRadius) / 2
            };

            const i = interpolate(from, to);
            return t => String(centroidGen.centroid((slice.set(this, i(t)) as Partial<DefaultArcObject>))[0]); // TODO: PR into @types/local#set
          }).attrTween('y', function(d, idx) {
            const oRadius = sumOthers(idx) ? outerRadius : innerRadius;
            const from = animation === 'enter' ? vanish : slice.get(this);
            const to = animation === 'exit' ? vanish : {
              ...d,
              startAngle: Math.PI * 2 - d.startAngle,
              endAngle: Math.PI * 2 - d.endAngle,
              outerRadius: oRadius,
              innerRadius: oRadius < threshold ? innerRadius : innerRadius + (oRadius - innerRadius) / 2
            };

            const i = interpolate(from, to);
            return t => String(centroidGen.centroid((slice.set(this, i(t)) as Partial<DefaultArcObject>))[1]); // TODO: PR into @types/local#set
          }) as unknown as { // textTween not defined in @types/d3 just yet // TODO: create PR to add textTween to @types/d3
            textTween: (
              factory: (datum: PieArcDatum<PopulationClass>, idx: number) => (time: number) => string
            ) => Transition<SVGTextElement, PieArcDatum<PopulationClass>, SVGGElement, unknown>
          }).textTween(function({ value }) {
            const i = interpolate(this._current || 0, animation === 'exit' ? 0 : value);
            return t => String(Math.round(this._current = i(t)));
          });
      }

      (slowTransition(this.numericPos.datum(this.total())
        .attr('dominant-baseline', 'central')
        .attr('text-anchor', 'middle')
        .style('font-size', `${fontSize}px`)
      )
        .style('fill', outerRadius < threshold ? this.colour(1) : String(color('white')))
        .attr('transform', `translate(0, ${outerRadius < threshold && outerRadius !== innerRadius ? 40 : 0})`) as unknown as {
          // textTween not defined in @types/d3 just yet
          // TODO: create PR to add textTween to @types/d3
          textTween: (factory: (datum: number, idx: number) => (time: number) => string) => void
        }).textTween(function(v) {
          const i = interpolate(this._current || 0, v);
          return t => String(Math.round(this._current = i(t)));
        });

      slowTransition(this.piePos)
        .attr('transform', `translate(0, ${outerRadius < threshold && outerRadius !== innerRadius ? -40 : 0})`);

      this.piePos.selectAll<SVGPathElement, PieArcDatum<PopulationClass>>('path.arc')
        .data(arcs)
        .join(
          enter => enter.append('path')
            .attr('class', 'arc')
            .attr('fill', (_, i) => this.colour(i))
            .call(e => animateSlice('enter', e)),
          update => update.call(u => animateSlice('update', u)),
          exit => exit.call(e => animateSlice('exit', e).remove())
        );

      this.piePos.selectAll<SVGTextElement, PieArcDatum<PopulationClass>>('text.pop-label')
        .data(arcs)
        .join(
          enter => enter.append('text')
            .attr('class', 'pop-label')
            .attr('fill', 'white')
            .attr('dominant-baseline', 'central')
            .attr('text-anchor', 'middle')
            .style('font-size', `16px`)
            .call(e => animateLabel('enter', e)),
          update => update.call(u => animateLabel('update', u)),
          exit => exit.call(e => animateLabel('exit', e).remove())
        );
    }

    private drawLegend(): void {
      if (!this.discriminator) {
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
          update => update.call(u => slowTransition(u).style('opacity', 1)),
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
            .call(u => slowTransition(u).style('opacity', 1)),
          exit => exit.call(e => slowNamedTransition('eric', e).style('opacity', 0).remove())
        );
    }

    protected total(): number {
      return this.discriminator.populations.reduce((sum, { id }) => sum + this.stats[id], 0);
    }

    private colour(i: number): string {
      const { h, s, l } = hsl(this.outcome && this.outcome.colour);
      return String(hsl(h, s * (i ? .75 : 1), l * (i ? .75 : 1)));
    }

    private get margin(): { top: number, right: number, bottom: number, left: number } {
      return { top: 30, right: 0, bottom: 0, left: 0 };
    }

    private get width(): number {
      return 200;
    }

    private get height(): number {
      return 210;
    }

    private get chartWidth(): number {
      return this.width - this.margin.left - this.margin.right;
    }

    private get chartHeight(): number {
      return this.height - this.margin.top - this.margin.bottom;
    }
  }
};
