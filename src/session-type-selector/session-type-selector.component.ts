import { IComponentOptions } from 'angular';
import SESSION_TYPES from 'assets/session-types.json';

export const sessionTypeSelectorComponent: IComponentOptions = {
  template: `<select ng-options="opt.trty_pk as opt.trty_name for opt in $ctrl.types" ng-model="$ctrl.type"></select>`,
  bindings: {
    typeChanged: '&?'
  },
  controller: class SessionTypeSelectorController {

    // angular bindings
    public typeChanged: (context: { type: number }) => any;

    // template bindings
    protected types: any[] = Object.values(SESSION_TYPES);

    private _type: number;
    protected get type(): number {
      return this._type;
    }
    protected set type(type: number) {
      this._type = type;
      if (this.typeChanged) {
        this.typeChanged({ type });
      }
    }

    public $onInit(): void {
      this.type = this.types[0].trty_pk;
    }
  }
};
