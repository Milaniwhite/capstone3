// Clear and repopulate the database.

const { db } = require("../index");
const bcrypt = require('bcrypt');


async function seed() {
  console.log("Seeding the database.");
  try {
    await db.query(`
      DROP TABLE IF EXISTS comments, photos, reviews, operating_hours, bookmarks, 
    places, cities, countries, categories, users, admins CASCADE;

CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL CHECK (LENGTH(username) >= 3),
    email VARCHAR(100) UNIQUE NOT NULL CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$'),
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    profile_picture_url VARCHAR(255),
    bio TEXT,
    country VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'moderator', 'admin')),
    is_verified BOOLEAN NOT NULL DEFAULT false,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    last_login TIMESTAMP,
    last_password_change TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE admins (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    department VARCHAR(50) NOT NULL,
    hire_date DATE NOT NULL DEFAULT CURRENT_DATE,
    last_access_date TIMESTAMP,
    
    can_add_reviews BOOLEAN DEFAULT false,
    can_edit_reviews BOOLEAN DEFAULT false,
    can_delete_reviews BOOLEAN DEFAULT false,
    can_moderate_reviews BOOLEAN DEFAULT false,
    
    reviews_added INTEGER DEFAULT 0,
    reviews_edited INTEGER DEFAULT 0,
    reviews_deleted INTEGER DEFAULT 0,
    reviews_moderated INTEGER DEFAULT 0,
    
    average_review_score DECIMAL(3,2),
    review_approval_rate DECIMAL(5,2),
    review_response_time INTEGER,
    flagged_reviews_handled INTEGER DEFAULT 0,
    
    last_review_action_date TIMESTAMP,
    last_moderation_date TIMESTAMP,
    total_actions_performed INTEGER DEFAULT 0,
    
    review_categories_handled VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    preferred_categories VARCHAR[] DEFAULT ARRAY[]::VARCHAR[],
    
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    created_by INTEGER REFERENCES users(id),
    updated_by INTEGER REFERENCES users(id),
    
    review_action_log JSONB DEFAULT '[]',
    review_notes TEXT,
    
    UNIQUE(user_id),
    CONSTRAINT valid_review_score CHECK (average_review_score BETWEEN 1 AND 5),
    CONSTRAINT valid_approval_rate CHECK (review_approval_rate BETWEEN 0 AND 100)
);

CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    parent_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    name VARCHAR(50) UNIQUE NOT NULL,
    description TEXT,
    icon_url VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE countries (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL,
    continent TEXT NOT NULL CHECK (continent IN ('Asia', 'Africa', 'North America', 'South America', 'Antarctica', 'Europe', 'Oceania')),
    is_active BOOLEAN NOT NULL DEFAULT true
);

CREATE TABLE cities (
    id SERIAL PRIMARY KEY,
    country_id INTEGER REFERENCES countries(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NULL,
    state_province VARCHAR(100),
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    timezone VARCHAR(50) NOT NULL,
    population INTEGER CHECK (population >= 0),
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180),
    UNIQUE(country_id, slug)
);

CREATE TABLE places (
    id SERIAL PRIMARY KEY,
    category_id INTEGER REFERENCES categories(id) ON DELETE SET NULL,
    city_id INTEGER REFERENCES cities(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NULL,
    description TEXT,
    address TEXT NOT NULL,
    latitude DECIMAL(10,8) NOT NULL,
    longitude DECIMAL(11,8) NOT NULL,
    website_url VARCHAR(255),
    phone_number VARCHAR(50),
    price_level SMALLINT CHECK (price_level BETWEEN 1 AND 5),
    average_rating DECIMAL(3,2) CHECK (average_rating BETWEEN 1 AND 5),
    review_count INTEGER NOT NULL DEFAULT 0,
    status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'archived')),
    submission_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (submission_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT valid_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT valid_longitude CHECK (longitude BETWEEN -180 AND 180),
    UNIQUE(city_id, slug)
);

CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
    rating SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    visit_date DATE NOT NULL,
    helpful_votes INTEGER NOT NULL DEFAULT 0,
    report_count INTEGER NOT NULL DEFAULT 0,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
    CONSTRAINT visit_date_not_future CHECK (visit_date <= CURRENT_DATE)
);

CREATE TABLE bookmarks (
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
    collection_name VARCHAR(50) DEFAULT 'Default',
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    notes TEXT,
    is_private BOOLEAN NOT NULL DEFAULT false,
    PRIMARY KEY (user_id, place_id)
);

CREATE TABLE operating_hours (
    id SERIAL PRIMARY KEY,
    place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
    day_of_week SMALLINT CHECK (day_of_week BETWEEN 0 AND 6),
    open_time TIME,
    close_time TIME,
    is_closed BOOLEAN NOT NULL DEFAULT false,
    season_start DATE,
    season_end DATE,
    is_special_hours BOOLEAN NOT NULL DEFAULT false,
    special_hours_description TEXT,
    UNIQUE(place_id, day_of_week, season_start, season_end),
    CHECK (open_time < close_time),
    CHECK ((season_start IS NULL AND season_end IS NULL) OR (season_start IS NOT NULL AND season_end IS NOT NULL))
);

CREATE TABLE photos (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    place_id INTEGER REFERENCES places(id) ON DELETE CASCADE,
    review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
    photo_url VARCHAR(255) NOT NULL,
    thumbnail_url VARCHAR(255),
    caption TEXT,
    metadata JSONB,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    uploaded_at TIMESTAMP NOT NULL DEFAULT NOW(),
    is_featured BOOLEAN NOT NULL DEFAULT false
);

CREATE TABLE comments (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    review_id INTEGER REFERENCES reviews(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    helpful_votes INTEGER NOT NULL DEFAULT 0,
    report_count INTEGER NOT NULL DEFAULT 0,
    moderation_status VARCHAR(20) NOT NULL DEFAULT 'approved' CHECK (moderation_status IN ('pending', 'approved', 'rejected')),
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_places_category ON places(category_id);
CREATE INDEX idx_places_city ON places(city_id);
CREATE INDEX idx_places_status ON places(status);
CREATE INDEX idx_reviews_place ON reviews(place_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_moderation ON reviews(moderation_status);
CREATE INDEX idx_photos_place ON photos(place_id);
CREATE INDEX idx_photos_user ON photos(user_id);
CREATE INDEX idx_comments_review ON comments(review_id);
CREATE INDEX idx_users_username_email ON users(username, email);
CREATE INDEX idx_bookmarks_user ON bookmarks(user_id);
CREATE INDEX idx_operating_hours_place ON operating_hours(place_id);
CREATE INDEX idx_admins_user ON admins(user_id);
CREATE INDEX idx_admins_department ON admins(department);

CREATE VIEW admin_review_management AS
SELECT 
    r.id AS review_id,
    r.title AS review_title,
    r.content AS review_content,
    r.rating,
    r.visit_date,
    r.created_at AS review_created_at,
    r.moderation_status,
    r.helpful_votes,
    r.report_count,
    u.username AS reviewer_username,
    u.email AS reviewer_email,
    p.name AS place_name,
    p.category_id,
    c.name AS category_name,
    city.name AS city_name,
    country.name AS country_name
FROM 
    reviews r
    JOIN users u ON r.user_id = u.id
    JOIN places p ON r.place_id = p.id
    JOIN categories c ON p.category_id = c.id
    JOIN cities city ON p.city_id = city.id
    JOIN countries country ON city.country_id = country.id;

    `);

    console.log("Database schema created successfully.");
    
    console.log("Seeding database with initial data...");


      const categories = [
        { name: 'Restaurant', description: 'Places to eat', icon_url: 'restaurant.png' },
        { name: 'Museum', description: 'Cultural venues', icon_url: 'museum.png' },
        { name: 'Park', description: 'Outdoor spaces', icon_url: 'park.png' },
        { name: 'Cafe', description: 'Coffee and light meals', icon_url: 'cafe.png' },
        { name: 'Shopping', description: 'Retail locations', icon_url: 'shopping.png' }
      ];
  
      for (const category of categories) {
        await db.query(`
          INSERT INTO categories (name, description, icon_url)
          VALUES ($1, $2, $3)
        `, [category.name, category.description, category.icon_url]);
      }


      const countries = [
        { name: 'United States', continent: 'North America' },
        { name: 'Japan', continent: 'Asia' },
        { name: 'France', continent: 'Europe' },
        { name: 'Australia', continent: 'Oceania' },
        { name: 'Brazil', continent: 'South America' }
      ];
  
      for (const country of countries) {
        await db.query(`
          INSERT INTO countries (name, continent)
          VALUES ($1, $2)
        `, [country.name, country.continent]);
      }
  

      const cities = [
        {
          country: 'United States',
          name: 'New York',
          state: 'NY',
          lat: 40.7128,
          lng: -74.0060,
          timezone: 'America/New_York',
          population: 8400000
        },
        {
          country: 'Japan',
          name: 'Tokyo',
          state: 'Tokyo',
          lat: 35.6762,
          lng: 139.6503,
          timezone: 'Asia/Tokyo',
          population: 37400068
        }
      ];
  
      for (const city of cities) {
        await db.query(`
          INSERT INTO cities (
            country_id, name, state_province, latitude, longitude, timezone, population
          )
          VALUES (
            (SELECT id FROM countries WHERE name = $1),
            $2, $3, $4, $5, $6, $7
          )
        `, [city.country, city.name, city.state, city.lat, city.lng, city.timezone, city.population]);
      }
  
      const saltRounds = 10;
      const users = [
        {
          username: 'johndoe',
          email: 'john@example.com',
          password: 'password123', 
          full_name: 'John Doe',
          country: 'United States',
          role: 'user'
        },
        {
          username: 'janedoe',
          email: 'jane@example.com',
          password: 'password456', 
          full_name: 'Jane Doe',
          country: 'Japan',
          role: 'user'
        },
        {
          username: 'admin_sarah',
          email: 'sarah.admin@example.com',
          password: 'adminpass789', 
          full_name: 'Sarah Johnson',
          country: 'United States',
          role: 'admin'
        },
        {
          username: 'admin_mike',
          email: 'mike.admin@example.com',
          password: 'adminpass101',  
          full_name: 'Mike Wilson',
          country: 'United States',
          role: 'admin'
        }
      ];
  
      for (const user of users) {
        const hashedPassword = await bcrypt.hash(user.password, saltRounds);
        await db.query(`
          INSERT INTO users (
            username,
            email,
            password_hash,
            full_name,
            country,
            role,
            is_verified,
            is_active
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
          RETURNING id
        `, [
          user.username,
          user.email,
          hashedPassword,
          user.full_name,
          user.country,
          user.role,
          true, // is_verified
          true  // is_active
        ]);
      }
  
      const admins = [
        {
          username: 'admin_sarah',
          department: 'Review Management',
          can_add_reviews: true,
          can_edit_reviews: true,
          can_delete_reviews: true,
          can_moderate_reviews: true,
          reviews_added: 250,
          reviews_edited: 890,
          reviews_deleted: 45,
          reviews_moderated: 1200,
          average_review_score: 4.2,
          review_approval_rate: 92.5,
          review_response_time: 25,
          flagged_reviews_handled: 150,
          review_categories_handled: ['Restaurant', 'Cafe', 'Shopping'],
          preferred_categories: ['Restaurant', 'Cafe'],
          review_notes: 'Senior review manager specializing in food and retail establishments'
        },
        {
          username: 'admin_mike',
          department: 'Content Moderation',
          can_add_reviews: false,
          can_edit_reviews: true,
          can_delete_reviews: true,
          can_moderate_reviews: true,
          reviews_added: 0,
          reviews_edited: 560,
          reviews_deleted: 89,
          reviews_moderated: 780,
          average_review_score: 4.0,
          review_approval_rate: 88.5,
          review_response_time: 35,
          flagged_reviews_handled: 220,
          review_categories_handled: ['Museum', 'Park', 'Shopping'],
          preferred_categories: ['Museum', 'Park'],
          review_notes: 'Content moderator focused on cultural and outdoor venues'
        }
      ];
  
      for (const admin of admins) {
        await db.query(`
          INSERT INTO admins (
            user_id,
            department,
            can_add_reviews,
            can_edit_reviews,
            can_delete_reviews,
            can_moderate_reviews,
            reviews_added,
            reviews_edited,
            reviews_deleted,
            reviews_moderated,
            average_review_score,
            review_approval_rate,
            review_response_time,
            flagged_reviews_handled,
            review_categories_handled,
            preferred_categories,
            review_notes
          )
          VALUES (
            (SELECT id FROM users WHERE username = $1),
            $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17
          )
        `, [
          admin.username,
          admin.department,
          admin.can_add_reviews,
          admin.can_edit_reviews,
          admin.can_delete_reviews,
          admin.can_moderate_reviews,
          admin.reviews_added,
          admin.reviews_edited,
          admin.reviews_deleted,
          admin.reviews_moderated,
          admin.average_review_score,
          admin.review_approval_rate,
          admin.review_response_time,
          admin.flagged_reviews_handled,
          admin.review_categories_handled,
          admin.preferred_categories,
          admin.review_notes
        ]);
      }
      
      const places = [
        {
          category: 'Restaurant',
          city: 'New York',
          name: 'Central Bistro',
          description: 'Fine dining in the heart of Manhattan',
          address: '123 5th Avenue',
          lat: 40.7580,
          lng: -73.9855,
          website: 'https://centralbistro.example.com',
          phone: '+1-212-555-0123',
          price_level: 4
        },
        {
          category: 'Museum',
          city: 'New York',
          name: 'Metropolitan Museum',
          description: 'World-class art museum',
          address: '1000 5th Avenue',
          lat: 40.7794,
          lng: -73.9632,
          website: 'https://metropolitan.example.com',
          phone: '+1-212-555-0234',
          price_level: 3
        }
      ];
  
      for (const place of places) {
        const placeId = await db.query(`
          INSERT INTO places (
            category_id, city_id, name, description, address,
            latitude, longitude, website_url, phone_number, price_level
          )
          VALUES (
            (SELECT id FROM categories WHERE name = $1),
            (SELECT id FROM cities WHERE name = $2),
            $3, $4, $5, $6, $7, $8, $9, $10
          )
          RETURNING id
        `, [
          place.category,
          place.city,
          place.name,
          place.description,
          place.address,
          place.lat,
          place.lng,
          place.website,
          place.phone,
          place.price_level
        ]);
  
       
        for (let day = 0; day < 7; day++) {
          await db.query(`
            INSERT INTO operating_hours (place_id, day_of_week, open_time, close_time, is_closed)
            VALUES ($1, $2, $3, $4, $5)
          `, [placeId.rows[0].id, day, '09:00', '22:00', day === 0]); 
        }
      }
  
      console.log("Database seeded successfully!");
    } catch (err) {
      console.error("Error initializing database:", err);
      throw err;
    }
  }

if (require.main === module) {
  seed();
}

module.exports = seed;