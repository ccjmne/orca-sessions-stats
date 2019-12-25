'use strict';

import ng, { IScope } from 'angular';

import crossfilter, { Crossfilter, Dimension } from 'crossfilter2';
import { json } from 'd3';

import { SessionRecord } from './record.class';
import { statsDetailsComponent } from './stats-details/stats-details.component';

export default ng.module('orca-sessions-stats', [])
  .component('statsDetails', statsDetailsComponent)
  .controller('main', ['$scope', class MainController {

    protected data: SessionRecord[];
    protected universe: Crossfilter<SessionRecord>;

    protected genders: Dimension<SessionRecord, boolean>;
    protected statuses: Dimension<SessionRecord, boolean>;
    protected instructors: Dimension<SessionRecord, number>;
    protected months: Dimension<SessionRecord, Date>;

    private disposeOnChanges: () => void;

    public dates: [Date, Date] | null;

    constructor(private $scope: IScope) { }

    public async $onInit(): Promise<void> {
      const loaded = await json('./assets/records2.json') as SessionRecord[];
      // set dates to first day of month
      this.data = loaded
        .map(entry => (entry.trng_date = new Date(String(entry.trng_date)), entry)) // TODO: actually already have Dates instead of strings
        .filter(({ trng_date }) => trng_date.getFullYear() >= 2018 && trng_date.getFullYear() < 2019)
        .map(entry => (entry.trng_date = new Date(entry.trng_date.getFullYear(), entry.trng_date.getMonth(), 1), entry));

      this.universe = crossfilter(this.data);

      this.genders = this.universe.dimension(({ empl_gender }) => empl_gender);
      this.statuses = this.universe.dimension(({ empl_permanent }) => empl_permanent);
      this.instructors = this.universe.dimension(({ instructors }) => instructors, true);
      this.months = this.universe.dimension(({ trng_date }) => trng_date);

      this.$scope.$applyAsync();
      this.disposeOnChanges = this.universe.onChange(() => this.$scope.$applyAsync());
    }

    public filterDates(dates: { from: Date, to: Date } | null): void {
      this.dates = dates ? [dates.from, dates.to] : null;
      if (dates) {
        this.months.filterRange([dates.from, dates.to]);
      } else {
        this.months.filter(null);
      }
    }

    public $onDestroy(): void {
      this.disposeOnChanges();
    }
  }])
  .name;
