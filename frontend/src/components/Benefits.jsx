import React from 'react'
import './Benefits.css'

const Benefits = () => {
  return (
    <div className="benefits-wrapper">
      <div className="benefits-grid">
        {/* Left Side Benefits */}
        <div className="benefit-card">
          <span className="benefit-icon">👥</span>
          <h3>Effortless Workout Logging</h3>
          <p>Easily log your workouts and monitor your progress over time with our intuitive logging feature.</p>
        </div>
        
        <div className="benefit-card">
          <span className="benefit-icon">📊</span>
          <h3>Accurate Rep Counting</h3>
          <p>Count your reps accurately with our app, ensuring consistency and improved performance.</p>
        </div>

        {/* Center Phone Display */}
        <div className="phone-container">
          <div className="phone-frame">
            <div className="phone-header">
              <span>9:41</span>
              <span className="close-btn">×</span>
              <span>🔊</span>
            </div>
            
            <div className="workout-timer">
              <div className="time">03 : 25</div>
              <div className="label">Skip Warm-up</div>
            </div>

            <div className="workout-display">
              <img src="https://placehold.co/300x400" alt="Workout demonstration" />
              <button className="review-btn">
                <span>👁️</span> Review Movement
              </button>
              <div className="exercise-name">Dumbbell Lunges</div>
            </div>

            <div className="control-panel">
              <button>⚙️</button>
              <button className="play-btn">▶️</button>
              <button>🎵</button>
            </div>
          </div>
        </div>

        {/* Right Side Benefits */}
        <div className="benefit-card">
          <span className="benefit-icon">🎯</span>
          <h3>Personalized Workout Plans</h3>
          <p>AI-powered workout plans tailored to your fitness level, goals, and progress.</p>
        </div>

        <div className="benefit-card">
          <span className="benefit-icon">🍎</span>
          <h3>Calorie Calculation & Diet Plans</h3>
          <p>Calculate calories burned during workouts and get AI-customized meal plans for optimal nutrition.</p>
        </div>
      </div>
    </div>
  )
}

export default Benefits