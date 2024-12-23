import React, { useState, useRef, useEffect } from "react";
import "./Analyze.css";
import axios from "axios";
import { Header } from "../components/Header";

export function Analyze() {
  // Update to match your local or deployed backend URL
  const API_BASE_URL = "http://localhost:5000/";

  // Existing states
  const [selectedExercise, setSelectedExercise] = useState("Lateral Raise");
  const [cameraActive, setCameraActive] = useState(false);
  const [yoloResults, setYoloResults] = useState([]);
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(3);
  const [restTime, setRestTime] = useState(30);

  const [currentRepCount, setCurrentRepCount] = useState(0);
  const [currentSetCount, setCurrentSetCount] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restCountdown, setRestCountdown] = useState(restTime);

  const [exerciseCompleted, setExerciseCompleted] = useState(false); 
  const [bodyWeight, setBodyWeight] = useState(70);
  const [exerciseIntensity, setExerciseIntensity] = useState("Moderate");
  const [caloriesBurned, setCaloriesBurned] = useState(0);

  // NEW: Feedback state
  const [feedback, setFeedback] = useState("Start your exercise!");

  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const processingActive = useRef(false);
  const restIntervalRef = useRef(null);

  // Define MET values based on exercise type and intensity
  const MET_VALUES = {
    "Lateral Raise": {
      "Light": 3,
      "Moderate": 4,
      "Vigorous": 5,
    },
    "Shoulder Press": {
      "Light": 4,
      "Moderate": 5,
      "Vigorous": 6,
    },
    "Squats": {
      "Light": 5,
      "Moderate": 6,
      "Vigorous": 7,
    },
  };

  // Function to calculate calories burned
  const calculateCaloriesBurned = () => {
    const met = MET_VALUES[selectedExercise][exerciseIntensity] || 3; // Default MET
    const totalReps = sets * reps;
    const timePerRep = 3; // seconds
    const totalDurationSeconds = totalReps * timePerRep;
    const durationHours = totalDurationSeconds / 3600;

    const calories = met * bodyWeight * durationHours;
    return Math.round(calories);
  };

  // Camera startup/shutdown
  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      processingActive.current = true;
      processNextFrame();
    } catch (err) {
      console.error("Error accessing camera: ", err);
    }
  };

  const stopCamera = () => {
    processingActive.current = false;
    clearRestInterval();
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    // We don't set cameraActive here to avoid potential conflicts.
  };

  // Continuous frame processing
  const processNextFrame = () => {
    if (!processingActive.current || isResting || currentSetCount > sets) return;
    captureFrameAndProcess();
  };

  const captureFrameAndProcess = async () => {
    if (!videoRef.current || !canvasRef.current) return;

    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");
    context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);

    canvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("frame", blob);
      formData.append("exercise_type", selectedExercise);

      try {
        const response = await axios.post(`${API_BASE_URL}process_frame`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.status === 200) {
          if (response.data.pose_landmarks) {
            drawLandmarks(response.data.pose_landmarks);
          }

          const newRepCount = response.data.rep_count || 0;
          setCurrentRepCount(newRepCount);

          // NEW: Capture feedback
          const newFeedback = response.data.feedback || "Keep going!";
          setFeedback(newFeedback);

          if (newRepCount >= reps && !isResting) {
            // Reset backend and frontend rep count
            await axios.post(`${API_BASE_URL}reset_exercise`);
            setCurrentRepCount(0);

            startRestTimer();
          } else if (processingActive.current && !isResting && currentSetCount <= sets) {
            processNextFrame();
          }
        }
      } catch (err) {
        console.error("Error processing frame:", err);
        if (processingActive.current && !isResting && currentSetCount <= sets) {
          processNextFrame();
        }
      }
    });
  };

  const drawLandmarks = (landmarks) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    context.clearRect(0, 0, canvas.width, canvas.height);
    context.fillStyle = "red";

    landmarks.forEach((lm) => {
      const x = lm.x * canvas.width;
      const y = lm.y * canvas.height;
      context.beginPath();
      context.arc(x, y, 3, 0, 2 * Math.PI);
      context.fill();
    });
  };

  // Rest timer logic
  const startRestTimer = () => {
    setIsResting(true);
    setRestCountdown(restTime);
    clearRestInterval();

    restIntervalRef.current = setInterval(() => {
      setRestCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(restIntervalRef.current);
          finishRestWithBaseline();
          return restTime;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const finishRestWithBaseline = () => {
    setIsResting(false);
    setCurrentSetCount((prevSet) => {
      const nextSet = prevSet + 1;
      if (nextSet > sets) {
        // All sets completed
        processingActive.current = false;
        stopCamera();
        setExerciseCompleted(true);
        setCameraActive(false);

        // Calculate total calories burned
        const totalCalories = calculateCaloriesBurned();
        setCaloriesBurned(totalCalories);
      } else {
        // Next set
        processNextFrame();
      }
      return nextSet;
    });
  };

  const clearRestInterval = () => {
    if (restIntervalRef.current) {
      clearInterval(restIntervalRef.current);
      restIntervalRef.current = null;
    }
  };

  // Keep processing frames if conditions allow
  useEffect(() => {
    if (cameraActive && processingActive.current && !isResting && currentSetCount <= sets) {
      processNextFrame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, isResting, currentSetCount]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Start or reset
  const handleStart = async () => {
    try {
      // Reset backend exercise state first
      await axios.post(`${API_BASE_URL}reset_exercise`);

      // Reset frontend states
      setCurrentSetCount(1);
      setCurrentRepCount(0);
      setIsResting(false);
      setExerciseCompleted(false);
      setCaloriesBurned(0);
      setFeedback("Start your exercise!");

      setCameraActive(true);
    } catch (err) {
      console.error("Error resetting exercise:", err);
    }
  };

  return (
    <div className="analyze-page">
      <Header />
      <div className="analyze-scrollable">
        <div className="analyze-left">
          {cameraActive ? (
            <>
              <video ref={videoRef} autoPlay muted className="camera-feed"></video>
              <div className="rep-counter-overlay">
                {isResting ? (
                  <h2>Rest: {restCountdown} sec</h2>
                ) : (
                  <>
                    <h2>
                      Set: {currentSetCount}/{sets} | Reps: {currentRepCount}/{reps}
                    </h2>
                    {/* Display dynamic feedback */}
                    <p style={{ marginTop: "115px" }}>{feedback}</p>
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="placeholder">
              {exerciseCompleted ? (
                <>
                  <p className="good-job-message">Good job on finishing the sets!</p>
                  <p className="calories-message">
                    You have burned approximately {caloriesBurned} calories.
                  </p>
                </>
              ) : (
                <p>Camera feed will appear here when you start the exercise.</p>
              )}
            </div>
          )}
          <canvas ref={canvasRef} width="640" height="480" style={{ display: "none" }}></canvas>
        </div>

        <div className="analyze-right" style={{ paddingTop: "10rem" }}>
          <h2 className="dropdown-title">Select an Exercise</h2>
          <select
            className="exercise-dropdown"
            style={{ backgroundColor: "#333" }}
            value={selectedExercise}
            onChange={(e) => setSelectedExercise(e.target.value)}
          >
            <option value="Lateral Raise">Lateral Raise</option>
            <option value="Shoulder Press">Shoulder Press</option>
            <option value="Squats">Squats</option>
          </select>

          <div className="exercise-config">
            <h3>Set Your Preferences</h3>
            <div className="config-row">
              <div className="config-group">
                <label htmlFor="reps">Number of Reps:</label>
                <input
                  id="reps"
                  type="number"
                  min="1"
                  value={reps}
                  onChange={(e) => setReps(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="config-group">
                <label htmlFor="sets">Number of Sets:</label>
                <input
                  id="sets"
                  type="number"
                  min="1"
                  value={sets}
                  onChange={(e) => setSets(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="config-group">
                <label htmlFor="rest">Rest Time (seconds):</label>
                <input
                  id="rest"
                  type="number"
                  min="1"
                  value={restTime}
                  onChange={(e) => setRestTime(parseInt(e.target.value, 10) || 1)}
                />
              </div>
              <div className="config-group">
                <label htmlFor="weight">Body Weight (kg):</label>
                <input
                  id="weight"
                  type="number"
                  min="1"
                  value={bodyWeight}
                  onChange={(e) => setBodyWeight(parseFloat(e.target.value) || 1)}
                />
              </div>
              <div className="config-group">
                <label htmlFor="intensity">Exercise Intensity:</label>
                <select
                  id="intensity"
                  value={exerciseIntensity}
                  onChange={(e) => setExerciseIntensity(e.target.value)}
                >
                  <option value="Light">Light</option>
                  <option value="Moderate">Moderate</option>
                  <option value="Vigorous">Vigorous</option>
                </select>
              </div>
            </div>
          </div>

          <div className="button-group">
            <button
              className="start-button"
              style={{ marginRight: "1rem" }}
              onClick={handleStart}
            >
              Start Exercise
            </button>

            <button
              className="start-button"
              onClick={() => {
                processingActive.current = false;
                setCameraActive(false);
              }}
            >
              Stop Exercise
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
