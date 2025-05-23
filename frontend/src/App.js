import { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Auth context
import { createContext, useContext } from 'react';
const AuthContext = createContext(null);

function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    // Check if user is logged in on mount
    const token = localStorage.getItem('token');
    if (token) {
      fetchUserData(token);
    } else {
      setLoading(false);
    }
  }, []);
  
  const fetchUserData = async (token) => {
    try {
      const response = await axios.get(`${API}/users/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setUser(response.data);
    } catch (error) {
      console.error("Failed to fetch user data:", error);
      localStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };
  
  const login = async (username, password) => {
    try {
      console.log("Attempting login with username:", username);
      const response = await axios.post(`${API}/token`, 
        new URLSearchParams({
          'username': username,
          'password': password
        }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      console.log("Login response:", response);
      const { access_token } = response.data;
      
      if (access_token) {
        console.log("Token received, storing in localStorage");
        localStorage.setItem('token', access_token);
        await fetchUserData(access_token);
        return { success: true };
      } else {
        console.error("No access token in response");
        return { 
          success: false, 
          message: "Login failed: No access token received" 
        };
      }
    } catch (error) {
      console.error("Login error:", error);
      let errorMessage = "Login failed";
      
      if (error.response) {
        console.log("Error response:", error.response.data);
        errorMessage = error.response.data.detail || "Login failed";
      } else if (error.message) {
        errorMessage = "Login failed: " + error.message;
      }
      
      return { success: false, message: errorMessage };
    }
  };
  
  const register = async (email, username, password) => {
    try {
      await axios.post(`${API}/users`, {
        email,
        username,
        password
      });
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.detail || "Registration failed" 
      };
    }
  };
  
  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
  };
  
  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

function useAuth() {
  return useContext(AuthContext);
}

// Components
const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const handleLogout = () => {
    logout();
    navigate("/");
  };
  
  return (
    <nav className="bg-slate-800 text-white p-4">
      <div className="container mx-auto flex justify-between items-center">
        <Link to="/" className="text-xl font-bold">NewsAlgo</Link>
        
        <div className="flex space-x-4">
          <Link to="/" className="hover:text-blue-300">Home</Link>
          {user ? (
            <>
              <Link to="/preferences" className="hover:text-blue-300">My Preferences</Link>
              <Link to="/admin" className="hover:text-blue-300">Admin Panel</Link>
              <button onClick={handleLogout} className="hover:text-blue-300">Logout</button>
            </>
          ) : (
            <>
              <Link to="/login" className="hover:text-blue-300">Login</Link>
              <Link to="/register" className="hover:text-blue-300">Register</Link>
            </>
          )}
        </div>
      </div>
    </nav>
  );
};

const ArticleCard = ({ article }) => {
  const formatDate = (dateString) => {
    if (!dateString) return "Unknown date";
    const date = new Date(dateString);
    return date.toLocaleString();
  };
  
  return (
    <div className="bg-white rounded-lg shadow-md overflow-hidden">
      {article.image_url && (
        <div className="w-full h-48 overflow-hidden">
          <img 
            src={article.image_url} 
            alt={article.title} 
            className="w-full h-full object-cover"
          />
        </div>
      )}
      <div className="p-4">
        <h3 className="text-xl font-semibold mb-2">{article.title}</h3>
        <div className="flex justify-between text-sm text-gray-600 mb-2">
          <span>{article.source}</span>
          <span>{formatDate(article.published_date)}</span>
        </div>
        
        {article.is_paywalled && (
          <div className="mb-2 text-amber-600 text-sm font-medium">
            ⚠️ This article may be behind a paywall
          </div>
        )}
        
        {article.summary && (
          <p className="text-gray-700 mb-3">{article.summary.substring(0, 150)}...</p>
        )}
        
        {article.classification && (
          <div className="grid grid-cols-2 gap-2 mb-3 text-sm">
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-blue-500 mr-2"></span>
              <span>Reading: {article.classification.reading_level ? article.classification.reading_level.toFixed(1) : "5"}/10</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span>Density: {article.classification.information_density ? article.classification.information_density.toFixed(1) : "5"}/10</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
              <span>Bias: {article.classification.bias_score ? article.classification.bias_score.toFixed(1) : "5"}/10</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
              <span>Propaganda: {article.classification.propaganda_score ? article.classification.propaganda_score.toFixed(1) : "5"}/10</span>
            </div>
          </div>
        )}
        
        <div className="flex flex-wrap gap-1 mb-3">
          {article.classification?.topics && article.classification.topics.map((topic, index) => (
            <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
              {topic}
            </span>
          ))}
          {article.classification?.region && (
            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
              {article.classification.region.replace('_', ' ')}
            </span>
          )}
        </div>
        
        <a 
          href={article.url} 
          target="_blank" 
          rel="noopener noreferrer" 
          className="block w-full text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Read Article
        </a>
      </div>
    </div>
  );
};

const FilterBar = ({ preferences, setPreferences, applyFilters, loading }) => {
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    }));
  };
  
  const handleTopicToggle = (topic) => {
    setPreferences(prev => {
      const topics = [...prev.topics];
      const index = topics.indexOf(topic);
      
      if (index > -1) {
        topics.splice(index, 1);
      } else {
        topics.push(topic);
      }
      
      return { ...prev, topics };
    });
  };
  
  const handleRegionToggle = (region) => {
    setPreferences(prev => {
      const regions = [...prev.regions];
      const index = regions.indexOf(region);
      
      if (index > -1) {
        regions.splice(index, 1);
      } else {
        regions.push(region);
      }
      
      return { ...prev, regions };
    });
  };
  
  const topics = [
    "politics", "business", "technology", "science", 
    "health", "sports", "entertainment", "world"
  ];
  
  const regions = [
    "north_america", "europe", "asia", "middle_east", 
    "africa", "south_america", "oceania"
  ];
  
  return (
    <div className="bg-white rounded-lg shadow-md p-4 mb-6">
      <h2 className="text-xl font-semibold mb-4">Customize Your News Feed</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Reading Level: {preferences.reading_level}/10
          </label>
          <input
            type="range"
            name="reading_level"
            min="1"
            max="10"
            value={preferences.reading_level}
            onChange={handleChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Simple (1)</span>
            <span>Complex (10)</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Information Density: {preferences.information_density}/10
          </label>
          <input
            type="range"
            name="information_density"
            min="1"
            max="10"
            value={preferences.information_density}
            onChange={handleChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Light (1)</span>
            <span>Dense (10)</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Bias Threshold: {preferences.bias_threshold}/10
          </label>
          <input
            type="range"
            name="bias_threshold"
            min="1"
            max="10"
            value={preferences.bias_threshold}
            onChange={handleChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Any bias (1)</span>
            <span>Neutral only (10)</span>
          </div>
          <p className="text-xs text-gray-500">Higher values show more neutral content</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Propaganda Threshold: {preferences.propaganda_threshold}/10
          </label>
          <input
            type="range"
            name="propaganda_threshold"
            min="1"
            max="10"
            value={preferences.propaganda_threshold}
            onChange={handleChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>Any content (1)</span>
            <span>No propaganda (10)</span>
          </div>
          <p className="text-xs text-gray-500">Higher values filter out propaganda</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Article Age: {preferences.max_age_days} days
          </label>
          <input
            type="range"
            name="max_age_days"
            min="1"
            max="90"
            value={preferences.max_age_days}
            onChange={handleChange}
            className="w-full"
          />
          <div className="flex justify-between text-xs text-gray-500 mt-1">
            <span>1 day</span>
            <span>90 days</span>
          </div>
          <p className="text-xs text-gray-500">Maximum age of articles to display</p>
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Topics</label>
        <div className="mb-2">
          <select
            name="topics_filter_type"
            value={preferences.topics_filter_type}
            onChange={handleChange}
            className="p-2 border border-gray-300 rounded text-sm"
          >
            <option value="OR">Match ANY selected topic (OR)</option>
            <option value="AND">Match ALL selected topics (AND)</option>
          </select>
        </div>
        <div className="flex flex-wrap gap-2">
          {topics.map(topic => (
            <button
              key={topic}
              onClick={() => handleTopicToggle(topic)}
              className={`px-3 py-1 rounded-full text-sm ${
                preferences.topics.includes(topic)
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {topic}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-2">Regions</label>
        <div className="flex flex-wrap gap-2">
          {regions.map(region => (
            <button
              key={region}
              onClick={() => handleRegionToggle(region)}
              className={`px-3 py-1 rounded-full text-sm ${
                preferences.regions.includes(region)
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-200 text-gray-800'
              }`}
            >
              {region.replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>
      
      <div className="flex items-center mb-4">
        <input
          id="show_paywalled"
          name="show_paywalled"
          type="checkbox"
          checked={preferences.show_paywalled}
          onChange={handleChange}
          className="h-4 w-4 text-blue-600 rounded"
        />
        <label htmlFor="show_paywalled" className="ml-2 text-sm text-gray-700">
          Show paywalled articles
        </label>
      </div>
      
      <button
        onClick={applyFilters}
        disabled={loading}
        className={`w-full ${loading ? 'bg-blue-400' : 'bg-blue-600'} text-white py-2 rounded hover:bg-blue-700 transition flex justify-center items-center`}
      >
        {loading ? (
          <>
            <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-solid border-white border-r-transparent"></div>
            Applying Filters...
          </>
        ) : (
          'Apply Filters'
        )}
      </button>
    </div>
  );
};

// Helper function to create fallback articles
const createFallbackArticles = () => {
  return [
    {
      id: "fallback-1",
      title: "Sample Article: Getting Started with NewsAlgo",
      url: "#",
      source: "NewsAlgo Demo",
      author: "System",
      published_date: new Date().toISOString(),
      summary: "This is a sample article to show how the interface works. You can customize your news feed using the controls above. Try adjusting the reading level, bias threshold, and other filters to see how they affect your content.",
      is_paywalled: false,
      classification: {
        reading_level: 5,
        information_density: 5,
        bias_score: 8,
        propaganda_score: 9,
        length: 500,
        topics: ["technology", "demo"],
        region: "north_america"
      }
    },
    {
      id: "fallback-2",
      title: "How to Use the Filter Controls in NewsAlgo",
      url: "#",
      source: "NewsAlgo Demo",
      author: "System",
      published_date: new Date().toISOString(),
      summary: "This article explains how to use the reading level, bias, and other filter controls to customize your news experience. The more you adjust these settings, the more personalized your feed becomes.",
      is_paywalled: false,
      classification: {
        reading_level: 6,
        information_density: 7,
        bias_score: 7,
        propaganda_score: 8,
        length: 800,
        topics: ["help", "demo"],
        region: "europe"
      }
    },
    {
      id: "fallback-3",
      title: "Understanding News Bias and Propaganda Detection",
      url: "#",
      source: "NewsAlgo Demo",
      author: "System",
      published_date: new Date().toISOString(),
      summary: "Learn how the NewsAlgo system detects and classifies bias and propaganda in news articles. Our algorithms analyze language patterns, source credibility, and content structure to help you find news that matches your preferences.",
      is_paywalled: false,
      classification: {
        reading_level: 8,
        information_density: 9,
        bias_score: 10,
        propaganda_score: 10,
        length: 1200,
        topics: ["media", "politics"],
        region: "north_america"
      }
    },
    {
      id: "fallback-4",
      title: "The Benefits of Customizable News Feeds",
      url: "#",
      source: "NewsAlgo Demo",
      author: "System",
      published_date: new Date().toISOString(),
      summary: "In today's media landscape, customization is key to a good news experience. NewsAlgo lets you control exactly what kind of content you see, from the reading difficulty to the geographic focus.",
      is_paywalled: false,
      classification: {
        reading_level: 7,
        information_density: 6,
        bias_score: 9,
        propaganda_score: 8,
        length: 950,
        topics: ["technology", "media"],
        region: "europe"
      }
    },
    {
      id: "fallback-5",
      title: "Filtering News by Geographic Region",
      url: "#",
      source: "NewsAlgo Demo",
      author: "System",
      published_date: new Date().toISOString(),
      summary: "With NewsAlgo, you can focus on news from specific parts of the world. Whether you're interested in North American politics, European business, or Asian technology trends, our region filters help you stay informed.",
      is_paywalled: false,
      classification: {
        reading_level: 5,
        information_density: 8,
        bias_score: 8,
        propaganda_score: 9,
        length: 750,
        topics: ["world", "news"],
        region: "asia"
      }
    },
    {
      id: "fallback-6",
      title: "Advanced Topic Filtering with AND/OR Logic",
      url: "#",
      source: "NewsAlgo Demo",
      author: "System",
      published_date: new Date().toISOString(),
      summary: "NewsAlgo's advanced filtering lets you combine topics with AND or OR logic. Want articles that discuss both technology AND healthcare? Or perhaps business OR politics? Our system makes it easy to find exactly what you're looking for.",
      is_paywalled: false,
      classification: {
        reading_level: 7,
        information_density: 9,
        bias_score: 10,
        propaganda_score: 10,
        length: 1100,
        topics: ["technology", "science"],
        region: "north_america"
      }
    }
  ];
};

// Add fallback article loading on mount
const HomeWithFallback = () => {
  const homeComponent = <Home />;
  const [showFallback, setShowFallback] = useState(false);
  
  useEffect(() => {
    // If Home component doesn't load articles within 8 seconds, show fallbacks
    const timer = setTimeout(() => {
      setShowFallback(true);
    }, 8000);
    
    return () => clearTimeout(timer);
  }, []);
  
  if (!showFallback) {
    return homeComponent;
  }
  
  // Fallback content when loading takes too long
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">NewsAlgo</h1>
        <p className="text-xl text-gray-600">Customize your news feed algorithm</p>
        
        <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded max-w-xl mx-auto">
          <p><strong>Welcome!</strong> We're experiencing some temporary loading issues.</p>
          <p className="mt-2">In the meantime, here are some sample articles to demonstrate the interface.</p>
        </div>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {createFallbackArticles().map(article => (
          <ArticleCard key={article.id} article={article} />
        ))}
      </div>
    </div>
  );
};

// Pages
const Home = () => {
  const { user } = useAuth();
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [preferences, setPreferences] = useState({
    reading_level: 5,
    information_density: 5,
    bias_threshold: 5,
    propaganda_threshold: 5,
    max_length: 5000,
    min_length: 0,
    topics: [],
    regions: [],
    show_paywalled: true,
    topics_filter_type: "OR",
    max_age_days: 30
  });
  
  const fetchArticles = async () => {
    setLoading(true);
    setArticles([]); // Clear existing articles while loading
    
    try {
      console.log("Fetching articles from backend...");
      const token = localStorage.getItem('token');
      
      // Determine which endpoint to use based on whether user is logged in
      let endpoint = `${API}/articles`;
      const headers = {};
      let params = {};
      
      if (token) {
        console.log("Using authenticated endpoint with token");
        headers.Authorization = `Bearer ${token}`;
        // When logged in, preferences are passed via auth token to backend
      } else {
        console.log("Using sample articles endpoint for guest with preference params");
        endpoint = `${API}/sample-articles`;
        
        // For guest users, manually add preference params
        params = {
          reading_level: preferences.reading_level,
          information_density: preferences.information_density,
          bias_threshold: preferences.bias_threshold,
          propaganda_threshold: preferences.propaganda_threshold,
          show_paywalled: preferences.show_paywalled,
          max_age_days: preferences.max_age_days
        };
        
        // Add topics if selected
        if (preferences.topics && preferences.topics.length > 0) {
          params.topics = preferences.topics.join(',');
          params.topics_filter_type = preferences.topics_filter_type;
        }
        
        // Add regions if selected
        if (preferences.regions && preferences.regions.length > 0) {
          params.regions = preferences.regions.join(',');
        }
      }
      
      console.log(`Making API request to ${endpoint} with params:`, params);
      console.log(`Headers:`, headers);
      
      // Set a timeout to ensure we don't wait forever
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await axios.get(endpoint, { 
        headers,
        params,
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      console.log("Articles response:", response);
      
      if (response.data && response.data.length > 0) {
        console.log(`Got ${response.data.length} articles from API`);
        setArticles(response.data);
      } else {
        console.log("No articles returned from API, using fallback sample articles");
        // Add fallback sample articles for empty response
        const fallbackArticles = createFallbackArticles();
        setArticles(fallbackArticles);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      console.log("Error details:", error.response || error.message);
      
      // Show sample articles even on error
      console.log("Using fallback sample articles due to error");
      const fallbackArticles = createFallbackArticles();
      setArticles(fallbackArticles);
    } finally {
      setLoading(false);
    }
  };
  
  const savePreferences = async () => {
    if (!user) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/users/me/preferences`, 
        preferences,
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (error) {
      console.error("Failed to save preferences:", error);
    }
  };
  
  const applyFilters = async () => {
    console.log("Applying filters with preferences:", preferences);
    
    try {
      // Save preferences if user is logged in
      if (user) {
        await savePreferences();
        console.log("Preferences saved successfully");
      } else {
        console.log("Guest mode - preferences will not be saved");
      }
      
      // Fetch articles with current preferences
      setLoading(true);
      await fetchArticles();
      console.log("Articles fetched with new filters");
    } catch (error) {
      console.error("Error applying filters:", error);
    }
  };
  
  useEffect(() => {
    fetchArticles();
  }, [user]);
  
  useEffect(() => {
    if (user?.preferences) {
      setPreferences(user.preferences);
    }
    
    // If no articles loaded after 5 seconds, show fallback articles
    const timeoutId = setTimeout(() => {
      if (articles.length === 0 && !loading) {
        console.log("No articles loaded after timeout, showing fallbacks");
        setArticles(createFallbackArticles());
      }
    }, 5000);
    
    return () => clearTimeout(timeoutId);
  }, [user]);
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8 text-center">
        <h1 className="text-4xl font-bold mb-2">NewsAlgo</h1>
        <p className="text-xl text-gray-600">Customize your news feed algorithm</p>
        
        {!user && (
          <div className="mt-4 p-3 bg-blue-100 text-blue-800 rounded max-w-xl mx-auto">
            <p><strong>Welcome!</strong> To get the full experience, please <Link to="/login" className="text-blue-600 underline">log in</Link> or <Link to="/register" className="text-blue-600 underline">register</Link>.</p>
            <p className="mt-2">As a guest, you can browse sample articles and see how the interface works.</p>
          </div>
        )}
      </div>
      
      <FilterBar 
        preferences={preferences} 
        setPreferences={setPreferences}
        applyFilters={applyFilters}
        loading={loading}
      />
      
      {loading ? (
        <div className="text-center py-10">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading articles...</p>
        </div>
      ) : articles.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {articles.map(article => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <div className="text-center py-10">
          <p className="text-xl text-gray-600">No articles found with your current filters</p>
          <p className="text-gray-500 mt-2">Try adjusting your preferences or check back later</p>
          <button
            onClick={() => {
              const fallbackArticles = createFallbackArticles();
              setArticles(fallbackArticles);
            }}
            className="mt-4 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            Show Sample Articles
          </button>
        </div>
      )}
    </div>
  );
};

const Login = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const { login } = useAuth();
  const navigate = useNavigate();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!username || !password) {
      setError('Username and password are required');
      return;
    }
    
    const result = await login(username, password);
    if (result.success) {
      navigate('/');
    } else {
      setError(result.message);
    }
  };
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Log In</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Log In
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            Don't have an account? <Link to="/register" className="text-blue-600">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Register = () => {
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const { register } = useAuth();
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!email || !username || !password) {
      setError('All fields are required');
      return;
    }
    
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    
    try {
      console.log("Submitting registration with:", { email, username });
      const response = await axios.post(`${API}/users`, {
        email,
        username,
        password
      });
      console.log("Registration successful:", response.data);
      setSuccess(true);
    } catch (error) {
      console.error("Registration error:", error);
      if (error.response) {
        console.log("Error response:", error.response.data);
        setError(error.response.data.detail || "Registration failed");
      } else {
        setError("Registration failed: " + (error.message || "Unknown error"));
      }
    }
  };
  
  if (success) {
    return (
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8 text-center">
          <h2 className="text-2xl font-bold mb-4 text-green-600">Registration Successful!</h2>
          <p className="mb-6">Your account has been created successfully.</p>
          <Link 
            to="/login" 
            className="inline-block bg-blue-600 text-white py-2 px-6 rounded hover:bg-blue-700 transition"
          >
            Log In Now
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto px-4 py-12">
      <div className="max-w-md mx-auto bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6 text-center">Create Account</h2>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="username">
              Username
            </label>
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div className="mb-4">
            <label className="block text-gray-700 mb-2" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <div className="mb-6">
            <label className="block text-gray-700 mb-2" htmlFor="confirmPassword">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded"
            />
          </div>
          
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Register
          </button>
        </form>
        
        <div className="mt-4 text-center">
          <p className="text-gray-600">
            Already have an account? <Link to="/login" className="text-blue-600">Log In</Link>
          </p>
        </div>
      </div>
    </div>
  );
};

const Preferences = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [preferences, setPreferences] = useState({
    reading_level: 5,
    information_density: 5,
    bias_threshold: 5,
    propaganda_threshold: 5,
    max_length: 5000,
    min_length: 0,
    topics: [],
    regions: [],
    show_paywalled: true,
    topics_filter_type: "OR",
    max_age_days: 30
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    if (user.preferences) {
      setPreferences(user.preferences);
    }
  }, [user, navigate]);
  
  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setPreferences(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : type === 'number' ? parseInt(value) : value
    }));
  };
  
  const handleTopicToggle = (topic) => {
    setPreferences(prev => {
      const topics = [...prev.topics];
      const index = topics.indexOf(topic);
      
      if (index > -1) {
        topics.splice(index, 1);
      } else {
        topics.push(topic);
      }
      
      return { ...prev, topics };
    });
  };
  
  const handleRegionToggle = (region) => {
    setPreferences(prev => {
      const regions = [...prev.regions];
      const index = regions.indexOf(region);
      
      if (index > -1) {
        regions.splice(index, 1);
      } else {
        regions.push(region);
      }
      
      return { ...prev, regions };
    });
  };
  
  const savePreferences = async () => {
    setSuccess(false);
    setError('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.put(
        `${API}/users/me/preferences`, 
        preferences,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setSuccess(true);
    } catch (error) {
      setError("Failed to save preferences");
      console.error("Error:", error);
    }
  };
  
  const topics = [
    "politics", "business", "technology", "science", 
    "health", "sports", "entertainment", "world"
  ];
  
  const regions = [
    "north_america", "europe", "asia", "middle_east", 
    "africa", "south_america", "oceania"
  ];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-2xl mx-auto bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold mb-6">My News Preferences</h2>
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            Preferences saved successfully!
          </div>
        )}
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-medium mb-3">Reading Level</h3>
            <label className="block text-sm text-gray-600 mb-1">
              Preferred complexity: {preferences.reading_level}/10
            </label>
            <input
              type="range"
              name="reading_level"
              min="1"
              max="10"
              value={preferences.reading_level}
              onChange={handleChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Simple</span>
              <span>Complex</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Information Density</h3>
            <label className="block text-sm text-gray-600 mb-1">
              Preferred density: {preferences.information_density}/10
            </label>
            <input
              type="range"
              name="information_density"
              min="1"
              max="10"
              value={preferences.information_density}
              onChange={handleChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Light</span>
              <span>Dense</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Bias Filter</h3>
            <label className="block text-sm text-gray-600 mb-1">
              Minimum neutrality: {preferences.bias_threshold}/10
            </label>
            <input
              type="range"
              name="bias_threshold"
              min="1"
              max="10"
              value={preferences.bias_threshold}
              onChange={handleChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Show all</span>
              <span>Only neutral</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Propaganda Filter</h3>
            <label className="block text-sm text-gray-600 mb-1">
              Minimum quality: {preferences.propaganda_threshold}/10
            </label>
            <input
              type="range"
              name="propaganda_threshold"
              min="1"
              max="10"
              value={preferences.propaganda_threshold}
              onChange={handleChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Show all</span>
              <span>No propaganda</span>
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Topics</h3>
            <div className="mb-2">
              <label className="block text-sm text-gray-600 mb-1">Topic matching:</label>
              <select
                name="topics_filter_type"
                value={preferences.topics_filter_type}
                onChange={handleChange}
                className="p-2 border border-gray-300 rounded text-sm"
              >
                <option value="OR">Match ANY selected topic (OR)</option>
                <option value="AND">Match ALL selected topics (AND)</option>
              </select>
            </div>
            <p className="text-sm text-gray-600 mb-2">Select topics you're interested in:</p>
            <div className="flex flex-wrap gap-2">
              {topics.map(topic => (
                <button
                  key={topic}
                  onClick={() => handleTopicToggle(topic)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    preferences.topics.includes(topic)
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {topic}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Regions</h3>
            <p className="text-sm text-gray-600 mb-2">Select regions you're interested in:</p>
            <div className="flex flex-wrap gap-2">
              {regions.map(region => (
                <button
                  key={region}
                  onClick={() => handleRegionToggle(region)}
                  className={`px-3 py-1 rounded-full text-sm ${
                    preferences.regions.includes(region)
                      ? 'bg-green-600 text-white'
                      : 'bg-gray-200 text-gray-800'
                  }`}
                >
                  {region.replace('_', ' ')}
                </button>
              ))}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-3">Article Age</h3>
            <label className="block text-sm text-gray-600 mb-1">
              Maximum age: {preferences.max_age_days} days
            </label>
            <input
              type="range"
              name="max_age_days"
              min="1"
              max="90"
              value={preferences.max_age_days}
              onChange={handleChange}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-gray-500">
              <span>Recent (1 day)</span>
              <span>Older (90 days)</span>
            </div>
            <p className="text-sm text-gray-600 mt-1">Only show articles published within this time period</p>
          </div>
          
          <div className="flex items-center">
            <input
              id="show_paywalled"
              name="show_paywalled"
              type="checkbox"
              checked={preferences.show_paywalled}
              onChange={handleChange}
              className="h-4 w-4 text-blue-600 rounded"
            />
            <label htmlFor="show_paywalled" className="ml-2 text-sm text-gray-700">
              Show paywalled articles
            </label>
          </div>
          
          <button
            onClick={savePreferences}
            className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
};

const FeedDetail = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { feedId } = useParams();
  const [feed, setFeed] = useState(null);
  const [articles, setArticles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchFeedDetails();
    fetchFeedArticles();
  }, [feedId, user, navigate]);
  
  const fetchFeedDetails = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/feeds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      const foundFeed = response.data.find(f => f.id === feedId);
      if (foundFeed) {
        setFeed(foundFeed);
      } else {
        setError('Feed not found');
      }
    } catch (error) {
      console.error('Failed to fetch feed details:', error);
      setError('Failed to load feed details');
    }
  };
  
  const fetchFeedArticles = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/feeds/${feedId}/articles`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('Articles for feed:', response.data);
      setArticles(response.data || []);
      
      if (response.data && response.data.length === 0) {
        // No articles found, but don't set as an error - just informational
        console.log('No articles found for this feed. Try processing the feed first.');
      }
    } catch (error) {
      console.error('Failed to fetch feed articles:', error);
      setError('Failed to load articles from this feed');
    } finally {
      setLoading(false);
    }
  };
  
  const processFeed = async () => {
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/feeds/${feedId}/process`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      alert('Feed processing started. Check back in a few minutes for new articles.');
    } catch (error) {
      console.error('Failed to process feed:', error);
      setError('Failed to process feed');
    }
  };
  
  const renderClassificationMetrics = (classification) => {
    if (!classification) return null;
    
    return (
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${(classification.reading_level/10)*100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm w-36">Reading: {classification.reading_level.toFixed(1)}/10</span>
        </div>
        
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-green-600 h-2.5 rounded-full" 
              style={{ width: `${(classification.information_density/10)*100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm w-36">Density: {classification.information_density.toFixed(1)}/10</span>
        </div>
        
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-purple-600 h-2.5 rounded-full" 
              style={{ width: `${(classification.bias_score/10)*100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm w-36">Bias: {classification.bias_score.toFixed(1)}/10</span>
        </div>
        
        <div className="flex items-center">
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div 
              className="bg-orange-600 h-2.5 rounded-full" 
              style={{ width: `${(classification.propaganda_score/10)*100}%` }}
            ></div>
          </div>
          <span className="ml-2 text-sm w-36">Propaganda: {classification.propaganda_score.toFixed(1)}/10</span>
        </div>
      </div>
    );
  };
  
  const formatDate = (dateString) => {
    if (!dateString) return 'Unknown date';
    return new Date(dateString).toLocaleString();
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {feed ? feed.name : 'Loading feed...'}
            </h1>
            {feed && (
              <div className="text-sm text-gray-600 mt-1">
                <p>Category: {feed.category}</p>
                <p>Region: {feed.region.replace('_', ' ')}</p>
                <p>URL: <a href={feed.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">{feed.url}</a></p>
                <p>Last checked: {feed.last_checked ? formatDate(feed.last_checked) : 'Never'}</p>
              </div>
            )}
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={() => navigate('/admin')}
              className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700 transition"
            >
              Back to Admin
            </button>
            <button
              onClick={processFeed}
              className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
            >
              Process Feed Now
            </button>
          </div>
        </div>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        <h2 className="text-xl font-semibold mb-4">Articles from this Feed</h2>
        
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading articles...</p>
          </div>
        ) : articles.length > 0 ? (
          <div className="space-y-4">
            {articles.map((article) => (
              <div key={article.id} className="border rounded-lg p-4 hover:bg-gray-50 transition">
                <h3 className="text-lg font-medium mb-2">{article.title}</h3>
                
                <div className="flex justify-between text-sm text-gray-600 mb-2">
                  <span>{article.author || 'Unknown author'}</span>
                  <span>{formatDate(article.published_date)}</span>
                </div>
                
                {article.is_paywalled && (
                  <div className="mb-2 text-amber-600 text-sm font-medium">
                    ⚠️ This article may be behind a paywall
                  </div>
                )}
                
                {article.summary && (
                  <p className="text-gray-700 mb-3">{article.summary}</p>
                )}
                
                {renderClassificationMetrics(article.classification)}
                
                <div className="flex flex-wrap gap-1 mb-3">
                  {article.classification?.topics.map((topic, index) => (
                    <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                      {topic}
                    </span>
                  ))}
                  {article.classification?.region && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      {article.classification.region.replace('_', ' ')}
                    </span>
                  )}
                </div>
                
                <a 
                  href={article.url} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline"
                >
                  Read full article
                </a>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-xl text-gray-600">No articles found for this feed</p>
            <p className="text-gray-500 mt-2">Try processing the feed or check back later</p>
          </div>
        )}
      </div>
    </div>
  );
};

const AdminPanel = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feeds, setFeeds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [feedFormVisible, setFeedFormVisible] = useState(false);
  const [newFeed, setNewFeed] = useState({
    url: '',
    name: '',
    category: 'news',
    region: 'north_america'
  });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  useEffect(() => {
    if (!user) {
      navigate('/login');
      return;
    }
    
    fetchFeeds();
  }, [user, navigate]);
  
  const fetchFeeds = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get(`${API}/feeds`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setFeeds(response.data);
    } catch (error) {
      console.error("Failed to fetch feeds:", error);
      setError("Failed to load RSS feeds");
    } finally {
      setLoading(false);
    }
  };
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setNewFeed(prev => ({
      ...prev,
      [name]: value
    }));
  };
  
  const addFeed = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    
    if (!newFeed.url || !newFeed.name || !newFeed.category || !newFeed.region) {
      setError('All fields are required');
      return;
    }
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/feeds`,
        newFeed,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Feed added successfully');
      setNewFeed({
        url: '',
        name: '',
        category: 'news',
        region: 'north_america'
      });
      setFeedFormVisible(false);
      fetchFeeds();
    } catch (error) {
      console.error("Failed to add feed:", error);
      setError(error.response?.data?.detail || "Failed to add feed");
    }
  };
  
  const deleteFeed = async (feedId) => {
    if (!window.confirm('Are you sure you want to delete this feed?')) {
      return;
    }
    
    setError('');
    setSuccess('');
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(
        `${API}/feeds/${feedId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Feed deleted successfully');
      fetchFeeds();
    } catch (error) {
      console.error("Failed to delete feed:", error);
      setError("Failed to delete feed");
    }
  };
  
  const processFeed = async (feedId) => {
    setError('');
    setSuccess('');
    setProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/feeds/${feedId}/process`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Feed processing started');
    } catch (error) {
      console.error("Failed to process feed:", error);
      setError("Failed to process feed");
    } finally {
      setProcessing(false);
    }
  };
  
  const processAllFeeds = async () => {
    setError('');
    setSuccess('');
    setProcessing(true);
    
    try {
      const token = localStorage.getItem('token');
      await axios.post(
        `${API}/process-all-feeds`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setSuccess('Processing all feeds started');
    } catch (error) {
      console.error("Failed to process feeds:", error);
      setError("Failed to process feeds");
    } finally {
      setProcessing(false);
    }
  };
  
  const categories = [
    "news", "business", "technology", "science", 
    "health", "sports", "entertainment", "world"
  ];
  
  const regions = [
    "north_america", "europe", "asia", "middle_east", 
    "africa", "south_america", "oceania"
  ];
  
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow-md p-6 mb-6">
        <h1 className="text-2xl font-bold mb-4">Admin Panel</h1>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-4 p-3 bg-green-100 text-green-700 rounded">
            {success}
          </div>
        )}
        
        <div className="flex justify-between items-center mb-6">
          <button
            onClick={() => setFeedFormVisible(!feedFormVisible)}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
          >
            {feedFormVisible ? 'Cancel' : 'Add New Feed'}
          </button>
          
          <button
            onClick={processAllFeeds}
            disabled={processing}
            className={`bg-green-600 text-white px-4 py-2 rounded transition ${
              processing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
            }`}
          >
            {processing ? 'Processing...' : 'Process All Feeds'}
          </button>
        </div>
        
        <div className="mb-4 p-3 bg-blue-100 text-blue-800 rounded">
          <p><strong>Note:</strong> RSS feed processing happens in the background and may take some time. After processing, articles will be available on the home page.</p>
          <p className="mt-2">You can test the app with the demo articles that appear on the home page while waiting for real articles to be processed.</p>
        </div>
        
        {feedFormVisible && (
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h2 className="text-xl font-semibold mb-3">Add New RSS Feed</h2>
            
            <form onSubmit={addFeed}>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feed URL
                  </label>
                  <input
                    type="url"
                    name="url"
                    value={newFeed.url}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                    placeholder="https://example.com/rss.xml"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Feed Name
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={newFeed.name}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                    placeholder="Example News"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    name="category"
                    value={newFeed.category}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  >
                    {categories.map(category => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Region
                  </label>
                  <select
                    name="region"
                    value={newFeed.region}
                    onChange={handleInputChange}
                    className="w-full p-2 border border-gray-300 rounded"
                    required
                  >
                    {regions.map(region => (
                      <option key={region} value={region}>
                        {region.replace('_', ' ')}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              
              <button
                type="submit"
                className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
              >
                Add Feed
              </button>
            </form>
          </div>
        )}
        
        {loading ? (
          <div className="text-center py-10">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-600 border-r-transparent"></div>
            <p className="mt-2 text-gray-600">Loading feeds...</p>
          </div>
        ) : feeds.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100 text-gray-700 text-sm uppercase font-semibold">
                  <th className="py-3 px-4 text-left">Name</th>
                  <th className="py-3 px-4 text-left">URL</th>
                  <th className="py-3 px-4 text-left">Category</th>
                  <th className="py-3 px-4 text-left">Region</th>
                  <th className="py-3 px-4 text-left">Last Checked</th>
                  <th className="py-3 px-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {feeds.map(feed => (
                  <tr key={feed.id} className="border-b hover:bg-gray-50">
                    <td className="py-3 px-4">
                      <Link 
                        to={`/feeds/${feed.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {feed.name}
                      </Link>
                    </td>
                    <td className="py-3 px-4">
                      <a 
                        href={feed.url} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline"
                      >
                        {feed.url.length > 40 ? `${feed.url.substring(0, 40)}...` : feed.url}
                      </a>
                    </td>
                    <td className="py-3 px-4">{feed.category}</td>
                    <td className="py-3 px-4">{feed.region.replace('_', ' ')}</td>
                    <td className="py-3 px-4">
                      {feed.last_checked 
                        ? new Date(feed.last_checked).toLocaleString()
                        : 'Never'
                      }
                    </td>
                    <td className="py-3 px-4 text-center">
                      <div className="flex justify-center space-x-2">
                        <Link
                          to={`/feeds/${feed.id}`}
                          className="text-xs bg-blue-600 text-white px-2 py-1 rounded hover:bg-blue-700"
                        >
                          View Articles
                        </Link>
                        <button
                          onClick={() => processFeed(feed.id)}
                          disabled={processing}
                          className={`text-xs bg-green-600 text-white px-2 py-1 rounded ${
                            processing ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-700'
                          }`}
                        >
                          Process
                        </button>
                        <button
                          onClick={() => deleteFeed(feed.id)}
                          className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <p className="text-xl text-gray-600">No RSS feeds found</p>
            <p className="text-gray-500 mt-2">Add some feeds to get started</p>
          </div>
        )}
      </div>
    </div>
  );
};

function App() {
  return (
    <div className="App min-h-screen bg-gray-100">
      <AuthProvider>
        <BrowserRouter>
          <Navbar />
          <Routes>
            <Route path="/" element={<HomeWithFallback />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/admin" element={<AdminPanel />} />
            <Route path="/feeds/:feedId" element={<FeedDetail />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
