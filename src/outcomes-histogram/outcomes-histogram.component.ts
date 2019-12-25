'use strict';

import { IComponentOptions } from 'angular';


import { PopulationDiscriminator } from 'src/population-discriminator/population-discriminator.class';
import { InfosSelector, INFOS_SELECTORS } from 'src/infos-selector/infos-selector.class';
import { ByDate } from 'src/record.class';
import { Grouping } from 'crossfilter2';

export type Dated<T> = T & { from: Date, to: Date };

export const outcomesHistogramComponent: IComponentOptions = {
  template: `
    <div style="display: flex; flex-direction: column-reverse; align-items: stretch; align-self: stretch;">
      <outcome-histogram-layer entries="$ctrl.entries" info="info" discriminator="$ctrl.discriminator" ng-repeat="info in $ctrl.infos track by info.outcome"></outcome-histogram-layer>
    </div>`,
  bindings: {
    discriminator: '<',
    infos: '<',
    entries: '<'
  },
  controller: class OutcomesHistogramController {

    // angular bindings
    public discriminator: PopulationDiscriminator;
    public entries: Grouping<Date, ByDate>[];
    private _infos: InfosSelector[];
    public get infos(): InfosSelector[] {
      return this._infos;
    }
    public set infos(infos: InfosSelector[]) {
      this._infos = infos && infos.length ? infos : INFOS_SELECTORS;
    }

    constructor() { }
  }
};
