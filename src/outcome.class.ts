export type OutcomeCode = 'VALIDATED' | 'FLUNKED' |
  'MISSING' |
  'PENDING' |
  'CANCELLED';

export interface Outcome {
  id: OutcomeCode;
  display: string;
  colour: string;
}

export const OUTCOME_VALIDATED: Outcome = {
  id: 'VALIDATED',
  display: 'Validés',
  colour: 'teal'
};

export const OUTCOME_FLUNKED: Outcome = {
  id: 'FLUNKED',
  display: 'Recalés',
  colour: 'crimson'
};

export const OUTCOME_MISSING: Outcome = {
  id: 'MISSING',
  display: 'Absents',
  colour: 'crimson'
};

export const OUTCOME_PENDING: Outcome = {
  id: 'PENDING',
  display: 'En attente',
  colour: 'darkgrey'
};

export const OUTCOME_CANCELLED: Outcome = {
  id: 'CANCELLED',
  display: 'Annulés',
  colour: 'orange'
};

export const OUTCOMES: Outcome[] = [OUTCOME_VALIDATED, OUTCOME_FLUNKED, OUTCOME_MISSING, OUTCOME_PENDING, OUTCOME_CANCELLED];
