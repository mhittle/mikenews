# NewsAlgo Data Schema Specification

This document provides a detailed specification of the data models used in the NewsAlgo system. These schemas define the structure of documents stored in MongoDB and the data exchanged through the API.

## Table of Contents

1. [Article Schema](#article-schema)
2. [User Schema](#user-schema)
3. [RSS Feed Schema](#rss-feed-schema)
4. [Classification Schema](#classification-schema)
5. [Relationships](#relationships)
6. [Indexing Strategy](#indexing-strategy)

## Article Schema

Articles are the primary content objects in the system.

### MongoDB Schema

```javascript
{
  "_id": ObjectId,            // MongoDB's internal ID
  "id": String,               // UUID string for public API
  "title": String,            // Article headline
  "url": String,              // Original article URL
  "source": String,           // Publication name
  "source_id": String,        // Reference to the feed ID
  "author": String,           // Article author (optional)
  "published_date": Date,     // Publication timestamp
  "summary": String,          // Brief article summary (optional)
  "content": String,          // Full article text (optional)
  "image_url": String,        // Featured image URL (optional)
  "is_paywalled": Boolean,    // Whether article is behind a paywall
  "classification": {         // Article metrics
    "reading_level": Number,  // 1-10 scale
    "information_density": Number, // 1-10 scale
    "bias_score": Number,     // 1-10 scale
    "propaganda_score": Number, // 1-10 scale
    "length": Number,         // Word count
    "topics": [String],       // Array of topic identifiers
    "region": String          // Geographic region identifier
  },
  "created_at": Date          // When article was added to system
}
```

### Validation Rules

- `id`: Must be a valid UUID string
- `url`: Must be a valid URL and unique in the collection
- `title`: Required, non-empty string
- `source`: Required, non-empty string
- `published_date`: ISO date format, must not be in the future
- `classification.reading_level`: Number between 1-10
- `classification.information_density`: Number between 1-10
- `classification.bias_score`: Number between 1-10
- `classification.propaganda_score`: Number between 1-10
- `classification.topics`: Array of predefined topic strings
- `classification.region`: Must be one of predefined regions

## User Schema

Users represent registered accounts in the system.

### MongoDB Schema

```javascript
{
  "_id": ObjectId,               // MongoDB's internal ID
  "id": String,                  // UUID string for public API
  "email": String,               // User's email address
  "username": String,            // User's login name
  "password": String,            // Bcrypt hashed password
  "created_at": Date,            // Account creation timestamp
  "preferences": {               // User's feed preferences
    "reading_level": Number,     // 1-10 scale
    "information_density": Number, // 1-10 scale
    "bias_threshold": Number,    // 1-10 scale
    "propaganda_threshold": Number, // 1-10 scale
    "max_length": Number,        // Maximum article length in words
    "min_length": Number,        // Minimum article length in words
    "topics": [String],          // Array of preferred topics
    "regions": [String],         // Array of preferred regions
    "show_paywalled": Boolean,   // Whether to include paywalled content
    "topics_filter_type": String, // "AND" or "OR" logic for topics
    "max_age_days": Number       // Maximum article age in days
  }
}
```

### Validation Rules

- `id`: Must be a valid UUID string
- `email`: Must be a valid email format and unique
- `username`: Alphanumeric, 3-20 characters, unique
- `password`: Bcrypt hash, never returned in API responses
- `preferences.reading_level`: Number between 1-10
- `preferences.information_density`: Number between 1-10
- `preferences.bias_threshold`: Number between 1-10
- `preferences.propaganda_threshold`: Number between 1-10
- `preferences.max_length`: Positive integer
- `preferences.min_length`: Non-negative integer
- `preferences.topics_filter_type`: Must be "AND" or "OR"
- `preferences.max_age_days`: Positive integer between 1-90

## RSS Feed Schema

RSS Feeds represent content sources in the system.

### MongoDB Schema

```javascript
{
  "_id": ObjectId,            // MongoDB's internal ID
  "id": String,               // UUID string for public API
  "url": String,              // RSS feed URL
  "name": String,             // Display name for the feed
  "category": String,         // Feed category
  "region": String,           // Geographic region
  "active": Boolean,          // Whether feed is actively crawled
  "last_checked": Date        // Last successful processing timestamp
}
```

### Validation Rules

- `id`: Must be a valid UUID string
- `url`: Must be a valid URL and unique
- `name`: Required, non-empty string
- `category`: Must be one of predefined categories
- `region`: Must be one of predefined regions
- `active`: Boolean value
- `last_checked`: ISO date format, must not be in the future

## Classification Schema

The classification schema is embedded within articles and defines the metrics used for filtering.

### Schema

```javascript
{
  "reading_level": Number,      // 1-10 scale
  "information_density": Number, // 1-10 scale
  "bias_score": Number,         // 1-10 scale
  "propaganda_score": Number,   // 1-10 scale
  "length": Number,             // Word count
  "topics": [String],           // Array of topic identifiers
  "region": String              // Geographic region identifier
}
```

### Defined Values

#### Topics

Valid topic values:
- `politics`
- `business`
- `technology`
- `science`
- `health`
- `sports`
- `entertainment`
- `world`

#### Regions

Valid region values:
- `north_america`
- `europe`
- `asia`
- `middle_east`
- `africa`
- `south_america`
- `oceania`

## Relationships

### Articles to Feeds

- Each article has a `source_id` field that references the `id` field of a feed
- This creates a one-to-many relationship between feeds and articles

### Users to Preferences

- Each user document contains an embedded preferences object
- Preferences are not separate documents but part of the user document

## Indexing Strategy

### Article Collection Indexes

```javascript
// Primary key
db.articles.createIndex({ "id": 1 }, { unique: true })

// URL uniqueness (for deduplication)
db.articles.createIndex({ "url": 1 }, { unique: true })

// Fast filtering by source
db.articles.createIndex({ "source_id": 1 })

// Fast filtering by publication date
db.articles.createIndex({ "published_date": -1 })

// Compound index for topic+region filtering
db.articles.createIndex({ 
  "classification.topics": 1, 
  "classification.region": 1,
  "published_date": -1
})

// Full-text search on title and content
db.articles.createIndex({ 
  "title": "text", 
  "content": "text", 
  "summary": "text" 
})
```

### User Collection Indexes

```javascript
// Primary key
db.users.createIndex({ "id": 1 }, { unique: true })

// Username lookup (for authentication)
db.users.createIndex({ "username": 1 }, { unique: true })

// Email uniqueness
db.users.createIndex({ "email": 1 }, { unique: true })
```

### Feed Collection Indexes

```javascript
// Primary key
db.feeds.createIndex({ "id": 1 }, { unique: true })

// URL uniqueness
db.feeds.createIndex({ "url": 1 }, { unique: true })

// Fast filtering by category and region
db.feeds.createIndex({ "category": 1, "region": 1 })
```

## Query Patterns

### Article Filtering by User Preferences

The core query pattern matches articles to user preferences:

```javascript
// Base query
let query = {}

// Paywall filter
if (!preferences.show_paywalled) {
  query["is_paywalled"] = false
}

// Article age filter
if (preferences.max_age_days > 0) {
  const minDate = new Date()
  minDate.setDate(minDate.getDate() - preferences.max_age_days)
  query["published_date"] = { $gte: minDate }
}

// Topic filter
if (preferences.topics.length > 0) {
  if (preferences.topics_filter_type === "AND") {
    query["classification.topics"] = { $all: preferences.topics }
  } else {
    query["classification.topics"] = { $in: preferences.topics }
  }
}

// Region filter
if (preferences.regions.length > 0) {
  query["classification.region"] = { $in: preferences.regions }
}

// Content length filter
let lengthQuery = {}
if (preferences.min_length > 0) {
  lengthQuery["$gte"] = preferences.min_length
}
if (preferences.max_length < 5000) {
  lengthQuery["$lte"] = preferences.max_length
}
if (Object.keys(lengthQuery).length > 0) {
  query["classification.length"] = lengthQuery
}

// Execute base query
let articles = await db.articles.find(query)
  .sort("published_date", -1)
  .skip(skip)
  .limit(limit)
  .toArray()

// Post-query filtering for numeric thresholds
articles = articles.filter(article => {
  if (!article.classification) return false
  
  return (
    article.classification.reading_level >= preferences.reading_level - 2 &&
    article.classification.reading_level <= preferences.reading_level + 2 &&
    article.classification.information_density >= preferences.information_density - 2 &&
    article.classification.information_density <= preferences.information_density + 2 &&
    article.classification.bias_score >= preferences.bias_threshold &&
    article.classification.propaganda_score >= preferences.propaganda_threshold
  )
})
```

## Schema Evolution

As the system evolves, follow these guidelines for schema changes:

1. **Backward Compatibility**: New fields should be optional
2. **Data Migration**: Run scripts to update existing documents when adding required fields
3. **Versioning**: Consider adding a schema version field for major changes
4. **Gradual Rollout**: Deploy schema changes separately from code changes when possible
5. **Documentation**: Update this document when schema changes occur

---

&copy; 2025 NewsAlgo Team
