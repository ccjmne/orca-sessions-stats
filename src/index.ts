'use strict';

import * as ng from 'angular';
import { sessionStatsComponent } from './sessions-stats/sessions-stats.component';

export default ng.module('orca-sessions-stats', [])
  .component('sessionsStats', sessionStatsComponent)
  .name;
