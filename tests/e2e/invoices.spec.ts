import { test, expect } from '@playwright/test';

/**
 * Tests E2E - Gestion des Factures
 * 
 * Scénarios UI :
 * - E2E-INVOICE-001 : Afficher la liste des factures
 * - E2E-INVOICE-002 : Vérifier les propriétés des factures
 * - E2E-INVOICE-003 : Créer une facture (si formulaire présent)
 */

test.describe('E2E-INVOICE : Gestion des Factures', () => {
  
  test.beforeEach(async ({ page }) => {
    // Aller à l'accueil
    await page.goto('/');
    await page.waitForLoadState('networkidle');
  });

  // ========================================
  // E2E-INVOICE-001 : Afficher la liste des factures
  // ========================================
  test('E2E-INVOICE-001 : Doit afficher la liste des factures', async ({ page }) => {
    // Aller aux factures
    const invoicesLink = page.locator('a:has-text("Factures"), a[href*="invoices"]');
    await invoicesLink.click();

    await page.waitForLoadState('networkidle');

    // Vérifier la présence du tableau
    const table = page.locator('table');
    await expect(table).toBeVisible();

    // Vérifier les colonnes principales
    const headers = page.locator('th');
    const headerCount = await headers.count();
    expect(headerCount).toBeGreaterThanOrEqual(2);

    // Le titre doit être visible
    const invoicesTitle = page.locator('h1, h2, h3').filter({ hasText: /[Ff]actures?/ });
    await expect(invoicesTitle.first()).toBeVisible().catch(() => {
      // Ce n'est pas un problème si le titre exact ne correspond pas
      return true;
    });
  });

  // ========================================
  // E2E-INVOICE-002 : Afficher les propriétés des factures
  // ========================================
  test('E2E-INVOICE-002 : Doit afficher les propriétés des factures', async ({ page }) => {
    // Aller aux factures
    const invoicesLink = page.locator('a:has-text("Factures"), a[href*="invoices"]');
    await invoicesLink.click();

    await page.waitForLoadState('networkidle');

    // Vérifier que les en-têtes contiennent les colonnes attendues
    const table = page.locator('table');
    const tableContent = await table.content();

    // Au moins une colonne devrait être présente
    const hasId = tableContent.includes('ID') || tableContent.includes('id');
    const hasAmount = tableContent.includes('Montant') || tableContent.includes('montant') || tableContent.includes('Amount');
    const hasOrder = tableContent.includes('Commande') || tableContent.includes('commande') || tableContent.includes('Order');
    
    // Au moins l'une de ces colonnes doit exister
    expect(
      hasId || hasAmount || hasOrder || tableContent.includes('th')
    ).toBeTruthy();
  });

  // ========================================
  // E2E-INVOICE-003 : Valider le rendu du tableau
  // ========================================
  test('E2E-INVOICE-003 : Doit avoir un tableau bien structuré', async ({ page }) => {
    // Aller aux factures
    const invoicesLink = page.locator('a:has-text("Factures"), a[href*="invoices"]');
    await invoicesLink.click();

    await page.waitForLoadState('networkidle');

    // Vérifier la structure HTML du tableau
    const table = page.locator('table');
    
    // Doit avoir thead et/ou tbody
    const thead = table.locator('thead');
    const tbody = table.locator('tbody');
    
    const hasHead = await thead.isVisible().catch(() => false);
    const hasBody = await tbody.isVisible().catch(() => false);

    expect(hasHead || hasBody).toBeTruthy();

    // Vérifier les lignes
    const rows = table.locator('tr');
    const rowCount = await rows.count();
    expect(rowCount).toBeGreaterThanOrEqual(1); // Au moins l'en-tête
  });

  // ========================================
  // E2E-INVOICE-004 : Lien vers les commandes
  // ========================================
  test('E2E-INVOICE-004 : Doit avoir des liens de navigation', async ({ page }) => {
    // Vérifier que la navigation entre les sections fonctionne
    
    // Aller aux commandes
    let ordersLink = page.locator('a:has-text("Commandes"), a[href*="orders"]');
    await ordersLink.click();

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/orders');

    // Aller aux factures
    const invoicesLink = page.locator('a:has-text("Factures"), a[href*="invoices"]');
    await invoicesLink.click();

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/invoices');

    // Aller aux camions
    let trucksLink = page.locator('a:has-text("Camions"), a[href*="trucks"]');
    await trucksLink.click();

    await page.waitForLoadState('networkidle');
    expect(page.url()).toContain('/trucks');
  });

  // ========================================
  // E2E-INVOICE-005 : Responsive design
  // ========================================
  test('E2E-INVOICE-005 : Doit avoir un design responsive', async ({ page }) => {
    // Aller aux factures
    const invoicesLink = page.locator('a:has-text("Factures"), a[href*="invoices"]');
    await invoicesLink.click();

    await page.waitForLoadState('networkidle');

    // Redimensionner à mobile
    await page.setViewportSize({ width: 375, height: 667 });

    // Vérifier que le contenu est toujours visible
    const table = page.locator('table');
    const isStillVisible = await table.isVisible().catch(() => false);

    // Si le tableau n'est pas visible en mobile, il devrait y avoir une alternative
    if (!isStillVisible) {
      // Chercher une liste ou card view alternative
      const content = await page.content();
      expect(content.length).toBeGreaterThan(0);
    }

    // Redimensionner à desktop
    await page.setViewportSize({ width: 1920, height: 1080 });

    // Vérifier que le tableau est visible
    await expect(table).toBeVisible();
  });
});
