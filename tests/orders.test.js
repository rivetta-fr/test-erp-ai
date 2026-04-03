/**
 * Tests - Module Gestion des Commandes
 * 
 * Fichier : tests/orders.test.js
 * Description : Tests des cas d'usage pour la gestion des commandes
 * 
 * Cas de test couverts :
 * - TC-ORDER-001 : Créer commande planifiée
 * - TC-ORDER-002 : Modifier les horaires
 * - TC-ORDER-003 : Vérifier statut "en transit"
 * - TC-ORDER-004 : Vérifier statut "complété"
 */

const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const TEST_PORT = 3001;
const TEST_DB = path.join(__dirname, '../test-orders.db');

const express = require('express');
const bodyParser = require('body-parser');

let app;
let db;
let calculateStatus;
let updateTruckStatus;

// Fonction pour calculer le statut
const createCalculateStatus = () => {
  return (departureTime, arrivalTime) => {
    const now = new Date();
    const departure = departureTime ? new Date(departureTime) : null;
    const arrival = arrivalTime ? new Date(arrivalTime) : null;

    if (!departure) return 'pending';
    if (now < departure) return 'scheduled';
    if (now >= departure && (!arrival || now < arrival)) return 'in_transit';
    if (arrival && now >= arrival) return 'completed';
    return 'pending';
  };
};

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }

  app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.set('view engine', 'ejs');

  db = new sqlite3.Database(TEST_DB);
  calculateStatus = createCalculateStatus();

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
      )`, () => {
        // Créer un client de test
        db.run('INSERT INTO clients (name, contact_person, email) VALUES (?, ?, ?)', 
          ['Client Test', 'Jean Dupont', 'jean@test.com'], () => {
          // Créer un camion de test
          db.run('INSERT INTO trucks (name, capacity) VALUES (?, ?)', ['Test Truck', 5000], () => {
            resolve();
          });
        });
      });
    });
  });
});

beforeAll(() => {
  // GET /orders - Liste toutes les commandes
  app.get('/orders', (req, res) => {
    db.all(`SELECT orders.*, trucks.name as truck_name, clients.name as client_name 
            FROM orders 
            LEFT JOIN trucks ON orders.truck_id = trucks.id 
            LEFT JOIN clients ON orders.client_id = clients.id`, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      
      const ordersWithStatus = rows.map(order => {
        order.dynamic_status = calculateStatus(order.departure_time, order.arrival_time);
        return order;
      });
      
      res.json(ordersWithStatus);
    });
  });

  // POST /orders - Créer une commande
  app.post('/orders', (req, res) => {
    const { client_id, origin, destination, truck_id, departure_time, arrival_time } = req.body;

    // Validation
    if (!client_id || !origin || !destination || !truck_id || !departure_time || !arrival_time) {
      return res.status(400).json({ error: 'Tous les champs sont requis' });
    }

    const departure = new Date(departure_time);
    const arrival = new Date(arrival_time);
    
    if (arrival <= departure) {
      return res.status(400).json({ error: 'L\'arrivée doit être après le départ' });
    }

    const status = calculateStatus(departure_time, arrival_time);

    db.run(
      'INSERT INTO orders (client_id, origin, destination, truck_id, departure_time, arrival_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_id, origin, destination, truck_id, departure_time, arrival_time, status],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        updateTruckStatus(truck_id, () => {
          res.status(201).json({
            id: this.lastID,
            client_id,
            origin,
            destination,
            truck_id,
            departure_time,
            arrival_time,
            status
          });
        });
      }
    );
  });

  // POST /orders/:orderId/update-times - Mettre à jour les horaires
  app.post('/orders/:orderId/update-times', (req, res) => {
    const { orderId } = req.params;
    const { departure_time, arrival_time } = req.body;

    db.get('SELECT truck_id FROM orders WHERE id = ?', [orderId], (err, order) => {
      if (err || !order) {
        return res.status(404).json({ error: 'Commande non trouvée' });
      }

      const status = calculateStatus(departure_time, arrival_time);
      db.run(
        'UPDATE orders SET departure_time = ?, arrival_time = ?, status = ? WHERE id = ?',
        [departure_time, arrival_time, status, orderId],
        (err) => {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          updateTruckStatus(order.truck_id, () => {
            res.json({ success: true, status });
          });
        }
      );
    });
  });
});

afterAll(() => {
  return new Promise((resolve) => {
    db.close((err) => {
      if (err) console.error(err);
      if (fs.existsSync(TEST_DB)) {
        fs.unlinkSync(TEST_DB);
      }
      resolve();
    });
  });
});

// ========================================
// TC-ORDER-001 : Créer commande planifiée
// ========================================
describe('TC-ORDER-001 : Créer une commande planifiée', () => {
  test('Doit créer une commande avec dates futures', async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const tomorrowEvening = new Date(tomorrow);
    tomorrowEvening.setHours(17, 0, 0, 0);

    const response = await request(app)
      .post('/orders')
      .send({
        client_id: 1,
        origin: 'Paris',
        destination: 'Lyon',
        truck_id: 1,
        departure_time: tomorrow.toISOString(),
        arrival_time: tomorrowEvening.toISOString()
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.client_id).toBe(1);
    expect(response.body.origin).toBe('Paris');
    expect(response.body.destination).toBe('Lyon');
  });

  test('Doit rejeter si arrivée avant départ', async () => {
    const now = new Date();
    const past = new Date(now.getTime() - 1000);

    const response = await request(app)
      .post('/orders')
      .send({
        client_id: 1,
        origin: 'City A',
        destination: 'City B',
        truck_id: 1,
        departure_time: now.toISOString(),
        arrival_time: past.toISOString()
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('doit être après');
  });

  test('Doit rejeter données manquantes', async () => {
    const response = await request(app)
      .post('/orders')
      .send({
        client_id: 1,
        origin: 'A'
        // Manque destination, truck_id, etc.
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
  });
});

// ========================================
// TC-ORDER-002 : Modifier les horaires
// ========================================
describe('TC-ORDER-002 : Modifier les horaires d\'une commande', () => {
  let createdOrderId;

  beforeEach(async () => {
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const tomorrowEvening = new Date(tomorrow);
    tomorrowEvening.setHours(17, 0, 0, 0);

    const response = await request(app)
      .post('/orders')
      .send({
        client_name: 'Test Modification',
        origin: 'Paris',
        destination: 'Lyon',
        truck_id: 1,
        departure_time: tomorrow.toISOString(),
        arrival_time: tomorrowEvening.toISOString()
      });

    createdOrderId = response.body.id;
  });

  test('Doit modifier les horaires d\'une commande', async () => {
    const newDeparture = new Date();
    newDeparture.setHours(10, 0, 0, 0);

    const newArrival = new Date();
    newArrival.setHours(14, 0, 0, 0);

    const response = await request(app)
      .post(`/orders/${createdOrderId}/update-times`)
      .send({
        departure_time: newDeparture.toISOString(),
        arrival_time: newArrival.toISOString()
      });

    expect(response.status).toBe(200);
    expect(response.body.success).toBe(true);
  });

  test('Doit calculer le nouveau statut après modification', async () => {
    const newDeparture = new Date();
    newDeparture.setDate(newDeparture.getDate() + 2);

    const newArrival = new Date(newDeparture);
    newArrival.setHours(newArrival.getHours() + 8);

    const response = await request(app)
      .post(`/orders/${createdOrderId}/update-times`)
      .send({
        departure_time: newDeparture.toISOString(),
        arrival_time: newArrival.toISOString()
      });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe('scheduled');
  });
});

// ========================================
// TC-ORDER-003 : Vérifier statut "en transit"
// ========================================
describe('TC-ORDER-003 : Vérifier statut "en transit"', () => {
  test('Doit avoir statut "in_transit" si entre départ et arrivée', async () => {
    const nowMinus1Hour = new Date();
    nowMinus1Hour.setHours(nowMinus1Hour.getHours() - 1);

    const nowPlus1Hour = new Date();
    nowPlus1Hour.setHours(nowPlus1Hour.getHours() + 1);

    const response = await request(app)
      .post('/orders')
      .send({
        client_name: 'Order In Transit',
        origin: 'A',
        destination: 'B',
        truck_id: 1,
        departure_time: nowMinus1Hour.toISOString(),
        arrival_time: nowPlus1Hour.toISOString()
      });

    const orderResponse = await request(app).get('/orders');
    const createdOrder = orderResponse.body.find(o => o.client_name === 'Order In Transit');

    expect(createdOrder).toBeDefined();
    expect(createdOrder.dynamic_status).toBe('in_transit');
  });
});

// ========================================
// TC-ORDER-004 : Vérifier statut "complété"
// ========================================
describe('TC-ORDER-004 : Vérifier statut "complété"', () => {
  test('Doit avoir statut "completed" si après arrivée', async () => {
    const nowMinus5Hours = new Date();
    nowMinus5Hours.setHours(nowMinus5Hours.getHours() - 5);

    const nowMinus30Minutes = new Date();
    nowMinus30Minutes.setMinutes(nowMinus30Minutes.getMinutes() - 30);

    const response = await request(app)
      .post('/orders')
      .send({
        client_name: 'Order Completed',
        origin: 'A',
        destination: 'B',
        truck_id: 1,
        departure_time: nowMinus5Hours.toISOString(),
        arrival_time: nowMinus30Minutes.toISOString()
      });

    const orderResponse = await request(app).get('/orders');
    const createdOrder = orderResponse.body.find(o => o.client_name === 'Order Completed');

    expect(createdOrder).toBeDefined();
    expect(createdOrder.dynamic_status).toBe('completed');
  });
});
