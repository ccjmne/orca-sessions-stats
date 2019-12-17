'use strict';

require('./dc.scss');

import ng from 'angular';
import { IScope } from 'angular';

import { sessionStatsComponent } from './sessions-stats/sessions-stats.component';
import { statsDetailsComponent } from './stats-details/stats-details.component';
import { StatsEntry } from './datasets/session-stats';
import { dcDashboardComponent } from './dc-dashboard/dc-dashboard.component';

export default ng.module('orca-sessions-stats', [])
  .component('sessionsStats', sessionStatsComponent)
  .component('statsDetails', statsDetailsComponent)
  .component('dcDashboard', dcDashboardComponent)
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
