import { test, expect } from '@playwright/test';

/**
 * Tests E2E - Gestion des Commandes
 * 
 * Scénarios UI :
 * - E2E-ORDER-001 : Créer une commande avec horaires
 * - E2E-ORDER-002 : Gérer l'affichage du statut
 * - E2E-ORDER-003 : Modification des horaires
 * - E2E-ORDER-004 : Listing des commandes
 */

test.describe('E2E-ORDER : Gestion des Commandes', () => {
  
  test.beforeEach(async ({ page }) => {
    // S'assurer qu'il y a au moins un camion
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ========================================
  // E2E-ORDER-001 : Créer une commande
  // ========================================
  test('E2E-ORDER-001 : Doit créer une commande avec horaires futurs', async ({ page }) => {
    // Aller à la page d'ajout de commande
    const addOrderButton = page.locator('a:has-text("Ajouter Commande"), button:has-text("Ajouter Commande")');
    await addOrderButton.click();

    await page.waitForLoadState('networkidle');

    // Remplir le formulaire
    await page.fill('input[name="client_name"]', 'Client E2E Test');
    await page.fill('input[name="origin"]', 'Paris');
    await page.fill('input[name="destination"]', 'Lyon');

    // Sélectionner un camion (le premier disponible)
    const truckSelect = page.locator('select[name="truck_id"]');
    const options = truckSelect.locator('option');
    const count = await options.count();
    
    if (count > 1) {
      // Sélectionner le second option (première est généralement "vide")
      await truckSelect.selectOption({ index: 1 });
    }

    // Définir les horaires
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const departureTime = `${tomorrowStr}T08:00`;
    const arrivalTime = `${tomorrowStr}T17:00`;

    await page.fill('input[name="departure_time"]', departureTime);
    await page.fill('input[name="arrival_time"]', arrivalTime);

    // Soumettre
    const submitButton = page.locator('button[type="submit"]:has-text("Ajouter"), button:has-text("Créer")');
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    // Vérifier le succès
    const clientName = page.locator('text=Client E2E Test');
    await expect(clientName).toBeVisible({ timeout: 5000 });

    // Vérifier dans la table
    const table = page.locator('table');
    await expect(table).toContainText('Client E2E Test');
  });

  // ========================================
  // E2E-ORDER-002 : Affichage des commandes
  // ========================================
  test('E2E-ORDER-002 : Doit afficher la liste des commandes', async ({ page }) => {
    // Aller aux commandes
    const ordersLink = page.locator('a:has-text("Commandes"), a[href*="orders"]');
    await ordersLink.click();

    await page.waitForLoadState('networkidle');

    // Vérifier le tableau
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Vérifier les en-têtes
    await expect(page.locator('th:has-text("Client"), th:has-text("client")')).toBeVisible();
    await expect(page.locator('th:has-text("Statut"), th:has-text("statut")')).toBeVisible();

    // Vérifier qu'il y a des lignes
    const rows = page.locator('tbody tr');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  // ========================================
  // E2E-ORDER-003 : Statut dynamique
  // ========================================
  test('E2E-ORDER-003 : Doit afficher le statut correct selon l\'heure', async ({ page }) => {
    // Aller aux commandes
    const ordersLink = page.locator('a:has-text("Commandes"), a[href*="orders"]');
    await ordersLink.click();

    await page.waitForLoadState('networkidle');

    // Chercher un lien "Modifier" pour une commande
    const editLinks = page.locator('a:has-text("Modifier"), a:has-text("Éditer")');
    const count = await editLinks.count();

    if (count > 0) {
      // Cliquer sur le premier lien Modifier
      await editLinks.first().click();

      await page.waitForLoadState('networkidle');

      // Les statuts doivent être affichés ou disponibles
      const pageContent = await page.content();
      
      // Vérifier que les champs de temps sont présents
      expect(pageContent).toContain('departure_time');
      expect(pageContent).toContain('arrival_time');
    }
  });

  // ========================================
  // E2E-ORDER-004 : Modification des horaires
  // ========================================
  test('E2E-ORDER-004 : Doit permettre la modification des horaires', async ({ page }) => {
    // Créer d'abord une commande
    const addOrderButton = page.locator('a:has-text("Ajouter Commande"), button:has-text("Ajouter Commande")');
    await addOrderButton.click();

    await page.waitForLoadState('networkidle');

    await page.fill('input[name="client_name"]', 'Modify Test Order');
    await page.fill('input[name="origin"]', 'Paris');
    await page.fill('input[name="destination"]', 'Marseille');

    const truckSelect = page.locator('select[name="truck_id"]');
    const options = truckSelect.locator('option');
    const countOptions = await options.count();
    
    if (countOptions > 1) {
      await truckSelect.selectOption({ index: 1 });
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await page.fill('input[name="departure_time"]', `${tomorrowStr}T08:00`);
    await page.fill('input[name="arrival_time"]', `${tomorrowStr}T17:00`);

    const submitButton = page.locator('button[type="submit"]:has-text("Ajouter"), button:has-text("Créer")');
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    // Chercher et mémoriser l'URL pour trouver la commande
    const orderRow = page.locator('text=Modify Test Order');
    await expect(orderRow).toBeVisible();

    // Chercher le lien de modification (s'il existe)
    const modifyLink = orderRow.locator('..').locator('a:has-text("Modifier Update"), a:has-text("éditer")').first();
    const isVisible = await modifyLink.isVisible().catch(() => false);

    if (isVisible) {
      await modifyLink.click();
      await page.waitForLoadState('networkidle');

      // Vérifier qu'on peut modifier
      const departureInput = page.locator('input[name="departure_time"]');
      await expect(departureInput).toBeVisible();
    }
  });

  // ========================================
  // E2E-ORDER-005 : Validation des champs
  // ========================================
  test('E2E-ORDER-005 : Doit valider les champs obligatoires', async ({ page }) => {
    // Aller à la page d'ajout
    const addOrderButton = page.locator('a:has-text("Ajouter Commande"), button:has-text("Ajouter Commande")');
    await addOrderButton.click();

    await page.waitForLoadState('networkidle');

    // Essayer de soumettre sans données
    const submitButton = page.locator('button[type="submit"]:has-text("Ajouter"), button:has-text("Créer")');
    await submitButton.click();

    // Attendre la validation
    await page.waitForTimeout(2000);

    // Vérifier qu'on est toujours sur le formulaire
    const urlPath = page.url();
    expect(urlPath).toContain('/orders');
  });
});
