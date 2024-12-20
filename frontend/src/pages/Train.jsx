// src/pages/Train.jsx

import React, { useState } from "react";
import { Header } from "../components/Header"; // Reuse the Header component
import "./Train.css"; // Custom CSS for the Train page
import "./Track.css"; // Reuse Track.css for consistent styling
import axios from "axios";

export function Train() {
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [personalizedWorkout, setPersonalizedWorkout] = useState(""); // Store personalized routine
  const [formData, setFormData] = useState({
    fitnessGoal: "",
    experienceLevel: "",
    workoutDays: "",
  }); // Form data state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(""); // Error state for form submission

  // Define workout plans with alternate exercises
  const workoutPlans = [
    {
      id: 1,
      title: "3-Day Workout Plan",
      description: "Perfect for beginners or those with a busy schedule.",
      schedule: [
        {
          day: "Monday",
          exercises: [
            { main: "Squats - 3 sets of 12 reps", alternate: "Bodyweight Squats - 3 sets of 15 reps" },
            { main: "Push-Ups - 3 sets of 10 reps", alternate: "Incline Push-Ups - 3 sets of 12 reps" },
            { main: "Plank - 3 sets of 30 seconds", alternate: "Side Plank - 3 sets of 20 seconds per side" },
          ],
        },
        {
          day: "Wednesday",
          exercises: [
            { main: "Deadlifts - 3 sets of 10 reps", alternate: "Romanian Deadlifts with Dumbbells - 3 sets of 12 reps" },
            { main: "Bench Press - 3 sets of 12 reps", alternate: "Push-Ups - 3 sets of 15 reps" },
            { main: "Bicycle Crunches - 3 sets of 15 reps", alternate: "Leg Raises - 3 sets of 12 reps" },
          ],
        },
        {
          day: "Friday",
          exercises: [
            { main: "Lunges - 3 sets of 12 reps per leg", alternate: "Step-Ups - 3 sets of 12 reps per leg" },
            { main: "Overhead Press - 3 sets of 10 reps", alternate: "Pike Push-Ups - 3 sets of 12 reps" },
            { main: "Russian Twists - 3 sets of 20 reps", alternate: "Mountain Climbers - 3 sets of 15 reps per leg" },
          ],
        },
      ],
    },
    {
      id: 2,
      title: "4-Day Workout Plan",
      description: "Ideal for intermediate fitness enthusiasts.",
      schedule: [
        {
          day: "Monday - Upper Body",
          exercises: [
            { main: "Pull-Ups - 4 sets of 8 reps", alternate: "Assisted Pull-Ups - 4 sets of 10 reps" },
            { main: "Dumbbell Bench Press - 4 sets of 10 reps", alternate: "Push-Ups - 4 sets of 15 reps" },
            { main: "Bent Over Rows - 4 sets of 12 reps", alternate: "Dumbbell Rows - 4 sets of 10 reps" },
          ],
        },
        {
          day: "Tuesday - Lower Body",
          exercises: [
            { main: "Squats - 4 sets of 12 reps", alternate: "Bodyweight Squats - 4 sets of 15 reps" },
            { main: "Leg Press - 4 sets of 10 reps", alternate: "Step-Ups - 4 sets of 12 reps" },
            { main: "Calf Raises - 4 sets of 15 reps", alternate: "Seated Calf Raises - 4 sets of 20 reps" },
          ],
        },
        {
          day: "Thursday - Core & Cardio",
          exercises: [
            { main: "Plank - 4 sets of 45 seconds", alternate: "Side Plank - 4 sets of 30 seconds per side" },
            { main: "Hanging Leg Raises - 4 sets of 12 reps", alternate: "Bicycle Crunches - 4 sets of 15 reps" },
            { main: "Jump Rope - 20 minutes", alternate: "Jogging - 15 minutes" },
          ],
        },
        {
          day: "Friday - Full Body",
          exercises: [
            { main: "Deadlifts - 4 sets of 8 reps", alternate: "Romanian Deadlifts - 4 sets of 10 reps" },
            { main: "Push Press - 4 sets of 10 reps", alternate: "Dumbbell Shoulder Press - 4 sets of 12 reps" },
            { main: "Kettlebell Swings - 4 sets of 15 reps", alternate: "Jump Squats - 4 sets of 12 reps" },
          ],
        },
      ],
    },
    {
      id: 3,
      title: "5-Day Workout Plan",
      description: "Designed for advanced individuals seeking comprehensive training.",
      schedule: [
        {
          day: "Monday - Chest & Triceps",
          exercises: [
            { main: "Bench Press - 5 sets of 8 reps", alternate: "Incline Push-Ups - 5 sets of 12 reps" },
            { main: "Incline Dumbbell Press - 5 sets of 10 reps", alternate: "Chest Dips - 5 sets of 12 reps" },
            { main: "Tricep Dips - 5 sets of 12 reps", alternate: "Close-Grip Push-Ups - 5 sets of 15 reps" },
          ],
        },
        {
          day: "Tuesday - Back & Biceps",
          exercises: [
            { main: "Deadlifts - 5 sets of 6 reps", alternate: "Romanian Deadlifts - 5 sets of 8 reps" },
            { main: "Pull-Ups - 5 sets of 10 reps", alternate: "Assisted Pull-Ups - 5 sets of 12 reps" },
            { main: "Barbell Curls - 5 sets of 12 reps", alternate: "Dumbbell Curls - 5 sets of 10 reps" },
          ],
        },
        {
          day: "Wednesday - Legs",
          exercises: [
            { main: "Squats - 5 sets of 10 reps", alternate: "Bodyweight Squats - 5 sets of 12 reps" },
            { main: "Leg Extensions - 5 sets of 12 reps", alternate: "Step-Ups - 5 sets of 12 reps" },
            { main: "Hamstring Curls - 5 sets of 12 reps", alternate: "Dumbbell Romanian Deadlifts - 5 sets of 10 reps" },
          ],
        },
        {
          day: "Thursday - Shoulders & Abs",
          exercises: [
            { main: "Overhead Press - 5 sets of 8 reps", alternate: "Pike Push-Ups - 5 sets of 10 reps" },
            { main: "Lateral Raises - 5 sets of 12 reps", alternate: "Front Raises - 5 sets of 10 reps" },
            { main: "Crunches - 5 sets of 20 reps", alternate: "Plank - 5 sets of 30 seconds" },
          ],
        },
        {
          day: "Friday - Full Body & Cardio",
          exercises: [
            { main: "Clean and Press - 5 sets of 6 reps", alternate: "Kettlebell Swings - 5 sets of 10 reps" },
            { main: "Burpees - 5 sets of 15 reps", alternate: "Mountain Climbers - 5 sets of 20 reps" },
            { main: "Running - 30 minutes", alternate: "Cycling - 30 minutes" },
          ],
        },
      ],
    },
  ];

  // Handle form submission
  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setPersonalizedWorkout("");

    try {
      const response = await axios.post("http://localhost:5000/workout_plan", {
        fitness_goal: formData.fitnessGoal,
        experience_level: formData.experienceLevel,
        workout_days: formData.workoutDays,
      });

      if (response.status === 200) {
        setPersonalizedWorkout(response.data.plan); // Display the personalized workout plan
      } else {
        setError("Failed to generate workout plan. Please try again.");
      }
    } catch (err) {
      console.error("Error generating workout plan:", err);
      setError("An error occurred while generating the workout plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="train-page">
      <Header />

      <div className="train-container">
        <h1 className="train-title">Customized Workout Plans</h1>
        <p className="train-description">
          Choose a workout plan that fits your schedule and fitness level to achieve your goals effectively.
        </p>

        {/* Workout Plan Cards */}
        <div className="workout-cards">
          {workoutPlans.map((plan) => (
            <div
              key={plan.id}
              className="workout-card"
              onClick={() => setSelectedPlan(plan)} // Show popup when card is clicked
            >
              <h2 className="card-title">{plan.title}</h2>
              <p className="card-description">{plan.description}</p>
            </div>
          ))}
        </div>

        {/* Popup for Plan Details */}
        {selectedPlan && (
          <div className="popup-overlay" onClick={() => setSelectedPlan(null)}>
            <div className="popup" onClick={(e) => e.stopPropagation()}>
              <h2 className="popup-title">{selectedPlan.title}</h2>
              <button className="close-button" onClick={() => setSelectedPlan(null)}>
                &times;
              </button>
              <ul className="schedule-list">
                {selectedPlan.schedule.map((day, index) => (
                  <li key={index}>
                    <strong>{day.day}:</strong>
                    <ul>
                      {day.exercises.map((exercise, idx) => (
                        <li key={idx}>
                          {exercise.main} <br />
                          <em>(Alternate: {exercise.alternate})</em>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Personalized Workout Routine Section */}
        <div className="personalized-workout">
          <h2>Create Your Personalized Workout Routine</h2>
          <form className="workout-form" onSubmit={handleFormSubmit}>
            <div className="form-group">
              <label htmlFor="fitness-goal">Fitness Goal</label>
              <select
                id="fitness-goal"
                value={formData.fitnessGoal}
                onChange={(e) => setFormData({ ...formData, fitnessGoal: e.target.value })}
                required
              >
                <option value="">Select your goal</option>
                <option value="Lose Weight">Lose Weight</option>
                <option value="Build Muscle">Build Muscle</option>
                <option value="Improve Endurance">Improve Endurance</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="experience-level">Experience Level</label>
              <select
                id="experience-level"
                value={formData.experienceLevel}
                onChange={(e) => setFormData({ ...formData, experienceLevel: e.target.value })}
                required
              >
                <option value="">Select your experience level</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="workout-days">Workout Days per Week</label>
              <input
                type="number"
                id="workout-days"
                value={formData.workoutDays}
                onChange={(e) => setFormData({ ...formData, workoutDays: e.target.value })}
                placeholder="Enter number of days"
                min="1"
                max="7"
                required
              />
            </div>

            <button type="submit" className="action-button" disabled={loading}>
              {loading ? "Generating..." : "Generate Plan"}
            </button>
          </form>

          {/* Display the Personalized Workout */}
          {personalizedWorkout && (
            <div className="generated-plan">
              <h3>Your Personalized Workout Plan:</h3>
              <div className="plan-content">
                {/* Render the Markdown content as HTML */}
                <div dangerouslySetInnerHTML={{ __html: personalizedWorkout }}></div>
              </div>
            </div>
          )}

          {/* Display Error Message */}
          {error && (
            <div className="error-message">
              <p>{error}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
