'use strict';

const ng = require('angular');

module.exports = ng.module('orca-sessions-stats', [])
  .component('sessionsStats', require('./sessions-stats/sessions-stats.component'))
  .name;
