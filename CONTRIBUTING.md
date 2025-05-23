# Contributing to NewsAlgo

Thank you for your interest in contributing to NewsAlgo! This document provides guidelines and instructions for developers who want to contribute to the project.

## Table of Contents

1. [Development Environment Setup](#development-environment-setup)
2. [Project Structure](#project-structure)
3. [Coding Standards](#coding-standards)
4. [Git Workflow](#git-workflow)
5. [Testing](#testing)
6. [Documentation](#documentation)
7. [Adding New Features](#adding-new-features)

## Development Environment Setup

### Prerequisites

- Python 3.8+
- Node.js 14+
- MongoDB 4.4+
- Git

### Backend Setup

```bash
# Clone the repository
git clone https://github.com/yourusername/newsalgo.git
cd newsalgo

# Create a virtual environment
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the backend server
python -m uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

### Frontend Setup

```bash
# Navigate to frontend directory
cd frontend

# Install dependencies
yarn install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration

# Start the frontend development server
yarn start
```

### Database Setup

```bash
# Start MongoDB (if not using a cloud instance)
mongod --dbpath=/path/to/data/db

# Seed the database with initial data
cd scripts
python setup_feeds.py
python init_admin.py
```

## Project Structure

### Backend Structure

```
/backend/
├── server.py             # Main FastAPI application
├── requirements.txt      # Python dependencies
└── .env                  # Environment variables
```

### Frontend Structure

```
/frontend/
├── public/               # Static assets
├── src/                  # React source code
│   ├── components/       # Reusable UI components
│   ├── pages/            # Page components
│   ├── contexts/         # React contexts
│   ├── hooks/            # Custom React hooks
│   ├── utils/            # Helper functions
│   ├── App.js            # Main React component
│   ├── App.css           # Component styles
│   ├── index.js          # Entry point
│   └── index.css         # Global styles
├── package.json          # Node.js dependencies
└── .env                  # Environment variables
```

## Coding Standards

### Python (Backend)

- Follow PEP 8 style guidelines
- Use type hints where appropriate
- Document functions with docstrings
- Use async/await for database operations

### JavaScript/React (Frontend)

- Use ES6+ features
- Follow React Hooks patterns
- Use functional components
- Add JSDoc comments for complex functions
- Use PropTypes for component props

### General Guidelines

- Keep functions small and focused
- Write meaningful variable and function names
- Add comments for complex logic
- Use consistent indentation (2 spaces for JS, 4 spaces for Python)

## Git Workflow

1. **Fork the repository**
2. **Create a feature branch**
   ```
   git checkout -b feature/your-feature-name
   ```
3. **Make your changes**
4. **Write tests**
5. **Commit your changes with descriptive messages**
   ```
   git commit -m "Add: detailed description of your changes"
   ```
6. **Push to your fork**
   ```
   git push origin feature/your-feature-name
   ```
7. **Create a pull request**

### Commit Message Format

- Use prefixes for commit messages:
  - `Add:` for new features
  - `Fix:` for bug fixes
  - `Update:` for non-breaking changes
  - `Refactor:` for code refactoring
  - `Docs:` for documentation updates
  - `Test:` for adding or updating tests

## Testing

### Backend Testing

```bash
# Run backend tests
cd backend
pytest
```

### Frontend Testing

```bash
# Run frontend tests
cd frontend
yarn test
```

### End-to-End Testing

```bash
# Run E2E tests
cd tests
python e2e_tests.py
```

## Documentation

- Document all new functions, classes, and components
- Update README.md for major changes
- Keep API documentation current
- Add usage examples for new features

## Adding New Features

### Adding a New Classification Dimension

1. **Update the data models**
   - Add the new dimension to `ArticleClassification` in `server.py`
   - Add default value to `UserPreferences`

2. **Implement the classification algorithm**
   - Create a new function in `server.py` to calculate the metric

3. **Update article processing**
   - Add your new function to the article classification process

4. **Add UI controls**
   - Create slider or filter control in `FilterBar` component
   - Add visual indicator in `ArticleCard` component

5. **Update filtering logic**
   - Add the new dimension to the filtering algorithm in the backend
   - Update the preference handling in the frontend

### Adding a New Feed Type

1. **Extend the feed model**
   - Add new fields to the `RSSFeed` model if needed

2. **Create a parser for the new feed type**
   - Implement a function similar to `fetch_rss_feed` for the new type

3. **Update feed processing**
   - Add conditional logic to use the appropriate parser

4. **Update the admin interface**
   - Add UI elements for managing the new feed type

## Optimization Guidelines

- Use database indexes for frequently queried fields
- Implement caching for expensive operations
- Use pagination for large result sets
- Profile and optimize slow functions
- Consider background tasks for long-running operations

## Security Considerations

- Validate all user inputs
- Sanitize data displayed to users
- Use parameterized queries for database operations
- Keep dependencies up-to-date
- Follow OWASP security guidelines

---

Thank you for contributing to NewsAlgo! If you have any questions, please reach out to the project maintainers.
