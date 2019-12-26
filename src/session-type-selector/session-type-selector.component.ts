import { IComponentOptions } from 'angular';
import SESSION_TYPES from 'assets/session-types.json';

export const sessionTypeSelectorComponent: IComponentOptions = {
  template: `<select ng-options="opt.trty_pk as opt.trty_name for opt in $ctrl.types" ng-model="$ctrl.type" ng-change="$ctrl.typeChanged({ type: $ctrl.type })"></select>`,
  bindings: {
    typeChanged: '&?'
  },
  controller: class SessionTypeSelectorController {

    // angular bindings
    public typeChanged: (type: number) => any;

    // template bindings
    protected types: any[] = Object.values(SESSION_TYPES);
    protected type: any;

    public $onInit(): void {
      this.type = this.types[0].trty_pk;
    }
  }
};
