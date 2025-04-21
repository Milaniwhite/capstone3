import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

export const ItemDetailPage = () => {
  const { id } = useParams();
  const [item, setItem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { auth } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchItem = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/items/${id}`);
        if (!response.ok) {
          throw new Error("Item not found");
        }
        const data = await response.json();
        setItem(data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchItem();
  }, [id]);

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h2 className="text-2xl font-bold text-red-500 mb-4">{error}</h2>
        <button
          onClick={() => navigate("/")}
          className="text-blue-600 hover:underline"
        >
          Back to Home
        </button>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <button
        onClick={() => navigate("/")}
        className="mb-6 text-blue-600 hover:underline"
      >
        &larr; Back to all items
      </button>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {/* Image */}
        <div className="bg-gray-100 p-4">
          {item.images.length > 0 ? (
            <img
              src={item.images[0].image_url}
              alt={item.name}
              className="w-full h-64 object-contain"
            />
          ) : (
            <div className="w-full h-64 bg-gray-200 flex items-center justify-center">
              <span className="text-gray-500">No image available</span>
            </div>
          )}
        </div>

        {/* Item Details */}
        <div className="p-6">
          <h1 className="text-3xl font-bold mb-2">{item.name}</h1>
          <div className="flex items-center mb-4">
            <span className="text-gray-500">
              Added by {item.created_by_username}
            </span>
          </div>

          {/* Rating */}
          <div className="flex items-center mb-4">
            <div className="flex mr-2">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-6 h-6 ${
                    star <= Math.round(item.average_rating)
                      ? "text-yellow-400"
                      : "text-gray-300"
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
            <span className="text-gray-600">
              {typeof item.average_rating === "number"
                ? item.average_rating.toFixed(1)
                : "N/A"}{" "}
              ({item.review_count} reviews)
            </span>
          </div>

          {/* Item Info */}
          <div className="mb-6">
            <h2 className="text-xl font-semibold mb-2">Description</h2>
            <p className="text-gray-700 mb-4">{item.description}</p>

            {item.address && (
              <div className="mb-2">
                <h3 className="font-semibold">Address:</h3>
                <p>{item.address}</p>
              </div>
            )}

            {item.phone_number && (
              <div className="mb-2">
                <h3 className="font-semibold">Phone:</h3>
                <p>{item.phone_number}</p>
              </div>
            )}

            {item.website_url && (
              <div className="mb-2">
                <h3 className="font-semibold">Website:</h3>
                <a
                  href={item.website_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  {item.website_url}
                </a>
              </div>
            )}
          </div>

          {/* Actions */}
          {auth && auth.id === item.created_by && (
            <button
              onClick={() => navigate(`/items/${item.id}/edit`)}
              className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
            >
              Edit Item
            </button>
          )}

          {/* Reviews */}
          <div className="mt-8">
            <h2 className="text-2xl font-bold mb-4">Reviews</h2>
            {item.reviews.length === 0 ? (
              <p className="text-gray-500">No reviews yet.</p>
            ) : (
              <div className="space-y-4">
                {item.reviews.map((review) => (
                  <div key={review.id} className="border-b pb-4">
                    <div className="flex items-center mb-2">
                      <div>
                        <h3 className="font-semibold">
                          {review.user_username}
                        </h3>
                        <div className="flex">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <svg
                              key={star}
                              className={`w-5 h-5 ${
                                star <= review.rating
                                  ? "text-yellow-400"
                                  : "text-gray-300"
                              }`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                      </div>
                    </div>
                    <h4 className="font-semibold text-lg mb-1">
                      {review.title}
                    </h4>
                    <p className="text-gray-700">{review.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
