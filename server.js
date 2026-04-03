const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const bodyParser = require('body-parser');
const path = require('path');

const app = express();
const PORT = 3001;

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Database setup
const db = new sqlite3.Database('./erp.db', (err) => {
  if (err) {
    console.error(err.message);
  }
  console.log('Connected to the SQLite database.');
});

// Create tables
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
  )`);
});

// Function to calculate order and truck status based on departure and arrival times
function calculateStatus(departureTime, arrivalTime) {
  const now = new Date();
  const departure = departureTime ? new Date(departureTime) : null;
  const arrival = arrivalTime ? new Date(arrivalTime) : null;

  if (!departure) return 'pending';
  if (now < departure) return 'scheduled';
  if (now >= departure && (!arrival || now < arrival)) return 'in_transit';
  if (arrival && now >= arrival) return 'completed';
  return 'pending';
}

// Function to determine truck status based on orders
function updateTruckStatus(truckId, callback) {
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
}

// Routes
app.get('/', (req, res) => {
  res.render('index');
});

// Trucks routes
app.get('/trucks', (req, res) => {
  db.all('SELECT * FROM trucks', [], (err, rows) => {
    if (err) {
      throw err;
    }
    res.render('trucks', { trucks: rows });
  });
});

app.get('/trucks/add', (req, res) => {
  res.render('add-truck');
});

app.post('/trucks', (req, res) => {
  const { name, capacity } = req.body;
  db.run('INSERT INTO trucks (name, capacity) VALUES (?, ?)', [name, capacity], function(err) {
    if (err) {
      return console.log(err.message);
    }
    res.redirect('/trucks');
  });
});

// Orders routes
app.get('/orders', (req, res) => {
  db.all(`SELECT orders.*, trucks.name as truck_name FROM orders LEFT JOIN trucks ON orders.truck_id = trucks.id`, [], (err, rows) => {
    if (err) {
      throw err;
    }
    
    // Calculate dynamic status for each order
    const ordersWithStatus = rows.map(order => {
      order.dynamic_status = calculateStatus(order.departure_time, order.arrival_time);
      return order;
    });
    
    res.render('orders', { orders: ordersWithStatus });
  });
});

app.get('/orders/add', (req, res) => {
  db.all('SELECT * FROM trucks', [], (err, trucks) => {
    res.render('add-order', { trucks });
  });
});

app.post('/orders', (req, res) => {
  const { client_name, origin, destination, truck_id, departure_time, arrival_time } = req.body;
  
  db.run(
    'INSERT INTO orders (client_name, origin, destination, truck_id, departure_time, arrival_time, status) VALUES (?, ?, ?, ?, ?, ?, ?)', 
    [client_name, origin, destination, truck_id, departure_time, arrival_time, 'pending'], 
    function(err) {
      if (err) {
        return console.log(err.message);
      }
      
      // Update truck status based on the new order
      updateTruckStatus(truck_id, () => {
        res.redirect('/orders');
      });
    }
  );
});

// Invoices routes
app.get('/invoices', (req, res) => {
  db.all(`SELECT invoices.*, orders.client_name FROM invoices JOIN orders ON invoices.order_id = orders.id`, [], (err, rows) => {
    if (err) {
      throw err;
    }
    res.render('invoices', { invoices: rows });
  });
});

app.post('/invoices/:orderId', (req, res) => {
  const orderId = req.params.orderId;
  const amount = req.body.amount;
  db.run('INSERT INTO invoices (order_id, amount) VALUES (?, ?)', [orderId, amount], function(err) {
    if (err) {
      return console.log(err.message);
    }
    
    // Mark order as completed
    db.get('SELECT truck_id FROM orders WHERE id = ?', [orderId], (err, order) => {
      if (order) {
        db.run('UPDATE orders SET status = ? WHERE id = ?', ['completed', orderId], () => {
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

// Update order times
app.post('/orders/:orderId/update-times', (req, res) => {
  const { orderId } = req.params;
  const { departure_time, arrival_time } = req.body;
  
  db.get('SELECT truck_id FROM orders WHERE id = ?', [orderId], (err, order) => {
    if (err || !order) return res.redirect('/orders');
    
    // Update order times and status
    const status = calculateStatus(departure_time, arrival_time);
    db.run(
      'UPDATE orders SET departure_time = ?, arrival_time = ?, status = ? WHERE id = ?',
      [departure_time, arrival_time, status, orderId],
      () => {
        updateTruckStatus(order.truck_id, () => {
          res.redirect('/orders');
        });
      }
    );
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});