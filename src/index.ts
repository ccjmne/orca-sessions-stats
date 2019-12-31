'use strict';

import ng, { IScope } from 'angular';

import { json } from 'd3-fetch';
import crossfilter, { Crossfilter, Dimension } from 'crossfilter2';

import { statsDetailsComponent } from './stats-details/stats-details.component';
import { populationDiscriminatorComponent } from './population-discriminator/population-discriminator.component';
import { sessionTypeSelectorComponent } from './session-type-selector/session-type-selector.component';
import { outcomeSelectorComponent } from './outcome-selector/outcome-selector.component';
import { histogramDatesFilterComponent } from './histogram-dates-filter/histogram-dates-filter.component';
import { barchartInstructorsComponent } from './barchart-instructors/barchart-instructors.component';

import { SessionRecord, Month, SessionOutcome } from './record.class';
import { Outcome, OutcomeCode } from './outcome.class';
import { REFRESH_EVENT } from './refresh-event.class';

export default ng.module('orca-sessions-stats', [])
  .component('statsDetails', statsDetailsComponent)
  .component('populationDiscriminator', populationDiscriminatorComponent)
  .component('sessionTypeSelector', sessionTypeSelectorComponent)
  .component('outcomeSelector', outcomeSelectorComponent)
  .component('histogramDatesFilter', histogramDatesFilterComponent)
  .component('barchartInstructors', barchartInstructorsComponent)
  .controller('main', ['$scope', class MainController {

    protected data: SessionRecord[];
    protected universe: Crossfilter<SessionRecord>;

    protected outcomes: Dimension<SessionRecord, OutcomeCode>;
    protected types: Dimension<SessionRecord, number>;
    protected genders: Dimension<SessionRecord, boolean>;
    protected statuses: Dimension<SessionRecord, boolean>;
    protected instructors: Dimension<SessionRecord, number>;
    protected months: Dimension<SessionRecord, Date>;

    private disposeOnChanges: () => void;

    public outcome: Outcome;

    constructor(private $scope: IScope) { }

    public async $onInit(): Promise<void> {
      const loaded = await json('./assets/records2.json') as SessionRecord[];
      // set dates to first day of month
      this.data = loaded
        .map(entry => (entry.trng_date = new Date(String(entry.trng_date)), entry)) // TODO: actually already have Dates instead of strings
        .filter(({ trng_date }) => trng_date.getFullYear() >= 2018 && trng_date.getFullYear() < 2019)
        .map(entry => (entry.month = new Date(entry.trng_date.getFullYear(), entry.trng_date.getMonth(), 1), entry)); // 'month: Month' is the first day of the month

      this.universe = crossfilter(this.data);

      this.outcomes = this.universe.dimension(({ trem_outcome }) => trem_outcome);
      this.types = this.universe.dimension(({ trng_trty_fk }) => trng_trty_fk);
      this.genders = this.universe.dimension(({ empl_gender }) => empl_gender);
      this.statuses = this.universe.dimension(({ empl_permanent }) => empl_permanent);
      this.instructors = this.universe.dimension(({ instructors }) => instructors, true);
      this.months = this.universe.dimension(({ month }) => month);

      this.$scope.$applyAsync();
      this.disposeOnChanges = this.universe.onChange(() => {
        this.$scope.$broadcast(REFRESH_EVENT);
        this.$scope.$applyAsync();
      });
    }

    public filterMonth(month: Month | null): void {
      if (month) {
        this.months.filterExact(month);
      } else {
        this.months.filter(null);
      }
    }

    public filterInstructor(instructor: number | null): void {
      if (instructor) {
        this.instructors.filterExact(instructor);
      } else {
        this.instructors.filter(null);
      }
    }

    public selectType(type: number): void {
      this.types.filterExact(type);
    }

    public selectOutcome(outcome: Outcome): void {
      this.outcome = outcome;
      this.outcomes.filterExact(outcome.id);
    }

    public $onDestroy(): void {
      this.disposeOnChanges();
      this.outcomes.dispose();
      this.types.dispose();
      this.genders.dispose();
      this.statuses.dispose();
      this.instructors.dispose();
      this.months.dispose();
    }
  }])
  .name;
