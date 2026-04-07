# Plan de Test - ERP Transport

**Version:** 1.0.0  
**Date:** Avril 2026  
**Statut:** En cours  
**Responsable:** QA Team

---

## Table des matières

1. [Stratégie de test](#stratégie-de-test)
2. [Environnement de test](#environnement-de-test)
3. [Cas de test](#cas-de-test)
4. [Procédures de test](#procédures-de-test)
5. [Métriques et rapports](#métriques-et-rapports)

---

## Stratégie de test

### Niveaux de test

| Niveau      | Type        | Couverture        | Outil          |
| ----------- | ----------- | ----------------- | -------------- |
| Unitaire    | Unit        | Fonctions isolées | Manual/Jest    |
| Intégration | Integration | Routes + DB       | Manual/Postman |
| Système     | System      | Workflow complet  | Manual         |
| Acceptation | UAT         | Critique métier   | Manual         |

### Types de test

- **Fonctionnel** : Vérifier les US et cas d'usage
- **Régression** : S'assurer que les changements ne cassent pas existant
- **Performance** : Vérifier les temps de réponse
- **Sécurité** : SQL injection, XSS, données sensibles

### Critères de sortie

- ✓ 100% des cas de test critiques PASS
- ✓ 0 bugs critiques ou majeurs ouverts
- ✓ Pas de régressions
- ✓ Performance < 500ms par requête
- ✓ Documentation complète

---

## Environnement de test

### Configuration

| Composant       | Spécification          |
| --------------- | ---------------------- |
| OS              | Windows 10/11 ou Linux |
| Node.js         | Version 24.x           |
| Port            | 3000                   |
| Base de données | SQLite (test.db)       |
| Navigateur      | Chrome/Firefox/Edge    |

### Données de test

```javascript
// Camions de test
const trucks = [
  { name: "Volvo FH16", capacity: 5000 },
  { name: "Scania R450", capacity: 6000 },
  { name: "Mercedes Actros", capacity: 4500 },
];

// Clients de test
const clients = ["Entreprise ABC", "LogiCorp", "TransportXYZ"];

// Villes de test
const routes = [
  { origin: "Paris", destination: "Lyon" },
  { origin: "Marseille", destination: "Toulouse" },
  { origin: "Bordeaux", destination: "Nantes" },
];
```

---

## Cas de test

### 1. MODULE TRUCK - Gestion des camions

#### TC-TRUCK-001 : Ajouter un camion avec données valides

| Propriété     | Valeur                                |
| ------------- | ------------------------------------- |
| **ID**        | TC-TRUCK-001                          |
| **Titre**     | Ajouter un nouveau camion             |
| **Catégorie** | Fonctionnel                           |
| **Type**      | Positif                               |
| **Priorité**  | Critique                              |
| **Prérequis** | Accès à la page "Gestion des camions" |

**Étapes:**

1. Naviguer vers `/trucks`
2. Cliquer sur "Ajouter un camion"
3. Remplir le formulaire :
   - Nom : "Volvo FH16"
   - Capacité : 5000
4. Cliquer sur "Ajouter Camion"

**Résultat attendu:**

- ✓ Redirection vers `/trucks`
- ✓ Camion "Volvo FH16" visible dans le tableau
- ✓ Statut : "Disponible" (badge vert)
- ✓ Capacité affichée : "5000 kg"

**Bug/Remarque:** `N/A`

---

#### TC-TRUCK-002 : Ajouter un camion avec capacité invalide

| Propriété     | Valeur                    |
| ------------- | ------------------------- |
| **ID**        | TC-TRUCK-002              |
| **Titre**     | Validation de la capacité |
| **Catégorie** | Fonctionnel               |
| **Type**      | Négatif                   |
| **Priorité**  | Majeure                   |

**Étapes:**

1. Naviguer vers `/trucks/add`
2. Remplir le formulaire avec capacité négative (-1000)
3. Soumettre

**Résultat attendu:**

- ✓ Erreur de validation affichée
- ✓ Camion non créé
- ✓ Message : "La capacité doit être positive"

---

#### TC-TRUCK-003 : Consulter la liste des camions

| Propriété     | Valeur                    |
| ------------- | ------------------------- |
| **ID**        | TC-TRUCK-003              |
| **Titre**     | Afficher tous les camions |
| **Catégorie** | Fonctionnel               |
| **Type**      | Positif                   |
| **Priorité**  | Critique                  |

**Étapes:**

1. Créer 3 camions (voir TC-TRUCK-001)
2. Naviguer vers `/trucks`

**Résultat attendu:**

- ✓ Les 3 camions affichés dans le tableau
- ✓ Tous les statuts calculés correctement
- ✓ En-têtes du tableau : ID, Nom, Capacité, Statut

---

### 2. MODULE ORDER - Gestion des commandes

#### TC-ORDER-001 : Créer une commande avec dates futures

| Propriété     | Valeur                   |
| ------------- | ------------------------ |
| **ID**        | TC-ORDER-001             |
| **Titre**     | Créer commande planifiée |
| **Catégorie** | Fonctionnel              |
| **Type**      | Positif                  |
| **Priorité**  | Critique                 |

**Prérequis:** Au moins 1 camion disponible

**Étapes:**

1. Naviguer vers `/orders/add`
2. Remplir le formulaire :
   - Client : "Entreprise ABC"
   - Origine : "Paris"
   - Destination : "Lyon"
   - Camion : "Volvo FH16"
   - Départ : Demain à 08:00
   - Arrivée : Demain à 17:00
3. Cliquer "Créer Commande"

**Résultat attendu:**

- ✓ Commande créée
- ✓ Statut calculé : "📅 Planifié"
- ✓ Camion passe à "📅 Planifié"
- ✓ Redirection vers `/orders`

---

#### TC-ORDER-002 : Modifier les heures d'une commande

| Propriété     | Valeur                |
| ------------- | --------------------- |
| **ID**        | TC-ORDER-002          |
| **Titre**     | Modifier les horaires |
| **Catégorie** | Fonctionnel           |
| **Type**      | Positif               |
| **Priorité**  | Majeure               |

**Prérequis:** Commande existante avec horaires

**Étapes:**

1. Aller à `/orders`
2. Sur une commande, cliquer "✏️ Modifier heures"
3. Changer le départ à +1 heure
4. Cliquer "Enregistrer"

**Résultat attendu:**

- ✓ Horaires mis à jour
- ✓ Statut recalculé si nécessaire
- ✓ Camion mis à jour
- ✓ Retour à la liste des commandes

---

#### TC-ORDER-003 : Statut en transit (horaire en cours)

| Propriété     | Valeur                       |
| ------------- | ---------------------------- |
| **ID**        | TC-ORDER-003                 |
| **Titre**     | Vérifier statut "en transit" |
| **Catégorie** | Fonctionnel                  |
| **Type**      | Positif                      |
| **Priorité**  | Majeure                      |

**Étapes:**

1. Créer une commande avec :
   - Départ : Il y a 1 heure
   - Arrivée : Dans 1 heure
2. Actualisez la page `/orders`

**Résultat attendu:**

- ✓ Statut : "🚚 En transit" (badge orange)
- ✓ Camion : "🚚 En transit"

---

#### TC-ORDER-004 : Statut complété (après arrivée)

| Propriété     | Valeur                     |
| ------------- | -------------------------- |
| **ID**        | TC-ORDER-004               |
| **Titre**     | Vérifier statut "complété" |
| **Catégorie** | Fonctionnel                |
| **Type**      | Positif                    |
| **Priorité**  | Majeure                    |

**Étapes:**

1. Créer une commande avec :
   - Départ : Il y a 5 heures
   - Arrivée : Il y a 30 minutes
2. Actualisez `/orders`

**Résultat attendu:**

- ✓ Statut : "✓ Complété" (badge vert)
- ✓ Camion : "✓ Complété"
- ✓ Bouton "Facturer" disponible

---

### 3. MODULE INVOICE - Facturation

#### TC-INVOICE-001 : Facturer une commande

| Propriété     | Valeur            |
| ------------- | ----------------- |
| **ID**        | TC-INVOICE-001    |
| **Titre**     | Créer une facture |
| **Catégorie** | Fonctionnel       |
| **Type**      | Positif           |
| **Priorité**  | Critique          |

**Prérequis:** Commande avec statut "pending" ou "completed"

**Étapes:**

1. Aller à `/orders`
2. Sur une commande, saisir montant : 500
3. Cliquer "Facturer"

**Résultat attendu:**

- ✓ Facture créée
- ✓ Redirection à `/invoices`
- ✓ Facture affichée avec montant 500€
- ✓ Commande marquée "completed"
- ✓ Camion revient à "Disponible"

---

#### TC-INVOICE-002 : Consulter toutes les factures

| Propriété     | Valeur                     |
| ------------- | -------------------------- |
| **ID**        | TC-INVOICE-002             |
| **Titre**     | Afficher tous les factures |
| **Catégorie** | Fonctionnel                |
| **Type**      | Positif                    |
| **Priorité**  | Majeure                    |

**Étapes:**

1. Créer 3 factures
2. Naviguer vers `/invoices`

**Résultat attendu:**

- ✓ Les 3 factures affichées
- ✓ Colonnes : ID, Client, Montant, Date
- ✓ Montants affichés avec "€"
- ✓ Dates formatées localement (fr-FR)

---

### 4. TESTS DE RÉGRESSION

#### TC-REG-001 : Cycle complet : Création → Transit → Facturation

| Propriété     | Valeur           |
| ------------- | ---------------- |
| **ID**        | TC-REG-001       |
| **Titre**     | Workflow complet |
| **Catégorie** | Régression       |
| **Type**      | Positif          |
| **Priorité**  | Critique         |

**Étapes:**

1. Ajouter un camion
2. Créer une commande planifiée
3. Modifier l'heure de départ (début immédiat)
4. Vérifier statut "en transit"
5. Modifier l'heure d'arrivée (dans 30 min)
6. Attendre/vérifier statut "complété"
7. Créer la facture
8. Vérifier camion "disponible"

**Résultat attendu:**

- ✓ Tous les statuts se mettent à jour correctement
- ✓ Aucune erreur/exception
- ✓ Données cohérentes en base

---

#### TC-REG-002 : Pas de régression après modification

| Propriété     | Valeur             |
| ------------- | ------------------ |
| **ID**        | TC-REG-002         |
| **Titre**     | Vérifier stabilité |
| **Catégorie** | Régression         |
| **Type**      | Positif            |
| **Priorité**  | Majeure            |

**Étapes:**

1. Exécuter les scénarios principaux
2. Parcourir toutes les pages
3. Vérifier pas d'erreur 500

**Résultat attendu:**

- ✓ Pas d'exception non gérée
- ✓ Tous les liens fonctionnent
- ✓ Redirection cohérente

---

### 5. TESTS DE SÉCURITÉ

#### TC-SEC-001 : SQL Injection sur camion

| Propriété     | Valeur                   |
| ------------- | ------------------------ |
| **ID**        | TC-SEC-001               |
| **Titre**     | Prévention SQL injection |
| **Catégorie** | Sécurité                 |
| **Type**      | Négatif                  |
| **Priorité**  | Critique                 |

**Étapes:**

1. Naviguer vers `/trucks/add`
2. Nom : `"; DROP TABLE trucks; --`
3. Capacité : 5000
4. Soumettre

**Résultat attendu:**

- ✓ Injection rejetée
- ✓ Camion créé avec le texte en tant que nom (échappé)
- ✓ Table trucks intacte

---

### 6. TESTS DE PERFORMANCE

#### TC-PERF-001 : Temps de réponse page commandes

| Propriété     | Valeur                    |
| ------------- | ------------------------- |
| **ID**        | TC-PERF-001               |
| **Titre**     | Performance de chargement |
| **Catégorie** | Performance               |
| **Type**      | Mesure                    |
| **Priorité**  | Mineure                   |

**Étapes:**

1. Créer 100 commandes
2. Naviguer vers `/orders`
3. Mesurer temps de chargement

**Résultat attendu:**

- ✓ Temps < 500ms
- ✓ Page responsive

---

## Procédures de test

### Procédure d'exécution des tests

#### Étapes préalables

```bash
# 1. Démarrer le serveur
cd C:\Dev\ERP-test
npm start

# 2. Ouvrir le navigateur
http://localhost:3000

# 3. Initialiser avec données de test
# (Voir section Données de test)
```

#### Exécution d'un cas de test

1. Lire les prérequis
2. Exécuter chaque étape
3. Vérifier chaque résultat attendu avec une checkbox
4. Si une étape échoue → marquer FAIL et noter l'écart
5. Documenter les remarques

#### Résultat du test

- **PASS** : Tous les résultats attendus PASS
- **FAIL** : Au moins un résultat attendu FAIL
- **BLOCKED** : Test ne peut pas s'exécuter

### Matrice de traçabilité

| US             | Cas de test                | Statut   |
| -------------- | -------------------------- | -------- |
| UC-TRUCK-001   | TC-TRUCK-001               | À tester |
| UC-TRUCK-002   | TC-TRUCK-003               | À tester |
| UC-ORDER-001   | TC-ORDER-001               | À tester |
| UC-ORDER-002   | TC-ORDER-002               | À tester |
| UC-ORDER-003   | TC-ORDER-003, TC-ORDER-004 | À tester |
| UC-INVOICE-001 | TC-INVOICE-001             | À tester |
| UC-INVOICE-002 | TC-INVOICE-002             | À tester |

---

## Métriques et rapports

### Métriques de couverture

```
Module Trucks     : 100% (3/3 cas critiques)
Module Orders     : 100% (4/4 cas critiques)
Module Invoices   : 100% (2/2 cas critiques)
Régression        : 100% (2/2 cas)
Sécurité          : 80% (1/1 cas majeurs)
Performance       : 50% (1/2 cas)

COUVERTURE TOTALE : 95%
```

### Template de rapport de test

```markdown
## Rapport d'exécution - [Date]

**Exécuteur:** [Name]  
**Période:** [Date début] - [Date fin]  
**Environnement:** [Spécifications]

### Résumé

- Total cas : X
- PASS : Y
- FAIL : Z
- BLOCKED : W

### Bugs trouvés

- ID : BUG-001
  Description : [...]
  Sévérité : Critique
  Reproduction : [...]

### Commentaires

[Remarques]

### Signature

Signé : ******\_\_\_\_******  
Date : ******\_\_\_\_******
```

### Seuils d'acceptation

| Métrique         | Cible   | Seuil min |
| ---------------- | ------- | --------- |
| Taux de réussite | 100%    | 95%       |
| Cas critiques    | 100%    | 100%      |
| Bugs critiques   | 0       | ≤ 1       |
| Temps de réponse | < 500ms | < 1000ms  |

---

## Stratégie de dépannage

### Symptôme : Page 500 - Internal Server Error

| Étape | Action                                           |
| ----- | ------------------------------------------------ |
| 1     | Vérifier console serveur pour erreur             |
| 2     | Vérifier base de données SQLite                  |
| 3     | Vérifier les paramètres liés dans la requête SQL |
| 4     | Redémarrer le serveur                            |

### Symptôme : Statut pas recalculé

| Étape | Action                                  |
| ----- | --------------------------------------- |
| 1     | Vérifier les horaires (format DATETIME) |
| 2     | Vérifier l'heure système du serveur     |
| 3     | Rafraîchir la page (F5)                 |
| 4     | Vérifier fonction calculateStatus()     |

### Symptôme : Camion reste en "en transit"

| Étape | Action                                          |
| ----- | ----------------------------------------------- |
| 1     | Vérifier l'heure d'arrivée                      |
| 2     | Attendre que l'heure actuelle dépasse l'arrivée |
| 3     | Modifier l'heure d'arrivée à un temps passé     |
| 4     | Rafraîchir la page                              |

---

**Fin du plan de test**
