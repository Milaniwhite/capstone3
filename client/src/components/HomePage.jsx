import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

export const  HomePage = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItems = async () => {
      try {
        setLoading(true);
        const url = searchTerm 
          ? `/api/items?search=${encodeURIComponent(searchTerm)}`
          : '/api/items';
        
        const response = await fetch(url);
        const data = await response.json();
        setItems(data);
      } catch (err) {
        console.error('Failed to fetch items:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchItems();
  }, [searchTerm]);

  const handleSearch = (e) => {
    e.preventDefault();
    // The useEffect will trigger automatically when searchTerm changes
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <form onSubmit={handleSearch} className="flex gap-4 mb-4">
          <input
            type="text"
            placeholder="Search items..."
            className="flex-grow p-2 border rounded"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <button
            type="submit"
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Search
          </button>
        </form>

        {auth && (
          <button
            onClick={() => navigate('/items/new')}
            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            Add New Item
          </button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : items.length === 0 ? (
        <div className="text-center py-12">
          <h3 className="text-xl font-semibold text-gray-600">No items found</h3>
          <p className="text-gray-500">Try adjusting your search</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {items.map((item) => (
            <div 
              key={item.id} 
              className="border rounded-lg overflow-hidden shadow hover:shadow-lg cursor-pointer"
              onClick={() => navigate(`/items/${item.id}`)}
            >
              {item.image_url && (
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full h-48 object-cover"
                />
              )}
              <div className="p-4">
                <h3 className="text-xl font-semibold mb-2">{item.name}</h3>
                <div className="flex items-center mb-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <svg
                      key={star}
                      className={`w-5 h-5 ${star <= Math.round(item.average_rating) ? 'text-yellow-400' : 'text-gray-300'}`}
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                  <span className="ml-2 text-gray-600">
                    ({item.review_count})
                  </span>
                </div>
                <p className="text-gray-700 line-clamp-2">{item.description}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

