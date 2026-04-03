# Tests E2E avec Playwright - ERP Transport

## 🎭 Vue d'ensemble

Cette suite contient des **tests E2E (End-to-End)** pour tester l'interface utilisateur complète de l'application ERP Transport.

### Différence vs Jest Tests

| Jest (Actuels)              | Playwright (Nouveaux)           |
| --------------------------- | ------------------------------- |
| ✅ Teste les API routes     | ✅ Teste l'interface UI         |
| ✅ Teste la logique backend | ✅ Simule les clics utilisateur |
| ✅ Test BD transitions      | ✅ Teste le rendu HTML/CSS      |
| ❌ Ne voit pas l'interface  | ✅ Responsive testing           |

---

## 📁 Structure

```
tests/e2e/
├── trucks.spec.ts         # Tests de gestion des camions
├── orders.spec.ts         # Tests de gestion des commandes
├── invoices.spec.ts       # Tests de gestion des factures
├── full-journey.spec.ts   # Tests workflow complet
└── fixtures.ts            # Configuration commune
```

---

## 🚀 Installation

### 1. Installer Playwright

```bash
npm install
```

Cela installe `@playwright/test` (si package.json a été mis à jour)

### 2. Installer les navigateurs (1ère fois)

```bash
npx playwright install
```

Optionnel (si vous voulez juste Chromium) :

```bash
npx playwright install chromium
```

---

## 🧪 Exécuter les Tests

### Tous les tests E2E

```bash
npm run test:e2e
```

**Output** :

```
E2E-TRUCK : Gestion des Camions
  ✓ E2E-TRUCK-001 : Doit ajouter un camion via le formulaire (2.5s)
  ✓ E2E-TRUCK-002 : Doit afficher la liste des camions (1.2s)
  ✓ E2E-TRUCK-003 : Doit rejeter une capacité invalide (1.8s)
  ✓ E2E-TRUCK-004 : Doit afficher le statut "available" (1.9s)

E2E-ORDER : Gestion des Commandes
  ✓ E2E-ORDER-001 : Doit créer une commande (2.3s)
  ✓ E2E-ORDER-002 : Doit afficher la liste des commandes (1.1s)
  ✓ E2E-ORDER-003 : Doit afficher le statut correct (1.5s)
  ✓ E2E-ORDER-004 : Doit modifier les horaires (2.1s)

E2E-INVOICE : Gestion des Factures
  ✓ E2E-INVOICE-001 : Doit afficher la liste des factures (1.0s)
  ✓ E2E-INVOICE-002 : Doit afficher les propriétés (0.9s)
  ✓ E2E-INVOICE-003 : Tableau bien structuré (0.8s)

E2E-FULL : Workflow Complet
  ✓ E2E-FULL-001 : Cycle complet (5.2s)
  ✓ E2E-FULL-002 : Navigation complète (3.1s)
  ✓ E2E-FULL-003 : Performance (1.2s)
  ✓ E2E-FULL-004 : Pas d'erreur console (3.4s)

Tests: 17 passed
Time: 45s
```

### Interface UI Interactive

```bash
npm run test:e2e:ui
```

Ouvre une interface graphique où vous pouvez :

- 👉 Cliquer sur les tests
- 📺 Voir ce qui se passe en temps réel
- ⏸️ Mettre en pause et déboguer
- 🔄 Re-exécuter individuellement

### Mode Debug

```bash
npm run test:e2e:debug
```

Ouvre le débogueur Playwright avec :

- 🔍 Inspecteur d'éléments
- 📝 Console JavaScript
- ⏸️ Breakpoints

### Tests Spécifiques

```bash
# Seulement les tests Trucks
npx playwright test trucks

# Seulement un test
npx playwright test trucks -g "E2E-TRUCK-001"

# Mode watch (re-run on change)
npx playwright test --watch
```

---

## 🔧 Configuration

### playwright.config.ts

```typescript
// Serveur web testé
webServer: "http://localhost:3001";

// Timeout
timeout: 30 * 1000;

// Navigateurs testés
projects: [
  { name: "chromium" },
  { name: "firefox" },
  { name: "webkit" },
  { name: "Mobile Chrome" },
];

// Rapports
reporter: "html";
screenshot: "only-on-failure";
video: "retain-on-failure";
```

### Voir le Rapport HTML

Après la première exécution :

```bash
npx playwright show-report
```

Ouvre le rapport HTML avec :

- ✅ Tests passés/échoués
- 📸 Screenshots des erreurs
- 🎬 Videos des tests
- 📊 Statistiques

---

## 📝 Description des Tests

### E2E-TRUCK : Camions (4 tests)

| Test    | Scénario                               |
| ------- | -------------------------------------- |
| **001** | Ajouter un camion via formulaire       |
| **002** | Afficher la liste des camions          |
| **003** | Rejeter capacité invalide (0, négatif) |
| **004** | Vérifier statut "available" par défaut |

### E2E-ORDER : Commandes (5 tests)

| Test    | Scénario                                |
| ------- | --------------------------------------- |
| **001** | Créer une commande avec horaires futurs |
| **002** | Afficher la liste des commandes         |
| **003** | Vérifier le statut dynamique            |
| **004** | Modifier les horaires                   |
| **005** | Valider les champs obligatoires         |

### E2E-INVOICE : Factures (5 tests)

| Test    | Scénario                              |
| ------- | ------------------------------------- |
| **001** | Afficher la liste des factures        |
| **002** | Afficher les propriétés des factures  |
| **003** | Vérifier la structure du tableau      |
| **004** | Navigation entre sections             |
| **005** | Responsive design (desktop et mobile) |

### E2E-FULL : Workflows Complets (5 tests)

| Test    | Scénario                                 |
| ------- | ---------------------------------------- |
| **001** | Cycle complet : Truck → Order → Invoices |
| **002** | Navigation entre toutes les sections     |
| **003** | Performance (< 5s par page)              |
| **004** | Pas d'erreur JavaScript                  |
| **005** | Responsive sur tous les appareils        |

---

## 🎯 Bonnes Pratiques

### 1. Sélecteurs Robustes

```javascript
// ✅ BON - Utiliser le texte visible
await page.locator("text=Ajouter Camion").click();

// ✅ BON - Utiliser les attributs
await page.fill('input[name="name"]', "Volvo");

// ❌ MAUVAIS - CSS Selectors fragiles
await page.locator(".btn-primary.mt-2.ml-4").click();
```

### 2. Attendre le Chargement

```javascript
// ✅ BON
await page.goto("/trucks");
await page.waitForLoadState("networkidle");

// ❌ MAUVAIS
await page.goto("/trucks");
await page.click("button"); // Peut éclater si pas chargé
```

### 3. Vérifications Explicites

```javascript
// ✅ BON
await expect(page.locator("text=Success")).toBeVisible({ timeout: 5000 });

// ❌ MAUVAIS
await page.waitForTimeout(2000); // Timing imprévisible
```

---

## 🐛 Dépannage

### Tests Timeout

**Symptôme** : `Timeout waiting for element.click()`

**Solution** :

```bash
# Augmenter le timeout
npx playwright test --timeout 60000

# Ou en config
export const test = base.extend({
  timeout: 60 * 1000
});
```

### Élément Non Trouvé

**Symptôme** : `locator.click() timeout`

**Debug** :

```bash
npm run test:e2e:debug

# Dans VS Code, placer un breakpoint et inspecter
```

### Serveur Non Disponible

**Symptôme** : `Connection refused 127.0.0.1:3001`

**Solution** :

```bash
# S'assurer que le serveur tourne
npm start

# Ou dans une autre terminal
npm run test:e2e
```

---

## 📊 Reports

### Voir les Résultats

```bash
# Après test:e2e
npx playwright show-report

# Voir les vidéos d'erreur
ls -la test-results/
```

### CI/CD Integration

Dans GitHub Actions :

```yaml
- name: Run E2E Tests
  run: npm run test:e2e

- name: Upload Report
  if: always()
  uses: actions/upload-artifact@v3
  with:
    name: playwright-report
    path: playwright-report/
```

---

## 🚀 Commandes Utiles

```bash
# Tous les tests (Jest + E2E)
npm run test:all

# Mode watch E2E
npx playwright test --watch

# Test spécifique
npx playwright test trucks.spec.ts

# Avec verbosité
npx playwright test --verbose

# Générer trace pour debugging
npx playwright test --trace on

# Reporter personnalisé
npx playwright test --reporter=json > results.json
```

---

## 💡 Exemples d'Assertions

```javascript
// Visibilité
await expect(page.locator("h1")).toBeVisible();

// Texte
await expect(page.locator("button")).toContainText("Ajouter");

// URL
expect(page.url()).toContain("/trucks");

// Count
await expect(page.locator("table tr")).toHaveCount(5);

// Attributs
await expect(page.locator("input")).toHaveAttribute("disabled");

// Value
await expect(page.locator('input[name="name"]')).toHaveValue("Volvo");
```

---

## 📚 Resources

- [Playwright Documentation](https://playwright.dev)
- [Locators](https://playwright.dev/docs/locators)
- [Assertions](https://playwright.dev/docs/test-assertions)
- [Best Practices](https://playwright.dev/docs/best-practices)

---

## ✅ Checklist

- [ ] `npm install` exécuté
- [ ] `npx playwright install` exécuté
- [ ] `npm start` en arrière-plan
- [ ] `npm run test:e2e` passe
- [ ] Rapport HTML visualisé
- [ ] Tests en CI/CD configurés

---

**Status** : ✅ Tests E2E opérationnels
**Couverture** : 4 modules + 1 workflow complet
**Navigateurs** : Chromium, Firefox, WebKit, Mobile
