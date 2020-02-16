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
import { statisticsSummaryComponent } from './statistics-summary/statistics-summary.component';
import { slidingWindowBarchartYearsComponent } from './sliding-window-barchart-years/sliding-window-barchart-years.component';
import { yearPickerComponent } from './year-picker/year-picker.component';

import { SessionRecord, Month, InstructorID, } from './record.class';
import { Outcome, OutcomeCode, SessionOutcomeCode } from './outcome.class';
import { REFRESH_EVENT } from './refresh-event.class';
import { outcomePieComponent } from './outcome-pie/outcome-pie.component';
import { Instructor } from './instructor.class';

export default ng.module('orca-sessions-stats', [])
  .component('statsDetails', statsDetailsComponent)
  .component('populationDiscriminator', populationDiscriminatorComponent)
  .component('sessionTypeSelector', sessionTypeSelectorComponent)
  .component('outcomeSelector', outcomeSelectorComponent)
  .component('histogramDatesFilter', histogramDatesFilterComponent)
  .component('barchartInstructors', barchartInstructorsComponent)
  .component('statisticsSummary', statisticsSummaryComponent)
  .component('slidingWindowBarchartYears', slidingWindowBarchartYearsComponent)
  .component('yearPicker', yearPickerComponent)
  .component('outcomePie', outcomePieComponent)

  .controller('main', ['$scope', class MainController {

    protected data: SessionRecord[];
    protected universe: Crossfilter<SessionRecord>;

    protected outcomes: Dimension<SessionRecord, OutcomeCode>;
    protected sessionOutcomes: Dimension<SessionRecord, SessionOutcomeCode>;
    protected types: Dimension<SessionRecord, number>;
    protected genders: Dimension<SessionRecord, boolean>;
    protected statuses: Dimension<SessionRecord, boolean>;
    protected instructors: Dimension<SessionRecord, number>;
    protected months: Dimension<SessionRecord, Month>;
    protected sessions: Dimension<SessionRecord, number>;
    protected years: Dimension<SessionRecord, number>;

    private disposeOnChanges: () => void;

    public outcome: Outcome;
    public instructorsMap: Record<InstructorID, Instructor>;

    public instructor: Instructor;
    public year: number;

    constructor(private $scope: IScope) { }

    public displayInstructor(id: InstructorID): string {
      if (id === -1) {
        return 'ORGANISME EXT.';
      }

      const { empl_gender, empl_surname, empl_firstname } = this.instructorsMap[id];
      return empl_surname.toUpperCase();
    }

    public async $onInit(): Promise<void> {
      this.data = await json('./assets/records.json') as SessionRecord[];
      this.instructorsMap = await json('./assets/instructors.json') as Record<InstructorID, Instructor>;

      this.universe = crossfilter(this.data);

      this.outcomes = this.universe.dimension(({ trem_outcome }) => trem_outcome);
      this.sessionOutcomes = this.universe.dimension(({ trng_outcome }) => trng_outcome);
      this.types = this.universe.dimension(({ trng_trty_fk }) => trng_trty_fk);
      this.genders = this.universe.dimension(({ empl_gender }) => empl_gender);
      this.statuses = this.universe.dimension(({ empl_permanent }) => empl_permanent);
      this.instructors = this.universe.dimension(({ instructors }) => instructors, true);
      this.months = this.universe.dimension(({ month }) => month);
      this.sessions = this.universe.dimension(({ trng_pk }) => trng_pk);
      this.years = this.universe.dimension(({ year }) => year);

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
        this.months.filterAll();
      }
    }

    public filterInstructor(instructor: number | null): void {
      if (instructor) {
        this.instructor = this.instructorsMap[instructor];
        this.instructors.filterExact(instructor);
      } else {
        this.instructor = null;
        this.instructors.filterAll();
      }
    }

    public selectType(type: number): void {
      this.types.filterExact(type);
    }

    public selectOutcome(outcome: Outcome): void {
      this.outcome = outcome;
      this.outcomes.filterExact(outcome.id);
    }

    public selectYear(year: number): void {
      this.year = year;
      this.years.filterExact(year);
    }

    public $onDestroy(): void {
      this.disposeOnChanges();
      this.outcomes.dispose();
      this.sessionOutcomes.dispose();
      this.types.dispose();
      this.genders.dispose();
      this.statuses.dispose();
      this.instructors.dispose();
      this.months.dispose();
      this.sessions.dispose();
      this.years.dispose();
    }
  }])
  .name;
