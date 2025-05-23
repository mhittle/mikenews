# NewsAlgo: Technical Specification

## System Architecture

NewsAlgo follows a modern microservices architecture with these key components:

### Core Services

1. **Feed Crawler Service**
   - **Purpose**: Retrieve articles from RSS feeds
   - **Implementation**: Python-based crawler using feedparser
   - **Schedule**: Runs hourly via background thread
   - **Scaling**: Horizontally scalable with multiple crawler instances

2. **Article Processor Service**
   - **Purpose**: Extract and classify article content
   - **Implementation**: Multiple analysis algorithms for each dimension
   - **Dependencies**: newspaper3k, NLTK, BeautifulSoup
   - **Optimization**: Caching system for repeated article analysis

3. **User Preference Engine**
   - **Purpose**: Match articles to user preferences
   - **Implementation**: Multi-dimensional filtering algorithm
   - **Performance**: O(n) complexity for article filtering

4. **Authentication Service**
   - **Purpose**: Manage user sessions and API access
   - **Implementation**: JWT-based token system
   - **Security**: Bcrypt password hashing, token expiration

### Data Storage

1. **MongoDB Collections**
   - **Articles**: Stores all article data and classifications
   - **Feeds**: RSS feed configuration and metadata
   - **Users**: User accounts and preference settings
   - **Indexes**: Optimized for article querying by multiple dimensions

### Frontend Architecture

1. **Component Structure**
   - **App**: Main application container
   - **AuthProvider**: Authentication context provider
   - **Home/HomeWithFallback**: Primary content views
   - **ArticleCard**: Individual article display
   - **FilterBar**: User preference controls
   - **AdminPanel**: Feed management interface
   - **FeedDetail**: Individual feed view

2. **State Management**
   - **Context API**: Used for authentication state
   - **Component State**: Local state for UI components
   - **Effects**: Side effects for data fetching and persistence

## Classification Algorithms

### Reading Level Analysis

```python
def calculate_reading_level(text):
    """Calculate approximate reading level on a 1-10 scale"""
    if not text:
        return 5  # Default middle value
    
    try:
        # Try to use NLTK tokenization
        try:
            sentences = sent_tokenize(text)
        except Exception:
            # Fall back to simple tokenization
            sentences = simple_tokenize(text)
            
        if not sentences:
            return 5
            
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
        
        # Simple formula based on avg sentence length
        reading_level = min(10, max(1, avg_sentence_length / 3))
        return reading_level
    except Exception as e:
        logging.error(f"Error calculating reading level: {str(e)}")
        return 5
```

### Information Density Calculation

```python
def calculate_information_density(text):
    """Calculate information density on a 1-10 scale"""
    if not text:
        return 5  # Default middle value
    
    try:
        # Simple proxy using ratio of unique words to total words
        words = re.findall(r'\w+', text.lower())
        if not words:
            return 5
        
        unique_ratio = len(set(words)) / len(words)
        # Scale to 1-10
        return min(10, max(1, unique_ratio * 20))
    except Exception as e:
        logging.error(f"Error calculating information density: {str(e)}")
        return 5
```

### Bias Detection

```python
def estimate_bias(text):
    """Estimate political bias on a 1-10 scale (10 being neutral)"""
    # This would ideally use a trained model
    # For MVP, we'll use a simple keyword approach
    if not text:
        return 5  # Default middle value
    
    try:
        text = text.lower()
        
        # Simplified bias detection using keyword lists
        left_bias_terms = ["progressive", "liberal", "democrat", "socialism", "green new deal", "universal healthcare"]
        right_bias_terms = ["conservative", "republican", "trump", "tax cuts", "border wall", "deregulation"]
        
        left_count = sum(term in text for term in left_bias_terms)
        right_count = sum(term in text for term in right_bias_terms)
        
        # If counts are equal or both zero, return neutral (10)
        if left_count == right_count:
            return 10
        
        # Calculate bias level - higher values are more neutral
        total = left_count + right_count
        if total == 0:
            return 10
        
        imbalance = abs(left_count - right_count) / total
        return min(10, max(1, 10 - (imbalance * 9)))
    except Exception as e:
        logging.error(f"Error estimating bias: {str(e)}")
        return 5
```

### Propaganda Detection

```python
def estimate_propaganda(text):
    """Estimate propaganda level on a 1-10 scale (10 being no propaganda)"""
    if not text:
        return 5  # Default middle value
    
    try:
        text = text.lower()
        
        # Simplified propaganda detection
        propaganda_indicators = [
            "must", "always", "never", "every", "all", "none", "everyone", "nobody",
            "undoubtedly", "certainly", "absolutely", "obviously", "clearly", "definitely",
            "!!", "??", "BREAKING", "EXCLUSIVE"
        ]
        
        # Count indicator presence
        indicator_count = sum(indicator in text for indicator in propaganda_indicators)
        
        # Calculate score (inverse - higher is less propaganda)
        word_count = len(re.findall(r'\w+', text))
        if word_count == 0:
            return 5
            
        density = indicator_count / (word_count / 100)  # Per 100 words
        return min(10, max(1, 10 - density))
    except Exception as e:
        logging.error(f"Error estimating propaganda: {str(e)}")
        return 5
```

### Topic Classification

```python
def extract_topics(text, title):
    """Extract likely topics from article content"""
    if not text and not title:
        return ["uncategorized"]
    
    combined_text = f"{title} {text or ''}"
    combined_text = combined_text.lower()
    
    # Simple topic mapping based on keywords
    topic_keywords = {
        "politics": ["politics", "government", "election", "president", "congress", "senate", "democracy"],
        "business": ["business", "economy", "market", "stock", "finance", "company", "industry"],
        "technology": ["technology", "tech", "ai", "software", "hardware", "internet", "app", "digital"],
        "science": ["science", "research", "study", "discovery", "scientist", "physics", "chemistry", "biology"],
        "health": ["health", "medical", "medicine", "disease", "doctor", "patient", "hospital", "wellness"],
        "sports": ["sports", "game", "team", "player", "tournament", "championship", "league", "score"],
        "entertainment": ["entertainment", "movie", "film", "music", "celebrity", "actor", "director", "tv", "television"],
        "world": ["world", "international", "global", "foreign", "country", "nation", "diplomatic", "crisis"]
    }
    
    detected_topics = []
    for topic, keywords in topic_keywords.items():
        if any(keyword in combined_text for keyword in keywords):
            detected_topics.append(topic)
    
    return detected_topics or ["uncategorized"]
```

## API Performance Considerations

### Optimization Strategies

1. **MongoDB Indexing**
   - Index on article URLs for deduplication
   - Compound indexes for multi-dimensional filtering
   - TTL index on published_date for automatic archiving

2. **Query Optimization**
   - Two-stage filtering: Database query + in-memory refinement
   - Limit + Skip pagination for large result sets
   - Projection to retrieve only needed fields

3. **Caching Strategy**
   - Cache frequently accessed articles
   - Cache classification results for unchanged content
   - Cache user preference query results

## Scaling Considerations

### Horizontal Scaling

1. **Crawler Service**
   - Distribute feed crawling across multiple workers
   - Use message queue for feed processing tasks
   - Implement rate limiting per domain

2. **Article Processing**
   - Process articles in parallel
   - Scale classification workers independently
   - Batch processing for efficiency

### Vertical Scaling

1. **Database Optimization**
   - Increase MongoDB memory allocation
   - SSD storage for improved I/O performance
   - Sharding for very large article collections

2. **Application Server**
   - Increase memory for larger batch processing
   - Optimize CPU allocation for classification tasks

## Monitoring and Maintenance

### Key Metrics

1. **Crawler Performance**
   - Feeds processed per hour
   - Article fetch success rate
   - Average processing time per feed

2. **Classification Accuracy**
   - Consistency of classifications
   - User feedback on classification accuracy
   - Classification failure rate

3. **System Health**
   - Database query performance
   - API response times
   - Error rates by endpoint

### Maintenance Tasks

1. **Regular Maintenance**
   - Remove inactive feeds
   - Archive older articles
   - Optimize database indexes

2. **Classification Improvement**
   - Regular updates to classification algorithms
   - Training data expansion for AI-based classification
   - User feedback incorporation

## Development Roadmap

### Short-term (1-3 months)

1. **Performance Improvements**
   - Optimize classification algorithms
   - Implement caching layer
   - Improve error handling and recovery

2. **Feature Enhancements**
   - Advanced search functionality
   - User feedback on article classifications
   - Content recommendation system

### Medium-term (3-6 months)

1. **AI Integration**
   - ML-based classification models
   - Sentiment analysis
   - Entity recognition

2. **Platform Expansion**
   - Mobile-responsive design improvements
   - Progressive Web App capabilities
   - Email digests based on preferences

### Long-term (6-12 months)

1. **Advanced Features**
   - Personalized article summaries
   - Cross-source fact checking
   - Dynamic content discovery

2. **Infrastructure**
   - Microservices architecture
   - Containerization with Docker
   - Kubernetes deployment

---

## Appendix A: Deployment Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│                 │     │                 │     │                 │
│  React Frontend │────▶│  FastAPI Backend│────▶│  MongoDB        │
│                 │     │                 │     │                 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               │
                               ▼
                        ┌─────────────────┐
                        │                 │
                        │  RSS Crawler    │
                        │  (Background)   │
                        │                 │
                        └─────────────────┘
```

## Appendix B: Database Schema

### Articles Collection

```javascript
{
  "_id": ObjectId,
  "id": String,  // UUID
  "title": String,
  "url": String,
  "source": String,
  "source_id": String,
  "author": String,
  "published_date": Date,
  "summary": String,
  "content": String,
  "image_url": String,
  "is_paywalled": Boolean,
  "classification": {
    "reading_level": Number,
    "information_density": Number,
    "bias_score": Number,
    "propaganda_score": Number,
    "length": Number,
    "topics": [String],
    "region": String
  },
  "created_at": Date
}
```

### Feeds Collection

```javascript
{
  "_id": ObjectId,
  "id": String,  // UUID
  "url": String,
  "name": String,
  "category": String,
  "region": String,
  "active": Boolean,
  "last_checked": Date
}
```

### Users Collection

```javascript
{
  "_id": ObjectId,
  "id": String,  // UUID
  "email": String,
  "username": String,
  "password": String,  // Hashed
  "created_at": Date,
  "preferences": {
    "reading_level": Number,
    "information_density": Number,
    "bias_threshold": Number,
    "propaganda_threshold": Number,
    "max_length": Number,
    "min_length": Number,
    "topics": [String],
    "regions": [String],
    "show_paywalled": Boolean,
    "topics_filter_type": String,
    "max_age_days": Number
  }
}
```

## Appendix C: Frontend Component Structure

```
App
├── AuthProvider
│   ├── AuthContext
│   └── useAuth hook
├── BrowserRouter
│   ├── Navbar
│   └── Routes
│       ├── HomeWithFallback
│       │   └── Home
│       │       ├── FilterBar
│       │       └── ArticleCard
│       ├── Login
│       ├── Register
│       ├── Preferences
│       ├── AdminPanel
│       └── FeedDetail
└── Footer
```

---

&copy; 2025 NewsAlgo Team
