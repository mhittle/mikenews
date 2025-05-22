import asyncio
import os
import sys
from pathlib import Path
import uuid
from datetime import datetime, timedelta
import random

# Add parent directory to path so we can import from backend
sys.path.append(str(Path(__file__).parent.parent))

from backend.server import db, Article, ArticleClassification

# Sample article data with varied attributes
SAMPLE_ARTICLES = [
    {
        "title": "The Future of AI in Healthcare",
        "url": "https://example.com/ai-healthcare",
        "source": "Tech Health Journal",
        "author": "Dr. Jane Smith",
        "summary": "Artificial intelligence is revolutionizing healthcare with improved diagnostics, personalized treatment plans, and predictive analytics for patient care.",
        "content": "Artificial intelligence is transforming healthcare across multiple dimensions. From advanced imaging analysis that can detect conditions earlier than human radiologists, to algorithms that can predict patient deterioration before traditional symptoms appear, the applications are vast and growing. Hospitals are implementing AI systems to optimize resource allocation, reduce administrative burdens, and identify high-risk patients. Pharmaceutical companies are using machine learning to accelerate drug discovery and development. However, challenges remain in data privacy, algorithmic bias, and integration with existing systems. The future will require thoughtful regulation and ethical frameworks to ensure these powerful tools benefit all patients equitably.",
        "is_paywalled": False,
        "classification": {
            "reading_level": 8.5,
            "information_density": 7.2,
            "bias_score": 8.9,
            "propaganda_score": 9.1,
            "length": 120,
            "topics": ["technology", "health", "science"],
            "region": "north_america"
        }
    },
    {
        "title": "Global Markets React to Central Bank Decisions",
        "url": "https://example.com/markets-central-banks",
        "source": "Financial Times",
        "author": "Robert Johnson",
        "summary": "Stock markets worldwide showed mixed reactions today as central banks in Europe and Asia announced their latest interest rate decisions.",
        "content": "Global financial markets experienced volatility following the wave of central bank announcements this week. The European Central Bank maintained its cautious stance, keeping rates steady while signaling potential cuts later in the year if inflation continues to moderate. Meanwhile, the Bank of Japan surprised analysts with a slight increase in rates, reflecting growing confidence in the country's economic recovery. Wall Street traders responded with initial selling before a late-day rally, particularly in financial stocks that benefit from higher interest rate environments. Bond markets saw yield curves flatten slightly as investors processed the implications for long-term economic growth. Currency markets also saw significant movement, with the yen strengthening against major currencies following the Bank of Japan's decision.",
        "is_paywalled": True,
        "classification": {
            "reading_level": 7.8,
            "information_density": 8.5,
            "bias_score": 7.6,
            "propaganda_score": 8.4,
            "length": 130,
            "topics": ["business", "world"],
            "region": "europe"
        }
    },
    {
        "title": "New Study Challenges Climate Change Models",
        "url": "https://example.com/climate-models-study",
        "source": "Science Daily",
        "author": "Maria Chen",
        "summary": "Researchers have published findings that suggest current climate models may be overlooking important feedback mechanisms in ocean circulation patterns.",
        "content": "A groundbreaking study published in Nature Climate Science has identified potential gaps in widely-used climate projection models. The research team, led by oceanographers at the University of Helsinki, conducted a decade-long analysis of deep ocean current data and found that existing models may not adequately account for slow-moving but significant changes in heat distribution patterns across the Atlantic Ocean. These findings could have implications for how scientists project sea level rise and regional climate shifts. However, the researchers emphasize that their work doesn't challenge the fundamental understanding of human-caused climate change, but rather suggests that some regions may experience different impacts than previously anticipated. The scientific community has responded with calls for further research and refinement of existing models.",
        "is_paywalled": False,
        "classification": {
            "reading_level": 9.2,
            "information_density": 9.0,
            "bias_score": 6.5,
            "propaganda_score": 7.8,
            "length": 140,
            "topics": ["science", "world"],
            "region": "europe"
        }
    },
    {
        "title": "Championship Game Sets Viewership Records",
        "url": "https://example.com/championship-viewership",
        "source": "Sports Network",
        "author": "James Wilson",
        "summary": "Last night's championship game broke all previous viewership records with over 112 million people tuning in across television and streaming platforms.",
        "content": "The championship showdown between Kansas City and San Francisco delivered record-breaking audience numbers, according to preliminary data released this morning. Traditional television broadcasts accounted for approximately 98 million viewers, while streaming services added another 14 million, pushing the total audience past the 112 million mark. This represents a 8% increase over last year's championship and the highest viewership for any sporting event in the past five years. Advertising slots during the broadcast commanded unprecedented prices, with 30-second spots selling for an average of $7 million. Social media engagement also reached new heights, with over 25 million posts across major platforms during the game. The halftime show featuring international pop star Maya Rodriguez generated particular interest, with her performance driving a 500% increase in streams of her music immediately following the event.",
        "is_paywalled": False,
        "classification": {
            "reading_level": 6.2,
            "information_density": 5.5,
            "bias_score": 9.4,
            "propaganda_score": 8.9,
            "length": 160,
            "topics": ["sports", "entertainment"],
            "region": "north_america"
        }
    },
    {
        "title": "Tech Giant Announces Major Restructuring",
        "url": "https://example.com/tech-restructuring",
        "source": "Tech Insider",
        "author": "Sarah Lopez",
        "summary": "One of Silicon Valley's largest companies revealed plans for organizational changes that will affect thousands of employees across multiple divisions.",
        "content": "In a move that surprised industry analysts, the tech giant announced a comprehensive restructuring plan that will realign its business units around AI-focused initiatives. The reorganization will create three distinct divisions: consumer AI products, enterprise solutions, and fundamental research. CEO Michael Reynolds described the changes as necessary to 'position the company for the next decade of innovation.' The restructuring will impact approximately 15,000 employees globally, though the company stated that it does not anticipate significant layoffs, instead focusing on retraining and internal transfers. Wall Street responded positively to the announcement, with the company's stock rising 3.7% by market close. The restructuring comes amid increasing competition in the AI space, with several rival firms announcing similar strategic pivots in recent months.",
        "is_paywalled": False,
        "classification": {
            "reading_level": 7.5,
            "information_density": 7.0,
            "bias_score": 8.1,
            "propaganda_score": 8.5,
            "length": 150,
            "topics": ["technology", "business"],
            "region": "north_america"
        }
    },
    {
        "title": "Political Leaders Clash Over Infrastructure Bill",
        "url": "https://example.com/infrastructure-debate",
        "source": "National Politics",
        "author": "Thomas Brown",
        "summary": "The infrastructure funding proposal faced heated debate in yesterday's session, with opposing parties disagreeing on funding mechanisms and project priorities.",
        "content": "The infrastructure bill debate intensified yesterday as lawmakers from both major parties clashed over fundamental aspects of the proposed $1.2 trillion package. Progressive representatives pushed for expanded public transportation funding and climate resilience measures, while conservatives advocated for traditional infrastructure like roads, bridges, and rural broadband expansion. The most contentious issue remains the funding mechanism, with one side proposing tax increases on corporations and high-income individuals, while the other suggests redirecting existing program funds. Several moderate lawmakers have proposed compromise solutions, including public-private partnerships and phased implementation approaches. Regional interests are also complicating negotiations, with representatives from coastal, rural, and urban areas advocating for different priorities. Leadership has set an ambitious timeline for reaching consensus, aiming to bring a finalized bill to vote before the summer recess.",
        "is_paywalled": False,
        "classification": {
            "reading_level": 8.0,
            "information_density": 7.8,
            "bias_score": 5.2,
            "propaganda_score": 6.1,
            "length": 155,
            "topics": ["politics"],
            "region": "north_america"
        }
    },
    {
        "title": "Revolutionary Treatment Shows Promise for Alzheimer's Patients",
        "url": "https://example.com/alzheimers-treatment",
        "source": "Medical Journal",
        "author": "Dr. Michael Thompson",
        "summary": "Clinical trials for a new approach to treating Alzheimer's disease have shown encouraging results in slowing cognitive decline among early-stage patients.",
        "content": "A clinical trial involving 1,200 patients across 50 medical centers has demonstrated significant benefits from a novel treatment approach for Alzheimer's disease. The therapy, which combines targeted immunotherapy with neural stimulation, showed a 37% reduction in cognitive decline rates compared to the control group over an 18-month period. Particularly promising was the impact on patients in the earliest stages of the disease, where intervention appeared to preserve key memory functions and daily living abilities. Side effects were generally mild, with only 3% of participants experiencing adverse reactions that required discontinuation of treatment. The research team, led by neurologists at Johns Hopkins University, emphasized that while not a cure, the approach represents a meaningful advancement in management of a condition that affects millions worldwide. The treatment is now entering expanded trials, with researchers hoping to refine protocols and determine optimal timing for intervention.",
        "is_paywalled": True,
        "classification": {
            "reading_level": 9.0,
            "information_density": 8.8,
            "bias_score": 9.2,
            "propaganda_score": 9.5,
            "length": 170,
            "topics": ["health", "science"],
            "region": "north_america"
        }
    },
    {
        "title": "Film Festival Celebrates Independent Cinema",
        "url": "https://example.com/film-festival",
        "source": "Arts & Culture Today",
        "author": "Elena Rodriguez",
        "summary": "The annual independent film showcase kicked off yesterday with record attendance and an international selection of groundbreaking works from emerging directors.",
        "content": "The 25th Annual Independent Vision Film Festival opened yesterday with its most diverse lineup to date, featuring 87 films from 32 countries. Opening night showcased 'Shadows of Memory,' a visually stunning drama from first-time director Jae-Sun Park that received a standing ovation from the packed theater. Festival organizers reported a 15% increase in ticket sales compared to last year, attributing the growth to expanded virtual screening options and increased interest in international perspectives. This year's programming emphasizes stories from traditionally underrepresented communities, with nearly 60% of selected films coming from female directors and directors of color. Industry presence is also stronger than in previous years, with representatives from major streaming platforms and traditional studios attending with acquisition teams. Panel discussions throughout the week will address evolving distribution models and the impact of AI on independent filmmaking.",
        "is_paywalled": False,
        "classification": {
            "reading_level": 7.2,
            "information_density": 6.8,
            "bias_score": 8.7,
            "propaganda_score": 9.3,
            "length": 165,
            "topics": ["entertainment", "world"],
            "region": "north_america"
        }
    }
]

async def add_sample_articles():
    """Add sample articles to the database"""
    print("Adding sample articles to the database...")
    
    now = datetime.utcnow()
    
    for i, article_data in enumerate(SAMPLE_ARTICLES):
        # Check if article already exists by URL
        existing = await db.articles.find_one({"url": article_data["url"]})
        if existing:
            print(f"Article already exists: {article_data['title']}")
            continue
        
        # Create classification
        classification = ArticleClassification(**article_data["classification"])
        
        # Set published date to random time in past week
        published_date = now - timedelta(days=random.randint(0, 6), 
                                         hours=random.randint(0, 23),
                                         minutes=random.randint(0, 59))
        
        # Create article
        article = Article(
            id=str(uuid.uuid4()),
            title=article_data["title"],
            url=article_data["url"],
            source=article_data["source"],
            source_id="sample",
            author=article_data["author"],
            published_date=published_date,
            summary=article_data["summary"],
            content=article_data["content"],
            image_url=None,
            is_paywalled=article_data["is_paywalled"],
            classification=classification,
            created_at=now
        )
        
        # Save to database
        await db.articles.insert_one(article.dict())
        print(f"Added article: {article.title}")
    
    count = await db.articles.count_documents({})
    print(f"Total articles in database: {count}")

if __name__ == "__main__":
    asyncio.run(add_sample_articles())
