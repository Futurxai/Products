import { QuestionDefinition, RecipientQuestionView } from '../models/question.model';

/**
 * Narrows a Creator's full `QuestionDefinition` down to what a
 * Recipient may see before earning that piece — `questionId` and
 * `prompt` only. Called exactly once, server-side, by
 * `resolveShareToken` (the only place a full `QuestionDefinition`
 * array and a Recipient-facing response ever exist in the same
 * function) — never client-side, since the client is never handed a
 * `QuestionDefinition` to narrow in the first place.
 */
export function toRecipientQuestionView(question: QuestionDefinition): RecipientQuestionView {
  return { questionId: question.questionId, prompt: question.prompt };
}
