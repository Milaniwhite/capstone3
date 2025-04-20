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
      `INSERT INTO users (username, email, password_hash, full_name, country)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, full_name;`,
      [username, email, hashedPassword, full_name, country]
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

    await pool.query(
      'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
      [user.id]
    );

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
      'SELECT id, username, email, full_name, bio, country, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Place Routes
app.get('/api/places', async (req, res) => {
  try {
    const { page = 1, limit = 10, category, city } = req.query;
    const offset = (page - 1) * limit;

    let query = `
      SELECT p.*, c.name as category_name, ct.name as city_name,
             COUNT(*) OVER() as total_count
      FROM places p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN cities ct ON p.city_id = ct.id
      WHERE 1=1
    `;
    const queryParams = [];
    let paramCount = 1;

    if (category) {
      query += ` AND c.id = $${paramCount}`;
      queryParams.push(category);
      paramCount++;
    }

    if (city) {
      query += ` AND ct.id = $${paramCount}`;
      queryParams.push(city);
      paramCount++;
    }

    query += ` ORDER BY p.name
               LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
    queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    const totalCount = result.rows[0]?.total_count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      places: result.rows,
      pagination: {
        total: parseInt(totalCount),
        pages: totalPages,
        current_page: parseInt(page),
        per_page: parseInt(limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/places/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    // Get place details with category and city information
    const placeResult = await pool.query(`
      SELECT p.*, 
             c.name as category_name,
             ct.name as city_name,
             COUNT(DISTINCT r.id) as review_count,
             COALESCE(AVG(r.rating), 0) as average_rating
      FROM places p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN cities ct ON p.city_id = ct.id
      LEFT JOIN reviews r ON p.id = r.place_id
      WHERE p.id = $1
      GROUP BY p.id, c.name, ct.name
    `, [id]);

    if (placeResult.rows.length === 0) {
      return res.status(404).json({ error: 'Place not found' });
    }

    // Get reviews for the place
    const reviewsResult = await pool.query(`
      SELECT r.*, 
             u.username, 
             u.full_name,
             COUNT(p.id) as photo_count
      FROM reviews r
      JOIN users u ON r.user_id = u.id
      LEFT JOIN photos p ON r.id = p.review_id
      WHERE r.place_id = $1
      GROUP BY r.id, u.username, u.full_name
      ORDER BY r.created_at DESC
      LIMIT 10
    `, [id]);

    // Get photos for the place
    const photosResult = await pool.query(`
      SELECT p.*, u.username
      FROM photos p
      JOIN users u ON p.user_id = u.id
      WHERE p.place_id = $1
      ORDER BY p.created_at DESC
      LIMIT 5
    `, [id]);

    const place = placeResult.rows[0];
    place.reviews = reviewsResult.rows;
    place.photos = photosResult.rows;

    res.json(place);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Review Routes
app.post('/api/places/:placeId/reviews', authenticateToken, async (req, res, next) => {
  try {
    const { rating, title, content, visit_date } = req.body;
    const { placeId } = req.params;

    const result = await pool.query(
      `INSERT INTO reviews (user_id, place_id, rating, title, content, visit_date)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [req.user.id, placeId, rating, title, content, visit_date]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

app.get('/api/search', async (req, res) => {
  try {
    const { q, category, city, rating, page = 1, limit = 10 } = req.query;
    const offset = (page - 1) * limit;
    
    let query = `
      SELECT p.*, 
             c.name as category_name,
             ct.name as city_name,
             COALESCE(AVG(r.rating), 0) as avg_rating,
             COUNT(DISTINCT r.id) as review_count,
             COUNT(*) OVER() as total_count
      FROM places p
      LEFT JOIN categories c ON p.category_id = c.id
      LEFT JOIN cities ct ON p.city_id = ct.id
      LEFT JOIN reviews r ON p.id = r.place_id
      WHERE 1=1
    `;
    
    const queryParams = [];
    let paramCount = 1;


    if (category) {
      query += ` AND c.id = $${paramCount}`;
      queryParams.push(category);
      paramCount++;
    }

    if (city) {
      query += ` AND ct.id = $${paramCount}`;
      queryParams.push(city);
      paramCount++;
    }
    query += ` GROUP BY p.id, c.name, ct.name`;

    if (rating) {
      query += ` HAVING COALESCE(AVG(r.rating), 0) >= $${paramCount}`;
      queryParams.push(parseFloat(rating));
      paramCount++;
    }

    query += ` ORDER BY avg_rating DESC NULLS LAST, p.name
    LIMIT $${paramCount} OFFSET $${paramCount + 1}`;
queryParams.push(limit, offset);

    const result = await pool.query(query, queryParams);

    const totalCount = result.rows[0]?.total_count || 0;
    const totalPages = Math.ceil(totalCount / limit);

    res.json({
      places: result.rows,
      pagination: {
        total: parseInt(totalCount),
        pages: totalPages,
        current_page: parseInt(page),
        per_page: parseInt(limit)
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Bookmark Routes
app.post('/api/bookmarks/:placeId', authenticateToken, async (req, res, next) => {
  try {
    const { notes } = req.body;
    const { placeId } = req.params;

    const result = await pool.query(
      `INSERT INTO bookmarks (user_id, place_id, notes)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [req.user.id, placeId, notes]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') { 
      return res.status(400).json({ error: 'Place already bookmarked' });
    }
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Photo Upload Routes
app.post('/api/places/:placeId/photos', authenticateToken, upload.single('photo'), async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const result = await pool.query(
      `INSERT INTO photos (user_id, place_id, photo_url, caption)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [req.user.id, req.params.placeId, `/uploads/${req.file.filename}`, req.body.caption]
    );

    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
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