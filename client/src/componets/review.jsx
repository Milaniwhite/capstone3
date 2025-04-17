import React from 'react';
import ' .index.css';

const Review = () => { const [places, setPlaces] = useState([]);}
const fetchreview= async ()=>{ const endpoint=searchQuery?`/api/places/:placeId/reviews/`

}
document.getElementById('reviewForm').addEventListener('submit', function(event) {
    event.preventDefault(); // Prevent the default form submission

    const reviewText = document.getElementById('review').value;

    if (reviewText.trim() === "") {
        alert("Please write a review before submitting.");
        return;
    }

    // Simulate a review submission
    console.log("Review submitted:", reviewText);

    // Clear the form after submission
    document.getElementById('review').value = "";
    alert("Thank you for your review!");
});

document.addEventListener('DOMContentLoaded', () => {
    const stars = document.querySelectorAll('.star');

    stars.forEach(star => {
        star.addEventListener('click', () => {
            stars.forEach(s => s.classList.remove('selected'));
            star.classList.add('selected');
            let previousSibling = star.previousElementSibling;
            while (previousSibling) {
                previousSibling.classList.add('selected');
                previousSibling = previousSibling.previousElementSibling;
            }
            alert(`You rated this ${star.getAttribute('data-value')} stars!`);
        });
    });
});
const reviews = {};

