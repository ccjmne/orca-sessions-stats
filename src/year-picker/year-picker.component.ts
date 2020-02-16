import { IComponentOptions, IAugmentedJQuery, IOnChangesObject, IScope, IWindowService } from 'angular';

import { fromEvent } from 'rxjs';
import { takeUntil, debounceTime, startWith } from 'rxjs/operators';
import { componentDestroyed } from 'src/component-destroyed';

import { hsl } from 'd3-color';
import { Selection, select } from 'd3-selection';
import { Dimension, Group } from 'crossfilter2';

import { slowTransition } from 'src/utils';

import { REFRESH_EVENT } from 'src/refresh-event.class';
import { Outcome } from 'src/outcome.class';
import { SessionRecord } from 'src/record.class';
import { extent } from 'd3-array';

require('./year-picker.component.scss');

type Year = number;

export const yearPickerComponent: IComponentOptions = {
  template: `<svg style="height: 100%;"></svg>`,
  bindings: {
    outcome: '<',
    years: '<',
    onSelect: '&'
  },
  controller: class YearPickerController {

    public static $inject: string[] = ['$scope', '$element', '$window'];

    // angular bindings
    public outcome: Outcome;
    public years: Dimension<SessionRecord, Year>;
    public onSelect: (ctx: { year: Year }) => void;

    // template bindings
    private svg: SVGSVGElement;
    private root: Selection<SVGGElement, unknown, null, undefined>;

    // data
    private group: Group<SessionRecord, Year, number>;
    private selected: Year;

    constructor(private $scope: IScope, private $element: IAugmentedJQuery, private $window: IWindowService) {
      this.svg = $element[0].querySelector('svg');
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
      if (this.years) {
        if (changes['years']) {
          if (this.group) {
            this.group.dispose();
          }

          this.group = this.years.group<Year, number>().reduceCount();
          this.select(Math.max(...this.group.all().map(({ key: year }) => year)));
        }

        this.refresh();
      }
    }

    private buildSkeleton(): void {
      this.root = select(this.svg)
        .append('g')
        .attr('transform', `translate(${this.width / 2}, ${this.height / 2})`);
    }

    private updateYearLabel(): void {
      slowTransition(this.root).attr('transform', `translate(0, ${this.height / 2})`);
      const [lo, hi] = extent(this.group.all().map(({ key }) => key));

      function desat(colour: string): string {
        const { h, l } = hsl(colour);
        return String(hsl(h, 0, l));
      }

      const selectedIdx = hi - this.selected;
      slowTransition(this.root.selectAll<SVGTextElement, unknown>('text.year-label')
        .data(Array.from({ length: hi - lo + 1 }, (_, i) => hi - i))
        .join('text')
        .text(String)
        .attr('class', 'year-label')
        .attr('text-anchor', 'left')
        .style('font-size', `${50}px`)
        .style('font-family', 'sans-serif')
        .style('font-weight', 'bold')
        .style('alignment-baseline', 'central')
        .on('click', year => this.select(year))
      )
        .attr('transform', (_, i) => `translate(0, ${(i - selectedIdx) * 50})`)
        .attr('opacity', (_, i) => 1 - Math.abs(i - selectedIdx) / 3)
        .style('cursor', d => d === this.selected ? 'default' : 'pointer')
        .style('fill', d => d === this.selected ? this.colour(0) : desat(this.colour(0)));

      this.svg.setAttribute('width', `${this.root.node().getBBox().width}px`);
      this.$element[0].setAttribute('width', `${this.root.node().getBBox().width}px`);
    }

    private refresh(): void {
      if (!this.group || !this.selected || !this.root) { // TODO: better initialisation mechanism
        return;
      }

      this.updateYearLabel();
    }

    private select(year: Year): void {
      this.onSelect({ year: this.selected = year });
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

    private get width(): number {
      return this.svg.clientWidth || 250;
    }

    private get height(): number {
      return this.svg.clientHeight;
    }
  }
};
