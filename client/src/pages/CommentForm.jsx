import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';

const CommentForm = ({ reviewId, onSuccess }) => {
  const [content, setContent] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { auth } = useAuth();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!content.trim()) {
      setError('Please write your comment');
      return;
    }

    setLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/reviews/${reviewId}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${auth.token}`
        },
        body: JSON.stringify({ content })
      });

      if (!response.ok) {
        throw new Error('Please login to submit a comment');
      }

      setContent('');
      onSuccess();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="mt-4">
      {error && <div className="text-red-500 text-sm mb-1">{error}</div>}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="w-full p-2 border rounded text-sm"
        rows="2"
        placeholder="Write a comment..."
      />
      <button
        type="submit"
        disabled={loading}
        className="mt-1 bg-blue-600 text-white px-3 py-1 rounded text-sm disabled:opacity-50"
      >
        {loading ? 'Posting...' : 'Post Comment'}
      </button>
    </form>
  );
};

export default CommentForm;