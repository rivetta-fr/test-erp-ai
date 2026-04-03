/**
 * Tests - Module Gestion des Clients
 *
 * Fichier : tests/clients.test.js
 * Description : Tests des cas d'usage pour la gestion des clients
 *
 * Cas de test couverts :
 * - TC-CLIENT-001 : Créer un client
 * - TC-CLIENT-002 : Afficher tous les clients
 * - TC-CLIENT-003 : Afficher un client spécifique
 * - TC-CLIENT-004 : Modifier un client
 * - TC-CLIENT-005 : Supprimer un client
 */

const request = require('supertest');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const TEST_DB = path.join(__dirname, '../test-clients.db');

const express = require('express');
const bodyParser = require('body-parser');

let app;
let db;

beforeAll(() => {
  if (fs.existsSync(TEST_DB)) {
    fs.unlinkSync(TEST_DB);
  }

  app = express();
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(bodyParser.json());
  app.set('view engine', 'ejs');

  db = new sqlite3.Database(TEST_DB);

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
      )`, () => {
        resolve();
      });
    });
  });
});

beforeAll(() => {
  // GET /clients - Liste tous les clients
  app.get('/clients', (req, res) => {
    db.all('SELECT * FROM clients ORDER BY name', [], (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      res.json(rows);
    });
  });

  // GET /clients/:id - Afficher un client spécifique
  app.get('/clients/:id', (req, res) => {
    const { id } = req.params;
    db.get('SELECT * FROM clients WHERE id = ?', [id], (err, row) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      if (!row) {
        return res.status(404).json({ error: 'Client non trouvé' });
      }
      res.json(row);
    });
  });

  // POST /clients - Créer un client
  app.post('/clients', (req, res) => {
    const { name, contact_person, email, phone, address } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom du client est requis' });
    }

    db.run(
      'INSERT INTO clients (name, contact_person, email, phone, address) VALUES (?, ?, ?, ?, ?)',
      [name.trim(), contact_person, email, phone, address],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        res.status(201).json({
          id: this.lastID,
          name: name.trim(),
          contact_person,
          email,
          phone,
          address,
          created_at: new Date().toISOString()
        });
      }
    );
  });

  // PUT /clients/:id - Modifier un client
  app.put('/clients/:id', (req, res) => {
    const { id } = req.params;
    const { name, contact_person, email, phone, address } = req.body;

    // Validation
    if (!name || name.trim() === '') {
      return res.status(400).json({ error: 'Le nom du client est requis' });
    }

    db.run(
      'UPDATE clients SET name = ?, contact_person = ?, email = ?, phone = ?, address = ? WHERE id = ?',
      [name.trim(), contact_person, email, phone, address, id],
      function(err) {
        if (err) {
          return res.status(500).json({ error: err.message });
        }

        if (this.changes === 0) {
          return res.status(404).json({ error: 'Client non trouvé' });
        }

        res.json({
          id: parseInt(id),
          name: name.trim(),
          contact_person,
          email,
          phone,
          address
        });
      }
    );
  });

  // DELETE /clients/:id - Supprimer un client
  app.delete('/clients/:id', (req, res) => {
    const { id } = req.params;

    db.run('DELETE FROM clients WHERE id = ?', [id], function(err) {
      if (err) {
        return res.status(500).json({ error: err.message });
      }

      if (this.changes === 0) {
        return res.status(404).json({ error: 'Client non trouvé' });
      }

      res.status(204).send();
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
// TC-CLIENT-001 : Créer un client
// ========================================
describe('TC-CLIENT-001 : Créer un client', () => {
  test('Doit créer un client avec toutes les informations', async () => {
    const response = await request(app)
      .post('/clients')
      .send({
        name: 'Entreprise ABC',
        contact_person: 'Jean Dupont',
        email: 'jean@abc.com',
        phone: '01 23 45 67 89',
        address: '123 Rue de la Paix, 75001 Paris'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('id');
    expect(response.body.name).toBe('Entreprise ABC');
    expect(response.body.contact_person).toBe('Jean Dupont');
    expect(response.body.email).toBe('jean@abc.com');
    expect(response.body.phone).toBe('01 23 45 67 89');
    expect(response.body.address).toBe('123 Rue de la Paix, 75001 Paris');
    expect(response.body).toHaveProperty('created_at');
  });

  test('Doit créer un client avec seulement le nom requis', async () => {
    const response = await request(app)
      .post('/clients')
      .send({
        name: 'Client Minimal'
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Client Minimal');
    expect(response.body.contact_person).toBeUndefined();
    expect(response.body.email).toBeUndefined();
  });

  test('Doit rejeter création sans nom', async () => {
    const response = await request(app)
      .post('/clients')
      .send({
        contact_person: 'Jean Dupont'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('requis');
  });

  test('Doit rejeter création avec nom vide', async () => {
    const response = await request(app)
      .post('/clients')
      .send({
        name: '   ',
        contact_person: 'Jean Dupont'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('requis');
  });

  test('Doit trimmer le nom du client', async () => {
    const response = await request(app)
      .post('/clients')
      .send({
        name: '  Client avec espaces  ',
        contact_person: 'Jean Dupont'
      });

    expect(response.status).toBe(201);
    expect(response.body.name).toBe('Client avec espaces');
  });
});

// ========================================
// TC-CLIENT-002 : Afficher tous les clients
// ========================================
describe('TC-CLIENT-002 : Afficher tous les clients', () => {
  beforeAll(async () => {
    // Créer quelques clients de test
    await request(app).post('/clients').send({ name: 'Client A' });
    await request(app).post('/clients').send({ name: 'Client B' });
    await request(app).post('/clients').send({ name: 'Client C' });
  });

  test('Doit retourner un tableau de clients', async () => {
    const response = await request(app).get('/clients');

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
    expect(response.body.length).toBeGreaterThanOrEqual(3);
  });

  test('Chaque client doit avoir les propriétés requises', async () => {
    const response = await request(app).get('/clients');

    expect(response.status).toBe(200);

    response.body.forEach(client => {
      expect(client).toHaveProperty('id');
      expect(client).toHaveProperty('name');
      expect(client).toHaveProperty('created_at');
      expect(typeof client.name).toBe('string');
      expect(client.name.trim()).toBe(client.name); // Pas d'espaces de début/fin
    });
  });

  test('Les clients doivent être triés par nom', async () => {
    const response = await request(app).get('/clients');

    expect(response.status).toBe(200);

    const names = response.body.map(client => client.name);
    const sortedNames = [...names].sort();

    expect(names).toEqual(sortedNames);
  });
});

// ========================================
// TC-CLIENT-003 : Afficher un client spécifique
// ========================================
describe('TC-CLIENT-003 : Afficher un client spécifique', () => {
  let clientId;

  beforeAll(async () => {
    // Créer un client de test
    const response = await request(app)
      .post('/clients')
      .send({
        name: 'Client Spécifique',
        contact_person: 'Marie Martin',
        email: 'marie@test.com'
      });

    clientId = response.body.id;
  });

  test('Doit retourner un client spécifique', async () => {
    const response = await request(app).get(`/clients/${clientId}`);

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(clientId);
    expect(response.body.name).toBe('Client Spécifique');
    expect(response.body.contact_person).toBe('Marie Martin');
    expect(response.body.email).toBe('marie@test.com');
  });

  test('Doit retourner 404 pour un client inexistant', async () => {
    const response = await request(app).get('/clients/99999');

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('non trouvé');
  });

  test('Doit gérer les IDs invalides', async () => {
    const response = await request(app).get('/clients/invalid');

    expect(response.status).toBe(404);
  });
});

// ========================================
// TC-CLIENT-004 : Modifier un client
// ========================================
describe('TC-CLIENT-004 : Modifier un client', () => {
  let clientId;

  beforeAll(async () => {
    // Créer un client de test
    const response = await request(app)
      .post('/clients')
      .send({
        name: 'Client Original',
        contact_person: 'Jean Original',
        email: 'jean@original.com'
      });

    clientId = response.body.id;
  });

  test('Doit modifier toutes les informations du client', async () => {
    const response = await request(app)
      .put(`/clients/${clientId}`)
      .send({
        name: 'Client Modifié',
        contact_person: 'Marie Modifiée',
        email: 'marie@modifie.com',
        phone: '02 34 56 78 90',
        address: '456 Rue Modifiée, 75002 Paris'
      });

    expect(response.status).toBe(200);
    expect(response.body.id).toBe(clientId);
    expect(response.body.name).toBe('Client Modifié');
    expect(response.body.contact_person).toBe('Marie Modifiée');
    expect(response.body.email).toBe('marie@modifie.com');
    expect(response.body.phone).toBe('02 34 56 78 90');
    expect(response.body.address).toBe('456 Rue Modifiée, 75002 Paris');
  });

  test('Doit modifier seulement le nom', async () => {
    const response = await request(app)
      .put(`/clients/${clientId}`)
      .send({
        name: 'Nouveau Nom'
      });

    expect(response.status).toBe(200);
    expect(response.body.name).toBe('Nouveau Nom');
  });

  test('Doit rejeter modification sans nom', async () => {
    const response = await request(app)
      .put(`/clients/${clientId}`)
      .send({
        contact_person: 'Nouveau Contact'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toContain('requis');
  });

  test('Doit retourner 404 pour un client inexistant', async () => {
    const response = await request(app)
      .put('/clients/99999')
      .send({
        name: 'Client Inexistant'
      });

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('non trouvé');
  });
});

// ========================================
// TC-CLIENT-005 : Supprimer un client
// ========================================
describe('TC-CLIENT-005 : Supprimer un client', () => {
  let clientId;

  beforeAll(async () => {
    // Créer un client de test
    const response = await request(app)
      .post('/clients')
      .send({
        name: 'Client à Supprimer'
      });

    clientId = response.body.id;
  });

  test('Doit supprimer un client existant', async () => {
    const deleteResponse = await request(app).delete(`/clients/${clientId}`);

    expect(deleteResponse.status).toBe(204);

    // Vérifier que le client n'existe plus
    const getResponse = await request(app).get(`/clients/${clientId}`);
    expect(getResponse.status).toBe(404);
  });

  test('Doit retourner 404 pour un client inexistant', async () => {
    const response = await request(app).delete('/clients/99999');

    expect(response.status).toBe(404);
    expect(response.body.error).toContain('non trouvé');
  });
});