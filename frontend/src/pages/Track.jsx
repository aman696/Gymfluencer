import React, { useState } from "react";
import { Header } from "../components/Header"; // Reuse the Header component
import "./Track.css"; // Custom CSS for the Track page
import axios from "axios"; // For API calls
import ReactMarkdown from "react-markdown";

export function Track() {
  const [fitnessGoal, setFitnessGoal] = useState("");
  const [currentWeight, setCurrentWeight] = useState("");
  const [height, setHeight] = useState("");
  const [gender, setGender] = useState("");
  const [monthlyBudget, setMonthlyBudget] = useState("");
  const [workoutDays, setWorkoutDays] = useState("");
  const [allergicFoods, setAllergicFoods] = useState("");
  const [dietPreference, setDietPreference] = useState("");
  const [mealsPerDay, setMealsPerDay] = useState("");
  const [generatedPlan, setGeneratedPlan] = useState(""); // For displaying the result
  const [loading, setLoading] = useState(false); // Loading state

  const handleSubmit = async () => {
    setLoading(true);
    setGeneratedPlan(""); // Clear previous plan

    const requestData = {
      fitness_goal: fitnessGoal,
      current_weight: currentWeight,
      height,
      gender,
      monthly_budget: monthlyBudget,
      workout_days: workoutDays,
      allergic_foods: allergicFoods,
      diet_preference: dietPreference,
      meals_per_day: mealsPerDay,
    };

    try {
      const response = await axios.post("http://localhost:5000/generate_plan", requestData);

      if (response.status === 200) {
        setGeneratedPlan(response.data.plan); // Display the generated plan
      } else {
        setGeneratedPlan("Failed to fetch the plan. Please try again later.");
      }
    } catch (error) {
      console.error("Error generating plan:", error);
      setGeneratedPlan("An error occurred while generating the plan.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="track-page">
      <Header />

      <div className="track-container">
        <h1 className="track-title">Personalized Diet Plans</h1>
        <p className="track-description">
          Tailored meal plans to help you achieve your fitness and health goals effectively.
        </p>

        <form className="track-form">
          <div className="form-grid">
            {/* Existing fields */}
            <div className="form-group">
              <label htmlFor="fitness-goal">Fitness Goal</label>
              <select
                id="fitness-goal"
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value)}
                required
              >
                <option value="">Select your goal</option>
                <option value="maintain">Maintain Current Weight</option>
                <option value="loss-fat-build-muscle">
                  Lose Fat & Build Muscle
                </option>
                <option value="lose-fat">Lose Fat</option>
                <option value="build-muscle">Build Muscle</option>
                <option value="gain-fat">Gain Fat</option>
                <option value="gain-muscle">Gain Fat & Muscle</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="current-weight">Current Weight (kg)</label>
              <input
                type="number"
                id="current-weight"
                value={currentWeight}
                onChange={(e) => setCurrentWeight(e.target.value)}
                placeholder="Enter your weight"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="height">Height (cm)</label>
              <input
                type="number"
                id="height"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder="Enter your height"
                required
              />
            </div>

            <div className="form-group">
              <label>Gender</label>
              <div className="radio-group">
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="male"
                    checked={gender === "male"}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  Male
                </label>
                <label>
                  <input
                    type="radio"
                    name="gender"
                    value="female"
                    checked={gender === "female"}
                    onChange={(e) => setGender(e.target.value)}
                  />
                  Female
                </label>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="monthly-budget">Monthly Budget (₹)</label>
              <input
                type="number"
                id="monthly-budget"
                value={monthlyBudget}
                onChange={(e) => setMonthlyBudget(e.target.value)}
                placeholder="Enter your budget"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="workout-days">Workout Days Per Week</label>
              <input
                type="number"
                id="workout-days"
                value={workoutDays}
                onChange={(e) => setWorkoutDays(e.target.value)}
                placeholder="Enter days"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="diet-preference">Diet Preference</label>
              <select
                id="diet-preference"
                value={dietPreference}
                onChange={(e) => setDietPreference(e.target.value)}
                required
              >
                <option value="">Select preference</option>
                <option value="veg">Vegetarian</option>
                <option value="non-veg">Non-Vegetarian</option>
                <option value="vegan">Vegan</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="meals-per-day">Meals Per Day</label>
              <input
                type="number"
                id="meals-per-day"
                value={mealsPerDay}
                onChange={(e) => setMealsPerDay(e.target.value)}
                placeholder="Enter number of meals"
                required
              />
            </div>

            <div className="form-group full-width">
              <label htmlFor="allergic-foods">Allergic Foods (Optional)</label>
              <textarea
                id="allergic-foods"
                value={allergicFoods}
                onChange={(e) => setAllergicFoods(e.target.value)}
                placeholder="List any foods you are allergic to..."
                rows="3"
              ></textarea>
            </div>
          </div>

          <div className="button-group">
            <button
              type="button"
              className="action-button"
              onClick={handleSubmit}
            >
              Get Plan
            </button>
          </div>
        </form>

        {loading ? (
          <p>Loading your plan...</p>
        ) : (
          generatedPlan && (
            <div className="generated-plan">
              <h2>Your Personalized Plan:</h2>
              <ReactMarkdown>{generatedPlan}</ReactMarkdown>
            </div>
          )
        )}
      </div>
    </div>
  );
}
