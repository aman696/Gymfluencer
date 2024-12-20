import React from "react";
import { Link } from "react-router-dom"; // Import Link for navigation
import "./FitnessHub.css";
import backgroundImage from "../assets/gymbg.jpg"; // Import your background image

export function FitnessHub() {
  return (
    <section
      className="fitness-hub-section"
      style={{ backgroundImage: `url(${backgroundImage})` }} // Inline style for the background
    >
      <div className="fitness-hub-container">
        {/* Left Content */}
        <div className="fitness-hub-content">
          <h2 className="hub-title">Your Personalized Fitness Hub</h2>
          <p className="hub-description">
            Personalized workout routines tailored to your goals and preferences.
          </p>
          <p className="hub-description">
            Get expert guidance with virtual coaching sessions, available anytime, anywhere.
          </p>
          <p className="hub-description">
            Track your fitness journey with detailed analytics, goal setting, and achievements.
          </p>
        </div>

        {/* Right Stats and Card */}
        <div className="fitness-hub-stats">
          {/* Card Section */}
          <div className="plan-card">
            <div className="plan-day">
              <span className="day-circle">Fri</span>
            </div>
            <div className="plan-details">
              <h3 className="workout-title">Workout 1</h3>
              <p className="workout-description">
                Jumping jacks, squats, high plank, crunches...
              </p>
            </div>
            <Link to="/train" className="details-button">Details</Link>
          </div>
          <div className="plan-card">
            <div className="plan-day">
              <span className="day-circle">Sat</span>
            </div>
            <div className="plan-details">
              <h3 className="workout-title">Workout 2</h3>
              <p className="workout-description">
                Push up in-row, lunges, mountain climber, squats...
              </p>
            </div>
            <Link to="/train" className="details-button">Details</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
