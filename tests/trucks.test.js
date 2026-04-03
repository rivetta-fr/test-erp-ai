/**
 * Tests - Module Gestion des Camions
 * 
 * Fichier : tests/trucks.test.js
 * Description : Tests des cas d'usage pour la gestion des camions
 * 
 * Cas de test couverts :
 * - TC-TRUCK-001 : Ajouter un camion avec données valides
 * - TC-TRUCK-002 : Validation de la capacité
 * - TC-TRUCK-003 : Afficher tous les camions
 */

const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

// Port et configuration de test
const TEST_PORT = 3001;
const TEST_DB = path.join(__dirname, '../test.db');

// Créer une instance Express pour les tests
const express = require('express');
const bodyParser = require('body-parser');

let app;
let db;
let calculateStatus;
let updateTruckStatus;

// Initialiser l'app et la base de données pour les tests
beforeAll(() => {
  // Supprimer la base de données de test si elle existe
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }

  // Créer l'app Express
  app = express();
  
  // Middleware
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.set('view engine', 'ejs');

  // Initialiser la base de données de test
  db = new sqlite3.Database(TEST_DB);

  // Définir les fonctions utilitaires
  calculateStatus = (departureTime, arrivalTime) => {
    const now = new Date();
    const departure = departureTime ? new Date(departureTime) : null;
    const arrival = arrivalTime ? new Date(arrivalTime) : null;

    if (!departure) return 'pending';
    if (now < departure) return 'scheduled';
    if (now >= departure && (!arrival || now < arrival)) return 'in_transit';
    if (arrival && now >= arrival) return 'completed';
    return 'pending';
  };

  updateTruckStatus = (truckId, callback) => {
    db.get(
      `SELECT departure_time, arrival_time, status FROM orders 
       WHERE truck_id = ? AND status IN ('scheduled', 'in_transit') 
       ORDER BY created_at DESC LIMIT 1`,
      [truckId],
      (err, row) => {
        if (err) return callback(err);
        
        const status = row ? calculateStatus(row.departure_time, row.arrival_time) : 'available';
        const truckStatus = status === 'pending' ? 'available' : status;
        
        db.run('UPDATE trucks SET status = ? WHERE id = ?', [truckStatus, truckId], callback);
      }
    );
  };

  // Créer les tables avec le nouveau schéma
  return new Promise((resolve) => {
    db.serialize(() => {
      // Table clients
      db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      // Table trucks
      db.run(`CREATE TABLE IF NOT EXISTS trucks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity INTEGER,
        status TEXT DEFAULT 'available'
      )`);

      // Table orders (avec client_id)
      db.run(`CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        client_id INTEGER,
        origin TEXT,
        destination TEXT,
        truck_id INTEGER,
        status TEXT DEFAULT 'pending',
        departure_time DATETIME,
        arrival_time DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (client_id) REFERENCES clients (id),
        FOREIGN KEY (truck_id) REFERENCES trucks (id)
      )`);

      // Table invoices (avec nouveau schéma)
      db.run(`CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        invoice_number TEXT UNIQUE,
        order_id INTEGER,
        amount_ht REAL,
        tva_rate REAL DEFAULT 20.0,
        tva_amount REAL,
        amount_ttc REAL,
        status TEXT DEFAULT 'pending',
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )`);

      // Insérer des données de test
      db.run(`INSERT INTO clients (name, contact_person, email) VALUES
        ('Client Test 1', 'Jean Dupont', 'jean@test.com'),
        ('Client Test 2', 'Marie Martin', 'marie@test.com')`);

      resolve();
    });
  });

      db.run(`CREATE TABLE IF NOT EXISTS invoices (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        order_id INTEGER,
        amount REAL,
        issued_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders (id)
      )`, () => {
        resolve();
      });
    });
  });
});

// Définir les routes pour les tests
beforeAll(() => {
  // GET /trucks - Liste tous les camions
  app.get('/trucks', (req, res) => {
    db.all('SELECT * FROM trucks', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // POST /trucks - Créer un nouveau camion
  app.post('/trucks', (req, res) => {
    const { name, capacity } = req.body;

    // Validation
    if (!name || !capacity) {
      return res.status(400).json({ error: 'Nom et capacité requis' });
    }

    if (capacity <= 0) {
      return res.status(400).json({ error: 'Capacité doit être positive' });
    }

    db.run('INSERT INTO trucks (name, capacity) VALUES (?, ?)', [name, capacity], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name, capacity, status: 'available' });
    });
  });
});

// Nettoyer après les tests
afterAll(() => {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) console.error(err);
      
      // Supprimer la base de données de test
      if (fs.existsSync(TEST_DB)) {
        fs.unlinkSync(TEST_DB);
      }
      
      resolve();
    });
  });
});

// ========================================
// TC-TRUCK-001 : Ajouter un camion valide
// ========================================
describe('TC-TRUCK-001 : Ajouter un camion avec données valides', () => {
  test('Doit créer un camion avec statut "available"', async () => {
    const response = await request(app)
      .post('/trucks')
      .send({
        name: 'Volvo FH16',
        capacity: 5000
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Volvo FH16');
    expect(response.body.capacity).toBe(5000);
    expect(response.body.status).toBe('available');
  });

  test('Doit insérer le camion dans la base de données', async () => {
    await request(app)
      .post('/trucks')
      .send({
        name: 'Scania R450',
        capacity: 6000
      });

    const response = await request(app).get('/trucks');
    
    expect(response.status).toBe(200);
    expect(response.body.length).toBeGreaterThan(0);
    
    const scania = response.body.find(t => t.name === 'Scania R450');
    expect(scania).toBeDefined();
    expect(scania.capacity).toBe(6000);
  });
});

// ========================================
// TC-TRUCK-002 : Validation de la capacité
// ========================================
describe('TC-TRUCK-002 : Validation de la capacité', () => {
  test('Doit rejeter capacité négative', async () => {
    const response = await request(app)
      .post('/trucks')
      .send({
        name: 'Mercedes Actros',
        capacity: -1000
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toBe('Capacité doit être positive');
  });

  test('Doit rejeter capacité zéro', async () => {
    const response = await request(app)
      .post('/trucks')
      .send({
        name: 'DAF XF',
        capacity: 0
      });

    expect(response.status).toBe(400);
  });

  test('Doit rejeter nombre manquant', async () => {
    const response = await request(app)
      .post('/trucks')
      .send({
        name: 'Volvo FH'
      });

    expect(response.status).toBe(400);
  });
});

// ========================================
// TC-TRUCK-003 : Consulter la liste des camions
// ========================================
describe('TC-TRUCK-003 : Afficher tous les camions', () => {
  test('Doit retourner un tableau de camions', async () => {
    // Créer 2 camions
    await request(app)
      .post('/trucks')
      .send({ name: 'Truck1', capacity: 5000 });

    await request(app)
      .post('/trucks')
      .send({ name: 'Truck2', capacity: 6000 });

    const response = await request(app).get('/trucks');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(2);
  });

  test('Chaque camion doit avoir les propriétés requises', async () => {
    const response = await request(app).get('/trucks');

    expect(response.status).toBe(200);
    
    response.body.forEach(truck => {
      expect(truck).toHaveProperty('id');
      expect(truck).toHaveProperty('name');
      expect(truck).toHaveProperty('capacity');
      expect(truck).toHaveProperty('status');
    });
  });

  test('Le statut par défaut doit être "available"', async () => {
    const response = await request(app).get('/trucks');

    expect(response.status).toBe(200);
    
    // Au moins un camion doit avoir le statut 'available'
    const hasAvailable = response.body.some(t => t.status === 'available');
    expect(hasAvailable).toBe(true);
  });
});
