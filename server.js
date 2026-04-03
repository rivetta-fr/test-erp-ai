/**
 * ========================================
 * ERP Transport Management System
 * ========================================
 * 
 * Application : Gestion de transport
 * Description : Système ERP simple pour la gestion des camions, commandes et facturation
 * Version : 1.0.0
 * Auteur : Équipe Développement
 * Date : 2026
 * 
 * Dépendances :
 * - Express : Framework web pour Node.js
 * - SQLite3 : Base de données légère
 * - Body-Parser : Middleware pour parser les données des formulaires
 * - EJS : Template engine pour les vues
 */

const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3001;

// ========================================
// CONFIGURATION DES MIDDLEWARES
// ========================================

// Parser les données URL-encoded (formulaires HTML)
app.use(bodyParser.urlencoded({ extended: true }));

// Parser les données JSON
app.use(bodyParser.json());

// Servir les fichiers statiques (CSS, images, JS)
app.use(express.static(path.join(__dirname, 'public')));

// Configurer le moteur de template EJS
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// ========================================
// INITIALISATION DE LA BASE DE DONNÉES
// ========================================

// Établir la connexion avec la base de données SQLite
const db = new sqlite3.Database('./erp.db', (err) => {
  if (err) {
    console.error('Erreur de connexion à la base de données:', err.message);
  }
  console.log('Connecté à la base de données SQLite avec succès.');
});

// ========================================
// CRÉATION DES TABLES DE LA BASE DE DONNÉES
// ========================================

/**
 * Tables créées :
 * 1. trucks - Gestion des véhicules de transport
 * 2. orders - Gestion des commandes de transport
 * 3. invoices - Gestion de la facturation
 */
db.serialize(() => {
  // Table TRUCKS : Stocke les informations des camions
  // Colonnes :
  // - id : Identifiant unique du camion
  // - name : Nom/Modèle du camion
  // - capacity : Capacité de chargement en kg
  // - status : État du camion (available, scheduled, in_transit, completed)
  db.run(`CREATE TABLE IF NOT EXISTS trucks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    capacity INTEGER,
    status TEXT DEFAULT 'available'
  )`);

  // Table ORDERS : Stocke les commandes de transport
  // Colonnes :
  // - id : Identifiant unique de la commande
  // - client_name : Nom du client ayant passé la commande
  // - origin : Lieu de départ
  // - destination : Lieu d'arrivée
  // - truck_id : Référence au camion assigné à cette commande
  // - status : État de la commande (pending, scheduled, in_transit, completed)
  // - departure_time : Date/heure de départ prévue
  // - arrival_time : Date/heure d'arrivée prévue
  // - created_at : Timestamp de création de la commande
  db.run(`CREATE TABLE IF NOT EXISTS orders (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_name TEXT NOT NULL,
    origin TEXT,
    destination TEXT,
    truck_id INTEGER,
    status TEXT DEFAULT 'pending',
    departure_time DATETIME,
    arrival_time DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (truck_id) REFERENCES trucks (id)
  )`);

  // Table INVOICES : Stocke les factures générées
  // Colonnes :
  // - id : Identifiant unique de la facture
  // - order_id : Référence à la commande facturée
  // - amount : Montant de la facture en euros
  // - issued_at : Timestamp d'émission de la facture
  db.run(`CREATE TABLE IF NOT EXISTS invoices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER,
    amount REAL,
    issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders (id)
  )`);
});

// ========================================
// FONCTIONS UTILITAIRES DE GESTION DES STATUTS
// ========================================

/**
 * Calcule le statut dynamique d'une commande basé sur la date/heure actuelle
 * et les horaires de départ/arrivée prévus.
 * 
 * @param {string|null} departureTime - Date/heure de départ (format DATETIME)
 * @param {string|null} arrivalTime - Date/heure d'arrivée (format DATETIME)
 * @returns {string} Statut calculé :
 *   - 'pending' : Pas de dates définies
 *   - 'scheduled' : Départ prévu dans le futur
 *   - 'in_transit' : Entre le départ et l'arrivée
 *   - 'completed' : Après l'heure d'arrivée
 * 
 * Exemple d'utilisation :
 * const status = calculateStatus('2026-04-05 08:00', '2026-04-05 17:00');
 */
function calculateStatus(departureTime, arrivalTime) {
  const now = new Date();
  const departure = departureTime ? new Date(departureTime) : null;
  const arrival = arrivalTime ? new Date(arrivalTime) : null;

  // Si pas de date de départ, la commande est en attente
  if (!departure) return 'pending';
  
  // Si la date de départ est dans le futur, la commande est planifiée
  if (now < departure) return 'scheduled';
  
  // Si nous sommes après le départ et avant l'arrivée, la commande est en transit
  if (now >= departure && (!arrival || now < arrival)) return 'in_transit';
  
  // Si nous sommes après l'arrivée, la commande est complétée
  if (arrival && now >= arrival) return 'completed';
  
  // Par défaut, retour pending
  return 'pending';
}

/**
 * Met à jour le statut d'un camion basé sur la commande la plus récente.
 * Le statut du camion suit l'état de la commande en cours.
 * 
 * @param {number} truckId - ID du camion à mettre à jour
 * @param {function} callback - Fonction de rappel (err) après mise à jour
 * 
 * Logique :
 * 1. Récupère la dernière commande du camion
 * 2. Calcule le statut basé sur les horaires
 * 3. Met à jour le statut du camion en base de données
 * 
 * Exemple :
 * updateTruckStatus(1, (err) => {
 *   if (err) console.log(err);
 *   else console.log('Camion mis à jour');
 * });
 */
function updateTruckStatus(truckId, callback) {
  // Récupérer la dernière commande non-pending du camion
  db.get(
    `SELECT departure_time, arrival_time FROM orders 
     WHERE truck_id = ? AND status != 'pending' 
     ORDER BY created_at DESC LIMIT 1`,
    [truckId],
    (err, row) => {
      if (err) return callback(err);
      
      // Calculer le nouveau statut basé sur la commande récupérée
      const status = row ? calculateStatus(row.departure_time, row.arrival_time) : 'available';
      const truckStatus = status === 'pending' ? 'available' : status;
      
      // Mettre à jour la base de données
      db.run('UPDATE trucks SET status = ? WHERE id = ?', [truckStatus, truckId], callback);
    }
  );
}

// ========================================
// ROUTES - PAGE D'ACCUEIL
// ========================================

/**
 * GET / - Page d'accueil
 * Affiche la page principale avec les liens de navigation
 */
app.get('/', (req, res) => {
  res.render('index');
});

// ========================================
// ROUTES - GESTION DES CAMIONS
// ========================================

/**
 * GET /trucks - Liste tous les camions
 * Récupère tous les camions de la base de données et affiche la page de gestion
 */
app.get('/trucks', (req, res) => {
  db.all('SELECT * FROM trucks', [], (err, rows) => {
    if (err) {
      throw err;
    }
    res.render('trucks', { trucks: rows });
  });
});

/**
 * GET /trucks/add - Affiche le formulaire d'ajout d'un camion
 */
app.get('/trucks/add', (req, res) => {
  res.render('add-truck');
});

/**
 * POST /trucks - Crée un nouveau camion
 * 
 * Paramètres du formulaire :
 * - name : Nom/modèle du camion (string, obligatoire)
 * - capacity : Capacité de chargement en kg (number, obligatoire)
 * 
 * Logique :
 * 1. Récupère les données du formulaire
 * 2. Insère le nouveau camion en base de données
 * 3. Redirige vers la liste des camions
 */
app.post('/trucks', (req, res) => {
  const { name, capacity } = req.body;
  db.run('INSERT INTO trucks (name, capacity) VALUES (?, ?)', [name, capacity], function(err) {
    if (err) {
      return console.log('Erreur lors de l\'ajout du camion:', err.message);
    }
    res.redirect('/trucks');
  });
});

// ========================================
// ROUTES - GESTION DES COMMANDES
// ========================================

/**
 * GET /orders - Liste toutes les commandes
 * Récupère toutes les commandes avec les informations du camion assigné
 * et calcule le statut dynamique de chaque commande
 */
app.get('/orders', (req, res) => {
  db.all(`SELECT orders.*, trucks.name as truck_name FROM orders LEFT JOIN trucks ON orders.truck_id = trucks.id`, [], (err, rows) => {
    if (err) {
      throw err;
    }
    
    // Calculer le statut dynamique pour chaque commande basé sur l'heure actuelle
    const ordersWithStatus = rows.map(order => {
      order.dynamic_status = calculateStatus(order.departure_time, order.arrival_time);
      return order;
    });
    
    res.render('orders', { orders: ordersWithStatus });
  });
});

/**
 * GET /orders/add - Affiche le formulaire d'ajout d'une commande
 * Récupère tous les camions disponibles pour la sélection
 */
app.get('/orders/add', (req, res) => {
  db.all('SELECT * FROM trucks', [], (err, trucks) => {
    res.render('add-order', { trucks });
  });
});

/**
 * POST /orders - Crée une nouvelle commande de transport
 * 
 * Paramètres du formulaire :
 * - client_name : Nom du client (string, obligatoire)
 * - origin : Lieu de départ (string, obligatoire)
 * - destination : Lieu de destination (string, obligatoire)
 * - truck_id : ID du camion assigné (number, obligatoire)
 * - departure_time : Date/heure de départ (datetime, obligatoire)
 * - arrival_time : Date/heure d'arrivée (datetime, obligatoire)
 * 
 * Logique :
 * 1. Valide et récupère les données du formulaire
 * 2. Insère la nouvelle commande (statut initial : 'pending')
 * 3. Met à jour le statut du camion basé sur les horaires
 * 4. Redirige vers la liste des commandes
 */
app.post('/orders', (req, res) => {
  const { client_name, origin, destination, truck_id, departure_time, arrival_time } = req.body;
  
  db.run(
    'INSERT INTO orders (client_name, origin, destination, truck_id, departure_time, arrival_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
    [client_name, origin, destination, truck_id, departure_time, arrival_time, 'pending'], 
    function(err) {
      if (err) {
        return console.log('Erreur lors de la création de la commande:', err.message);
      }
      
      // Mettre à jour le statut du camion en fonction de la nouvelle commande
      updateTruckStatus(truck_id, () => {
        res.redirect('/orders');
      });
    }
  );
});

// ========================================
// ROUTES - GESTION DE LA FACTURATION
// ========================================

/**
 * GET /invoices - Liste toutes les factures
 * Récupère toutes les factures avec les informations du client
 */
app.get('/invoices', (req, res) => {
  db.all(`SELECT invoices.*, orders.client_name FROM invoices JOIN orders ON invoices.order_id = orders.id`, [], (err, rows) => {
    if (err) {
      throw err;
    }
    res.render('invoices', { invoices: rows });
  });
});

/**
 * POST /invoices/:orderId - Crée une facture pour une commande
 * 
 * Paramètres :
 * - orderId : ID de la commande à facturer (URL parameter)
 * - amount : Montant de la facture (form data, number)
 * 
 * Logique :
 * 1. Crée la facture avec le montant spécifié
 * 2. Récupère le truck_id de la commande
 * 3. Marque la commande comme 'completed'
 * 4. Met à jour le statut du camion
 * 5. Redirige vers la page des factures
 */
app.post('/invoices/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  const amount = req.body.amount;
  
  // Insérer la nouvelle facture
  db.run('INSERT INTO invoices (order_id, amount) VALUES (?, ?)', [orderId, amount], function(err) {
    if (err) {
      return console.log('Erreur lors de la création de la facture:', err.message);
    }
    
    // Récupérer l'ID du camion pour mettre à jour son statut
    db.get('SELECT truck_id FROM orders WHERE id = ?', [orderId], (err, order) => {
      if (order) {
        // Marquer la commande comme complétée
        db.run('UPDATE orders SET status = ? WHERE id = ?', ['completed', orderId], () => {
          // Mettre à jour le statut du camion
          updateTruckStatus(order.truck_id, () => {
            res.redirect('/invoices');
          });
        });
      } else {
        res.redirect('/invoices');
      }
    });
  });
});

// ========================================
// ROUTES - MISE À JOUR DES HORAIRES
// ========================================

/**
 * POST /orders/:orderId/update-times - Met à jour les horaires d'une commande
 * 
 * Paramètres :
 * - orderId : ID de la commande (URL parameter)
 * - departure_time : Nouvelle date/heure de départ (form data)
 * - arrival_time : Nouvelle date/heure d'arrivée (form data)
 * 
 * Logique :
 * 1. Récupère l'ID du camion assigné à la commande
 * 2. Met à jour les horaires et le statut de la commande
 * 3. Met à jour le statut du camion en fonction des nouveaux horaires
 * 4. Redirige vers la liste des commandes
 */
app.post('/orders/:orderId/update-times', (req, res) => {
  const { orderId } = req.params;
  const { departure_time, arrival_time } = req.body;
  
  // Récupérer l'ID du camion
  db.get('SELECT truck_id FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) return res.redirect('/orders');
    
    // Calculer le nouveau statut basé sur les horaires fournis
    const status = calculateStatus(departure_time, arrival_time);
    
    // Mettre à jour la commande avec les nouveaux horaires et statut
    db.run(
      'UPDATE orders SET departure_time = ?, arrival_time = ?, status = ? WHERE id = ?',
      [departure_time, arrival_time, status, orderId],
      () => {
        // Mettre à jour le statut du camion
        updateTruckStatus(order.truck_id, () => {
          res.redirect('/orders');
        });
      }
    );
  });
});

// ========================================
// DÉMARRAGE DU SERVEUR
// ========================================

/**
 * Lance le serveur Express sur le port spécifié
 * Affiche un message de confirmation avec l'URL d'accès
 */
app.listen(PORT, () => {
  console.log(`✓ Serveur en cours d'exécution sur http://localhost:${PORT}`);
  console.log(`✓ Bienvenue dans l'ERP Transport !`);
});