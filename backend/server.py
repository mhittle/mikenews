from fastapi import FastAPI, APIRouter, HTTPException, Depends, status, BackgroundTasks
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import uuid
import feedparser
import requests
import schedule
import time
import threading
import re
import json
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
# Try to import newspaper, but handle ImportError
try:
    from newspaper import Article as NewspaperArticle
    newspaper_available = True
except ImportError:
    newspaper_available = False
    print("Newspaper3k module not available, will use simplified article extraction")
from nltk.tokenize import sent_tokenize
import nltk
import asyncio
import statistics

# Download required NLTK data
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ.get('DB_NAME', 'news_aggregator')]

# Security configuration
SECRET_KEY = os.environ.get("SECRET_KEY", "a_default_secret_key_for_development_only")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24 * 7  # 7 days

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Scheduler flag
scheduler_started = False

# Define Models
class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None

class UserBase(BaseModel):
    email: EmailStr
    username: str

class UserCreate(UserBase):
    password: str

class UserPreferences(BaseModel):
    reading_level: int = 5  # 1-10 scale
    information_density: int = 5  # 1-10 scale
    bias_threshold: int = 5  # 1-10 scale (10 being completely neutral)
    propaganda_threshold: int = 5  # 1-10 scale (10 being no propaganda)
    max_length: int = 5000  # words
    min_length: int = 0  # words
    topics: List[str] = []
    regions: List[str] = []
    show_paywalled: bool = True
    topics_filter_type: str = "OR"  # "AND" or "OR"

class User(UserBase):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    created_at: datetime = Field(default_factory=datetime.utcnow)
    preferences: UserPreferences = Field(default_factory=UserPreferences)
    password: Optional[str] = None

class RSSFeed(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    url: str
    name: str
    category: str
    region: str
    active: bool = True
    last_checked: Optional[datetime] = None

class RSSFeedCreate(BaseModel):
    url: str
    name: str
    category: str
    region: str

class ArticleClassification(BaseModel):
    reading_level: float  # 1-10 scale
    information_density: float  # 1-10 scale
    bias_score: float  # 1-10 scale (10 being completely neutral)
    propaganda_score: float  # 1-10 scale (10 being no propaganda)
    length: int  # words
    topics: List[str]
    region: str

class Article(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    title: str
    url: str
    source: str
    source_id: str
    author: Optional[str] = None
    published_date: Optional[datetime] = None
    summary: Optional[str] = None
    content: Optional[str] = None
    image_url: Optional[str] = None
    is_paywalled: bool = False
    classification: Optional[ArticleClassification] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Authentication functions
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_user(username: str):
    user_dict = await db.users.find_one({"username": username})
    if user_dict:
        # Need to handle password separately since it's not part of the User model
        password = user_dict.pop("password", None)
        user = User(**user_dict)
        user.password = password
        return user

async def authenticate_user(username: str, password: str):
    user = await get_user(username)
    if not user:
        return False
    if not verify_password(password, user.password):
        return False
    return user

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
        token_data = TokenData(username=username)
    except JWTError:
        raise credentials_exception
    user = await get_user(username=token_data.username)
    if user is None:
        raise credentials_exception
    return user

# RSS and Article Processing Functions
async def fetch_rss_feed(feed: RSSFeed):
    try:
        feed_data = feedparser.parse(feed.url)
        articles = []
        
        for entry in feed_data.entries:
            # Extract basic data
            article = Article(
                title=entry.get('title', ''),
                url=entry.get('link', ''),
                source=feed.name,
                source_id=feed.id,
                published_date=datetime.fromtimestamp(time.mktime(entry.published_parsed)) if hasattr(entry, 'published_parsed') else None,
                summary=entry.get('summary', ''),
            )
            
            articles.append(article)
        
        # Update feed's last checked timestamp
        await db.rss_feeds.update_one(
            {"id": feed.id},
            {"$set": {"last_checked": datetime.utcnow()}}
        )
        
        return articles
    except Exception as e:
        logging.error(f"Error fetching RSS feed {feed.url}: {str(e)}")
        return []

async def detect_paywall(article: Article):
    """Simple heuristic to detect paywalls"""
    try:
        response = requests.get(article.url, timeout=10)
        content = response.text.lower()
        
        paywall_indicators = [
            "subscribe now", "subscription required", "pay wall", "paywall",
            "subscribe to continue", "premium content", "premium article",
            "to continue reading", "create an account to read"
        ]
        
        article.is_paywalled = any(indicator in content for indicator in paywall_indicators)
        return article.is_paywalled
    except Exception as e:
        logging.error(f"Error detecting paywall for {article.url}: {str(e)}")
        return False

async def extract_full_article(article: Article):
    """Extract full article content using newspaper3k if available, or fallback to simple extraction"""
    try:
        if newspaper_available:
            news_article = NewspaperArticle(article.url)
            news_article.download()
            news_article.parse()
            
            article.content = news_article.text
            article.author = news_article.authors[0] if news_article.authors else None
            article.image_url = news_article.top_image
        else:
            # Simple fallback extraction
            response = requests.get(article.url, timeout=10)
            
            # Basic extraction of article content
            # This is a very simplified approach - won't work well on many sites
            from bs4 import BeautifulSoup
            soup = BeautifulSoup(response.text, 'html.parser')
            
            # Try to find main content - this is a simple approach
            # Real extraction requires more sophisticated methods
            content_elements = soup.find_all(['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'])
            content = ' '.join([el.get_text() for el in content_elements])
            
            # Try to find author
            author_elements = soup.find_all(['a', 'span', 'div'], string=lambda text: text and 'by' in text.lower())
            author = author_elements[0].get_text().replace('By', '').replace('by', '').strip() if author_elements else None
            
            # Try to find main image
            image_element = soup.find('meta', property='og:image')
            image_url = image_element['content'] if image_element else None
            
            article.content = content
            article.author = author
            article.image_url = image_url
        
        return article
    except Exception as e:
        logging.error(f"Error extracting content from {article.url}: {str(e)}")
        return article

def calculate_reading_level(text):
    """Calculate approximate reading level on a 1-10 scale"""
    if not text:
        return 5  # Default middle value
    
    try:
        sentences = sent_tokenize(text)
        avg_sentence_length = sum(len(s.split()) for s in sentences) / len(sentences)
        
        # Very simple formula based on avg sentence length
        # This is a placeholder - a more sophisticated algorithm would be better
        reading_level = min(10, max(1, avg_sentence_length / 3))
        return reading_level
    except Exception as e:
        logging.error(f"Error calculating reading level: {str(e)}")
        return 5

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

def determine_region(article_text, feed_region):
    """Determine the geographic region of an article"""
    if not article_text:
        return feed_region
    
    article_text = article_text.lower()
    
    # Map of regions and associated keywords
    region_keywords = {
        "north_america": ["united states", "u.s.", "us", "america", "canada", "mexico"],
        "europe": ["europe", "european union", "eu", "uk", "britain", "germany", "france", "italy", "spain"],
        "asia": ["asia", "china", "japan", "india", "korea", "singapore", "thailand", "vietnam"],
        "middle_east": ["middle east", "israel", "palestine", "iran", "iraq", "saudi arabia", "turkey"],
        "africa": ["africa", "nigeria", "egypt", "south africa", "kenya", "ethiopia"],
        "south_america": ["south america", "brazil", "argentina", "colombia", "chile", "peru"],
        "oceania": ["australia", "new zealand", "pacific", "oceania"]
    }
    
    for region, keywords in region_keywords.items():
        if any(keyword in article_text for keyword in keywords):
            return region
    
    # Default to feed region if no region detected
    return feed_region

async def classify_article(article: Article, feed_region: str):
    """Perform article classification"""
    if not article.content:
        article = await extract_full_article(article)
    
    if not article.content:
        return None
    
    # Calculate metrics
    reading_level = calculate_reading_level(article.content)
    info_density = calculate_information_density(article.content)
    bias_score = estimate_bias(article.content)
    propaganda_score = estimate_propaganda(article.content)
    word_count = len(re.findall(r'\w+', article.content))
    topics = extract_topics(article.content, article.title)
    region = determine_region(article.content, feed_region)
    
    # Create classification
    classification = ArticleClassification(
        reading_level=reading_level,
        information_density=info_density,
        bias_score=bias_score,
        propaganda_score=propaganda_score,
        length=word_count,
        topics=topics,
        region=region
    )
    
    return classification

async def process_article(article: Article, feed_region: str):
    """Process an article - detect paywall, extract content, classify"""
    try:
        # Skip processing if already in database
        existing = await db.articles.find_one({"url": article.url})
        if existing:
            return None
        
        # Detect paywall
        await detect_paywall(article)
        
        # Extract full content
        if not article.is_paywalled:
            article = await extract_full_article(article)
        
        # Classify article
        article.classification = await classify_article(article, feed_region)
        
        # Save to database
        article_dict = article.dict()
        await db.articles.insert_one(article_dict)
        
        return article
    except Exception as e:
        logging.error(f"Error processing article {article.url}: {str(e)}")
        return None

async def process_feed(feed_id: str):
    """Process a single RSS feed"""
    feed_dict = await db.rss_feeds.find_one({"id": feed_id})
    if not feed_dict:
        return
    
    feed = RSSFeed(**feed_dict)
    articles = await fetch_rss_feed(feed)
    
    for article in articles:
        await process_article(article, feed.region)

async def process_all_feeds():
    """Process all active RSS feeds"""
    logging.info("Starting scheduled feed processing")
    feeds = await db.rss_feeds.find({"active": True}).to_list(length=None)
    
    for feed_dict in feeds:
        feed = RSSFeed(**feed_dict)
        await process_feed(feed.id)
    
    logging.info("Completed scheduled feed processing")

def run_feed_processor():
    """Run the feed processor in a background thread"""
    asyncio.run(process_all_feeds())

def start_scheduler():
    """Start the scheduler if not already running"""
    global scheduler_started
    if not scheduler_started:
        # Schedule the job to run every hour
        schedule.every(1).hours.do(run_feed_processor)
        
        # Run the scheduler in a separate thread
        def run_scheduler():
            while True:
                schedule.run_pending()
                time.sleep(60)  # Check every minute
        
        scheduler_thread = threading.Thread(target=run_scheduler, daemon=True)
        scheduler_thread.start()
        scheduler_started = True
        logging.info("Scheduler started")

# API Routes
@api_router.post("/token", response_model=Token)
async def login_for_access_token(form_data: OAuth2PasswordRequestForm = Depends()):
    user = await authenticate_user(form_data.username, form_data.password)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@api_router.post("/users", response_model=User)
async def create_user(user: UserCreate):
    # Check if username already exists
    existing_user = await db.users.find_one({"username": user.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists
    existing_email = await db.users.find_one({"email": user.email})
    if existing_email:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )
    
    # Create new user
    hashed_password = get_password_hash(user.password)
    user_dict = user.dict()
    user_dict.pop("password")
    user_obj = User(**user_dict)
    user_dict = user_obj.dict()
    user_dict["password"] = hashed_password
    
    await db.users.insert_one(user_dict)
    return user_obj

@api_router.get("/users/me", response_model=User)
async def read_users_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.put("/users/me/preferences", response_model=UserPreferences)
async def update_preferences(
    preferences: UserPreferences,
    current_user: User = Depends(get_current_user)
):
    # Update preferences
    await db.users.update_one(
        {"id": current_user.id},
        {"$set": {"preferences": preferences.dict()}}
    )
    return preferences

@api_router.post("/feeds", response_model=RSSFeed)
async def create_feed(
    feed: RSSFeedCreate,
    current_user: User = Depends(get_current_user)
):
    # Check if feed URL already exists
    existing_feed = await db.rss_feeds.find_one({"url": feed.url})
    if existing_feed:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Feed URL already exists"
        )
    
    # Create new feed
    feed_obj = RSSFeed(**feed.dict())
    await db.rss_feeds.insert_one(feed_obj.dict())
    return feed_obj

@api_router.get("/feeds", response_model=List[RSSFeed])
async def list_feeds():
    feeds = await db.rss_feeds.find().to_list(length=None)
    return [RSSFeed(**feed) for feed in feeds]

@api_router.delete("/feeds/{feed_id}")
async def delete_feed(
    feed_id: str,
    current_user: User = Depends(get_current_user)
):
    result = await db.rss_feeds.delete_one({"id": feed_id})
    if result.deleted_count == 0:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found"
        )
    return {"message": "Feed deleted successfully"}

@api_router.post("/feeds/{feed_id}/process", response_model=dict)
async def trigger_feed_processing(
    feed_id: str,
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    # Check if feed exists
    feed = await db.rss_feeds.find_one({"id": feed_id})
    if not feed:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Feed not found"
        )
    
    # Process feed in background
    background_tasks.add_task(process_feed, feed_id)
    return {"message": "Feed processing started"}

@api_router.post("/process-all-feeds", response_model=dict)
async def trigger_all_feeds_processing(
    background_tasks: BackgroundTasks,
    current_user: User = Depends(get_current_user)
):
    background_tasks.add_task(process_all_feeds)
    return {"message": "Processing all feeds started"}

@api_router.get("/articles", response_model=List[Article])
async def list_articles(
    limit: int = 50,
    skip: int = 0,
    current_user: Optional[User] = Depends(get_current_user)
):
    # Apply user preferences if a user is logged in
    if current_user:
        prefs = current_user.preferences
        
        # Construct query based on user preferences
        query = {}
        
        # Handle paywalled content preference
        if not prefs.show_paywalled:
            query["is_paywalled"] = False
        
        # Topic preferences if specified
        if prefs.topics:
            if prefs.topics_filter_type == "AND":
                # For AND logic, each topic must be present
                for topic in prefs.topics:
                    query["classification.topics"] = {"$all": prefs.topics}
            else:
                # Default OR logic
                query["classification.topics"] = {"$in": prefs.topics}
        
        # Region preferences if specified
        if prefs.regions:
            query["classification.region"] = {"$in": prefs.regions}
        
        # Content length preferences
        length_query = {}
        if prefs.min_length > 0:
            length_query["$gte"] = prefs.min_length
        if prefs.max_length < 5000:
            length_query["$lte"] = prefs.max_length
        if length_query:
            query["classification.length"] = length_query
        
        # Get articles matching query
        articles = await db.articles.find(query).sort("published_date", -1).skip(skip).limit(limit).to_list(length=None)
        
        # Further filter based on numerical thresholds
        filtered_articles = []
        for article_dict in articles:
            article = Article(**article_dict)
            if not article.classification:
                continue
                
            # Skip if below thresholds
            if (article.classification.reading_level < prefs.reading_level - 2 or 
                article.classification.reading_level > prefs.reading_level + 2 or
                article.classification.information_density < prefs.information_density - 2 or
                article.classification.information_density > prefs.information_density + 2 or
                article.classification.bias_score < prefs.bias_threshold or
                article.classification.propaganda_score < prefs.propaganda_threshold):
                continue
                
            filtered_articles.append(article)
        
        return filtered_articles[:limit]
    else:
        # No user preferences, return latest articles
        articles = await db.articles.find().sort("published_date", -1).skip(skip).limit(limit).to_list(length=None)
        return [Article(**article) for article in articles]

@api_router.get("/articles/{article_id}", response_model=Article)
async def get_article(article_id: str):
    article = await db.articles.find_one({"id": article_id})
    if not article:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Article not found"
        )
    return Article(**article)

@api_router.get("/feeds/stats", response_model=Dict[str, Any])
async def get_feed_stats():
    # Get feed counts
    total_feeds = await db.rss_feeds.count_documents({})
    active_feeds = await db.rss_feeds.count_documents({"active": True})
    
    # Get article counts
    total_articles = await db.articles.count_documents({})
    paywalled_articles = await db.articles.count_documents({"is_paywalled": True})
    
    # Get category distribution
    category_pipeline = [
        {"$group": {"_id": "$category", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    categories = await db.rss_feeds.aggregate(category_pipeline).to_list(length=None)
    
    # Get region distribution
    region_pipeline = [
        {"$group": {"_id": "$region", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}}
    ]
    regions = await db.rss_feeds.aggregate(region_pipeline).to_list(length=None)
    
    return {
        "total_feeds": total_feeds,
        "active_feeds": active_feeds,
        "total_articles": total_articles,
        "paywalled_articles": paywalled_articles,
        "categories": categories,
        "regions": regions
    }

# Root endpoint
@api_router.get("/")
async def root():
    return {"message": "News Aggregator API"}

# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Startup and shutdown events
@app.on_event("startup")
async def startup_db_client():
    # Initialize collection indexes
    await db.articles.create_index("url", unique=True)
    await db.rss_feeds.create_index("url", unique=True)
    await db.users.create_index("username", unique=True)
    await db.users.create_index("email", unique=True)
    
    # Start the scheduler
    start_scheduler()

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
