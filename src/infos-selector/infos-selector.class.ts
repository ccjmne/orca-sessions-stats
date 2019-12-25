export type OutcomeCode = 'VALIDATED' | 'FLUNKED' | 'MISSING';

export interface InfosSelector {
  label: 'Validé(s)' | 'Recalé(s)' | 'Absent(s)';
  outcome: OutcomeCode;
  colour: string;
}

export const INFOS_SELECTORS: InfosSelector[] = [{
  label: 'Validé(s)',
  outcome: 'VALIDATED',
  colour: 'teal'
}, {
  label: 'Recalé(s)',
  outcome: 'FLUNKED',
  colour: 'crimson'
}, {
  label: 'Absent(s)',
  outcome: 'MISSING',
  colour: 'orange'
}];

export type Checkable<T> = T & { checked?: boolean };
