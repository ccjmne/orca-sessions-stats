import { IComponentOptions, copy } from 'angular';
import { InfosSelector, INFOS_SELECTORS, Checkable } from './infos-selector.class';

export const infosSelectorComponent: IComponentOptions = {
  template: `
  <label ng-repeat="option in $ctrl.options">{{::option.label}}
    <input type="checkbox" ng-model="option.checked" ng-change="$ctrl.onToggle(option)">
  </label>
  `,
  bindings: {
    displayed: '='
  },
  controller: class PopulationDiscriminatorController {

    // angular bindings
    public displayed: InfosSelector[];

    // template bindings
    protected options: Checkable<InfosSelector>[] = copy(INFOS_SELECTORS); // TODO: use homemade deepClone?

    public $onInit(): void {
      this.options[0].checked = true;
      this.onToggle();
    }

    public onToggle(): void {
      this.displayed = this.options.filter(({ checked }) => checked);
    }
  }
};
