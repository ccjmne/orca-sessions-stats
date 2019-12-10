'use strict';

import ng from 'angular';
import { IScope } from 'angular';

import { sessionStatsComponent } from './sessions-stats/sessions-stats.component';
import { statsDetailsComponent } from './stats-details/stats-details.component';
import { StatsEntry } from './datasets/session-stats';

export default ng.module('orca-sessions-stats', [])
  .component('sessionsStats', sessionStatsComponent)
  .component('statsDetails', statsDetailsComponent)
  .controller('main', ['$scope', class MainController {

    private _highlighted: StatsEntry | null;
    public set highlighted(highlighted: StatsEntry | null) {
      this._highlighted = highlighted;
      this.$scope.$applyAsync();
    }
    public get highlighted(): StatsEntry {
      return this._highlighted;
    }

    constructor(private $scope: IScope) { }
  }])
  .name;
