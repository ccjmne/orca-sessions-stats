'use strict';

import { IComponentOptions } from 'angular';

export const sessionStatsComponent: IComponentOptions = {
  template: `<svg></svg><pre>{{$ctrl.item | json}}</pre>`,
  controllerAs: '$ctrl',
  controller: ['$element', class SessionsStatsController {
    public item: { name: string, age: number };

    constructor($element: any) {
      console.log($element[0].querySelector('svg'));
      this.item = { name: 'eric', age: 28 };
    }
  }]
};
