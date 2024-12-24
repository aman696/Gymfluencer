import React, { useState, useRef, useEffect } from "react";
import "./Analyze.css"; // Ensure this path is correct
import axios from "axios";
import { Header } from "../components/Header"; // Ensure Header is correctly imported

export function Analyze() {
  // Backend API URL
  const API_BASE_URL = "http://localhost:5000/";

  // Exercise Configuration States
  const [selectedExercise, setSelectedExercise] = useState("Lateral Raise");
  const [cameraActive, setCameraActive] = useState(false);
  const [reps, setReps] = useState(10);
  const [sets, setSets] = useState(3);
  const [restTime, setRestTime] = useState(30);

  // Exercise Tracking States
  const [currentRepCount, setCurrentRepCount] = useState(0);
  const [currentSetCount, setCurrentSetCount] = useState(1);
  const [isResting, setIsResting] = useState(false);
  const [restCountdown, setRestCountdown] = useState(restTime);
  const [exerciseCompleted, setExerciseCompleted] = useState(false);
  const [bodyWeight, setBodyWeight] = useState(70);
  const [exerciseIntensity, setExerciseIntensity] = useState("Moderate");
  const [caloriesBurned, setCaloriesBurned] = useState(0);
  const [experienceLevel, setExperienceLevel] = useState("Beginner");
  const [weight, setWeight] = useState(10);
  // Feedback State
  const [feedback, setFeedback] = useState("Start your exercise!");

  // References for Video and Canvases
  const videoRef = useRef(null);
  const hiddenCanvasRef = useRef(null); // Hidden Canvas for Capturing Frames
  const canvasRef = useRef(null); // Visible Canvas for Drawing Landmarks

  // Processing Control References
  const processingActive = useRef(false);
  const restIntervalRef = useRef(null);

  // MET Values based on Exercise and Intensity
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

  // Function to Calculate Calories Burned
  const calculateCaloriesBurned = () => {
    const met = MET_VALUES[selectedExercise][exerciseIntensity] || 3; // Default MET
    const totalReps = sets * reps;
    const timePerRep = 3; // seconds
    const totalDurationSeconds = totalReps * timePerRep;
    const durationHours = totalDurationSeconds / 3600;

    const calories = met * bodyWeight * durationHours;
    return Math.round(calories);
  };

  // Start or Stop Camera based on cameraActive state
  useEffect(() => {
    if (cameraActive) {
      startCamera();
    } else {
      stopCamera();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive]);

  // Function to Start Camera
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

  // Function to Stop Camera
  const stopCamera = () => {
    processingActive.current = false;
    clearRestInterval();
    if (videoRef.current && videoRef.current.srcObject) {
      videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
    }
    setCameraActive(false);
  };

  // Frame Processing Throttling
  const [frameCount, setFrameCount] = useState(0);

  // Function to Process the Next Frame
  const processNextFrame = () => {
    if (!processingActive.current || isResting || currentSetCount > sets) return;
    captureFrameAndProcess();
  };

  // Function to Capture Frame and Send to Backend
  const captureFrameAndProcess = async () => {
    setFrameCount(prev => prev + 1);

    if (frameCount % 3 !== 0) { // Process every 3rd frame
      setTimeout(() => {
        processNextFrame();
      }, 100);
      return;
    }

    if (!videoRef.current || !hiddenCanvasRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const hiddenCanvas = hiddenCanvasRef.current;
    const hiddenContext = hiddenCanvas.getContext("2d");
    const poseCanvas = canvasRef.current;
    const poseContext = poseCanvas.getContext("2d");

    // Ensure video metadata is loaded
    if (video.readyState !== 4) {
      setTimeout(() => {
        captureFrameAndProcess();
      }, 100);
      return;
    }

    // Set hidden canvas dimensions to match backend resizing
    hiddenCanvas.width = 640; // Match backend resizing
    hiddenCanvas.height = 480;

    // Draw the video frame to the hidden canvas
    hiddenContext.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);

    // Capture the frame as a Blob from the hidden canvas with reduced quality
    hiddenCanvas.toBlob(async (blob) => {
      const formData = new FormData();
      formData.append("frame", blob, "frame.jpg");
      formData.append("exercise_type", selectedExercise);

      try {
        const response = await axios.post(`${API_BASE_URL}process_frame`, formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        if (response.status === 200) {
          if (response.data.pose_landmarks && response.data.pose_landmarks.length > 0) {
            console.log("Received landmarks:", response.data.pose_landmarks); // Debugging
            drawLandmarks(response.data.pose_landmarks);
          }

          const newRepCount = response.data.rep_count || 0;
          setCurrentRepCount(newRepCount);

          // Capture Feedback
          const newFeedback = response.data.feedback || "Keep going!";
          setFeedback(newFeedback);

          if (newRepCount >= reps && !isResting) {
            // Reset backend and frontend rep count
            await axios.post(`${API_BASE_URL}reset_exercise`);
            setCurrentRepCount(0);

            startRestTimer();
          } else if (processingActive.current && !isResting && currentSetCount <= sets) {
            // Introduce a small delay to prevent overwhelming the backend
            setTimeout(() => {
              processNextFrame();
            }, 300); // 300ms delay
          }
        }
      } catch (err) {
        console.error("Error processing frame:", err);
        if (processingActive.current && !isResting && currentSetCount <= sets) {
          // Retry after a short delay in case of temporary errors
          setTimeout(() => {
            processNextFrame();
          }, 1000); // 1 second delay
        }
      }
    }, "image/jpeg", 0.7); // Reduce image quality to lower payload size
  };

  /**
   * Function to Draw Landmarks and Skeleton on Visible Canvas
   */
  const drawLandmarks = (landmarks) => {
    const canvas = canvasRef.current;
    const context = canvas.getContext("2d");

    // Clear previous drawings
    context.clearRect(0, 0, canvas.width, canvas.height);

    // Create a map of landmark id to coordinates
    const landmarkMap = {};
    landmarks.forEach((lm) => {
      landmarkMap[lm.id] = { x: lm.x * canvas.width, y: lm.y * canvas.height };
    });

    // 1. Draw circles on each landmark
    context.fillStyle = "red";
    landmarks.forEach((lm) => {
      const { x, y } = landmarkMap[lm.id];
      context.beginPath();
      context.arc(x, y, 5, 0, 2 * Math.PI);
      context.fill();
    });

    // 2. Define skeleton connections (common MediaPipe Pose pairs)
    const POSE_CONNECTIONS = [
      // Arms
      [11, 13], [13, 15], [12, 14], [14, 16],
      // Shoulders
      [11, 12],
      // Hips
      [23, 24],
      // Shoulders to hips
      [11, 23], [12, 24],
      // Legs
      [23, 25], [25, 27], [24, 26], [26, 28],
      // Feet (Optional)
      [27, 29], [29, 31], [28, 30], [30, 32],
      // Spine
      [11, 23], [12, 24],
    ];

    // 3. Draw lines for skeleton
    context.strokeStyle = "lime";
    context.lineWidth = 2;

    POSE_CONNECTIONS.forEach(([startId, endId]) => {
      const start = landmarkMap[startId];
      const end = landmarkMap[endId];

      // Ensure both landmarks exist before drawing
      if (start && end) {
        context.beginPath();
        context.moveTo(start.x, start.y);
        context.lineTo(end.x, end.y);
        context.stroke();
      }
    });
  };
  const WEIGHT_SUGGESTIONS = {
    Beginner: {
      "Lateral Raise": 5,
      "Shoulder Press": 10,
      "Squats": 20,
    },
    Intermediate: {
      "Lateral Raise": 10,
      "Shoulder Press": 15,
      "Squats": 30,
    },
    Advance: {
      "Lateral Raise": 15,
      "Shoulder Press": 20,
      "Squats": 50,
    },
    Expert: {
      "Lateral Raise": 20,
      "Shoulder Press": 30,
      "Squats": 70,
    },
  };  const getSuggestedWeight = () => {
    return WEIGHT_SUGGESTIONS[experienceLevel]?.[selectedExercise] || "N/A";
  };
  // Rest Timer Logic
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

  // Continuously Process Frames if Conditions Allow
  useEffect(() => {
    if (cameraActive && processingActive.current && !isResting && currentSetCount <= sets) {
      processNextFrame();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cameraActive, isResting, currentSetCount]);

  // Cleanup on Component Unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Function to Start or Reset Exercise
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
              {/* Hidden Canvas for Capturing Frames */}
              <canvas ref={hiddenCanvasRef} className="hidden-canvas"></canvas>

              {/* Visible Video Feed */}
              <video ref={videoRef} autoPlay muted className="camera-feed"></video>

              {/* Visible Canvas for Drawing Pose Landmarks */}
              <canvas ref={canvasRef} className="pose-canvas"></canvas>

              {/* Rep Counter Overlay */}
              <div className="rep-counter-overlay">
                {isResting ? (
                  <h2>Rest: {restCountdown} sec</h2>
                ) : (
                  <>
                    <h2>
                      Set: {currentSetCount}/{sets} | Reps: {currentRepCount}/{reps}
                    </h2>
                    {/* Dynamic Feedback */}
                    <p className="feedback-text">{feedback}</p>
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
        </div>

        <div className="analyze-right">
          <h2 className="dropdown-title">Select an Exercise</h2>
          <select
            className="exercise-dropdown"
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
                <label htmlFor="experience">Experience Level:</label>
                <select
                  id="experience"
                  value={experienceLevel}
                  onChange={(e) => setExperienceLevel(e.target.value)}
                >
                  <option value="Beginner">Beginner (0-3 months)</option>
                  <option value="Intermediate">Intermediate (3-6 months)</option>
                  <option value="Advance">Advance (6-12 months)</option>
                  <option value="Expert">Expert (12+ months)</option>
                </select>
                <small className="suggestion-text">
                  Suggested Weight: {getSuggestedWeight()} kg
                </small>
              </div>
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
