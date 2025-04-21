require("dotenv").config()
const pg = require("pg");
const express = require("express");
const app = express();
const { Pool } = require("pg");
const multer = require("multer");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const JWT_SECRET = process.env.JWT || "shhh";
if (JWT_SECRET === "shhh") {
  console.log("If deployed, set process.env.JWT to something other than shhh");
}


const pool = new Pool({
  //connectionString: process.env.DATABASE_URL ||  'postgres://postgres:milaniwhite@localhost/career_simulation/',
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


module.exports = { 
  db: pool
};

const upload = multer({ dest: "uploads/" });
app.use(express.json());

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
 
  const token = authHeader && authHeader.split(' ')[1];
  console.log("token", token );
  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }
  const secret = process.env.JWT_SECRET || 'shhh';
  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid or expired token' });
    req.user = user;
    next();
  });

};

// Authentication Routes
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password, full_name, country = 'Unknown' } = req.body;

    // Check if user exists
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1 OR username = $2',
      [email, username]
    );

    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      `INSERT INTO users (username, email, password_hash, full_name)
       VALUES ($1, $2, $3, $4)
       RETURNING id, username, email, full_name;`,
      [username, email, hashedPassword, full_name]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Server error', details: err.message });
  }
});

app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1;',
      [email]
    );

    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const validPassword = await bcrypt.compare(password, user.password_hash);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email },
      process.env.JWT_SECRET || "shhh",
      { expiresIn: '24h' }
    ); console.log('JWT Secret:', process.env.JWT_SECRET ? 'Is set' : 'Not set');

  

    res.json(token);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// User Routes
app.get('/api/users/profile', authenticateToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      'SELECT id, username, email, full_name, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});
// ITEM ROUTES

// Create a new item
app.post('/api/items', authenticateToken, async (req, res) => {
  try {
    const { name, description, category_id, address, website_url, phone_number, image_url } = req.body;
    const created_by = req.user.id;

    const result = await pool.query(
      `INSERT INTO items (
        name, description, category_id, address, website_url, phone_number, created_by
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *`,
      [name, description, category_id, address, website_url, phone_number, created_by]
    );

    // Add image if provided
    if (image_url) {
      await pool.query(
        `INSERT INTO item_images (item_id, image_url, is_primary)
         VALUES ($1, $2, true)`,
        [result.rows[0].id, image_url]
      );
    }

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create item' });
  }
});

// Get all items with search
app.get('/api/items', async (req, res) => {
  try {
    const { search } = req.query;
    let query = `
      SELECT 
        i.*, 
        (SELECT image_url FROM item_images WHERE item_id = i.id AND is_primary = true LIMIT 1) as image_url,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
      FROM items i
      LEFT JOIN reviews r ON r.item_id = i.id
      WHERE i.is_approved = true
    `;
    const params = [];

    if (search) {
      query += ` AND (i.name ILIKE $1 OR i.description ILIKE $1)`;
      params.push(`%${search}%`);
    }

    query += ` GROUP BY i.id ORDER BY i.created_at DESC`;

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch items' });
  }
});

// Get single item with details
app.get('/api/items/:id', async (req, res) => {
  try {
    const itemId = req.params.id;

    // Get item details
    const itemResult = await pool.query(
      `SELECT 
        i.*, 
        u.username as created_by_username,
        COALESCE(AVG(r.rating), 0) as average_rating,
        COUNT(r.id) as review_count
       FROM items i
       LEFT JOIN users u ON i.created_by = u.id
       LEFT JOIN reviews r ON r.item_id = i.id
       WHERE i.id = $1
       GROUP BY i.id, u.username`,
      [itemId]
    );

    if (itemResult.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    // Get item images
    const imagesResult = await pool.query(
      `SELECT * FROM item_images WHERE item_id = $1`,
      [itemId]
    );

    // Get recent reviews
    const reviewsResult = await pool.query(
      `SELECT 
        r.*, 
        u.username as user_username
       FROM reviews r
       JOIN users u ON r.user_id = u.id
       WHERE r.item_id = $1
       ORDER BY r.created_at DESC
       LIMIT 5`,
      [itemId]
    );

    res.json({
      ...itemResult.rows[0],
      images: imagesResult.rows,
      reviews: reviewsResult.rows
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch item details' });
  }
});

// Update an item
app.put('/api/items/:id', authenticateToken, async (req, res) => {
  try {
    const itemId = req.params.id;
    const { name, description, category_id, address, website_url, phone_number } = req.body;
    const userId = req.user.id;

    // Verify user owns the item
    const ownershipCheck = await pool.query(
      `SELECT created_by FROM items WHERE id = $1`,
      [itemId]
    );

    if (ownershipCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (ownershipCheck.rows[0].created_by !== userId) {
      return res.status(403).json({ error: 'Not authorized to update this item' });
    }

    const result = await pool.query(
      `UPDATE items
       SET name = $1, description = $2, category_id = $3, 
           address = $4, website_url = $5, phone_number = $6,
           updated_at = NOW()
       WHERE id = $7
       RETURNING *`,
      [name, description, category_id, address, website_url, phone_number, itemId]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to update item' });
  }
});


// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something broke!' });
});

const init = async () => {
  try {
    const seed = require('./db/seed');
    await seed();
    
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize application:', err);
    process.exit(1);
  }
};


init();