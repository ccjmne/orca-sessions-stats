import { IComponentOptions } from 'angular';
import { PopulationDiscriminator, DISCRIMINATORS } from './population-discriminator.class';

export const populationDiscriminatorComponent: IComponentOptions = {
  template: `<select ng-options="dscmtr as dscmtr.label for dscmtr in $ctrl.discriminators track by dscmtr.type" ng-model="$ctrl.discriminator"></select>`,
  bindings: {
    discriminator: '='
  },
  controller: class PopulationDiscriminatorController {

    // angular bindings
    public discriminator: PopulationDiscriminator;

    // template bindings
    protected discriminators: PopulationDiscriminator[] = DISCRIMINATORS;

    public $onInit(): void {
      this.discriminator = DISCRIMINATORS[0];
    }
  }
};
