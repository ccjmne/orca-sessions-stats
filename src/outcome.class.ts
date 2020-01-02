export type OutcomeCode = 'VALIDATED' | 'FLUNKED' | 'MISSING' | 'PENDING' | 'CANCELLED';
export type SessionOutcomeCode = 'COMPLETED' | 'CANCELLED' | 'SCHEDULED';
export interface Outcome {
  id: OutcomeCode;
  display: string;
  colour: string;
}

export interface SessionOutcome {
  id: SessionOutcomeCode;
  display: string;
  colour: string;
  outcomes: Outcome[];
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

export const SESSION_OUTCOME_COMPLETED: SessionOutcome = {
  id: 'COMPLETED',
  display: 'Réalisées',
  colour: 'teal',
  outcomes: [OUTCOME_VALIDATED, OUTCOME_FLUNKED, OUTCOME_MISSING]
};

export const SESSION_OUTCOME_CANCELLED: SessionOutcome = {
  id: 'CANCELLED',
  display: 'Annulées',
  colour: 'warning',
  outcomes: [OUTCOME_CANCELLED]
};

export const SESSION_OUTCOME_SCHEDULED: SessionOutcome = {
  id: 'SCHEDULED',
  display: 'Prévues',
  colour: 'grey',
  outcomes: [OUTCOME_PENDING]
};

export const OUTCOMES: Outcome[] = [OUTCOME_VALIDATED, OUTCOME_FLUNKED, OUTCOME_MISSING, OUTCOME_PENDING, OUTCOME_CANCELLED];
export const SESSION_OUTCOMES: SessionOutcome[] = [SESSION_OUTCOME_COMPLETED, SESSION_OUTCOME_CANCELLED, SESSION_OUTCOME_SCHEDULED];
