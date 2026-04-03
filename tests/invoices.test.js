/**
 * Tests - Module Facturation
 *
 * Fichier : tests/invoices.test.js
 * Description : Tests des cas d'usage pour la facturation
 *
 * Cas de test couverts :
 * - TC-INVOICE-001 : Créer une facture
 * - TC-INVOICE-002 : Afficher toutes les factures
 */

const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, '../test-invoices.db');

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
      db.run(`CREATE TABLE IF NOT EXISTS clients (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        contact_person TEXT,
        email TEXT,
        phone TEXT,
        address TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`);

      db.run(`CREATE TABLE IF NOT EXISTS trucks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        capacity INTEGER,
        status TEXT DEFAULT 'available'
      )`);

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
        db.run('INSERT INTO clients (name, contact_person, email) VALUES (?, ?, ?)',
          ['Client Test', 'Jean Dupont', 'jean@test.com'], () => {
          db.run('INSERT INTO trucks (name, capacity) VALUES (?, ?)', ['Test Truck', 5000], () => {
            db.run('INSERT INTO orders (client_id, origin, destination, truck_id, departure_time, arrival_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)',
              [1, 'Paris', 'Lyon', 1, '2024-01-01 10:00:00', '2024-01-01 14:00:00', 'completed'], () => {
              resolve();
            });
          });
        });
      });
    });
  });
});

beforeAll(() => {
  app.get('/invoices', (req, res) => {
    db.all(`SELECT invoices.*, orders.origin, orders.destination, clients.name as client_name
            FROM invoices
            JOIN orders ON invoices.order_id = orders.id
            JOIN clients ON orders.client_id = clients.id`, [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  const generateInvoiceNumber = () => {
    const year = new Date().getFullYear();
    const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
    return `${year}-${random}`;
  };

  app.post('/invoices/:orderId', (req, res) => {
    const orderId = req.params.orderId;
    const { amount_ht, tva_rate = 20.0 } = req.body;

    if (!amount_ht || amount_ht <= 0) {
      return res.status(400).json({ error: 'Montant HT doit être positif' });
    }

    const tva_amount = amount_ht * (tva_rate / 100);
    const amount_ttc = amount_ht + tva_amount;
    const invoice_number = generateInvoiceNumber();

    db.run('INSERT INTO invoices (invoice_number, order_id, amount_ht, tva_rate, tva_amount, amount_ttc) VALUES (?, ?, ?, ?, ?, ?)',
      [invoice_number, orderId, amount_ht, tva_rate, tva_amount, amount_ttc], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      db.get('SELECT truck_id FROM orders WHERE id = ?', [orderId], (err, order) => {
        if (order) {
          db.run('UPDATE orders SET status = ? WHERE id = ?', ['completed', orderId], () => {
            updateTruckStatus(order.truck_id, () => {
              res.status(201).json({
                id: parseInt(this.lastID),
                invoice_number,
                order_id: parseInt(orderId),
                amount_ht: parseFloat(amount_ht),
                tva_rate: parseFloat(tva_rate),
                tva_amount: parseFloat(tva_amount),
                amount_ttc: parseFloat(amount_ttc),
                issued_at: new Date().toISOString()
              });
            });
          });
        } else {
          res.status(201).json({
            id: parseInt(this.lastID),
            invoice_number,
            order_id: parseInt(orderId),
            amount_ht: parseFloat(amount_ht),
            tva_rate: parseFloat(tva_rate),
            tva_amount: parseFloat(tva_amount),
            amount_ttc: parseFloat(amount_ttc),
            issued_at: new Date().toISOString()
          });
        }
      });
    });
  });
});

afterAll((done) => {
  if (db) {
    db.close((err) => {
      if (err) {
        console.error('Erreur lors de la fermeture de la base de données:', err);
      }
      if (fs.existsSync(TEST_DB)) {
        fs.unlinkSync(TEST_DB);
      }
      done();
    });
  } else {
    done();
  }
});

// ========================================
// TC-INVOICE-001 : Créer une facture
// ========================================
describe('TC-INVOICE-001 : Créer une facture', () => {
  test('Doit créer une facture avec montant HT', async () => {
    const response = await request(app)
      .post('/invoices/1')
      .send({
        amount_ht: 500
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body).toHaveProperty('invoice_number');
    expect(response.body.order_id).toBe(1);
    expect(response.body.amount_ht).toBe(500);
    expect(response.body.tva_rate).toBe(20.0);
    expect(response.body.tva_amount).toBe(100);
    expect(response.body.amount_ttc).toBe(600);
    expect(response.body).toHaveProperty('issued_at');
  });

  test('Doit rejeter montant HT zéro', async () => {
    const response = await request(app)
      .post('/invoices/1')
      .send({
        amount_ht: 0
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('positif');
  });

  test('Doit rejeter montant HT négatif', async () => {
    const response = await request(app)
      .post('/invoices/1')
      .send({
        amount_ht: -100
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('positif');
  });

  test('Doit accepter montant HT avec décimales', async () => {
    const response = await request(app)
      .post('/invoices/1')
      .send({
        amount_ht: 100.50
      });

    expect(response.status).toBe(201);
    expect(response.body.amount_ht).toBe(100.50);
    expect(response.body.tva_amount).toBe(20.1);
    expect(response.body.amount_ttc).toBe(120.6);
  });
});

// ========================================
// TC-INVOICE-002 : Afficher toutes les factures
// ========================================
describe('TC-INVOICE-002 : Afficher toutes les factures', () => {
  test('Doit retourner un tableau de factures', async () => {
    await request(app)
      .post('/invoices/1')
      .send({
        amount_ht: 250
      });

    const response = await request(app).get('/invoices');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Chaque facture doit avoir les propriétés requises', async () => {
    const response = await request(app).get('/invoices');

    expect(response.status).toBe(200);

    if (response.body.length > 0) {
      response.body.forEach(invoice => {
        expect(invoice).toHaveProperty('id');
        expect(invoice).toHaveProperty('invoice_number');
        expect(invoice).toHaveProperty('order_id');
        expect(invoice).toHaveProperty('amount_ht');
        expect(invoice).toHaveProperty('tva_rate');
        expect(invoice).toHaveProperty('tva_amount');
        expect(invoice).toHaveProperty('amount_ttc');
        expect(invoice).toHaveProperty('issued_at');
        expect(invoice).toHaveProperty('client_name');
      });
    }
  });

  test('Doit inclure le nom du client', async () => {
    const response = await request(app).get('/invoices');

    expect(response.status).toBe(200);

    if (response.body.length > 0) {
      const hasClientName = response.body.every(inv => inv.client_name);
      expect(hasClientName).toBe(true);
    }
  });
});

// ========================================
// Scénario complet : Créer → Facturer
// ========================================
describe('Scénario complet : Créer commande et facturer', () => {
  test('Doit complèter le cycle complet', async () => {
    const invoiceResponse = await request(app)
      .post('/invoices/1')
      .send({
        amount_ht: 450.75
      });

    expect(invoiceResponse.status).toBe(201);
    expect(invoiceResponse.body.amount_ht).toBe(450.75);
    expect(invoiceResponse.body.amount_ttc).toBe(540.9);

    const listResponse = await request(app).get('/invoices');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.length).toBeGreaterThan(0);
  });
});