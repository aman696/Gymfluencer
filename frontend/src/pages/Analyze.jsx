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
    const [weightLifted, setWeightLifted] = useState(10);
    
    // Exercise Tracking States
    const [currentRepCount, setCurrentRepCount] = useState(0);
    const [currentSetCount, setCurrentSetCount] = useState(1);
    const [isResting, setIsResting] = useState(false);
    const [restCountdown, setRestCountdown] = useState(restTime);
    const [exerciseCompleted, setExerciseCompleted] = useState(false);
    const [bodyWeight, setBodyWeight] = useState(70);
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [experienceLevel, setExperienceLevel] = useState("Beginner");
    
    // Feedback States
    const [feedback, setFeedback] = useState("Start your exercise!");
    const [holdingDumbbell, setHoldingDumbbell] = useState(false); // Existing State
    const [holdingDumbbellsOverall, setHoldingDumbbellsOverall] = useState(false); // New State
    const [dumbbellsDetected, setDumbbellsDetected] = useState(false); // New State
    
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
        const MET = MET_VALUES[selectedExercise]["Moderate"]; // Adjust if necessary
        const actualReps = currentRepCount + ((currentSetCount - 1) * reps);
        const calories = (MET * bodyWeight * (actualReps * 3) / 3600) * 1.15; // 1.15 factor for resistance training
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
  
      if (currentRepCount > 0) {
          const totalCalories = calculateCaloriesBurned();
          setCaloriesBurned(totalCalories);
          setExerciseCompleted(true); // Ensure message is displayed
      }
  
      // Reset dumbbell detection state
      setHoldingDumbbellsOverall(false);
  };
  

    // Frame Processing Throttling
    const [frameCount, setFrameCount] = useState(0);

    // Function to Process the Next Frame
    const processNextFrame = () => {
        if (!processingActive.current || isResting || currentSetCount > sets || dumbbellsDetected) return;
        captureFrameAndProcess();
    };

    // Function to Capture Frame and Send to Backend
    const captureFrameAndProcess = async () => {
      setFrameCount((prev) => prev + 1);
  
      if (frameCount % 3 !== 0) {
          setTimeout(() => processNextFrame(), 100);
          return;
      }
  
      if (!videoRef.current || !hiddenCanvasRef.current || !canvasRef.current) return;
  
      const video = videoRef.current;
      const hiddenCanvas = hiddenCanvasRef.current;
      const hiddenContext = hiddenCanvas.getContext("2d");
  
      // Set hidden canvas dimensions to match backend resizing
      hiddenCanvas.width = 640;
      hiddenCanvas.height = 480;
  
      hiddenContext.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);
  
      hiddenCanvas.toBlob(async (blob) => {
          const formData = new FormData();
          formData.append("frame", blob, "frame.jpg");
          formData.append("exercise_type", selectedExercise);
  
          try {
              const response = await axios.post(`${API_BASE_URL}process_frame`, formData, {
                  headers: { "Content-Type": "multipart/form-data" },
              });
  
              if (response.status === 200) {
                  const data = response.data;
  
                  if (data.pose_landmarks && data.pose_landmarks.length > 0) {
                      drawLandmarks(data.pose_landmarks, data.hand_landmarks);
                  }
  
                  setCurrentRepCount(data.rep_count || 0);
                  setFeedback(data.feedback || "Keep going!");
                  setHoldingDumbbell(data.holding_dumbbell || false);
                  setHoldingDumbbellsOverall(data.holding_dumbbells_overall || false);
                  setDumbbellsDetected(data.dumbbells_detected || false);
  
                  if (data.rep_count >= reps && !isResting) {
                      await axios.post(`${API_BASE_URL}reset_exercise`);
                      setCurrentRepCount(0);
                      startRestTimer();
                  } else if (processingActive.current && !isResting && currentSetCount <= sets) {
                      setTimeout(() => processNextFrame(), 300);
                  }
              }
          } catch (err) {
              console.error("Error processing frame:", err);
              if (processingActive.current && !isResting && currentSetCount <= sets) {
                  setTimeout(() => processNextFrame(), 1000);
              }
          }
      }, "image/jpeg", 0.7);
  };
  

    /**
     * Function to Draw Landmarks and Skeleton on Visible Canvas
     */
    const drawLandmarks = (poseLandmarks, handLandmarks) => {
        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");

        // Clear previous drawings
        context.clearRect(0, 0, canvas.width, canvas.height);

        // Create a map of pose landmark id to coordinates
        const poseMap = {};
        poseLandmarks.forEach((lm) => {
            poseMap[lm.id] = { x: lm.x * canvas.width, y: lm.y * canvas.height };
        });

        // 1. Draw Pose Landmarks
        context.fillStyle = "red";
        poseLandmarks.forEach((lm) => {
            const { x, y } = poseMap[lm.id];
            context.beginPath();
            context.arc(x, y, 5, 0, 2 * Math.PI);
            context.fill();
        });

        // 2. Define pose skeleton connections (common MediaPipe Pose pairs)
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

        // 3. Draw Pose Skeleton
        context.strokeStyle = "lime";
        context.lineWidth = 2;

        POSE_CONNECTIONS.forEach(([startId, endId]) => {
            const start = poseMap[startId];
            const end = poseMap[endId];

            // Ensure both landmarks exist before drawing
            if (start && end) {
                context.beginPath();
                context.moveTo(start.x, start.y);
                context.lineTo(end.x, end.y);
                context.stroke();
            }
        });

        // **Removed: Drawing Hand Landmarks**
        // Since the backend stops sending hand landmarks once dumbbells are detected,
        // and the frontend no longer needs to display them, this section remains commented out.
        /*
        // 4. Draw Hand Landmarks
        const drawHand = (handLandmarks, color = "blue") => {
            const handMap = {};
            handLandmarks.forEach((lm) => {
                handMap[lm.id] = { x: lm.x * canvas.width, y: lm.y * canvas.height };
            };

            // Draw hand landmarks
            context.fillStyle = color;
            handLandmarks.forEach((lm) => {
                const { x, y } = handMap[lm.id];
                context.beginPath();
                context.arc(x, y, 3, 0, 2 * Math.PI);
                context.fill();
            };

            // Define hand skeleton connections (based on MediaPipe Hands)
            const HAND_CONNECTIONS = [
                [0, 1], [1, 2], [2, 3], [3, 4],       // Thumb
                [0, 5], [5, 6], [6, 7], [7, 8],       // Index Finger
                [0, 9], [9, 10], [10, 11], [11, 12],   // Middle Finger
                [0, 13], [13, 14], [14, 15], [15, 16], // Ring Finger
                [0, 17], [17, 18], [18, 19], [19, 20], // Pinky
            ];

            // Draw hand skeleton
            context.strokeStyle = color;
            context.lineWidth = 1.5;

            HAND_CONNECTIONS.forEach(([startId, endId]) => {
                const start = handMap[startId];
                const end = handMap[endId];

                if (start && end) {
                    context.beginPath();
                    context.moveTo(start.x, start.y);
                    context.lineTo(end.x, end.y);
                    context.stroke();
                }
            });
        };

        // Draw left hand
        if (handLandmarks.left_hand && handLandmarks.left_hand.length > 0) {
            drawHand(handLandmarks.left_hand, "blue");
        }

        // Draw right hand
        if (handLandmarks.right_hand && handLandmarks.right_hand.length > 0) {
            drawHand(handLandmarks.right_hand, "orange");
        }
        */
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
    };  

    const getSuggestedWeight = () => {
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
        if (cameraActive && processingActive.current && !isResting && currentSetCount <= sets && !dumbbellsDetected) {
            processNextFrame();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [cameraActive, isResting, currentSetCount, dumbbellsDetected]);

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
            setHoldingDumbbell(false); // Reset holding status
            setHoldingDumbbellsOverall(false); // Reset overall holding status
            setDumbbellsDetected(false); // Reset dumbbellsDetected flag
            // No need to reset hand landmarks since they are no longer used

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
                                        <p className={`feedback-text ${holdingDumbbell ? 'holding' : 'not-holding'}`}>
                                            {feedback}
                                        </p>
                                        {/* Dumbbell Related Messages */}
                                        {dumbbellsDetected ? (
                                            <p className="dumbbells-detected-status">
                                                Dumbbells have been detected. Hand tracking is paused.
                                            </p>
                                        ) : (
                                            holdingDumbbell ? (
                                                <>
                                                    <p className="holding-status">
                                                        Object detected in both hands.
                                                    </p>
                                                    <p className="holding-overall-status">
                                                        Both dumbbells are detected. You're ready to perform the exercise.
                                                    </p>
                                                </>
                                            ) : (
                                                <>
                                                    <p className="holding-status">
                                                        No object detected. Please hold an object for accurate tracking.
                                                    </p>
                                                    <p className="holding-overall-status">
                                                        No dumbbells detected. Please ensure you're holding objects in both hands.
                                                    </p>
                                                </>
                                            )
                                        )}
                                    </>
                                )}
                            </div>
                        </>
                    ) : (
                        <div className="placeholder">
                            {exerciseCompleted || (!cameraActive && currentRepCount > 0) ? (
                                <>
                                    <p className="good-job-message">Exercise session completed!</p>
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
                                <label htmlFor="weightLifted">Weight Per Object (kg):</label>
                                <input
                                    id="weightLifted"
                                    type="number"
                                    min="1"
                                    value={weightLifted}
                                    onChange={(e) => setWeightLifted(parseFloat(e.target.value) || 1)}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="button-group">
                        <button
                            className="start-button"
                            style={{ marginRight: "1rem" }}
                            onClick={handleStart}
                            disabled={cameraActive} // Disable start button when active
                        >
                            Start Exercise
                        </button>

                        <button
                            className="start-button"
                            onClick={() => {
                                stopCamera();
                            }}
                            disabled={!cameraActive} // Disable stop button when not active
                        >
                            Stop Exercise
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
