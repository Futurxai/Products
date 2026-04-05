describe('Grocery List', () => {
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
    cy.visit('/tabs/grocery');
  });

  it('should display grocery items grouped by category', () => {
    cy.get('.category-group').should('have.length.at.least', 1);
  });

  it('should check/uncheck grocery items', () => {
    cy.get('.grocery-item').first().find('ion-checkbox').click();
    cy.get('.grocery-item').first().should('have.class', 'checked');
  });

  it('should filter by category', () => {
    cy.get('.category-filter').first().click();
    cy.get('.grocery-item').should('have.length.at.least', 1);
  });

  it('should update progress bar when items are checked', () => {
    cy.get('.progress-bar').should('be.visible');
    cy.get('.grocery-item').first().find('ion-checkbox').click();
    cy.get('.progress-bar .fill').should('have.css', 'width').and('not.eq', '0px');
  });

  it('should show empty state when all items are checked', () => {
    cy.get('.grocery-item ion-checkbox').each(($checkbox) => {
      cy.wrap($checkbox).click();
    });
    cy.contains('All done').should('be.visible');
  });
});
