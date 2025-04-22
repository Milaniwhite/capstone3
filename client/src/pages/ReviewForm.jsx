import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const ReviewForm = ({ existingReview, onSuccess, onCancel }) => {
  const [rating, setRating] = useState(existingReview?.rating || 5);
  const [content, setContent] = useState(existingReview?.content || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { auth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Please write your review');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`/api/items/${existingReview.item_id}/reviews`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ rating, content })
      });

      if (!response.ok) {
        throw new Error('Please login to submit a review');
      }

      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="bg-gray-50 p-4 rounded-lg mb-6">
      <h3 className="font-bold mb-2">
        {existingReview.id ? 'Edit Your Review' : 'Write a Review'}
      </h3>
      
      {error && <div className="text-red-500 mb-2">{error}</div>}

      <div className="mb-4">
        <label className="block mb-1">Rating</label>
        <div className="flex">
          {[1, 2, 3, 4, 5].map(star => (
            <button
              key={star}
              type="button"
              onClick={() => setRating(star)}
              className="focus:outline-none"
            >
              <svg
                className={`w-8 h-8 ${star <= rating ? 'text-yellow-400' : 'text-gray-300'}`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="block mb-1">Review</label>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          className="w-full p-2 border rounded"
          rows="4"
          required
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Review'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="bg-gray-200 px-4 py-2 rounded"
        >
          Cancel
        </button>
      </div>
    </form>
  );
};

export default ReviewForm;