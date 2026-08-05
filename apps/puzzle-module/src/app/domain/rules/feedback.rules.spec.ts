import { feedbackTierFor, pickFeedbackMessage } from './feedback.rules';

describe('feedbackTierFor', () => {
  it('maps direct -> youre_awesome', () => {
    expect(feedbackTierFor('direct')).toBe('youre_awesome');
  });
  it('maps clue -> nudge_to_remember', () => {
    expect(feedbackTierFor('clue')).toBe('nudge_to_remember');
  });
  it('maps partner_help -> teasing_inside_jokes', () => {
    expect(feedbackTierFor('partner_help')).toBe('teasing_inside_jokes');
  });
});

describe('pickFeedbackMessage', () => {
  it('deterministically picks the first message when random() returns 0', () => {
    expect(pickFeedbackMessage('youre_awesome', () => 0)).toBe("You're awesome! 🎉");
  });

  it('deterministically picks the last message when random() returns just under 1', () => {
    expect(pickFeedbackMessage('youre_awesome', () => 0.999999)).toBe('Look at you go!');
  });

  it('never returns an empty string for any tier', () => {
    for (const tier of ['youre_awesome', 'nudge_to_remember', 'teasing_inside_jokes'] as const) {
      expect(pickFeedbackMessage(tier, () => 0.5).length).toBeGreaterThan(0);
    }
  });
});
