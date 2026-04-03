import { test as base } from '@playwright/test';

/**
 * Fixtures personnalisées et configuration commune pour les tests E2E
 */

type TestFixtures = {
  authenticatedPage: any; // Pour authentification si nécessaire
};

export const test = base.extend<TestFixtures>({
  // Fixture pour une page pré-authentifiée
  authenticatedPage: async ({ page }, use) => {
    // Aller à la page d'accueil
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    
    // Passer la page à l'utilisation
    await use(page);
  },
});

export { expect } from '@playwright/test';
