'use strict';

import ng, { IScope } from 'angular';

import { statsDetailsComponent } from './stats-details/stats-details.component';
import { StatsEntry } from './datasets/session-stats';
import { populationDiscriminatorComponent } from './population-discriminator/population-discriminator.component';
import { infosSelectorComponent } from './infos-selector/infos-selector.component';
import { SessionRecord, ByDate } from './record.class';
import { json } from 'd3';
import crossfilter, { Crossfilter, Dimension, Grouping, Group } from 'crossfilter2';
import { outcomesHistogramModule } from './outcomes-histogram/outcomes-histogram.module';
import { PopulationClass } from './population-discriminator/population-discriminator.class';
import { OutcomeCode } from './infos-selector/infos-selector.class';

export default ng.module('orca-sessions-stats', [outcomesHistogramModule])
  // .component('sessionsStats', sessionStatsComponent)
  .component('statsDetails', statsDetailsComponent)
  .component('populationDiscriminator', populationDiscriminatorComponent)
  .component('infosSelector', infosSelectorComponent)
  .controller('main', ['$scope', class MainController {

    protected data: SessionRecord[];
    protected universe: Crossfilter<SessionRecord>;

    protected genders: Dimension<SessionRecord, boolean>;
    protected employmentStatuses: Dimension<SessionRecord, boolean>;
    protected instructors: Dimension<SessionRecord, number>;
    protected date: Dimension<SessionRecord, Date>;

    protected byDates: readonly Grouping<Date, ByDate>[];

    private _highlighted: StatsEntry | null;
    handler: () => void;

    private gendersGroup: Group<SessionRecord, boolean, { VALIDATED: 0; FLUNKED: 0; MISSING: 0; }>;
    private datesGroups: Group<SessionRecord, Date, Record<OutcomeCode, Record<PopulationClass, number>>>;

    public dates: [Date, Date] | null;


    public set highlighted(highlighted: StatsEntry | null) {
      this._highlighted = highlighted;
      this.$scope.$applyAsync();
    }
    public get highlighted(): StatsEntry {
      return this._highlighted;
    }

    constructor(private $scope: IScope) { }

    public async $onInit(): Promise<void> {
      const loaded = await json('./assets/asdf.json') as SessionRecord[];
      this.data = loaded
        .map(entry => (entry.trng_date = new Date(String(entry.trng_date)), entry)) // TODO: actually already have Dates instead of strings
        .filter(({ trng_date }) => trng_date.getFullYear() >= 2015)
        .map(entry => (entry.trng_date = new Date(entry.trng_date.getFullYear(), entry.trng_date.getMonth(), 1), entry));
      this.universe = crossfilter(this.data);
      this.genders = this.universe.dimension(({ empl_gender }) => empl_gender);
      this.employmentStatuses = this.universe.dimension(({ empl_permanent }) => empl_permanent);
      this.instructors = this.universe.dimension(({ instructors }) => instructors, true);
      this.date = this.universe.dimension(({ trng_date }) => trng_date);

      this.byDates = this.getByDates();
      this.$scope.$applyAsync();
      this.handler = this.universe.onChange(() => this.$scope.$applyAsync()); // () => this.byDates = this.getByDates());
    }

    public filterDates(dates: { from: Date, to: Date } | null): void {
      this.dates = dates ? [dates.from, dates.to] : null;
      if (dates) {
        this.date.filterRange([dates.from, dates.to]);
      } else {
        this.date.filter(null);
      }
    }


    public getGenders(): readonly Grouping<boolean, { VALIDATED: number, FLUNKED: number, MISSING: number }> [] {
      if (!this.gendersGroup) {
        this.gendersGroup = this.genders.group<boolean, { VALIDATED: 0, FLUNKED: 0, MISSING: 0 }>().reduce(
          (acc, { trem_outcome }) => (acc[trem_outcome] += 1, acc),
          (acc, { trem_outcome }) => (acc[trem_outcome] -= 1, acc),
          () => ({ VALIDATED: 0, FLUNKED: 0, MISSING: 0 })
        );
      }

      return this.gendersGroup.all();
    }

    public getByDates(): readonly Grouping < Date, ByDate > [] {
      if (!this.datesGroups) {
        this.datesGroups = this.date.group<Date, ByDate>().reduce(
          // TODO: handle CANCELLED and PENDING outcomes with something other than `(... || {})`
          (acc, { empl_gender, empl_permanent, trem_outcome }) => {
            (acc[trem_outcome] || {})[empl_gender ? 'male' : 'female'] += 1;
            (acc[trem_outcome] || {})[empl_permanent ? 'permanent' : 'temporary'] += 1;
            (acc[trem_outcome] || {})['total'] += 1;
            return acc;
          },
          (acc, { empl_gender, empl_permanent, trem_outcome }) => {
            (acc[trem_outcome] || {})[empl_gender ? 'male' : 'female'] -= 1;
            (acc[trem_outcome] || {})[empl_permanent ? 'permanent' : 'temporary'] -= 1;
            (acc[trem_outcome] || {})['total'] -= 1;
            return acc;
          },
          () => ({
            VALIDATED: {
              male: 0, female: 0, permanent: 0, temporary: 0, total: 0
            }, FLUNKED: {
              male: 0, female: 0, permanent: 0, temporary: 0, total: 0
            }, MISSING: {
              male: 0, female: 0, permanent: 0, temporary: 0, total: 0
            }
          })
        );
      }

      return this.datesGroups.all();
    }

    public $onDestroy(): void {
      this.handler();
    }
  }])
  .name;
