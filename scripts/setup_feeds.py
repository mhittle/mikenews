import asyncio
import os
import sys
from pathlib import Path
import uuid
from datetime import datetime

# Add parent directory to path so we can import from backend
sys.path.append(str(Path(__file__).parent.parent))

from backend.server import db, RSSFeed

# Initial set of RSS feeds across different categories and regions
INITIAL_FEEDS = [
    # News
    {"url": "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml", "name": "New York Times", "category": "news", "region": "north_america"},
    {"url": "https://feeds.bbci.co.uk/news/rss.xml", "name": "BBC News", "category": "news", "region": "europe"},
    {"url": "https://www.theguardian.com/world/rss", "name": "The Guardian World", "category": "news", "region": "europe"},
    {"url": "https://www.npr.org/rss/rss.php?id=1001", "name": "NPR News", "category": "news", "region": "north_america"},
    {"url": "https://www.aljazeera.com/xml/rss/all.xml", "name": "Al Jazeera", "category": "news", "region": "middle_east"},
    {"url": "https://timesofindia.indiatimes.com/rssfeeds/296589292.cms", "name": "Times of India", "category": "news", "region": "asia"},
    
    # Technology
    {"url": "https://www.wired.com/feed/rss", "name": "Wired", "category": "technology", "region": "north_america"},
    {"url": "https://feeds.feedburner.com/TechCrunch/", "name": "TechCrunch", "category": "technology", "region": "north_america"},
    {"url": "https://www.theverge.com/rss/index.xml", "name": "The Verge", "category": "technology", "region": "north_america"},
    {"url": "https://arstechnica.com/feed/", "name": "Ars Technica", "category": "technology", "region": "north_america"},
    
    # Business
    {"url": "https://www.ft.com/rss/home/uk", "name": "Financial Times", "category": "business", "region": "europe"},
    {"url": "https://feeds.bloomberg.com/markets/news.rss", "name": "Bloomberg", "category": "business", "region": "north_america"},
    {"url": "https://www.economist.com/finance-and-economics/rss.xml", "name": "The Economist", "category": "business", "region": "europe"},
    {"url": "https://fortune.com/feed", "name": "Fortune", "category": "business", "region": "north_america"},
    
    # Science
    {"url": "https://www.sciencemag.org/rss/news_current.xml", "name": "Science Magazine", "category": "science", "region": "north_america"},
    {"url": "https://www.nature.com/nature.rss", "name": "Nature", "category": "science", "region": "europe"},
    {"url": "https://www.newscientist.com/feed/home/?cmpid=RSS|NSNS|2012-GLOBAL|home", "name": "New Scientist", "category": "science", "region": "europe"},
    
    # Health
    {"url": "https://rss.medicalnewstoday.com/featurednews.xml", "name": "Medical News Today", "category": "health", "region": "north_america"},
    {"url": "https://www.who.int/feeds/entity/news/en/rss.xml", "name": "WHO News", "category": "health", "region": "europe"},
    {"url": "https://www.health.harvard.edu/blog/feed", "name": "Harvard Health", "category": "health", "region": "north_america"},
    
    # Sports
    {"url": "https://www.espn.com/espn/rss/news", "name": "ESPN", "category": "sports", "region": "north_america"},
    {"url": "https://rss.cbc.ca/lineup/sports.xml", "name": "CBC Sports", "category": "sports", "region": "north_america"},
    {"url": "https://www.skysports.com/rss/0,20514,11095,00.xml", "name": "Sky Sports", "category": "sports", "region": "europe"},
    
    # Entertainment
    {"url": "https://variety.com/feed/", "name": "Variety", "category": "entertainment", "region": "north_america"},
    {"url": "https://www.hollywoodreporter.com/feed", "name": "Hollywood Reporter", "category": "entertainment", "region": "north_america"},
    {"url": "https://deadline.com/feed", "name": "Deadline", "category": "entertainment", "region": "north_america"},
]

async def setup_feeds():
    """Add initial feeds to the database if they don't exist"""
    print("Setting up initial RSS feeds...")
    
    for feed_data in INITIAL_FEEDS:
        # Check if feed already exists
        existing = await db.rss_feeds.find_one({"url": feed_data["url"]})
        if existing:
            print(f"Feed already exists: {feed_data['name']}")
            continue
        
        # Create new feed
        feed = RSSFeed(
            id=str(uuid.uuid4()),
            url=feed_data["url"],
            name=feed_data["name"],
            category=feed_data["category"],
            region=feed_data["region"],
            active=True,
            last_checked=None
        )
        
        await db.rss_feeds.insert_one(feed.dict())
        print(f"Added feed: {feed.name}")
    
    count = await db.rss_feeds.count_documents({})
    print(f"Total feeds in database: {count}")

if __name__ == "__main__":
    asyncio.run(setup_feeds())
