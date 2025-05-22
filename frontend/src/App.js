import { useState, useEffect } from "react";
import "./App.css";
import { BrowserRouter, Routes, Route, Link, useNavigate } from "react-router-dom";
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
      const response = await axios.post(`${API}/token`, 
        new URLSearchParams({
          'username': username,
          'password': password
        }), {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });
      
      const { access_token } = response.data;
      localStorage.setItem('token', access_token);
      await fetchUserData(access_token);
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.detail || "Login failed" 
      };
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
              <span>Reading: {article.classification.reading_level.toFixed(1)}/10</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-green-500 mr-2"></span>
              <span>Density: {article.classification.information_density.toFixed(1)}/10</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-purple-500 mr-2"></span>
              <span>Bias: {article.classification.bias_score.toFixed(1)}/10</span>
            </div>
            <div className="flex items-center">
              <span className="w-3 h-3 rounded-full bg-orange-500 mr-2"></span>
              <span>Propaganda: {article.classification.propaganda_score.toFixed(1)}/10</span>
            </div>
          </div>
        )}
        
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
          className="block w-full text-center bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
        >
          Read Article
        </a>
      </div>
    </div>
  );
};

const FilterBar = ({ preferences, setPreferences, applyFilters }) => {
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
          <p className="text-xs text-gray-500">Higher values filter out propaganda</p>
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
        className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 transition"
      >
        Apply Filters
      </button>
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
    topics_filter_type: "OR"
  });
  
  const fetchArticles = async () => {
    setLoading(true);
    try {
      const headers = {};
      const token = localStorage.getItem('token');
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      
      const response = await axios.get(`${API}/articles`, { headers });
      console.log("Articles response:", response.data);
      
      if (response.data && response.data.length > 0) {
        setArticles(response.data);
      } else {
        console.log("No articles found - showing sample articles");
        // Add fallback sample articles for empty response
        setArticles([
          {
            id: "sample-1",
            title: "Sample Article: Getting Started with NewsAlgo",
            url: "#",
            source: "NewsAlgo Demo",
            author: "System",
            published_date: new Date().toISOString(),
            summary: "This is a sample article to show how the interface works. You can customize your news feed using the controls above.",
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
            id: "sample-2",
            title: "How to Use the Filter Controls",
            url: "#",
            source: "NewsAlgo Demo",
            author: "System",
            published_date: new Date().toISOString(),
            summary: "This article explains how to use the reading level, bias, and other filter controls to customize your news experience.",
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
          }
        ]);
      }
    } catch (error) {
      console.error("Failed to fetch articles:", error);
      // Add fallback articles for testing
      setArticles([
        {
          id: "sample-1",
          title: "Sample Article: Getting Started with NewsAlgo",
          url: "#",
          source: "NewsAlgo Demo",
          author: "System",
          published_date: new Date().toISOString(),
          summary: "This is a sample article to show how the interface works. You can customize your news feed using the controls above.",
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
          id: "sample-2",
          title: "How to Use the Filter Controls",
          url: "#",
          source: "NewsAlgo Demo",
          author: "System",
          published_date: new Date().toISOString(),
          summary: "This article explains how to use the reading level, bias, and other filter controls to customize your news experience.",
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
        }
      ]);
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
    await savePreferences();
    fetchArticles();
  };
  
  useEffect(() => {
    fetchArticles();
  }, [user]);
  
  useEffect(() => {
    if (user?.preferences) {
      setPreferences(user.preferences);
    }
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
    
    const result = await register(email, username, password);
    if (result.success) {
      setSuccess(true);
    } else {
      setError(result.message);
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
    topics_filter_type: "OR"
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
                    <td className="py-3 px-4">{feed.name}</td>
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
            <Route path="/" element={<Home />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/preferences" element={<Preferences />} />
            <Route path="/admin" element={<AdminPanel />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
