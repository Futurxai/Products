import { test, expect, type Page } from '@playwright/test';
import path from 'node:path';

// End-to-end UAT: the full creator-to-recipient journey, driving the real
// browser UI (not calling Cloud Functions/Firestore directly) against the
// Firebase emulator suite. See package.json's `test:e2e` script and
// README.md's End-to-End UAT section for how this is run.
//
// Covers, in order: Creator sign-up -> author a 9-question puzzle (image
// upload + crop, recipient details, questions, completion details) ->
// publish -> Recipient opens the share link with no account -> plays
// through all 9 questions, including one wrong-answer-then-clue path
// (Question 2) and one wrong-answer-then-partner-help path (Question 3,
// which skips answering entirely) -> reaches the final reveal/completion
// screen with the expected score and star rating.
//
// Expected score, per domain/rules/scoring.rules.ts's pointsForPiece:
//   Q1, Q4-Q9 (direct, no clue):        100 x 7 = 700
//   Q2 (1 clue used, then correct):      75
//   Q3 (1 clue used, then partner help): 10
//   Total: 785 / 900 -> starRatingFor(785) = 2 stars ("You know them well")

interface QuestionSpec {
  prompt: string;
  correctAnswer: string;
  clue?: string;
}

const QUESTIONS: QuestionSpec[] = [
  { prompt: 'What color is the sky on a clear day?', correctAnswer: 'Blue' },
  { prompt: 'Which city did we first meet in?', correctAnswer: 'Mysore', clue: 'It starts with the letter M.' },
  { prompt: 'What snack did we split on our first date?', correctAnswer: 'Dosa', clue: 'A South Indian breakfast staple.' },
  { prompt: 'What is our favorite weekend activity?', correctAnswer: 'Hiking' },
  { prompt: 'What was the first movie we watched together?', correctAnswer: 'Inception' },
  { prompt: 'What is your favorite flower?', correctAnswer: 'Rose' },
  { prompt: 'Where do we want to travel next?', correctAnswer: 'Japan' },
  { prompt: 'What is our song?', correctAnswer: 'Perfect' },
  { prompt: 'What do you call me when no one is listening?', correctAnswer: 'Sunshine' },
];

const SAMPLE_IMAGE = path.resolve(__dirname, '../src/assets/icon/icon-512x512.png');

test.setTimeout(180_000);

async function fillAppInput(page: Page, formControlName: string, value: string): Promise<void> {
  await page.locator(`app-input[formcontrolname="${formControlName}"] input`).fill(value);
}

async function fillAppTextarea(page: Page, formControlName: string, value: string): Promise<void> {
  await page.locator(`app-textarea[formcontrolname="${formControlName}"] textarea`).fill(value);
}

async function selectIonOption(page: Page, selectIndex: number, optionText: string): Promise<void> {
  await page.locator('ion-select').nth(selectIndex).click();
  await page.locator('ion-popover ion-item, ion-alert button', { hasText: optionText }).first().click();
}

test('creator authors and publishes a puzzle; recipient plays it end to end', async ({ page, context }) => {
  const uniqueSuffix = Date.now();
  const creatorEmail = `uat-creator-${uniqueSuffix}@example.com`;
  const creatorPassword = 'CorrectHorse9!';
  const creatorName = 'UAT Creator';
  const recipientName = 'UAT Recipient';

  // ---- Creator: sign up ----
  await page.goto('/auth/signup');
  await fillAppInput(page, 'displayName', creatorName);
  await fillAppInput(page, 'email', creatorEmail);
  await fillAppInput(page, 'password', creatorPassword);
  await fillAppInput(page, 'confirmPassword', creatorPassword);
  await page.getByRole('button', { name: 'Create account' }).click();
  await expect(page).toHaveURL(/\/creator$/, { timeout: 20_000 });

  // ---- Creator: start a new puzzle ----
  // Two matches on a brand-new (empty) dashboard: the always-visible
  // welcome-section button and the empty-state's own button.
  await page.getByRole('button', { name: 'Create New Puzzle' }).first().click();
  await expect(page).toHaveURL(/\/creator\/wizard\/new/);

  // Step 1: Occasion & Emotion
  await selectIonOption(page, 0, 'Anniversary');
  await selectIonOption(page, 1, 'Love');
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 2: Image upload + crop
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_IMAGE);
  await page.getByRole('button', { name: 'Use this crop' }).click();
  await expect(page.locator('.image-upload-step__confirmed-label')).toBeVisible({ timeout: 30_000 });
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 3: Recipient details
  await fillAppInput(page, 'recipientDisplayName', recipientName);
  await fillAppTextarea(page, 'welcomeNote', 'Nine memories, nine pieces — all for you.');
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 4: Questions (all 9 in one scrollable form)
  const editors = page.locator('app-question-editor');
  await expect(editors).toHaveCount(9);
  for (let i = 0; i < QUESTIONS.length; i++) {
    const editor = editors.nth(i);
    const q = QUESTIONS[i];
    await editor.locator('app-input[formcontrolname="prompt"] input').fill(q.prompt);
    await editor.locator('app-input[formcontrolname="correctAnswer"] input').fill(q.correctAnswer);
    if (q.clue) {
      await editor.getByRole('button', { name: '+ Add a clue' }).click();
      await editor.locator('.question-editor__clue-row input').fill(q.clue);
    }
  }
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 5: Completion details
  await fillAppTextarea(page, 'partnerHelpChallenge', 'Stuck? Ask them what my favorite chai order is.');
  await fillAppTextarea(page, 'completionMessage', 'You remembered every single one — of course you did.');
  await page.getByRole('button', { name: 'Next' }).click();

  // Step 6: Review + Publish
  await expect(page.getByText('9 / 9 ready')).toBeVisible();
  await page.getByRole('button', { name: 'Publish' }).click();
  await expect(page).toHaveURL(/\/creator\/publish\//);

  // ---- Publish: grab the share link ----
  const shareUrlLocator = page.getByTestId('share-url');
  await expect(shareUrlLocator).toBeVisible({ timeout: 20_000 });
  const shareUrl = (await shareUrlLocator.textContent())?.trim();
  expect(shareUrl).toBeTruthy();
  const shareToken = new URL(shareUrl!).pathname.replace(/^\/e\//, '');
  expect(shareToken).toMatch(/^[A-Za-z0-9_-]{10,}$/);

  // ---- Recipient: open the share link in a fresh, unauthenticated context ----
  const recipientPage = await context.newPage();
  await recipientPage.goto(`/e/${shareToken}`);

  await expect(recipientPage.getByRole('heading', { name: `Hi ${recipientName}!` })).toBeVisible({ timeout: 20_000 });
  await recipientPage.getByRole('button', { name: 'Start the Puzzle' }).click();

  await expect(recipientPage.getByRole('group', { name: 'Puzzle board' })).toBeVisible();

  // Q1: direct correct answer, no clue.
  await answerDirect(recipientPage, 1, QUESTIONS[0].correctAnswer);

  // Q2: wrong answer, request the one clue, then answer correctly.
  await answerViaClue(recipientPage, 2, QUESTIONS[1].correctAnswer);

  // Q3: wrong answer, request the one clue, then use Partner Help instead of answering.
  await answerViaPartnerHelp(recipientPage, 3);

  // Q4-Q9: direct correct answers.
  for (let i = 3; i < QUESTIONS.length; i++) {
    await answerDirect(recipientPage, i + 1, QUESTIONS[i].correctAnswer);
  }

  // ---- Completion ----
  await expect(recipientPage.locator('.completion-screen__reveal-image')).toBeVisible({ timeout: 20_000 });
  await expect(recipientPage.getByText('785 / 900 points')).toBeVisible();
  await expect(recipientPage.getByRole('heading', { name: 'You know them well' })).toBeVisible();
  await expect(recipientPage.getByText('You remembered every single one — of course you did.')).toBeVisible();
});

async function openQuestion(page: Page, pieceNumber: number): Promise<void> {
  await page.getByRole('button', { name: `Piece ${pieceNumber}, locked. Open question.` }).click();
}

async function submitAnswerForm(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Submit answer' }).click();
}

/**
 * On the 9th (final) piece, the app auto-transitions straight to the
 * completion screen the instant the last piece unlocks — there's no
 * "Piece unlocked" modal state left to click "Continue" on by the time
 * this assertion runs. Race both outcomes rather than assuming one.
 */
async function answerDirect(page: Page, pieceNumber: number, answer: string): Promise<void> {
  await openQuestion(page, pieceNumber);
  const input = page.locator('app-input').filter({ hasText: 'Your answer' }).locator('input');
  await input.fill(answer);
  await submitAnswerForm(page);
  const unlockedBadge = page.getByText('Piece unlocked', { exact: true });
  const revealImage = page.locator('.completion-screen__reveal-image');
  await expect(unlockedBadge.or(revealImage)).toBeVisible({ timeout: 10_000 });
  if (await unlockedBadge.isVisible()) {
    await page.getByRole('button', { name: 'Continue' }).click();
  }
}

async function answerViaClue(page: Page, pieceNumber: number, answer: string): Promise<void> {
  await openQuestion(page, pieceNumber);
  const answerInput = page.locator('app-input').filter({ hasText: 'Your answer' }).locator('input');

  // Wrong answer first.
  await answerInput.fill('definitely not the right answer');
  await submitAnswerForm(page);
  await expect(page.getByRole('alert')).toBeVisible();

  // Request the clue.
  await page.getByRole('button', { name: 'Get a clue' }).click();
  await expect(page.getByText('Clues 1/3')).toBeVisible({ timeout: 10_000 });

  // Now answer correctly.
  await answerInput.fill(answer);
  await submitAnswerForm(page);
  await expect(page.getByText('Piece unlocked', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('+75 points')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
}

async function answerViaPartnerHelp(page: Page, pieceNumber: number): Promise<void> {
  await openQuestion(page, pieceNumber);
  const answerInput = page.locator('app-input').filter({ hasText: 'Your answer' }).locator('input');

  // Wrong answer first.
  await answerInput.fill('also not right');
  await submitAnswerForm(page);
  await expect(page.getByRole('alert')).toBeVisible();

  // Request the clue — this question authored exactly one, so requesting it
  // exhausts this question's clues and unlocks Partner Help.
  await page.getByRole('button', { name: 'Get a clue' }).click();
  await expect(page.getByText('Clues 1/3')).toBeVisible({ timeout: 10_000 });

  await expect(page.getByRole('heading', { name: 'Ask Your Partner' })).toBeVisible();
  await page.getByRole('button', { name: 'Reveal Piece' }).click();
  await expect(page.getByText('Piece unlocked', { exact: true })).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText('+10 points')).toBeVisible();
  await page.getByRole('button', { name: 'Continue' }).click();
}
