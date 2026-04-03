const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./erp.db', (err) => {
  if (err) {
    console.error('Erreur de connexion:', err.message);
    process.exit(1);
  }
  console.log('Connecté pour migration.');
});

db.serialize(() => {
  // Vérifier le schéma actuel
  db.all("PRAGMA table_info(orders)", [], (err, columns) => {
    if (err) {
      console.error('Erreur:', err);
      return;
    }

    const hasClientId = columns.some(col => col.name === 'client_id');
    const hasClientName = columns.some(col => col.name === 'client_name');

    console.log('Colonnes:', columns.map(c => c.name));

    if (hasClientId && !hasClientName) {
      console.log('✅ Migration déjà effectuée.');
      db.close();
      return;
    }

    if (hasClientId && hasClientName) {
      // Finaliser la migration
      console.log('Finalisation...');

      db.run(`
        UPDATE orders
        SET client_id = (SELECT id FROM clients WHERE clients.name = orders.client_name)
        WHERE client_name IS NOT NULL AND client_id IS NULL
      `, (err) => {
        if (err) {
          console.error('Erreur update:', err);
          return;
        }

        // Supprimer la colonne client_name
        db.run("DROP TABLE IF EXISTS orders_new", () => {
          db.run(`
            CREATE TABLE orders_new (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              client_id INTEGER,
              origin TEXT,
              destination TEXT,
              truck_id INTEGER,
              status TEXT DEFAULT 'pending',
              created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
              FOREIGN KEY (client_id) REFERENCES clients (id),
              FOREIGN KEY (truck_id) REFERENCES trucks (id)
            )
          `, () => {
            db.run(`
              INSERT INTO orders_new (id, client_id, origin, destination, truck_id, status, created_at)
              SELECT id, client_id, origin, destination, truck_id, status, created_at
              FROM orders
            `, () => {
              db.run("DROP TABLE orders", () => {
                db.run("ALTER TABLE orders_new RENAME TO orders", () => {
                  console.log('✅ Migration terminée!');
                  db.close();
                });
              });
            });
          });
        });
      });
    } else {
      console.log('❌ État inattendu de la base de données');
      db.close();
    }
  });
});