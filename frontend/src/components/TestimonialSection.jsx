import React from "react";
import "./TestimonialSection.css";
import Joey from "../assets/joey.png";
import Sally from "../assets/hela.png";
import Raj from "../assets/raj.png";
import Tyson from "../assets/tyson.png";

const testimonials = [
  {
    name: "Joey Tribbiani",
    role: "Actor",
    image: Joey,
    rating: 5,
    review: "Logging workouts has never been easier with this app!",
  },
  {
    name: "Sally Hela",
    role: "Fitness Trainer",
    image: Sally,
    rating: 5,
    review: "The tracking feature has truly revolutionized my fitness routine!",
  },
  {
    name: "Raj Kumar",
    role: "Gym Enthusiast",
    image: Raj,
    rating: 4,
    review: "Great app! The calorie tracking feature is incredibly useful.",
  },
  {
    name: "Tyson Fury",
    role: "Professional Boxer",
    image: Tyson,
    rating: 5,
    review: "The personalized workout plans are spot-on for athletes!",
  },
  {
    name: "Chris Evans",
    role: "Athlete",
    image: Joey, // Replace with another image if available
    rating: 5,
    review: "A must-have for anyone serious about fitness. Highly recommended!",
  },
  {
    name: "Olivia Smith",
    role: "Nutritionist",
    image: Sally, // Replace with another image if available
    rating: 5,
    review: "The app’s intuitive design makes tracking progress so easy!",
  },
];

export function TestimonialSection() {
  return (
    <section className="testimonial-section">
      <h3 className="testimonial-title">What People Say</h3>
      <div className="testimonial-slider">
        <div className="testimonial-track">
          {testimonials.concat(testimonials).map((testimonial, index) => (
            <div key={index} className="testimonial-card">
              <img
                src={testimonial.image}
                alt={testimonial.name}
                className="testimonial-image"
              />
              <div className="testimonial-content">
                <div className="testimonial-rating">
                  {Array(testimonial.rating)
                    .fill("⭐")
                    .map((star, idx) => (
                      <span key={idx}>{star}</span>
                    ))}
                </div>
                <p className="testimonial-review">"{testimonial.review}"</p>
                <div className="testimonial-author">
                  <h4>{testimonial.name}</h4>
                  <p>{testimonial.role}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
