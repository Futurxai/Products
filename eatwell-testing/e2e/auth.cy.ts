describe('Auth Flow', () => {
  beforeEach(() => {
    cy.visit('/login');
  });

  it('should display the login page with Google Sign-In button', () => {
    cy.get('ion-button').contains('Sign in with Google').should('be.visible');
  });

  it('should show app logo and branding', () => {
    cy.get('.login-logo').should('be.visible');
    cy.contains('EatWell4U').should('be.visible');
  });

  it('should redirect to onboarding after successful login', () => {
    // Mock Firebase auth for testing
    cy.window().then((win) => {
      win.localStorage.setItem('eatwell_user', JSON.stringify({
        uid: 'test-uid',
        displayName: 'Test User',
        email: 'test@example.com',
      }));
    });
    cy.visit('/onboarding');
    cy.url().should('include', '/onboarding');
  });

  it('should clear state on sign-out and redirect to login', () => {
    cy.window().then((win) => {
      win.localStorage.clear();
    });
    cy.visit('/login');
    cy.url().should('include', '/login');
  });
});
