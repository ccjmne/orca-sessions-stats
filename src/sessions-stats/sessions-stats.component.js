'use strict';

module.exports = {
  template: `<svg></svg><pre>{{$ctrl.item | json}}</pre>`,
  controllerAs: '$ctrl',
  controller: [function () {
    this.item = { name: 'eric', age: 28 };
  }]
};
