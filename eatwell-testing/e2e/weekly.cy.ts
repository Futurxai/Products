describe('Weekly Planner', () => {
  beforeEach(() => {
    cy.window().then((win) => {
      win.localStorage.setItem('eatwell_user', JSON.stringify({
        uid: 'test-uid',
        displayName: 'Test User',
        email: 'test@example.com',
      }));
      win.localStorage.setItem('eatwell_profile', JSON.stringify({
        age: 25,
        weight: 70,
        height: 175,
        goal: 'maintain',
        cuisine: 'south-indian',
        diet: 'vegetarian',
      }));
    });
    cy.visit('/tabs/weekly');
  });

  it('should display 7 day tabs', () => {
    cy.get('.day-tab').should('have.length', 7);
  });

  it('should show meals for selected day', () => {
    cy.get('.day-tab').eq(2).click();
    cy.get('.meal-card').should('have.length.at.least', 3);
  });

  it('should highlight current day by default', () => {
    cy.get('.day-tab.active').should('have.length', 1);
  });

  it('should show total calories for the day', () => {
    cy.get('.daily-calories').should('be.visible');
    cy.get('.daily-calories').should('contain', 'kcal');
  });
});
