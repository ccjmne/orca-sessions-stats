import { IComponentOptions } from 'angular';
import { Discriminator, DISCRIMINATORS, DISCRIMINATOR_GENDER } from 'src/population.class';

export const populationDiscriminatorComponent: IComponentOptions = {
  template: `<select ng-options="dscmtr as dscmtr.display for dscmtr in $ctrl.discriminators" ng-model="$ctrl.discriminator"></select>`,
  bindings: {
    discriminator: '=?'
  },
  controller: class PopulationDiscriminatorController {

    // angular bindings
    public discriminator: Discriminator;

    // template bindings
    protected discriminators: Discriminator[] = DISCRIMINATORS;

    public $onInit(): void {
      this.discriminator = DISCRIMINATOR_GENDER;
    }
  }
};
