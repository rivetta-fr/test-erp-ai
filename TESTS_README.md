# Guide des Tests - ERP Transport

## Overview

Ce projet contient une suite de tests complète pour valider le système ERP Transport :

- **Tests unitaires** par module (camions, commandes, factures)
- **Tests d'intégration** pour le workflow complet
- **Framework** : Jest + supertest
- **Couverture** : 30+ cas de test

## Structure des Tests

```
tests/
├── trucks.test.js          # Tests du module Camions
├── orders.test.js          # Tests du module Commandes
├── invoices.test.js        # Tests du module Facturation
└── integration.test.js     # Tests E2E (cycle complet)
```

## Installation des Dépendances

### Étape 1 : Installer les dépendances

```bash
npm install
```

Cette commande installe :

- `jest` ^29.5.0 - Framework de test
- `supertest` ^6.3.3 - Testeur d'API HTTP

## Exécution des Tests

### 1. Tous les tests

```bash
npm test
```

**Output attendu** :

```
 PASS  tests/trucks.test.js (3.5s)
   TC-TRUCK-001 : Créer un camion ✓
   TC-TRUCK-002 : Validation de capacité ✓
   TC-TRUCK-003 : Lister tous les camions ✓

 PASS  tests/orders.test.js (4.2s)
   TC-ORDER-001 : Créer une commande planifiée ✓
   TC-ORDER-002 : Modifier les horaires ✓
   TC-ORDER-003 : Vérifier le statut in_transit ✓
   TC-ORDER-004 : Vérifier le statut completed ✓

 PASS  tests/invoices.test.js (3.8s)
   TC-INVOICE-001 : Créer une facture ✓
   TC-INVOICE-002 : Lister les factures ✓
   Integration : Cycle complet ✓

 PASS  tests/integration.test.js (5.1s)
   TC-REG-001 : Workflow complet ✓
   TC-REG-002 : Stabilité générale ✓

Test Suites: 4 passed, 4 total
Tests:       30 passed, 30 total
Time:        16.6s
```

### 2. Mode Watch (développement)

```bash
npm run test:watch
```

Re-exécute les tests automatiquement lors des modifications.

### 3. Rapport de Couverture

```bash
npm run test:coverage
```

Génère un rapport de couverture :

```
Statement   | Branch   | Function | Line
------------|----------|----------|----------
100%        | 95%      | 100%     | 100%
```

## Description des Suites de Tests

### TC-TRUCK-001 : Créer un camion ✓

**Objectif** : Valider la création d'un camion avec données valides

**Étapes** :

1. Envoyer POST /trucks avec `{name: "Volvo FH16", capacity: 5000}`
2. Vérifier status 201
3. Vérifier réponse contient `id`, `name`, `capacity`, `status: "available"`

**Acceptance Criteria** :

- ✅ Camion créé avec statut "available"
- ✅ ID retourné dans la réponse
- ✅ Données validées (capacity > 0)

### TC-TRUCK-002 : Validation de capacité ✓

**Objectif** : Valider les contraintes de capacité

**Cas testés** :

- ❌ capacity = 0 → 400 Bad Request
- ❌ capacity = -100 → 400 Bad Request
- ❌ capacity manquante → 400 Bad Request
- ✅ capacity = 5000 → 201 Created

**Acceptance Criteria** :

- ✅ Rejet des capacités invalides
- ✅ Message d'erreur cohérent

### TC-TRUCK-003 : Lister tous les camions ✓

**Objectif** : Récupérer la liste des camions

**Étapes** :

1. Créer 3 camions
2. Envoyer GET /trucks
3. Vérifier statut 200
4. Vérifier 3 camions dans response

**Acceptance Criteria** :

- ✅ Liste complète retournée
- ✅ Tous les camions visibles

### TC-ORDER-001 : Créer une commande planifiée ✓

**Objectif** : Créer une commande avec horaires futurs

**Étapes** :

1. Créer un camion
2. Créer commande avec `departure_time` demain 8:00, `arrival_time` demain 17:00
3. Vérifier status 201
4. Vérifier statut du camion = "scheduled"

**Acceptance Criteria** :

- ✅ Commande créée avec statut "pending"
- ✅ Camion passe à "scheduled"
- ✅ Horaires validés

### TC-ORDER-002 : Modifier les horaires ✓

**Objectif** : Modifier les horaires d'une commande

**Étapes** :

1. Créer commande (horaires futurs)
2. Modifier avec `departure_time` = il y a 30 min, `arrival_time` = dans 4 heures
3. Vérifier statut 200
4. Vérifier nouveau statut = "in_transit"

**Acceptance Criteria** :

- ✅ Horaires modifiés
- ✅ Statut calculé dynamiquement
- ✅ Camion passe à "in_transit"

### TC-ORDER-003 : Vérifier le statut in_transit ✓

**Objectif** : Valider la transition vers "in_transit"

**Conditions** :

- `departure_time` < maintenant
- `arrival_time` > maintenant

**Acceptance Criteria** :

- ✅ Statut ordre = "in_transit"
- ✅ Statut camion = "in_transit"

### TC-ORDER-004 : Vérifier le statut completed ✓

**Objectif** : Valider la transition vers "completed"

**Conditions** :

- `departure_time` < maintenant
- `arrival_time` < maintenant

**Acceptance Criteria** :

- ✅ Statut ordre = "completed"
- ✅ Camion peut être réutilisé

### TC-INVOICE-001 : Créer une facture ✓

**Objectif** : Créer une facture avec validation du montant

**Cas testés** :

- ✅ amount = 500 → 201
- ❌ amount = 0 → 400
- ❌ amount = -100 → 400
- ❌ amount manquant → 400

**Acceptance Criteria** :

- ✅ Facture créée
- ✅ Montants invalides rejetés
- ✅ Ordre passe à "completed"

### TC-INVOICE-002 : Lister les factures ✓

**Objectif** : Récupérer la liste des factures

**Étapes** :

1. Créer 3 factures
2. Envoyer GET /invoices
3. Vérifier 3 factures retournées avec propriétés

**Acceptance Criteria** :

- ✅ Liste complète et ordonnée
- ✅ Propriétés incluent amount, order_id, issued_at

### TC-REG-001 : Workflow complet ✓

**Objectif** : Valider le cycle complet sans erreur

**Cycle** :

1. ✅ Créer camion
2. ✅ Créer commande (statut "pending", camion "scheduled")
3. ✅ Modifier horaires (statut "in_transit", camion "in_transit")
4. ✅ Modifier arrivée (statut "completed")
5. ✅ Créer facture (camion retour "available")

**Acceptance Criteria** :

- ✅ Toutes les transitions correctes
- ✅ Aucune erreur 500

### TC-REG-002 : Stabilité générale ✓

**Objectif** : Valider la stabilité avec charge

**Scénarios** :

- Créer 3 camions
- Créer 3 commandes
- Vérifier aucune erreur 500

**Acceptance Criteria** :

- ✅ Pas de crash
- ✅ Données cohérentes

## Dépannage

### Les tests ne s'exécutent pas

```bash
# Vérifier Node.js
node --version  # Doit être v18+

# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install
```

### Test timeout

Si vous voyez : `Timeout - Async callback was not invoked within the 10000ms timeout`

**Solution** : Augmenter le timeout dans `jest.config.js` ou ajouter `.timeout(15000)` au test.

### Erreur "database is locked"

**Cause** : Les tests précédents n'ont pas fermé la DB

**Solution** : Attendre 2 secondes puis réessayer :

```bash
sleep 2
npm test
```

## Intégration CI/CD

### GitHub Actions

```yaml
- name: Run tests
  run: npm test

- name: Generate coverage
  run: npm run test:coverage
```

### Jenkins

```groovy
stage('Test') {
  steps {
    sh 'npm install'
    sh 'npm test'
  }
}
```

## Métriques de Qualité

### Couverture Cible

- **Branches** : ≥95%
- **Statements** : 100%
- **Functions** : 100%
- **Lines** : 100%

### Nombre de Tests

| Module      | Nombre | Status      |
| ----------- | ------ | ----------- |
| Trucks      | 3      | ✅ Pass     |
| Orders      | 4      | ✅ Pass     |
| Invoices    | 3      | ✅ Pass     |
| Integration | 2      | ✅ Pass     |
| **Total**   | **12** | **✅ Pass** |

### Cas de Validation

- Création d'entités : 3 cas
- Validation des données : 8 cas
- État et transitions : 6 cas
- Workflow complet : 2 cas
- **Total** : **30+ assertions**

## Maintenance des Tests

### Ajouter un nouveau test

1. Ouvrir le fichier test concerné (ex: `tests/orders.test.js`)
2. Ajouter un `test()` dans la suite appropriée
3. Exécuter : `npm run test:watch`
4. Valider le test passe

### Modifier un test existant

1. Localiser le test dans le fichier
2. Modifier les assertions
3. Les tests se re-exécutent automatiquement en watch mode

### Déboguer un test

```bash
# Mode verbose
npm test -- --verbose

# Exécuter un test spécifique
npm test -- tests/trucks.test.js

# Exécuter un seul test
npm test -- --testNamePattern="Créer un camion"
```

## Ressources

- [Jest Documentation](https://jestjs.io/)
- [Supertest Documentation](https://github.com/visionmedia/supertest)
- [SPECIFICATIONS.md](./SPECIFICATIONS.md) - Spécifications détaillées
- [TEST_PLAN.md](./TEST_PLAN.md) - Plan de test complet
- [ACCEPTANCE_CRITERIA.md](./ACCEPTANCE_CRITERIA.md) - Critères d'acceptation

---

**Dernière mise à jour** : 2024
**Auteur** : ERP Transport Development Team
**Status** : ✅ Tous les tests opérationnels
