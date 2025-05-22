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
    show_paywalled: true
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
      setArticles(response.data);
    } catch (error) {
      console.error("Failed to fetch articles:", error);
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
    show_paywalled: true
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
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </div>
  );
}

export default App;
