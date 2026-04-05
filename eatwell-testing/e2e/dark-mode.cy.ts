describe('Dark Mode', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('eatwell_user', JSON.stringify({
        uid: 'test-uid',
        displayName: 'Test User',
        email: 'test@example.com',
      }));
    });
    cy.visit('/tabs/profile');
  });

  it('should toggle dark mode on', () => {
    cy.get('.dark-mode-toggle ion-toggle').click();
    cy.get('body').should('have.class', 'dark');
  });

  it('should persist dark mode preference', () => {
    cy.get('.dark-mode-toggle ion-toggle').click();
    cy.reload();
    cy.get('body').should('have.class', 'dark');
  });

  it('should toggle dark mode off', () => {
    cy.window().then((win) => {
      win.localStorage.setItem('eatwell_dark_mode', 'true');
    });
    cy.reload();
    cy.get('.dark-mode-toggle ion-toggle').click();
    cy.get('body').should('not.have.class', 'dark');
  });
});
