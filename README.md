# NewsAlgo: Customizable News Feed Aggregator

## Overview

NewsAlgo is a personalized news aggregation platform that puts users in control of their news feed algorithm. Unlike traditional news platforms with opaque recommendation systems, NewsAlgo allows users to explicitly customize their content filters based on reading level, information density, bias, propaganda likelihood, content length, topics, and geographic regions.

The system crawls RSS feeds from diverse sources, classifies articles using advanced metrics, and presents content tailored to each user's specific preferences. NewsAlgo empowers readers to create their ideal news experience while promoting transparency in content filtering.

## Key Features

### For Users
- **Customizable News Feed**: Adjust sliders and toggles to personalize your content experience
- **Multi-dimensional Filtering**:
  - Reading Level (simple to complex)
  - Information Density (light to dense)
  - Bias Threshold (any bias to neutral only)
  - Propaganda Detection (any content to filtered)
  - Content Length
  - Geographic Focus (by region)
  - Topic Selection with AND/OR logic
- **Content Discovery**: Explore articles across multiple dimensions not available in traditional news platforms
- **Paywall Detection**: Articles behind paywalls are clearly marked
- **User Accounts**: Save preferences between sessions

### For Administrators
- **RSS Feed Management**: Add, remove, and process feeds from diverse sources
- **Feed Analytics**: View feed statistics and performance metrics
- **Article Classification**: Review how articles are classified across all dimensions
- **Manual Processing**: Trigger feed processing on demand

## Technical Architecture

NewsAlgo is built on a modern full-stack architecture:

### Backend
- **FastAPI**: High-performance Python web framework
- **MongoDB**: NoSQL database for storing articles, feeds, and user data
- **Scheduled Tasks**: Background processing for hourly RSS feed updates
- **Classification Engine**: Analyzes articles across multiple dimensions:
  - Linguistic complexity analysis for reading level
  - Information density calculation
  - Bias detection algorithms
  - Propaganda recognition patterns
  - Geographic and topic classification

### Frontend
- **React**: Component-based UI library
- **Tailwind CSS**: Utility-first CSS framework for responsive design
- **JWT Authentication**: Secure user sessions and API access
- **Responsive Design**: Mobile-friendly interface

### System Components
- **RSS Crawler**: Fetches content from >1000 feeds
- **Article Processor**: Extracts and classifies content
- **User Preference Engine**: Matches articles to user preferences
- **Admin Interface**: Feed and system management

## Classification System

NewsAlgo's core functionality relies on its multi-dimensional classification system:

### Reading Level (Scale: 1-10)
Measures linguistic complexity based on:
- Sentence length and structure
- Vocabulary complexity
- Grammatical sophistication
- Required background knowledge

### Information Density (Scale: 1-10)
Evaluates the ratio of unique information to word count:
- Unique vocabulary ratio
- Information-to-filler ratio
- Data and fact density
- Conceptual complexity

### Bias Score (Scale: 1-10)
Detects political and ideological leanings:
- Language sentiment analysis
- Source reputation consideration
- Political keyword detection
- Balanced presentation of viewpoints

### Propaganda Score (Scale: 1-10)
Identifies persuasive techniques and manipulation:
- Emotional manipulation detection
- Logical fallacy recognition
- Exaggeration and absolutist language
- Appeal to authority patterns

### Topic Classification
Categorizes articles by subject matter:
- Politics
- Business
- Technology
- Science
- Health
- Sports
- Entertainment
- World News

### Geographic Classification
Tags content by regional focus:
- North America
- Europe
- Asia
- Middle East
- Africa
- South America
- Oceania

## User Preference System

NewsAlgo's preference system allows users to:

1. **Set Thresholds**: Define minimum acceptable values for each metric
2. **Filter Topics**: Select topics of interest
3. **Choose Regions**: Filter by geographic focus
4. **Topic Logic**: Use AND/OR operators for precise content filtering
5. **Article Age**: Control recency of content (1-90 days)
6. **Paywall Settings**: Include or exclude paywalled content

## Installation and Setup

### Prerequisites
- Node.js (v14+)
- Python (v3.8+)
- MongoDB (v4+)

### Backend Setup

```bash
# Navigate to backend directory
cd /app/backend

# Install dependencies
pip install -r requirements.txt

# Start the backend server
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd /app/frontend

# Install dependencies
yarn install

# Start the frontend development server
yarn start
```

### Environment Variables

Create the following .env files:

**Backend (.env)**
```
MONGO_URL=mongodb://localhost:27017/newsalgo
SECRET_KEY=your_secret_key
```

**Frontend (.env)**
```
REACT_APP_BACKEND_URL=http://localhost:8001/api
```

## API Documentation

### Authentication Endpoints

#### POST /api/token
Authenticate user and retrieve JWT token.
- **Request Body**: 
  - username: string
  - password: string
- **Response**: 
  - access_token: string
  - token_type: string

#### POST /api/users
Register a new user.
- **Request Body**:
  - email: string
  - username: string
  - password: string
- **Response**: User object

### Article Endpoints

#### GET /api/articles
Get articles filtered by user preferences.
- **Headers**: Authorization: Bearer {token}
- **Query Parameters**:
  - limit: int (default: 50)
  - skip: int (default: 0)
- **Response**: Array of article objects

#### GET /api/articles/{article_id}
Get a specific article by ID.
- **Response**: Article object

### User Preference Endpoints

#### GET /api/users/me
Get current user profile.
- **Headers**: Authorization: Bearer {token}
- **Response**: User object with preferences

#### PUT /api/users/me/preferences
Update user preferences.
- **Headers**: Authorization: Bearer {token}
- **Request Body**: UserPreferences object
- **Response**: Updated UserPreferences object

### Feed Management Endpoints

#### GET /api/feeds
List all RSS feeds.
- **Response**: Array of feed objects

#### POST /api/feeds
Add a new RSS feed.
- **Headers**: Authorization: Bearer {token}
- **Request Body**:
  - url: string
  - name: string
  - category: string
  - region: string
- **Response**: Feed object

#### DELETE /api/feeds/{feed_id}
Delete an RSS feed.
- **Headers**: Authorization: Bearer {token}
- **Response**: Success message

#### POST /api/feeds/{feed_id}/process
Trigger processing for a specific feed.
- **Headers**: Authorization: Bearer {token}
- **Response**: Success message

#### POST /api/process-all-feeds
Trigger processing for all feeds.
- **Headers**: Authorization: Bearer {token}
- **Response**: Success message

## Data Models

### Article
```json
{
  "id": "string",
  "title": "string",
  "url": "string",
  "source": "string",
  "source_id": "string",
  "author": "string (optional)",
  "published_date": "datetime (optional)",
  "summary": "string (optional)",
  "content": "string (optional)",
  "image_url": "string (optional)",
  "is_paywalled": "boolean",
  "classification": {
    "reading_level": "float (1-10)",
    "information_density": "float (1-10)",
    "bias_score": "float (1-10)",
    "propaganda_score": "float (1-10)",
    "length": "integer",
    "topics": ["string"],
    "region": "string"
  },
  "created_at": "datetime"
}
```

### User Preferences
```json
{
  "reading_level": "integer (1-10)",
  "information_density": "integer (1-10)",
  "bias_threshold": "integer (1-10)",
  "propaganda_threshold": "integer (1-10)",
  "max_length": "integer",
  "min_length": "integer",
  "topics": ["string"],
  "regions": ["string"],
  "show_paywalled": "boolean",
  "topics_filter_type": "string (AND/OR)",
  "max_age_days": "integer"
}
```

### RSS Feed
```json
{
  "id": "string",
  "url": "string",
  "name": "string",
  "category": "string",
  "region": "string",
  "active": "boolean",
  "last_checked": "datetime (optional)"
}
```

## Administration Guide

### Managing RSS Feeds

1. **Add New Feeds**:
   - Navigate to Admin Panel
   - Click "Add New Feed"
   - Enter feed URL, name, category, and region
   - Submit the form

2. **Process Feeds**:
   - Individual feeds: Click "Process" button next to a feed
   - All feeds: Click "Process All Feeds" button

3. **View Feed Articles**:
   - Click on a feed name to view all articles from that source
   - Review classification metrics for each article

### Scheduled Tasks

The system automatically processes all active feeds hourly using a background scheduler. This ensures content stays fresh without manual intervention.

## Customization Guide

### Adding New Classification Dimensions

The system is designed to be extensible. To add new classification dimensions:

1. Add the new metric to the `ArticleClassification` model in `server.py`
2. Implement the classification function in the backend
3. Update the UI components to include the new filter controls
4. Modify the article filtering logic to incorporate the new dimension

### Adding New Feed Sources

To add support for new feed types beyond RSS:

1. Create a new fetcher function in the backend
2. Implement the specific parser for that feed type
3. Add the new feed type to the admin interface

## Future Enhancements

### Planned Features

1. **AI-Powered Classification**:
   - Machine learning models for more accurate classification
   - Sentiment analysis for emotional content detection
   - Entity recognition for more precise topic mapping

2. **Enhanced User Experience**:
   - Content recommendation based on reading history
   - Saved article collections
   - Social sharing capabilities

3. **Advanced Feed Management**:
   - Feed reliability metrics
   - Content source diversity analytics
   - Trending topic identification

4. **Mobile Applications**:
   - Native iOS and Android apps
   - Offline reading capability

## Contributing

We welcome contributions to the NewsAlgo project. To contribute:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Contact

For questions or support, please contact the project maintainers.

---

&copy; 2025 NewsAlgo Team. All rights reserved.
