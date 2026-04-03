/**
 * Tests d'Intégration - ERP Transport
 * 
 * Fichier : tests/integration.test.js
 * Description : Tests du cycle complet (E2E)
 * 
 * Scénarios testés :
 * - TC-REG-001 : Workflow complet
 * - TC-REG-002 : Stabilité générale
 */

const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, '../test-integration.db');

const express = require('express');
const bodyParser = require('body-parser');

let app;
let db;
let calculateStatus;
let updateTruckStatus;

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
      `SELECT departure_time, arrival_time FROM orders 
       WHERE truck_id = ? AND status != 'pending' 
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
      db.run(`CREATE TABLE IF NOT EXISTS trucks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity INTEGER,
        status TEXT DEFAULT 'available'
      )`);

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

beforeAll(() => {
  // Route pour créer un camion
  app.post('/trucks', (req, res) => {
    const { name, capacity } = req.body;

    if (!name || !capacity || capacity <= 0) {
      return res.status(400).json({ error: 'Données invalides' });
    }

    db.run('INSERT INTO trucks (name, capacity) VALUES (?, ?)', [name, capacity], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.status(201).json({ id: this.lastID, name, capacity, status: 'available' });
    });
  });

  // Route pour obtenir un camion
  app.get('/trucks/:id', (req, res) => {
    db.get('SELECT * FROM trucks WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Camion non trouvé' });
      res.json(row);
    });
  });

  // Route pour créer une commande
  app.post('/orders', (req, res) => {
    const { client_name, origin, destination, truck_id, departure_time, arrival_time } = req.body;

    if (!client_name || !origin || !destination || !truck_id || !departure_time || !arrival_time) {
      return res.status(400).json({ error: 'Données invalides' });
    }

    db.run(
      'INSERT INTO orders (client_name, origin, destination, truck_id, departure_time, arrival_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [client_name, origin, destination, truck_id, departure_time, arrival_time, 'pending'],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        updateTruckStatus(truck_id, () => {
          res.status(201).json({
            id: this.lastID,
            client_name,
            origin,
            destination,
            truck_id,
            departure_time,
            arrival_time,
            status: 'pending'
          });
        });
      }
    );
  });

  // Route pour récupérer une commande
  app.get('/orders/:id', (req, res) => {
    db.get('SELECT * FROM orders WHERE id = ?', [req.params.id], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'Commande non trouvée' });
      row.dynamic_status = calculateStatus(row.departure_time, row.arrival_time);
      res.json(row);
    });
  });

  // Route pour mettre à jour les horaires
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

  // Route pour créer une facture
  app.post('/invoices/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const amount = req.body.amount;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Montant invalide' });
    }

    db.run('INSERT INTO invoices (order_id, amount) VALUES (?, ?)', [orderId, amount], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT truck_id FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (order) {
          db.run('UPDATE orders SET status = ? WHERE id = ?', ['completed', orderId], () => {
            updateTruckStatus(order.truck_id, () => {
              res.status(201).json({
                id: this.lastID,
                order_id: orderId,
                amount,
                issued_at: new Date().toISOString()
              });
            });
          });
        } else {
          res.status(201).json({
            id: this.lastID,
            order_id: orderId,
            amount,
            issued_at: new Date().toISOString()
          });
        }
      });
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
// TC-REG-001 : Cycle complet : Création → Transit → Facturation
// ========================================
describe('TC-REG-001 : Workflow complet', () => {
  test('Doit parcourir le cycle complet d\'une commande', async () => {
    // Étape 1 : Ajouter un camion
    const truckResponse = await request(app)
      .post('/trucks')
      .send({
        name: 'Volvo FH16 Integration Test',
        capacity: 5000
      });

    expect(truckResponse.status).toBe(201);
    const truckId = truckResponse.body.id;

    // Vérifier le camion est créé
    const truckCheck = await request(app).get(`/trucks/${truckId}`);
    expect(truckCheck.status).toBe(200);
    expect(truckCheck.body.status).toBe('available');

    // Étape 2 : Créer une commande planifiée
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(8, 0, 0, 0);

    const tomorrowEvening = new Date(tomorrow);
    tomorrowEvening.setHours(17, 0, 0, 0);

    const orderResponse = await request(app)
      .post('/orders')
      .send({
        client_name: 'Integration Test Client',
        origin: 'Paris',
        destination: 'Lyon',
        truck_id: truckId,
        departure_time: tomorrow.toISOString(),
        arrival_time: tomorrowEvening.toISOString()
      });

    expect(orderResponse.status).toBe(201);
    const orderId = orderResponse.body.id;
    const truckAfterOrder = await request(app).get(`/trucks/${truckId}`);
    expect(truckAfterOrder.body.status).toBe('scheduled');

    // Étape 3 : Modifier l'heure de départ (simulation du début du trajet)
    const nowMinus30Mins = new Date();
    nowMinus30Mins.setMinutes(nowMinus30Mins.getMinutes() - 30);

    const nowPlus4Hours = new Date();
    nowPlus4Hours.setHours(nowPlus4Hours.getHours() + 4);

    const updateResponse = await request(app)
      .post(`/orders/${orderId}/update-times`)
      .send({
        departure_time: nowMinus30Mins.toISOString(),
        arrival_time: nowPlus4Hours.toISOString()
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.status).toBe('in_transit');

    // Vérifier le camion est en transit
    const truckInTransit = await request(app).get(`/trucks/${truckId}`);
    expect(truckInTransit.body.status).toBe('in_transit');

    // Étape 4 : Modifier l'heure d'arrivée (simuler l'arrivée)
    const nowMinus2Hours = new Date();
    nowMinus2Hours.setHours(nowMinus2Hours.getHours() - 2);

    const nowMinus1Hour = new Date();
    nowMinus1Hour.setHours(nowMinus1Hour.getHours() - 1);

    const arrivalResponse = await request(app)
      .post(`/orders/${orderId}/update-times`)
      .send({
        departure_time: nowMinus2Hours.toISOString(),
        arrival_time: nowMinus1Hour.toISOString()
      });

    expect(arrivalResponse.status).toBe(200);
    expect(arrivalResponse.body.status).toBe('completed');

    // Étape 5 : Créer la facture
    const invoiceResponse = await request(app)
      .post(`/invoices/${orderId}`)
      .send({
        amount: 500
      });

    expect(invoiceResponse.status).toBe(201);
    expect(invoiceResponse.body.amount).toBe(500);

    // Vérifier le camion est revenu à "available"
    const truckFinal = await request(app).get(`/trucks/${truckId}`);
    expect(truckFinal.body.status).toBe('available');
  });
});

// ========================================
// TC-REG-002 : Stabilité générale
// ========================================
describe('TC-REG-002 : Stabilité générale', () => {
  test('Doit gérer plusieurs camions et commandes', async () => {
    // Créer 3 camions
    const trucks = [];
    for (let i = 0; i < 3; i++) {
      const response = await request(app)
        .post('/trucks')
        .send({
          name: `Truck ${i}`,
          capacity: 5000 + (i * 1000)
        });
      expect(response.status).toBe(201);
      trucks.push(response.body.id);
    }

    // Créer 3 commandes
    for (let i = 0; i < 3; i++) {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const tomorrowPlus8 = new Date(tomorrow);
      tomorrowPlus8.setHours(tomorrowPlus8.getHours() + 8);

      const response = await request(app)
        .post('/orders')
        .send({
          client_name: `Client ${i}`,
          origin: `City ${i}`,
          destination: `City ${i + 1}`,
          truck_id: trucks[i],
          departure_time: tomorrow.toISOString(),
          arrival_time: tomorrowPlus8.toISOString()
        });
      expect(response.status).toBe(201);
    }
  });

  test('Ne doit pas avoir d\'erreur 500 sur requêtes normales', async () => {
    const truckResponse = await request(app)
      .post('/trucks')
      .send({
        name: 'Test Error Handling',
        capacity: 5000
      });

    expect(truckResponse.status).not.toBe(500);

    if (truckResponse.body.id) {
      const getResponse = await request(app).get(`/trucks/${truckResponse.body.id}`);
      expect(getResponse.status).not.toBe(500);
    }
  });
});
