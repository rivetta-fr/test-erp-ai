const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./erp.db', (err) => {
  if (err) {
    console.error('Erreur de connexion:', err.message);
    process.exit(1);
  }
  console.log('Connecté pour migration des colonnes temporelles.');
});

db.serialize(() => {
  // Vérifier si les colonnes license_plate et capacity existent
  db.all("PRAGMA table_info(trucks)", [], (err, columns) => {
    if (err) {
      console.error('Erreur:', err);
      return;
    }
    
    const license_plate = columns.some(col => col.name === 'license_plate');
    const capacity = columns.some(col => col.name === 'capacity');

    console.log('Colonnes actuelles:', columns.map(c => c.name));

    if (license_plate && capacity) {
      console.log('✅ Colonnes license_plate et capacity déjà présentes.');
      db.close();
      return;
    }

    console.log('Ajout des colonnes manquantes...');

    // Ajouter license_plate si elle n'existe pas
    if (!license_plate) {
      db.run("ALTER TABLE trucks ADD COLUMN license_plate TEXT", (err) => {
        if (err) {
          console.error('Erreur ajout license_plate:', err);
          return;
        }
        console.log('✅ Colonne license_plate ajoutée.');
      });
    }

    // Ajouter capacity si elle n'existe pas
    if (!capacity) {
      db.run("ALTER TABLE trucks ADD COLUMN capacity REAL", (err) => {
        if (err) {
          console.error('Erreur ajout capacity:', err);
          return;
        }
        console.log('✅ Colonne capacity ajoutée.');
      });
    }

    console.log('✅ Migration des colonnes temporelles terminée!');
    db.close();
  });
});