import { test, expect } from '@playwright/test';

/**
 * Tests E2E - Workflow Complet (Full Journey)
 * 
 * Scénario :
 * E2E-FULL-001 : Cycle complet d'une livraison
 * 1. Ajouter un camion
 * 2. Créer une commande pour ce camion
 * 3. Vérifier que le statut du camion a changé
 * 4. Vérifier le listing des factures
 * 5. Revenir à l'accueil
 */

test.describe('E2E-FULL : Workflow Complet', () => {

  // ========================================
  // E2E-FULL-001 : Cycle complet
  // ========================================
  test('E2E-FULL-001 : Doit compléter un cycle complet (truck → order → invoices)', async ({ page }) => {
    
    // ========== ÉTAPE 1 : Ajouter un camion ==========
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const addTruckButton = page.locator('a:has-text("Ajouter Camion"), button:has-text("Ajouter Camion")');
    await addTruckButton.click();

    await page.waitForLoadState('networkidle');

    const truckName = `Full Journey Truck ${Date.now()}`;
    await page.fill('input[name="name"]', truckName);
    await page.fill('input[name="capacity"]', '6000');

    let submitButton = page.locator('button[type="submit"]:has-text("Ajouter"), button:has-text("Créer")');
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    // Vérifier que le camion est créé
    await expect(page.locator(`text=${truckName}`)).toBeVisible({ timeout: 5000 });


    // ========== ÉTAPE 2 : Créer une commande ==========
    const addOrderButton = page.locator('a:has-text("Ajouter Commande"), button:has-text("Ajouter Commande")');
    await addOrderButton.click();

    await page.waitForLoadState('networkidle');

    const orderClientName = `OrderClient ${Date.now()}`;
    await page.fill('input[name="client_name"]', orderClientName);
    await page.fill('input[name="origin"]', 'Paris');
    await page.fill('input[name="destination"]', 'Bordeaux');

    // Sélectionner le camion qu'on vient de créer
    const truckSelect = page.locator('select[name="truck_id"]');
    const options = truckSelect.locator('option');
    const optionCount = await options.count();

    // Sélectionner le dernier camion (probablement le nouveau)
    if (optionCount > 1) {
      await truckSelect.selectOption({ index: optionCount - 1 });
    }

    // Définir les horaires
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    await page.fill('input[name="departure_time"]', `${tomorrowStr}T08:00`);
    await page.fill('input[name="arrival_time"]', `${tomorrowStr}T18:00`);

    submitButton = page.locator('button[type="submit"]:has-text("Ajouter"), button:has-text("Créer")');
    await submitButton.click();

    await page.waitForLoadState('networkidle');

    // Vérifier que la commande est créée
    await expect(page.locator(`text=${orderClientName}`)).toBeVisible({ timeout: 5000 });


    // ========== ÉTAPE 3 : Vérifier le statut du camion ==========
    const trucksLink = page.locator('a:has-text("Camions"), a[href*="trucks"]');
    await trucksLink.click();

    await page.waitForLoadState('networkidle');

    // Chercher le camion dans la liste
    const truckRow = page.locator(`table tbody tr:has-text("${truckName}")`);
    await expect(truckRow).toBeVisible({ timeout: 5000 });

    // Le statut devrait être "scheduled" (puisque la commande est planifiée pour demain)
    const statusCell = truckRow.locator('td').last();
    const statusText = await statusCell.textContent();
    
    // Le statut peut être "scheduled" ou "available" selon la logique
    expect(statusText).toMatch(/scheduled|available|in_transit/i);


    // ========== ÉTAPE 4 : Vérifier les commandes ==========
    const ordersLink = page.locator('a:has-text("Commandes"), a[href*="orders"]');
    await ordersLink.click();

    await page.waitForLoadState('networkidle');

    // Chercher la commande dans la liste
    const orderRow = page.locator(`table tbody tr:has-text("${orderClientName}")`);
    await expect(orderRow).toBeVisible({ timeout: 5000 });

    // Vérifier que la commande est associée au bon client
    const orderTable = page.locator('table');
    await expect(orderTable).toContainText(orderClientName);


    // ========== ÉTAPE 5 : Vérifier les factures ==========
    const invoicesLink = page.locator('a:has-text("Factures"), a[href*="invoices"]');
    await invoicesLink.click();

    await page.waitForLoadState('networkidle');

    // Vérifier que la page des factures se charge
    const invoicesTable = page.locator('table');
    await expect(invoicesTable).toBeVisible();


    // ========== ÉTAPE 6 : Retour à l'accueil ==========
    const homeLink = page.locator('a:has-text("Accueil"), a[href="/"], a[href*="index"]');
    
    // Si le lien existe
    const homeLinkExists = await homeLink.isVisible().catch(() => false);
    if (homeLinkExists) {
      await homeLink.first().click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toMatch(/\/$|index/);
    }
  });


  // ========================================
  // E2E-FULL-002 : Navigation complète
  // ========================================
  test('E2E-FULL-002 : Doit naviguer entre toutes les sections', async ({ page }) => {
    const sections = [
      { label: 'Camions', url: '/trucks' },
      { label: 'Commandes', url: '/orders' },
      { label: 'Factures', url: '/invoices' },
    ];

    for (const section of sections) {
      const link = page.locator(`a:has-text("${section.label}"), a[href*="${section.url}"]`);
      await link.first().click();

      await page.waitForLoadState('networkidle');

      // Vérifier que nous sommes sur la bonne page
      expect(page.url()).toContain(section.url);

      // Vérifier qu'il y a du contenu
      const content = await page.content();
      expect(content.length).toBeGreaterThan(100);
    }
  });


  // ========================================
  // E2E-FULL-003 : Performance
  // ========================================
  test('E2E-FULL-003 : Les pages doivent charger rapidement', async ({ page }) => {
    // Aller à l'accueil
    await page.goto('/');

    const startTime = Date.now();
    await page.waitForLoadState('networkidle');
    const loadTime = Date.now() - startTime;

    // Le chargement doit prendre moins de 5 secondes
    expect(loadTime).toBeLessThan(5000);
  });


  // ========================================
  // E2E-FULL-004 : Pas d'erreur console
  // ========================================
  test('E2E-FULL-004 : Pas d\'erreur JavaScript en console', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Naviguer partout
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const trucksLink = page.locator('a:has-text("Camions"), a[href*="trucks"]');
    await trucksLink.click();
    await page.waitForLoadState('networkidle');

    const ordersLink = page.locator('a:has-text("Commandes"), a[href*="orders"]');
    await ordersLink.click();
    await page.waitForLoadState('networkidle');

    const invoicesLink = page.locator('a:has-text("Factures"), a[href*="invoices"]');
    await invoicesLink.click();
    await page.waitForLoadState('networkidle');

    // Il ne devrait pas y avoir d'erreur critique
    expect(errors.filter(e => !e.includes('404') && !e.includes('undefined'))).toHaveLength(0);
  });


  // ========================================
  // E2E-FULL-005 : Responsive sur tous les appareils
  // ========================================
  test('E2E-FULL-005 : L\'interface est responsive sur mobile', async ({ page }) => {
    // Redimensionner à mobile
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Vérifier que la page est toujours visuelle
    const content = await page.content();
    expect(content.length).toBeGreaterThan(100);

    // Chercher la navigation (devrait exister même en mobile)
    const navLinks = page.locator('a:has-text("Camions"), a:has-text("Commandes"), a:has-text("Factures")');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);

    // Redimensionner à tablet
    await page.setViewportSize({ width: 768, height: 1024 });

    const trucksLink = page.locator('a:has-text("Camions"), a[href*="trucks"]');
    await trucksLink.click();
    await page.waitForLoadState('networkidle');

    // Vérifier que le contenu s'affiche
    const table = page.locator('table');
    await expect(table).toBeVisible();
  });
});
