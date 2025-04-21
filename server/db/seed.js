const { db } = require("../index");
const bcrypt = require('bcrypt');

async function seed() {
  console.log("Seeding the database with minimal test data.");
  try {
    // Drop all tables first
    await db.query(`
      DROP TABLE IF EXISTS 
        review_comments, 
        review_images, 
        review_reports, 
        item_reports, 
        item_ownership_requests, 
        item_images,
        categories, 
        items, 
        reviews, 
        users 
      CASCADE;
    `);

    // Create tables
    await db.query(`
      CREATE TABLE users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL CHECK (LENGTH(username) >= 3),
          email VARCHAR(100) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
          password_hash VARCHAR(255) NOT NULL,
          full_name VARCHAR(100) NOT NULL,
          profile_picture_url VARCHAR(255),
          bio TEXT,
          is_admin BOOLEAN NOT NULL DEFAULT false,
          is_active BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE categories (
          id SERIAL PRIMARY KEY,
          name VARCHAR(50) UNIQUE NOT NULL,
          description TEXT,
          icon_url VARCHAR(255),
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE items (
          id SERIAL PRIMARY KEY,
          name VARCHAR(100) NOT NULL,
          description TEXT,
          category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
          address TEXT,
          website_url VARCHAR(255),
          phone_number VARCHAR(20),
          owner_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
          is_approved BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          created_by INTEGER REFERENCES users(id) ON DELETE SET NULL
      );

      CREATE TABLE item_images (
          id SERIAL PRIMARY KEY,
          item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
          image_url VARCHAR(255) NOT NULL,
          is_primary BOOLEAN NOT NULL DEFAULT false,
          uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE reviews (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          item_id INTEGER REFERENCES items(id) ON DELETE CASCADE,
          rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
          title VARCHAR(200) NOT NULL,
          content TEXT NOT NULL,
          is_approved BOOLEAN NOT NULL DEFAULT true,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
          UNIQUE(user_id, item_id)
      );

      CREATE TABLE review_images (
          id SERIAL PRIMARY KEY,
          review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
          image_url VARCHAR(255) NOT NULL,
          uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE TABLE review_comments (
          id SERIAL PRIMARY KEY,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          created_at TIMESTAMP NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP NOT NULL DEFAULT NOW()
      );

      CREATE INDEX idx_items_category ON items(category_id);
      CREATE INDEX idx_items_owner ON items(owner_id);
      CREATE INDEX idx_reviews_item ON reviews(item_id);
      CREATE INDEX idx_reviews_user ON reviews(user_id);
      CREATE INDEX idx_review_comments_review ON review_comments(review_id);
      CREATE INDEX idx_review_comments_user ON review_comments(user_id);
      CREATE INDEX idx_item_images_item ON item_images(item_id);
      CREATE INDEX idx_review_images_review ON review_images(review_id);
    `);

    console.log("Database schema created successfully.");

    // Seed minimal test data
    console.log("Seeding minimal test data...");

    // Create users
    const users = [
      { username: 'admin', email: 'admin@example.com', password: 'admin123', full_name: 'Admin User', is_admin: true },
      { username: 'user1', email: 'user1@example.com', password: 'password1', full_name: 'John Doe' },
      { username: 'user2', email: 'user2@example.com', password: 'password2', full_name: 'Jane Smith' }
    ];

    for (const user of users) {
      const hashedPassword = await bcrypt.hash(user.password, 10);
      await db.query(`
        INSERT INTO users (username, email, password_hash, full_name, is_admin)
        VALUES ($1, $2, $3, $4, $5)
      `, [user.username, user.email, hashedPassword, user.full_name, user.is_admin || false]);
    }

    // Create categories
    const categories = [
      { name: 'Restaurants', description: 'Places to eat' },
      { name: 'Books', description: 'Books to read' }
    ];

    for (const category of categories) {
      await db.query(`
        INSERT INTO categories (name, description)
        VALUES ($1, $2)
      `, [category.name, category.description]);
    }

    // Create items
    const items = [
      { 
        name: 'Burger Place', 
        description: 'Great burgers downtown', 
        category: 'Restaurants',
        address: '123 Main St',
        website: 'http://burgerplace.com',
        phone: '555-1234'
      },
      { 
        name: 'Pizza Joint', 
        description: 'Best pizza in town', 
        category: 'Restaurants',
        address: '456 Elm St',
        website: 'http://pizzajoint.com',
        phone: '555-5678'
      },
      { 
        name: 'Programming Book', 
        description: 'Learn to code', 
        category: 'Books',
        website: 'http://example.com/programming-book'
      }
    ];

    for (const item of items) {
      const result = await db.query(`
        INSERT INTO items (
          name, description, category_id, address, website_url, phone_number, created_by
        )
        VALUES (
          $1, $2,
          (SELECT id FROM categories WHERE name = $3),
          $4, $5, $6, (SELECT id FROM users WHERE username = 'user1')
      )
      `, [
        item.name,
        item.description,
        item.category,
        item.address || null,
        item.website || null,
        item.phone || null
      ]);

      // Add item image
      await db.query(`
        INSERT INTO item_images (item_id, image_url, is_primary)
        VALUES ($1, $2, true)
      `, [1, 'https://via.placeholder.com/300x200?text=' + encodeURIComponent(item.name)]);
    }

    // Create reviews
    const reviews = [
      { user: 'user1', item: 'Burger Place', rating: 5, title: 'Amazing burgers!', content: 'The best burgers I ever had.' },
      { user: 'user2', item: 'Burger Place', rating: 4, title: 'Good burgers', content: 'Very tasty but a bit pricey.' },
      { user: 'user1', item: 'Pizza Joint', rating: 3, title: 'Decent pizza', content: 'Not bad but nothing special.' }
    ];

    for (const review of reviews) {
      await db.query(`
        INSERT INTO reviews (user_id, item_id, rating, title, content)
        VALUES (
          (SELECT id FROM users WHERE username = $1),
          (SELECT id FROM items WHERE name = $2),
          $3, $4, $5
        )
      `, [review.user, review.item, review.rating, review.title, review.content]);
    }

    // Create review comments
    const comments = [
      { user: 'user2', review: 1, content: 'I agree, their burgers are fantastic!' },
      { user: 'user1', review: 2, content: 'Thanks for your feedback!' }
    ];

    for (const comment of comments) {
      await db.query(`
        INSERT INTO review_comments (user_id, review_id, content)
        VALUES (
          (SELECT id FROM users WHERE username = $1),
          $2,
          $3
        )
      `, [comment.user, comment.review, comment.content]);
    }

    console.log("Successfully seeded minimal test data:");
    console.log("- 3 users (1 admin, 2 regular)");
    console.log("- 2 categories (Restaurants, Books)");
    console.log("- 3 items (2 restaurants, 1 book)");
    console.log("- 3 reviews");
    console.log("- 2 review comments");
  } catch (err) {
    console.error("Error initializing database:", err);
    throw err;
  }
}

if (require.main === module) {
  seed();
}

module.exports = seed;