import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import ReviewForm from './ReviewForm';
import CommentForm from './CommentForm';

export const ItemDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { auth } = useAuth();
  const [item, setItem] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [comments, setComments] = useState({});
  const [loading, setLoading] = useState({
    item: true,
    reviews: true,
    comments: {}
  });
  const [editingReview, setEditingReview] = useState(null);
  const [editingComments, setEditingComments] = useState({});
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  // Fetch item
  useEffect(() => {
    fetch(`/api/items/${id}`)
      .then(res => res.json())
      .then(data => {
        setItem(data);
        setLoading(prev => ({ ...prev, item: false }));
      });
  }, [id]);

  // Fetch reviews
  useEffect(() => {
    fetch(`/api/items/${id}/reviews`)
      .then(res => res.json())
      .then(data => {
        setReviews(data);
        setLoading(prev => ({ ...prev, reviews: false }));
      });
  }, [id]);

  // Fetch comments for a review
  const fetchComments = (reviewId) => {
    if (comments[reviewId]) return;
    
    setLoading(prev => ({ ...prev, comments: { ...prev.comments, [reviewId]: true } }));
    fetch(`/api/reviews/${reviewId}/comments`)
      .then(res => res.json())
      .then(data => {
        setComments(prev => ({ ...prev, [reviewId]: data }));
        setLoading(prev => ({ ...prev, comments: { ...prev.comments, [reviewId]: false } }));
      });
  };

  const handleReviewSubmit = () => {
    setEditingReview(null);
    // Refresh reviews
    fetch(`/api/items/${id}/reviews`)
      .then(res => res.json())
      .then(setReviews);
  };

  const handleDeleteReview = (reviewId) => {
    if (!window.confirm('Delete this review?')) return;
    
    fetch(`/api/reviews/${reviewId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth.token}` } })
      .then(() => {
        setReviews(prev => prev.filter(r => r.id !== reviewId));
      });
  };

  const handleCommentSubmit = (reviewId) => {
    // Refresh comments
    fetch(`/api/reviews/${reviewId}/comments`)
      .then(res => res.json())
      .then(data => {
        setComments(prev => ({ ...prev, [reviewId]: data }));
      });
  };

  const handleEditComment = (reviewId, commentId, content) => {
    fetch(`/api/comments/${commentId}`, {
      method: 'PUT',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${auth.token}`
      },
      body: JSON.stringify({ content })
    }).then(() => {
      setEditingComments(prev => ({ ...prev, [commentId]: false }));
      handleCommentSubmit(reviewId);
    });
  };

  const handleDeleteComment = (reviewId, commentId) => {
    if (!window.confirm('Delete this comment?')) return;
    
    fetch(`/api/comments/${commentId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${auth.token}` } })
      .then(() => {
        setComments(prev => ({
          ...prev,
          [reviewId]: prev[reviewId].filter(c => c.id !== commentId)
        }));
      });
  };

  if (loading.item) return <div>Loading item...</div>;

  return (
    <div className="container mx-auto p-4">
      <button onClick={() => navigate(-1)} className="mb-4 text-blue-600">
        &larr; Back
      </button>

      <h1 className="text-3xl font-bold">{item?.name}</h1>
      <p className="text-gray-700 mt-2">{item?.description}</p>

      <div className="mt-8">
        <h2 className="text-2xl font-bold mb-4">Reviews</h2>

        {/* Review Form */}
        {auth && (
          <div className="mb-6">
            {editingReview ? (
              <ReviewForm 
                existingReview={editingReview}
                onSuccess={handleReviewSubmit}
                onCancel={() => setEditingReview(null)}
              />
            ) : (
              <button
                onClick={() => {
                  const userReview = reviews.find(r => r.user_id === auth.id);
                  if (userReview) {
                    setEditingReview(userReview);
                  } else {
                    setEditingReview({ item_id: id, rating: 5, content: '' });
                  }
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded"
              >
                {reviews.some(r => r.user_id === auth.id) ? 'Edit Your Review' : 'Write a Review'}
              </button>
            )}
          </div>
        )}

        {/* Reviews List */}
        {loading.reviews ? (
          <div>Loading reviews...</div>
        ) : reviews.length === 0 ? (
          <p>No reviews yet.</p>
        ) : (
          reviews.map(review => (
            <div key={review.id} className="border-b py-4">
              <div className="flex justify-between items-start">
                <div>
                  <h3 className="font-semibold">{review.user_username}</h3>
                  <div className="flex items-center my-1">
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg
                        key={star}
                        className={`w-5 h-5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                        fill="currentColor"
                        viewBox="0 0 20 20"
                      >
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  {auth?.id === review.user_id && (
                    <>
                      <button
                        onClick={() => setEditingReview(review)}
                        className="text-blue-600 item-sm font-bold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-red-600 item-sm font-bold"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              </div>
              <p className="text-gray-700 my-2">{review.content}</p>
              <p className="item-sm font-bold text-gray-500">
                {new Date(review.created_at).toLocaleDateString()}
              </p>

              {/* Comments Section */}
              <div className="mt-4 pl-4 border-l-2 border-gray-200">
                <button
                  onClick={() => fetchComments(review.id)}
                  className="item-sm font-bold text-blue-600 hover:underline"
                >
                  {comments[review.id]?.length || 0} comments
                </button>

                {loading.comments[review.id] ? (
                  <div>Loading comments...</div>
                ) : (
                  comments[review.id]?.map(comment => (
                    <div key={comment.id} className="mt-3 item-sm font-bold">
                      <div className="flex justify-between items-start">
                        <span className="font-medium">{comment.user_username}</span>
                        {auth?.id === comment.user_id && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => setEditingComments(prev => ({ ...prev, [comment.id]: !prev[comment.id] }))}
                              className="text-xs text-blue-600"
                            >
                              {editingComments[comment.id] ? 'Cancel' : 'Edit'}
                            </button>
                            <button
                              onClick={() => handleDeleteComment(review.id, comment.id)}
                              className="text-xs text-red-600"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                      {editingComments[comment.id] ? (
                        <div className="mt-1">
                          <textarea
                            defaultValue={comment.content}
                            ref={el => el && (el.value = comment.content)}
                            className="w-full p-1 border rounded item-sm font-bold"
                            rows="2"
                          />
                          <button
                            onClick={() => handleEditComment(
                              review.id, 
                              comment.id, 
                              document.querySelector(`textarea[defaultValue="${comment.content}"]`).value
                            )}
                            className="mt-1 bg-blue-600 text-white px-2 py-1 rounded text-xs"
                          >
                            Save
                          </button>
                        </div>
                      ) : (
                        <p className="text-gray-700">{comment.content}</p>
                      )}
                    </div>
                  ))
                )}

                {auth && (
                  <CommentForm 
                    reviewId={review.id} 
                    onSuccess={() => handleCommentSubmit(review.id)}
                  />
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
