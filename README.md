# ERP Transport

Un ERP simple pour la gestion du transport avec Node.js.

## Fonctionnalités

- **Gestion des Ressources (Camions)** : Ajouter et lister les camions avec leur capacité et statut.
- **Gestion des Commandes** : Créer des commandes de transport, assigner des camions.
- **Facturation** : Générer des factures pour les commandes terminées.

## Installation

1. Cloner le dépôt.
2. Installer les dépendances : `npm install`
3. Lancer le serveur : `npm start`
4. Ouvrir http://localhost:3000 dans le navigateur.

## Structure

- `server.js` : Serveur Express principal.
- `views/` : Templates EJS.
- `public/` : Fichiers statiques (CSS).
- `erp.db` : Base de données SQLite (créée automatiquement).

## Technologies

- Node.js
- Express
- SQLite
- EJS
