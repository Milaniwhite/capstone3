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
  ssl: {
    rejectUnauthorized: false, 
  },
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
    return res.status(401).json({ error: 'Please login to continue' });
  }
  const secret = process.env.JWT_SECRET || 'shhh';
  jwt.verify(token, secret, (err, user) => {
    if (err) return res.status(403).json({ error: 'Please login to continue' });
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

app.get('/api/items/:id/reviews', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT r.*, u.username 
       FROM reviews r JOIN users u ON r.user_id = u.id 
       WHERE r.item_id = $1 ORDER BY r.created_at DESC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/items/:id/reviews', authenticateToken, async (req, res) => {
  try {
    const { id: itemId } = req.params;
    const { rating, content } = req.body;
    const userId = req.user.id;

    // Check for existing review
    const existing = await pool.query(
      'SELECT id FROM reviews WHERE item_id = $1 AND user_id = $2',
      [itemId, userId]
    );

    if (existing.rows.length > 0) {
      // Update existing
      const result = await pool.query(
        `UPDATE reviews SET rating = $1, content = $2, updated_at = NOW()
         WHERE id = $3 RETURNING *`,
        [rating, content, existing.rows[0].id]
      );
      return res.json(result.rows[0]);
    }

    // Create new
    const result = await pool.query(
      `INSERT INTO reviews (user_id, item_id, rating, content)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [userId, itemId, rating, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Review not found or not owned by user' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// COMMENT ROUTES
app.get('/api/reviews/:id/comments', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT c.*, u.username 
       FROM review_comments c JOIN users u ON c.user_id = u.id
       WHERE c.review_id = $1 ORDER BY c.created_at ASC`,
      [id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/reviews/:id/comments', authenticateToken, async (req, res) => {
  try {
    const { id: reviewId } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `INSERT INTO review_comments (user_id, review_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [userId, reviewId, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { content } = req.body;
    const userId = req.user.id;

    const result = await pool.query(
      `UPDATE review_comments SET content = $1 
       WHERE id = $2 AND user_id = $3 RETURNING *`,
      [content, id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not owned by user' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/comments/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user.id;

    const result = await pool.query(
      'DELETE FROM review_comments WHERE id = $1 AND user_id = $2 RETURNING id',
      [id, userId]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Comment not found or not owned by user' });
    }

    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// USER CONTENT ROUTES
app.get('/api/users/reviews', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT r.*, i.name as item_name, i.id as item_id 
       FROM reviews r JOIN items i ON r.item_id = i.id
       WHERE r.user_id = $1 ORDER BY r.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/users/comments', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT c.*, r.id as review_id, i.name as item_name, i.id as item_id
       FROM review_comments c
       JOIN reviews r ON c.review_id = r.id
       JOIN items i ON r.item_id = i.id
       WHERE c.user_id = $1 ORDER BY c.created_at DESC`,
      [userId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/categories', async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, name FROM categories ORDER BY name ASC'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
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