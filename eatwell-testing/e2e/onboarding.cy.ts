describe('Onboarding', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('eatwell_user', JSON.stringify({
        uid: 'test-uid',
        displayName: 'Test User',
        email: 'test@example.com',
      }));
    });
    cy.visit('/onboarding');
  });

  it('should display 3 onboarding slides', () => {
    cy.get('ion-slide, swiper-slide').should('have.length', 3);
  });

  it('should navigate through slides with next button', () => {
    cy.get('.next-btn').click();
    cy.get('.slide-indicator .active').should('exist');
    cy.get('.next-btn').click();
    cy.contains('Get Started').should('be.visible');
  });

  it('should allow skip to profile setup', () => {
    cy.contains('Skip').click();
    cy.url().should('include', '/profile-setup');
  });

  it('should navigate to profile setup after last slide', () => {
    cy.get('.next-btn').click();
    cy.get('.next-btn').click();
    cy.contains('Get Started').click();
    cy.url().should('include', '/profile-setup');
  });
});
