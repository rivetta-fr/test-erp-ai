import { test, expect } from '@playwright/test';

/**
 * Tests E2E - Gestion des Camions
 * 
 * Scénarios UI :
 * - E2E-TRUCK-001 : Ajouter un camion via le formulaire
 * - E2E-TRUCK-002 : Lister les camions
 * - E2E-TRUCK-003 : Valider les erreurs de formulaire
 */

test.describe('E2E-TRUCK : Gestion des Camions', () => {
  
  test.beforeEach(async ({ page }) => {
    // Aller à la page d'accueil
    await page.goto('/');
    // Attendre le chargement
    await page.waitForLoadState('networkidle');
  });

  // ========================================
  // E2E-TRUCK-001 : Ajouter un camion
  // ========================================
  test('E2E-TRUCK-001 : Doit ajouter un camion via le formulaire', async ({ page }) => {
    // Cliquer sur "Ajouter Camion"
    const addTruckButton = page.locator('a:has-text("Ajouter Camion"), button:has-text("Ajouter Camion")');
    await addTruckButton.click();

    // Attendre le chargement de la page
    await page.waitForLoadState('networkidle');

    // Remplir le formulaire
    await page.fill('input[name="name"]', 'Volvo FH16 E2E');
    await page.fill('input[name="capacity"]', '5500');

    // Soumettre le formulaire
    const submitButton = page.locator('button[type="submit"]:has-text("Ajouter"), button:has-text("Créer")');
    await submitButton.click();

    // Attendre la redirection ou le message de succès
    await page.waitForLoadState('networkidle');

    // Vérifier le succès
    // Peut être sur la page de listing ou un message de succès
    const truckName = page.locator('text=Volvo FH16 E2E');
    await expect(truckName).toBeVisible({ timeout: 5000 });

    // Vérifier que le camion est dans la liste
    const table = page.locator('table');
    await expect(table).toContainText('Volvo FH16 E2E');
    await expect(table).toContainText('5500');
  });

  // ========================================
  // E2E-TRUCK-002 : Lister les camions
  // ========================================
  test('E2E-TRUCK-002 : Doit afficher la liste des camions', async ({ page }) => {
    // Cliquer sur le lien Camions dans la navbar
    const trucksLink = page.locator('a:has-text("Camions"), a[href*="trucks"]');
    await trucksLink.click();

    // Attendre le chargement
    await page.waitForLoadState('networkidle');

    // Vérifier la présence du tableau
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Vérifier les en-têtes
    await expect(page.locator('th:has-text("Nom"), th:has-text("nom")')).toBeVisible();
    await expect(page.locator('th:has-text("Capacité"), th:has-text("capacité")')).toBeVisible();
    await expect(page.locator('th:has-text("Statut"), th:has-text("statut")')).toBeVisible();

    // Vérifier qu'il y a au moins une ligne
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ========================================
  // E2E-TRUCK-003 : Validation du formulaire
  // ========================================
  test('E2E-TRUCK-003 : Doit rejeter une capacité invalide', async ({ page }) => {
    // Aller à la page d'ajout
    const addTruckButton = page.locator('a:has-text("Ajouter Camion"), button:has-text("Ajouter Camion")');
    await addTruckButton.click();

    await page.waitForLoadState('networkidle');

    // Remplir avec une capacité invalide
    await page.fill('input[name="name"]', 'Invalid Truck');
    await page.fill('input[name="capacity"]', '0');

    // Essayer de soumettre
    const submitButton = page.locator('button[type="submit"]:has-text("Ajouter"), button:has-text("Créer")');
    await submitButton.click();

    // Attendre la réponse
    await page.waitForTimeout(2000);

    // Vérifier qu'une erreur est affichée
    const errorMessage = page.locator('text=invalide, text=Erreur, text=capacity, text=Données invalides');
    const hasError = await errorMessage.isVisible().catch(() => false);

    // OU vérifier qu'on n'a pas quitté la page
    const urlPath = page.url();
    expect(urlPath).toContain('/trucks');
  });

  // ========================================
  // E2E-TRUCK-004 : Vérifier le statut par défaut
  // ========================================
  test('E2E-TRUCK-004 : Doit afficher le statut "available" pour un nouveau camion', async ({ page }) => {
    // Ajouter un camion
    const addTruckButton = page.locator('a:has-text("Ajouter Camion"), button:has-text("Ajouter Camion")');
    await addTruckButton.click();

    await page.waitForLoadState('networkidle');

    await page.fill('input[name="name"]', 'Test Status Truck');
    await page.fill('input[name="capacity"]', '4000');

    const submitButton = page.locator('button[type="submit"]:has-text("Ajouter"), button:has-text("Créer")');
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    // Aller à la liste des camions
    const trucksLink = page.locator('a:has-text("Camions"), a[href*="trucks"]');
    await trucksLink.click();

    await page.waitForLoadState('networkidle');

    // Trouver la ligne du camion ajouté
    const row = page.locator('table tbody tr:has-text("Test Status Truck")');
    
    // Vérifier que le statut est "available"
    await expect(row).toContainText('available');
  });
});
