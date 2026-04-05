describe('Dashboard', () => {
  beforeEach(() => {
    // Set up authenticated user state
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
    cy.visit('/tabs/dashboard');
  });

  it('should display daily meals', () => {
    cy.get('.meal-card').should('have.length.at.least', 3);
  });

  it('should show breakfast, lunch, snack, and dinner sections', () => {
    cy.contains('Breakfast').should('be.visible');
    cy.contains('Lunch').should('be.visible');
    cy.contains('Dinner').should('be.visible');
  });

  it('should display calorie counter', () => {
    cy.get('.calorie-counter').should('be.visible');
    cy.get('.calorie-counter').should('contain', 'kcal');
  });

  it('should allow meal swap', () => {
    cy.get('.meal-card').first().find('.swap-btn').click();
    cy.get('.swap-modal').should('be.visible');
    cy.get('.alternative-meal').should('have.length.at.least', 1);
  });

  it('should navigate to meal details on tap', () => {
    cy.get('.meal-card').first().click();
    cy.get('.meal-detail').should('be.visible');
    cy.contains('Ingredients').should('be.visible');
  });
});
