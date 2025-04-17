import React from 'react';
import { Star, MapPin, Library } from 'lucide-react';

export const PlaceCard = ({ place }) => {
  console.log(place)
  return (
    <div className="bg-white rounded-lg shadow-md p-6 hover:shadow-lg transition-shadow">
      <h3 className="text-xl font-semibold mb-2">{place.name}</h3>
      <div className="flex items-center gap-2 text-gray-600 mb-2">
        <MapPin size={16} />
        <span>{place.city_name}</span>
        <Library size={16} className="ml-2" />
        <span>{place.category_name}</span>
      </div>
      {place.average_rating && (
        <div className="flex items-center gap-1 mb-2">
          <Star className="text-yellow-400" size={20} />
          <span className="font-semibold">{Number(place.average_rating).toFixed(1)}</span>
          <span className="text-gray-500 text-sm">({place.review_count || 0})</span>
        </div>
      )}
      <p className="text-gray-600">{place.description}</p>
    </div>
  );
};