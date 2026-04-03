const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./erp.db', (err) => {
  if (err) {
    console.error('Erreur de connexion:', err.message);
    process.exit(1);
  }
  console.log('Connecté pour migration des colonnes temporelles.');
});

db.serialize(() => {
  // Vérifier si les colonnes departure_time et arrival_time existent
  db.all("PRAGMA table_info(orders)", [], (err, columns) => {
    if (err) {
      console.error('Erreur:', err);
      return;
    }

    const hasDepartureTime = columns.some(col => col.name === 'departure_time');
    const hasArrivalTime = columns.some(col => col.name === 'arrival_time');
    const cargoDescription = columns.some(col => col.name === 'cargo_description');
    const weight = columns.some(col => col.name === 'weight');

    console.log('Colonnes actuelles:', columns.map(c => c.name));

    if (hasDepartureTime && hasArrivalTime && cargoDescription && weight) {
      console.log('✅ Colonnes departure_time, arrival_time, cargo_description et weight déjà présentes.');
      db.close();
      return;
    }

    console.log('Ajout des colonnes manquantes...');

    // Ajouter departure_time si elle n'existe pas
    if (!hasDepartureTime) {
      db.run("ALTER TABLE orders ADD COLUMN departure_time DATETIME", (err) => {
        if (err) {
          console.error('Erreur ajout departure_time:', err);
          return;
        }
        console.log('✅ Colonne departure_time ajoutée.');
      });
    }

    // Ajouter arrival_time si elle n'existe pas
    if (!hasArrivalTime) {
      db.run("ALTER TABLE orders ADD COLUMN arrival_time DATETIME", (err) => {
        if (err) {
          console.error('Erreur ajout arrival_time:', err);
          return;
        }
        console.log('✅ Colonne arrival_time ajoutée.');
      });
    }

    // Ajouter cargo_description si elle n'existe pas
    if (!cargoDescription) {
      db.run("ALTER TABLE orders ADD COLUMN cargo_description TEXT", (err) => {
        if (err) {
          console.error('Erreur ajout cargo_description:', err);
          return;
        }
        console.log('✅ Colonne cargo_description ajoutée.');
      });
    }

    // Ajouter weight si elle n'existe pas
    if (!weight) {
      db.run("ALTER TABLE orders ADD COLUMN weight REAL", (err) => {
        if (err) {
          console.error('Erreur ajout weight:', err);
          return;
        }
        console.log('✅ Colonne weight ajoutée.');
      });
    }

    console.log('✅ Migration des colonnes temporelles terminée!');
    db.close();
  });
});