import { IComponentOptions } from 'angular';
import { OUTCOME_VALIDATED, OUTCOMES, Outcome } from 'src/outcome.class';

export const outcomeSelectorComponent: IComponentOptions = {
  template: `<select ng-options="outome as outome.display for outome in $ctrl.outcomes" ng-model="$ctrl.outcome"></select>`,
  bindings: {
    outcomeChanged: '&?'
  },
  controller: class OutcomeSelectorController {

    // angular bindings
    public outcomeChanged: (context: { outcome: Outcome }) => any;

    // template bindings
    protected outcomes: Outcome[] = OUTCOMES;

    private _outcome: Outcome;
    protected get outcome(): Outcome {
      return this._outcome;
    }
    protected set outcome(outcome: Outcome) {
      this._outcome = outcome;
      if (this.outcomeChanged) {
        this.outcomeChanged({ outcome });
      }
    }

    public $onInit(): void {
      this.outcome = OUTCOME_VALIDATED;
    }
  }
};
