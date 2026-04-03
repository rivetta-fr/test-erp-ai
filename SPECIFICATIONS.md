# Spécifications Fonctionnelles - ERP Transport

**Version:** 1.0.0  
**Date:** Avril 2026  
**Statut:** En production  
**Auteur:** Équipe Développement

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Spécifications générales](#spécifications-générales)
3. [Spécifications détaillées par module](#spécifications-détaillées-par-module)
4. [Flux utilisateur](#flux-utilisateur)
5. [Architecture technique](#architecture-technique)

---

## Vue d'ensemble

### Objectif

Développer un système ERP simple et efficace pour la gestion des transports incluant :

- **Gestion des ressources** : Suivi des camions et de leurs capacités
- **Gestion des commandes** : Création et suivi des trajets de transport
- **Facturation** : Génération de factures pour les trajets complétés

### Utilisateurs cibles

- Gestionnaires de flotte
- Responsables logistiques
- Personnel administratif/comptable

### Périmètre du projet

**Inclus:**

- Module de gestion des camions
- Module de gestion des commandes de transport
- Module de facturation
- Gestion dynamique des statuts basée sur les horaires

**Non inclus (futures versions):**

- Authentification des utilisateurs
- Gestion des conducteurs
- Système de tracking GPS en temps réel
- Intégration de paiement en ligne
- Module de maintenance des véhicules

---

## Spécifications générales

### 1. Architecture générale

```
┌─────────────────────────────────────────┐
│        Interface Web (EJS/HTML/CSS)     │
├─────────────────────────────────────────┤
│      Server Backend (Express.js)        │
├─────────────────────────────────────────┤
│      Database (SQLite)                  │
│  ├─ Trucks                              │
│  ├─ Orders                              │
│  └─ Invoices                            │
└─────────────────────────────────────────┘
```

### 2. Stack technologique

| Composant       | Technologie | Version |
| --------------- | ----------- | ------- |
| Runtime         | Node.js     | 24.x    |
| Framework       | Express.js  | 4.18.x  |
| Base de données | SQLite3     | 5.1.x   |
| Template        | EJS         | 3.1.x   |
| Parsing         | Body-Parser | 1.20.x  |

### 3. Contraintes et hypothèses

**Contraintes:**

- La base de données est locale (SQLite)
- Interface web accessible sur un seul serveur
- Pas de cache distribué
- Pas de session persistante

**Hypothèses:**

- Un camion ne peut gérer qu'une commande à la fois
- Les horaires sont définis au moment de la création de la commande
- Les utilisateurs ont un accès complet (pas de restriction de droits)

### 4. Performance et disponibilité

| Aspect                            | Cible                  |
| --------------------------------- | ---------------------- |
| Temps de réponse moyen            | < 500ms                |
| Disponibilité                     | 99% (heures de bureau) |
| Nombre d'utilisateurs concurrents | 10-20                  |
| Taille max de la base de données  | 1 GB                   |

---

## Spécifications détaillées par module

### MODULE 1 : GESTION DES CAMIONS

#### 1.1 Données du camion

```
Truck {
  id: Number (Primary Key)
  name: String (NOT NULL, unique)
  capacity: Number (kg, NOT NULL, > 0)
  status: Enum[available, scheduled, in_transit, completed]
  created_at: DateTime (DEFAULT: NOW)
}
```

#### 1.2 Attributs

| Attribut   | Type    | Contrainte          | Description                             |
| ---------- | ------- | ------------------- | --------------------------------------- |
| `id`       | Integer | PK, Auto-increment  | Identifiant unique                      |
| `name`     | String  | NOT NULL            | Nom/modèle du camion (ex: "Volvo FH16") |
| `capacity` | Integer | NOT NULL, > 0       | Capacité en kg (ex: 5000)               |
| `status`   | String  | DEFAULT 'available' | État du camion                          |

#### 1.3 Statuts des camions

| Statut       | Description       | Déclencheur                |
| ------------ | ----------------- | -------------------------- |
| `available`  | Camion disponible | Aucune commande en cours   |
| `scheduled`  | Trajet planifié   | Départ prévu dans le futur |
| `in_transit` | En transport      | Entre départ et arrivée    |
| `completed`  | Trajet complété   | Après l'heure d'arrivée    |

#### 1.4 Cas d'usage

**UC-TRUCK-001 : Ajouter un camion**

- Acteur : Gestionnaire de flotte
- Préconditions : Accès au système
- Étapes :
  1. Aller à "Gestion des camions"
  2. Cliquer sur "Ajouter un camion"
  3. Remplir le formulaire (nom, capacité)
  4. Valider
- Postconditions : Camion créé avec statut "available"

**UC-TRUCK-002 : Consulter la liste des camions**

- Acteur : N'importe quel utilisateur
- Étapes :
  1. Aller à "Gestion des camions"
  2. Visualiser le tableau de tous les camions
  3. Voir le nom, capacité et statut de chaque camion
- Validation : Tous les camions sont affichés avec leurs statuts corrects

---

### MODULE 2 : GESTION DES COMMANDES

#### 2.1 Données de la commande

```
Order {
  id: Number (Primary Key)
  client_name: String (NOT NULL)
  origin: String (NOT NULL)
  destination: String (NOT NULL)
  truck_id: Number (Foreign Key → Trucks)
  status: Enum[pending, scheduled, in_transit, completed]
  departure_time: DateTime (NOT NULL)
  arrival_time: DateTime (NOT NULL)
  created_at: DateTime (DEFAULT: NOW)
}
```

#### 2.2 Attributs

| Attribut         | Type     | Contrainte         | Description             |
| ---------------- | -------- | ------------------ | ----------------------- |
| `id`             | Integer  | PK, Auto-increment | Identifiant unique      |
| `client_name`    | String   | NOT NULL           | Nom du client           |
| `origin`         | String   | NOT NULL           | Ville/adresse de départ |
| `destination`    | String   | NOT NULL           | Ville/adresse d'arrivée |
| `truck_id`       | Integer  | FK → trucks        | Camion assigné          |
| `status`         | String   | DEFAULT 'pending'  | État de la commande     |
| `departure_time` | DateTime | NOT NULL           | Date/heure de départ    |
| `arrival_time`   | DateTime | NOT NULL           | Date/heure d'arrivée    |
| `created_at`     | DateTime | DEFAULT NOW        | Timestamp de création   |

#### 2.3 Statuts des commandes

| Statut       | Description | Condition               |
| ------------ | ----------- | ----------------------- |
| `pending`    | En attente  | Pas de dates définies   |
| `scheduled`  | Planifiée   | Départ > NOW            |
| `in_transit` | En transit  | NOW ∈ [départ, arrivée] |
| `completed`  | Complétée   | NOW > arrivée           |

#### 2.4 Logique de calcul du statut

```javascript
function calculateStatus(departureTime, arrivalTime) {
  const now = new Date();

  if (!departureTime) return "pending";
  if (now < departure) return "scheduled";
  if (now >= departure && (!arrival || now < arrival)) return "in_transit";
  if (arrival && now >= arrival) return "completed";

  return "pending";
}
```

#### 2.5 Cas d'usage

**UC-ORDER-001 : Créer une commande**

- Acteur : Gestionnaire logistique
- Préconditions : Au moins un camion doit exister
- Étapes :
  1. Aller à "Gestion des commandes"
  2. Cliquer sur "Ajouter une commande"
  3. Remplir le formulaire :
     - Nom du client
     - Origine
     - Destination
     - Sélectionner un camion
     - Date/heure de départ
     - Date/heure d'arrivée
  4. Valider
- Postconditions :
  - Commande créée avec statut calculé automatiquement
  - Statut du camion mis à jour

**UC-ORDER-002 : Modifier les heures d'une commande**

- Acteur : Gestionnaire logistique
- Étapes :
  1. Aller à "Gestion des commandes"
  2. Cliquer sur "Modifier heures" pour une commande
  3. Mettre à jour les horaires
  4. Valider
- Postconditions :
  - Horaires mis à jour
  - Statut recalculé automatiquement
  - Statut du camion mis à jour

**UC-ORDER-003 : Consulter les commandes**

- Acteur : N'importe quel utilisateur
- Étapes :
  1. Aller à "Gestion des commandes"
  2. Visualiser le tableau de toutes les commandes
  3. Voir trajet, camion assigné et statut
  4. Filtrer par statut si nécessaire
- Validation : Tous les statuts affichés correctement

---

### MODULE 3 : FACTURATION

#### 3.1 Données d'une facture

```
Invoice {
  id: Number (Primary Key)
  order_id: Number (Foreign Key → Orders)
  amount: Number (in €)
  issued_at: DateTime (DEFAULT: NOW)
}
```

#### 3.2 Attributs

| Attribut    | Type     | Contrainte         | Description        |
| ----------- | -------- | ------------------ | ------------------ |
| `id`        | Integer  | PK, Auto-increment | Identifiant unique |
| `order_id`  | Integer  | FK → orders        | Commande associée  |
| `amount`    | Real     | NOT NULL, > 0      | Montant en euros   |
| `issued_at` | DateTime | DEFAULT NOW        | Date d'émission    |

#### 3.3 Cas d'usage

**UC-INVOICE-001 : Créer une facture**

- Acteur : Personnel administratif/comptable
- Préconditions :
  - La commande doit exister
  - La session doit être "en attente" ou "complétée"
- Étapes :
  1. Aller à "Gestion des commandes"
  2. Saisir le montant dans le champ facture
  3. Cliquer sur "Facturer"
- Postconditions :
  - Facture créée avec montant spécifié
  - Commande marquée comme "completed"
  - Statut du camion mis à jour

**UC-INVOICE-002 : Consulter les factures**

- Acteur : Personnel administratif
- Étapes :
  1. Aller à "Facturation"
  2. Visualiser le tableau de toutes les factures
  3. Voir client, montant et date d'émission
- Validation : Toutes les factures émises sont listées

---

## Flux utilisateur

### Flux principal : Créer et facturer une commande

```
┌─────────────────────────────────────────────────────┐
│ 1. Ajouter un camion                                │
│    - Nom : "Volvo FH16"                             │
│    - Capacité : 5000 kg                             │
│    - Statut initial : "available"                   │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ 2. Créer une commande                               │
│    - Client : "Entreprise ABC"                      │
│    - Trajet : Paris → Lyon                          │
│    - Camion : Volvo FH16 (assigné)                  │
│    - Départ : 2026-04-05 08:00                      │
│    - Arrivée : 2026-04-05 17:00                     │
│    - Statut calculé : "scheduled" (si futur)        │
│    - Camion : Statut → "scheduled"                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ 3. (Auto) Mise à jour des statuts                   │
│    - NOW >= départ et NOW < arrivée                 │
│    - Ordre : statut → "in_transit"                  │
│    - Camion : statut → "in_transit"                 │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ 4. (Auto) Commande complétée                        │
│    - NOW >= arrivée                                 │
│    - Ordre : statut → "completed"                   │
│    - Camion : statut → "completed"                  │
└──────────────────┬──────────────────────────────────┘
                   │
┌──────────────────▼──────────────────────────────────┐
│ 5. Créer la facture                                 │
│    - Montant : 500€                                 │
│    - Date d'émission : NOW                          │
│    - Commande : statut → "completed"                │
│    - Camion : statut → "available"                  │
└─────────────────────────────────────────────────────┘
```

### Flux alternatif : Modifier les heures d'une commande

```
┌──────────────────────────────────────────┐
│ Commande affichée                        │
│ Statut : "scheduled"                     │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│ Cliquer "Modifier heures"                │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│ Mettre à jour détail/arrivée             │
│ Ex: décaler de 2 heures                  │
└──────────────┬───────────────────────────┘
               │
┌──────────────▼───────────────────────────┐
│ Recalculer le statut                     │
│ Mettre à jour le camion                  │
│ Afficher la mise à jour                  │
└──────────────────────────────────────────┘
```

---

## Architecture technique

### 1. Modèle de données

```sql
-- Table des camions
CREATE TABLE trucks (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL UNIQUE,
  capacity INTEGER NOT NULL CHECK(capacity > 0),
  status TEXT DEFAULT 'available',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Table des commandes
CREATE TABLE orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  client_name TEXT NOT NULL,
  origin TEXT NOT NULL,
  destination TEXT NOT NULL,
  truck_id INTEGER NOT NULL,
  status TEXT DEFAULT 'pending',
  departure_time DATETIME NOT NULL,
  arrival_time DATETIME NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (truck_id) REFERENCES trucks(id)
);

-- Table des factures
CREATE TABLE invoices (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  order_id INTEGER NOT NULL,
  amount REAL NOT NULL CHECK(amount > 0),
  issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id)
);
```

### 2. Points d'intégration

- **API interne** : Routes Express pour l'interface web
- **Base de données** : Requêtes SQL paramétrées (prévention SQL injection)
- **Stateless** : Pas de session serveur persistante

### 3. Sécurité

- Paramètres liés pour toutes les requêtes SQL
- Validation des données côté serveur
- Pas de données sensibles en dur dans le code

---

## Règles métier

### RB-001 : Calcul automatique des statuts

**Description** : Les statuts des commandes et camions sont calculés en temps réel basé sur l'heure actuelle et les horaires définis.

**Logique** :

- Si `departure_time` n'existe pas → `pending`
- Si `NOW < departure_time` → `scheduled`
- Si `departure_time ≤ NOW < arrival_time` → `in_transit`
- Si `NOW ≥ arrival_time` → `completed`

### RB-002 : Synchronisation des statuts camion-commande

**Description** : Le statut d'un camion reflète toujours le statut de sa dernière commande en cours.

**Logique** :

- Après création/modification d'une commande → recalcul du statut camion
- Après facturation → camion revient à `available`

### RB-003 : Intégrité référentielle

**Description** : Un camion ne peut pas être supprimé s'il a des commandes associées.

### RB-004 : Montants de facture

**Description** : Le montant d'une facture doit être positif.

---

## Évolutivité future

### Version 2.0

- Authentification des utilisateurs
- Gestion des conducteurs
- Historique des modifications
- Rapports et statistiques

### Version 3.0

- API REST pour intégrations externes
- Application mobile
- Tracking GPS en temps réel
- Module de maintenance

---

**Fin du document de spécifications**
