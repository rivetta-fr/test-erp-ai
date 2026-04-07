# Critères d'Acceptation - ERP Transport

**Version:** 1.0.0  
**Date:** Avril 2026  
**Statut:** À valider  
**Validateur:** Product Owner / Client

---

## Table des matières

1. [Critères généraux](#critères-généraux)
2. [Critères fonctionnels par module](#critères-fonctionnels-par-module)
3. [Critères non-fonctionnels](#critères-non-fonctionnels)
4. [Critères de performance](#critères-de-performance)
5. [Critères de sécurité](#critères-de-sécurité)
6. [Checklist de livraison](#checklist-de-livraison)

---

## Critères généraux

### CG-001 : Accessibilité

**Description:** L'application doit être accessible via un navigateur web moderne.

**Critères d'acceptation:**
- ✓ Accessible via http://localhost:3000
- ✓ Compatible avec Chrome 90+, Firefox 88+, Edge 90+
- ✓ Interface responsive sur écrans 1920x1080
- ✓ Tous les formulaires accessibles au clavier

**Validation:** `PASS / FAIL`

---

### CG-002 : Disponibilité

**Description:** L'application doit être disponible pendant les heures de bureau.

**Critères d'acceptation:**
- ✓ Uptime ≥ 99% pendant les heures de bureau (8h-18h)
- ✓ Temps moyen de réponse ≤ 500ms
- ✓ Pas de crash non-gérés
- ✓ Récupération automatique en cas d'erreur base de données

**Validation:** `PASS / FAIL`

---

### CG-003 : Documentation

**Description:** Le code et l'application doivent être documentés.

**Critères d'acceptation:**
- ✓ Commentaires en français sur les fonctions critiques
- ✓ Fichier README.md à jour
- ✓ Spécifications détaillées (SPECIFICATIONS.md)
- ✓ Plan de test complet (TEST_PLAN.md)
- ✓ Guide utilisateur dans les templates EJS

**Validation:** `PASS / FAIL`

---

## Critères fonctionnels par module

### MODULE 1 : GESTION DES CAMIONS

#### AC-TRUCK-001 : Créer un camion

**US:** Ajouter un nouveau camion à la flotte

**Critères d'acceptation:**
- ✓ Formulaire accessible via "Ajouter un camion"
- ✓ Champs requis : Nom (string), Capacité (number > 0)
- ✓ Validation côté client (HTML5) et serveur (JS)
- ✓ Camion créé avec statut "available"
- ✓ Message de succès affiché
- ✓ Redirection vers la liste des camions
- ✓ Nouveau camion visible dans le tableau

**Tests associés:**
- TC-TRUCK-001 (Positif - données valides)
- TC-TRUCK-002 (Négatif - capacité invalide)

**Validation:** `PASS / FAIL`

---

#### AC-TRUCK-002 : Consulter les camions

**US:** Afficher la liste de tous les camions avec leurs informations

**Critères d'acceptation:**
- ✓ Page `/trucks` affiche un tableau
- ✓ Colonnes : ID, Nom, Capacité (kg), Statut
- ✓ Tous les camions listés (si n > 20, pagination)
- ✓ Statuts affichés avec badges colorés :
  - Vert pour "Disponible"
  - Orange pour "En transit"
  - Bleu pour "Planifié"
- ✓ Lien "Retour" vers page d'accueil
- ✓ Lien "Ajouter un camion" accessible

**Tests associés:**
- TC-TRUCK-003 (Consultation liste)

**Validation:** `PASS / FAIL`

---

#### AC-TRUCK-003 : Mise à jour automatique du statut

**US:** Le statut d'un camion se met à jour automatiquement selon ses commandes

**Critères d'acceptation:**
- ✓ Statut du camion = statut de sa dernière commande
- ✓ Après création commande → camion mis à jour
- ✓ Après modification horaires → camion mis à jour
- ✓ Après facturation → camion revient à "available"
- ✓ Les 4 statuts possibles sont implémentés :
  - available
  - scheduled
  - in_transit
  - completed

**Validation:** `PASS / FAIL`

---

### MODULE 2 : GESTION DES COMMANDES

#### AC-ORDER-001 : Créer une commande

**US:** Enregistrer une nouvelle commande de transport

**Critères d'acceptation:**
- ✓ Formulaire accessible via "Ajouter une commande"
- ✓ Champs requis :
  - Nom du client (string)
  - Origine (string - ville/adresse)
  - Destination (string - ville/adresse)
  - Camion (select - tous les camions)
  - Date/Heure départ (datetime-local)
  - Date/Heure arrivée (datetime-local)
- ✓ Validation : arrivée > départ
- ✓ Commande créée avec statut calculé automatiquement
- ✓ Camion mis à jour et assigné
- ✓ Redirection vers la liste des commandes
- ✓ Nouvelle commande visible avec détails corrects

**Tests associés:**
- TC-ORDER-001 (Positif - futures dates)
- TC-REG-001 (Cycle complet)

**Validation:** `PASS / FAIL`

---

#### AC-ORDER-002 : Consulter les commandes

**US:** Afficher la liste de toutes les commandes avec statuts dynamiques

**Critères d'acceptation:**
- ✓ Page `/orders` affiche un tableau ou des cartes
- ✓ Pour chaque commande, afficher :
  - ID et Numéro de commande
  - Nom du client
  - Trajet (Origine → Destination)
  - Camion assigné (ou "Non assigné")
  - Statut dynamique calculé (badge)
  - Horaires (départ/arrivée)
- ✓ Badges de statut colorés :
  - Jaune : "⏳ En attente"
  - Bleu : "📅 Planifié"
  - Orange : "🚚 En transit"
  - Vert : "✓ Complété"
- ✓ Bouton "Modifier heures" pour chaque commande
- ✓ Bouton "Facturer" pour commandes "pending" ou "completed"
- ✓ Lien "Retour" vers page d'accueil

**Tests associés:**
- TC-ORDER-003, TC-ORDER-004 (Calcul des statuts)

**Validation:** `PASS / FAIL`

---

#### AC-ORDER-003 : Modifier les horaires

**US:** Mettre à jour les heures de départ/arrivée d'une commande

**Critères d'acceptation:**
- ✓ Formulaire de modification accessible via "✏️ Modifier heures"
- ✓ Champs pré-remplis avec les valeurs actuelles
- ✓ Permettre modification de départ et arrivée
- ✓ Validation : arrivée > départ
- ✓ Après validation :
  - Commande mise à jour en DB
  - Statut recalculé dynamiquement
  - Camion mis à jour
  - Retour à liste commandes
- ✓ Bouton "Annuler" ferme le formulaire

**Tests associés:**
- TC-ORDER-002 (Modification heures)

**Validation:** `PASS / FAIL`

---

#### AC-ORDER-004 : Calcul dynamique des statuts

**US:** Les statuts se calculent automatiquement en fonction de l'heure actuelle

**Critères d'acceptation:**
- ✓ Statut "pending" : pas de dates définies
- ✓ Statut "scheduled" : départ dans le futur (NOW < départ)
- ✓ Statut "in_transit" : actuellement en route (NOW ∈ [départ, arrivée])
- ✓ Statut "completed" : arrivée passée (NOW ≥ arrivée)
- ✓ Calcul effectué à chaque consultation de la page
- ✓ Pas de délai observed (calcul immédiat)

**Tests associés:**
- TC-ORDER-003, TC-ORDER-004 (Vérification des statuts)

**Validation:** `PASS / FAIL`

---

### MODULE 3 : FACTURATION

#### AC-INVOICE-001 : Créer une facture

**US:** Générer une facture pour une commande complétée

**Critères d'acceptation:**
- ✓ Formulaire facture accessible sur page commandes
- ✓ Champ "Montant" (number, > 0)
- ✓ Montant en euros avec 2 décimales
- ✓ Après validation :
  - Facture créée en DB avec timestamp
  - Montant enregistré
  - Commande marquée "completed"
  - Camion revient à "available"
  - Redirection vers `/invoices`
- ✓ Facture bien créée même si montant avec virgule (ex: 100.50)

**Tests associés:**
- TC-INVOICE-001 (Création facture)

**Validation:** `PASS / FAIL`

---

#### AC-INVOICE-002 : Consulter les factures

**US:** Afficher la liste de toutes les factures avec détails

**Critères d'acceptation:**
- ✓ Page `/invoices` affiche un tableau
- ✓ Colonnes : ID Facture, Client, Montant, Date d'émission
- ✓ Tous les factures listées (si n > 20, pagination)
- ✓ Montants affichés avec symbole € (ex: "500€")
- ✓ Dates formatées locale FR (dd/MM/yyyy HH:mm)
- ✓ Si aucune facture : message "Aucune facture émise"
- ✓ Lien "Retour" vers page d'accueil

**Tests associés:**
- TC-INVOICE-002 (Consultation factures)

**Validation:** `PASS / FAIL`

---

## Critères non-fonctionnels

### CNF-001 : Ergonomie et UX

**Critères d'acceptation:**
- ✓ Interface intuitive pour utilisateur non-technique
- ✓ Navigation cohérente entre pages
- ✓ Boutons et links clairement identifiables
- ✓ Messages d'confirmation/erreur clairs
- ✓ Design moderne avec palette pastel bleu-vert
- ✓ Aucun texte cassé ou mal affiché
- ✓ Pas de scrolling horizontal sur desktop

**Validation:** `PASS / FAIL`

---

### CNF-002 : Maintenabilité du code

**Critères d'acceptation:**
- ✓ Code commenté en français
- ✓ Noms de variables explicites
- ✓ Fonctions ≤ 50 lignes (sauf exception)
- ✓ Pas de code duppliqué
- ✓ Structure de dossiers logique
- ✓ Fichier .gitignore présent
- ✓ Pas de credentials en dur

**Validation:** `PASS / FAIL`

---

### CNF-003 : Scalabilité

**Critères d'acceptation:**
- ✓ Architecture permettant augmentation utilisateurs
- ✓ DB capable de gérer 10,000+ enregistrements
- ✓ Code préparé pour migration vers DB robuste (PostgreSQL)
- ✓ API stateless (pas de session serveur)

**Validation:** `PASS / FAIL`

---

## Critères de performance

### CP-001 : Temps de chargement des pages

**Critères d'acceptation:**
- ✓ Page d'accueil : < 200ms
- ✓ Liste camions : < 300ms
- ✓ Liste commandes : < 500ms (même avec 100+)
- ✓ Liste factures : < 300ms
- ✓ Formulaires : < 100ms
- ✓ Temps global Page Load < 1s

**Mesure:** Utilisez F12 → Network → mesurer "Load time"

**Validation:** `PASS / FAIL`

---

### CP-002 : Réactivité des interactions

**Critères d'acceptation:**
- ✓ Redirection après action < 500ms
- ✓ Calcul de statuts immédiat (< 50ms)
- ✓ Pas de lag lors du clic de boutons
- ✓ Pas de freezing de l'interface

**Validation:** `PASS / FAIL`

---

### CP-003 : Consommation mémoire

**Critères d'acceptation:**
- ✓ Serveur Node utilise < 200MB RAM
- ✓ Page web < 100MB cache (au démarrage)
- ✓ Pas de fuite mémoire après 1h d'utilisation

**Mesure:** `top` (Linux) ou Task Manager (Windows)

**Validation:** `PASS / FAIL`

---

## Critères de sécurité

### CS-001 : Injection SQL

**Critères d'acceptation:**
- ✓ Tous les paramètres SQL utilisent prepared statements
- ✓ Test injection `"; DROP TABLE;` → échoue
- ✓ Injection enregistrée comme données (chaîne littérale)
- ✓ Table jamais supprimée par injection

**Tests associés:**
- TC-SEC-001

**Validation:** `PASS / FAIL`

---

### CS-002 : Validation des données

**Critères d'acceptation:**
- ✓ Capacité > 0 vérifiée
- ✓ Montants facture > 0 vérifiés
- ✓ Horaires validés (arrivée > départ)
- ✓ Aucune donnée NULL où NOT NULL requis
- ✓ Erreur 400 ou 500 si données invalides

**Validation:** `PASS / FAIL`

---

### CS-003 : Pas de donnée sensible

**Critères d'acceptation:**
- ✓ Aucun mot de passe en dur dans le code
- ✓ Aucune clé API visible
- ✓ Params DB pas en exposed
- ✓ Logs ne contiennent pas données sensibles

**Validation:** `PASS / FAIL`

---

### CS-004 : Protection CSRF

**Critères d'acceptation:**
- ✓ Formulaires utilisant POST (non GET)
- ✓ Actions sensibles protégées contre CSRF
- ✓ Token CSRF pour chaque formulaire (optionnel pour MVP)

**Validation:** `PASS / FAIL`

---

## Checklist de livraison

### Avant mise en production

#### Code et dépôt
- [ ] Tous les fichiers commitées en Git
- [ ] Pas de fichiers locaux non-trackés critiques
- [ ] Branch `dev` à jour avec `main`
- [ ] `.gitignore` complet (node_modules, .env, etc.)
- [ ] README.md à jour avec instructions de démarrage

#### Documentation
- [ ] SPECIFICATIONS.md complet
- [ ] TEST_PLAN.md complet
- [ ] ACCEPTANCE_CRITERIA.md complet (ce fichier)
- [ ] Commentaires en français dans le code server.js
- [ ] JSDoc/commentaires sur fonctions critiques

#### Tests
- [ ] Tous les cas de test exécutés
- [ ] Tous les cas critiques PASS
- [ ] Plan de test signée par QA
- [ ] Pas de bugs critiques ouverts
- [ ] Pas de warnings dans console

#### Sécurité
- [ ] Aucune injection SQL possible
- [ ] Données validées côté serveur
- [ ] Pas de données sensibles en du
- [ ] Erreurs gérées sans leak d'info

#### Performance
- [ ] Temps de réponse < 500ms mesuré
- [ ] Pas de fuite mémoire
- [ ] Base de données indexée si nécessaire
- [ ] Pas de N+1 queries

#### Fonctionnalité
- [ ] Tous les modules implémentés
- [ ] Tous les cas d'usage couverts
- [ ] Statuts calculés correctement
- [ ] Workflows selon spécifications

#### Livraison
- [ ] Package.json avec dépendances correctes
- [ ] npm install fonctionnel
- [ ] npm start démarre serveur
- [ ] Application accessible sur :3000
- [ ] Pas d'erreur au démarrage

---

## Validation finale

### Sign-off list

| Rôle | Nom | Date | Signature |
|------|------|------|-----------|
| Product Owner | ________ | ________ | ________ |
| Développeur | ________ | ________ | ________ |
| QA/Testeur | ________ | ________ | ________ |
| DevOps | ________ | ________ | ________ |

### Conditions de livraison finale

```
ACCEPTÉ si:
  ✓ 100% critères généraux (CG)
  ✓ 100% critères fonctionnels (AC)
  ✓ 100% critères non-fonctionnels (CNF)
  ✓ ≥ 95% critères performance (CP)
  ✓ 100% critères sécurité (CS)
  ✓ 100% checklist livraison

REJETÉ si:
  ✗ Budget dépassé
  ✗ Délai dépassé
  ✗ Critères critiques non-satisfaits
  ✗ Bugs critiques détectés après livraison
```

### Décision finale

**Statut :** `À VALIDER`

**Commentaires :**
```
[À compléter par Product Owner]
```

**Validé le :** ___________  
**Par :** ___________  

---

**Fin du document de critères d'acceptation**

---

## Annexe : Critères détaillés par user story

### Story 1 : Gestion des camions
- AC-TRUCK-001 : Créer camion ✓
- AC-TRUCK-002 : Consulter camions ✓
- AC-TRUCK-003 : Statut auto ✓

### Story 2 : Gestion des commandes
- AC-ORDER-001 : Créer commande ✓
- AC-ORDER-002 : Consulter commandes ✓
- AC-ORDER-003 : Modifier horaires ✓
- AC-ORDER-004 : Statuts dynamiques ✓

### Story 3 : Facturation
- AC-INVOICE-001 : Créer facture ✓
- AC-INVOICE-002 : Consulter factures ✓

### Non-fonctionnels
- CNF-001 : UX/Ergonomie ✓
- CNF-002 : Maintenabilité ✓
- CNF-003 : Scalabilité ✓

### Performance
- CP-001 : Temps de chargement ✓
- CP-002 : Réactivité ✓
- CP-003 : Mémoire ✓

### Sécurité
- CS-001 : Pas SQL injection ✓
- CS-002 : Validation données ✓
- CS-003 : Pas données sensibles ✓
- CS-004 : Protection CSRF ✓
