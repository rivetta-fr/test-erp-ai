const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./erp.db', (err) => {
  if (err) {
    console.error('Erreur de connexion:', err.message);
    process.exit(1);
  }
  console.log('Connecté pour migration des factures.');
});

db.serialize(() => {
  // Vérifier le schéma actuel de la table invoices
  db.all("PRAGMA table_info(invoices)", [], (err, columns) => {
    if (err) {
      console.error('Erreur:', err);
      return;
    }

    const hasInvoiceNumber = columns.some(col => col.name === 'invoice_number');
    const hasAmountHt = columns.some(col => col.name === 'amount_ht');

    console.log('Colonnes actuelles invoices:', columns.map(c => c.name));

    if (hasInvoiceNumber && hasAmountHt) {
      console.log('✅ Migration des factures déjà effectuée.');
      db.close();
      return;
    }

    // Migrer la table invoices
    console.log('Migration de la table invoices...');

    // Créer la nouvelle table invoices
    db.run("DROP TABLE IF EXISTS invoices_new", () => {
      db.run(`
        CREATE TABLE invoices_new (
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
        )
      `, () => {
        // Migrer les données existantes
        // amount (ancien) -> amount_ht (nouveau)
        // Générer invoice_number pour les factures existantes
        db.all("SELECT * FROM invoices", [], (err, rows) => {
          if (err) {
            console.error('Erreur lors de la récupération des factures:', err);
            return;
          }

          if (rows.length === 0) {
            console.log('Aucune facture à migrer.');
            finalizeMigration();
            return;
          }

          let processed = 0;
          rows.forEach((invoice) => {
            // Générer un numéro de facture
            const year = new Date().getFullYear();
            const random = Math.floor(Math.random() * 100000).toString().padStart(5, '0');
            const invoiceNumber = `${year}-${random}`;

            // Calculer les montants TVA (on suppose que l'ancien amount était TTC avec 20% TVA)
            const amountHt = invoice.amount / 1.2; // Retirer la TVA
            const tvaAmount = amountHt * 0.2; // 20% TVA
            const amountTtc = invoice.amount;

            db.run(`
              INSERT INTO invoices_new (id, invoice_number, order_id, amount_ht, tva_rate, tva_amount, amount_ttc, status, issued_at)
              VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
              invoice.id,
              invoiceNumber,
              invoice.order_id,
              amountHt,
              20.0,
              tvaAmount,
              amountTtc,
              'pending',
              invoice.issued_at
            ], (err) => {
              if (err) {
                console.error(`Erreur migration facture ${invoice.id}:`, err);
              }

              processed++;
              if (processed === rows.length) {
                finalizeMigration();
              }
            });
          });
        });
      });
    });
  });

  function finalizeMigration() {
    // Remplacer l'ancienne table
    db.run("DROP TABLE invoices", (err) => {
      if (err) {
        console.error('Erreur suppression ancienne table:', err);
        return;
      }

      db.run("ALTER TABLE invoices_new RENAME TO invoices", (err) => {
        if (err) {
          console.error('Erreur renommage table:', err);
          return;
        }

        // Vérifier la migration
        db.get("SELECT COUNT(*) as count FROM invoices", [], (err, row) => {
          if (err) {
            console.error('Erreur vérification:', err);
            return;
          }

          console.log(`✅ Migration des factures terminée! ${row.count} factures migrées.`);

          // Aperçu des données migrées
          db.all("SELECT id, invoice_number, amount_ht, tva_amount, amount_ttc FROM invoices LIMIT 3", [], (err, rows) => {
            if (err) {
              console.error('Erreur aperçu:', err);
            } else {
              console.log('Aperçu des factures migrées:');
              rows.forEach(row => {
                console.log(`  Facture ${row.id}: ${row.invoice_number} - HT:${row.amount_ht?.toFixed(2)} TVA:${row.tva_amount?.toFixed(2)} TTC:${row.amount_ttc?.toFixed(2)}`);
              });
            }

            db.close((err) => {
              if (err) {
                console.error('Erreur fermeture:', err);
              } else {
                console.log('Migration terminée.');
              }
            });
          });
        });
      });
    });
  }
});