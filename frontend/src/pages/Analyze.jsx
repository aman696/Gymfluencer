// frontend/src/Analyze.js

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
    const [squatStarted, setSquatStarted] = useState(false);
    // Exercise Tracking States
    const [currentRepCount, setCurrentRepCount] = useState(0);
    const [currentSetCount, setCurrentSetCount] = useState(1);
    const [isResting, setIsResting] = useState(false);
    const [restCountdown, setRestCountdown] = useState(restTime);
    const [exerciseCompleted, setExerciseCompleted] = useState(false);
    const [bodyWeight, setBodyWeight] = useState(70);
    const [caloriesBurned, setCaloriesBurned] = useState(0);
    const [experienceLevel, setExperienceLevel] = useState("Beginner");
    const [bicepCurlSide, setBicepCurlSide] = useState("left");
    // Feedback States
    const [feedback, setFeedback] = useState("Please start the exercise.");
    
    // References for Video and Canvases
    const videoRef = useRef(null);
    const hiddenCanvasRef = useRef(null); // Hidden Canvas for Capturing Frames
    const canvasRef = useRef(null); // Visible Canvas for Drawing Landmarks

    // Processing Control References
    const processingActive = useRef(false);
    const restIntervalRef = useRef(null);

    // Inactivity Detection References
    const inactivityTimerRef = useRef(null); // Timer for inactivity
    const popupTimerRef = useRef(null); // Timer for popup auto-close

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
        "Bicep Curl": {
            "Light": 3,
            "Moderate": 4,
            "Vigorous": 5,
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
            // Start inactivity timer when camera starts
            resetInactivityTimer();
        } catch (err) {
            console.error("Error accessing camera: ", err);
            setFeedback("Unable to access camera. Please check permissions.");
        }
    };

    // Function to Stop Camera
    const stopCamera = () => {
        processingActive.current = false;
        clearRestInterval();
        clearInactivityTimer(); // Clear inactivity timer
        clearPopupTimer(); // Clear popup timer if any
        if (videoRef.current && videoRef.current.srcObject) {
            videoRef.current.srcObject.getTracks().forEach((track) => track.stop());
        }
        setCameraActive(false);

        if (currentRepCount > 0) {
            const totalCalories = calculateCaloriesBurned();
            setCaloriesBurned(totalCalories);
            setExerciseCompleted(true); // Ensure message is displayed
        }

        // Reset feedback
        setFeedback("Please start the exercise."); // Reset feedback
    };

    // Frame Processing Throttling
    const [frameCount, setFrameCount] = useState(0);

    // Function to Process the Next Frame
    const processNextFrame = () => {
        if (!processingActive.current || isResting || currentSetCount > sets) return;
        captureFrameAndProcess();
    };

    const handleSideSwitch = () => {
        setBicepCurlSide(bicepCurlSide === "left" ? "right" : "left");
        // Additional logic if needed
    }

    // Function to Capture Frame and Send to Backend
    const captureFrameAndProcess = async () => {
        setFrameCount((prev) => prev + 1);

        // Keep your existing "skip" logic, but reduce the next delay:
        if (frameCount % 3 !== 0) {
            setTimeout(() => processNextFrame(), 50); // Reduced from 100 to 50
            return;
        }

        if (!videoRef.current || !hiddenCanvasRef.current || !canvasRef.current) return;

        const video = videoRef.current;
        const hiddenCanvas = hiddenCanvasRef.current;
        const hiddenContext = hiddenCanvas.getContext("2d");

        // Set hidden canvas dimensions to smaller for faster round trip
        // (Changed from 640x480 to 320x240)
        hiddenCanvas.width = 320;
        hiddenCanvas.height = 240;

        hiddenContext.drawImage(video, 0, 0, hiddenCanvas.width, hiddenCanvas.height);

        hiddenCanvas.toBlob(async (blob) => {
            const formData = new FormData();
            formData.append("frame", blob, "frame.jpg");
            formData.append("exercise_type", selectedExercise);
            if (selectedExercise === "Bicep Curl") {
                formData.append("side", bicepCurlSide);
            }

            try {
                console.log("Sending frame to backend"); // Debugging log
                // Emit with additional parameters
                const response = await axios.post(`${API_BASE_URL}process_frame`, formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });

                if (response.status === 200) {
                    const data = response.data;

                    if (data.pose_landmarks && data.pose_landmarks.length > 0) {
                        drawLandmarks(data.pose_landmarks, data.hand_landmarks);
                    } else {
                        // If no landmarks, clear canvas
                        const ctx = canvasRef.current.getContext("2d");
                        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
                    }

                    // Update states based on exercise type
                    setCurrentRepCount(data.rep_count || 0);
                    setFeedback(data.feedback || "Keep going!");

                    // Reset inactivity timer on activity
                    resetInactivityTimer();

                    // Check if we reached the target reps
                    if (data.rep_count >= reps && !isResting) {
                        await axios.post(`${API_BASE_URL}reset_exercise`);
                        setCurrentRepCount(0);
                        startRestTimer();
                        return;
                    }

                    // Continue processing if we haven't ended
                    if (processingActive.current && !isResting && currentSetCount <= sets) {
                        processNextFrame(); 
                    }
                }
            } catch (err) {
                console.error("Error processing frame:", err);
                setFeedback("Error processing frame. Retrying...");
                if (processingActive.current && !isResting && currentSetCount <= sets) {
                    setTimeout(() => processNextFrame(), 300); // Reduced from 1000 to 300
                }
            }
        }, "image/jpeg", 0.5); // Lowered from 0.7 to 0.5
    };

    /**
     * Function to Draw Landmarks and Skeleton on Visible Canvas
     */
    const drawLandmarks = (poseLandmarks, handLandmarks) => {
        console.log("Drawing landmarks:", poseLandmarks, handLandmarks); // Debugging log

        const canvas = canvasRef.current;
        const context = canvas.getContext("2d");
        const video = videoRef.current;

        if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) return;

        // Set canvas dimensions to match video
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;

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
            if (poseMap[lm.id]) {
                const { x, y } = poseMap[lm.id];
                context.beginPath();
                context.arc(x, y, 5, 0, 2 * Math.PI);
                context.fill();
            }
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
    };

    const WEIGHT_SUGGESTIONS = {
        Beginner: {
            "Lateral Raise": 5,
            "Shoulder Press": 10,
            "Squats": 20,
            "Bicep Curl": 5,
        },
        Intermediate: {
            "Lateral Raise": 10,
            "Shoulder Press": 15,
            "Squats": 30,
            "Bicep Curl": 10,
        },
        Advance: {
            "Lateral Raise": 15,
            "Shoulder Press": 20,
            "Squats": 50,
            "Bicep Curl": 15,
        },
        Expert: {
            "Lateral Raise": 20,
            "Shoulder Press": 30,
            "Squats": 70,
            "Bicep Curl": 20,
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
                setFeedback("Get ready for the next set!");
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

    // Inactivity Detection Functions

    // Function to reset the inactivity timer
    const resetInactivityTimer = () => {
        clearInactivityTimer(); // Clear existing timer
        // Set a new timer for 10 seconds
        inactivityTimerRef.current = setTimeout(() => {
            showInactivityPopup();
        }, 10000); // 10,000 milliseconds = 10 seconds
    };

    // Function to clear the inactivity timer
    const clearInactivityTimer = () => {
        if (inactivityTimerRef.current) {
            clearTimeout(inactivityTimerRef.current);
            inactivityTimerRef.current = null;
        }
    };

    // Function to show the inactivity popup
    const showInactivityPopup = () => {
        // Show the popup
        setShowPopup(true);
        // Start a timer for the popup auto-close (5 seconds)
        popupTimerRef.current = setTimeout(() => {
            handlePopupTimeout();
        }, 5000);
    };

    // Function to handle popup "Yes" response
    const handlePopupYes = () => {
        // User confirmed they are exercising
        setShowPopup(false);
        clearPopupTimer();
        // Reset inactivity timer
        resetInactivityTimer();
    };

    // Function to handle popup timeout (no response)
    const handlePopupTimeout = () => {
        setShowPopup(false);
        // Automatically stop the camera
        stopCamera();
    };

    // Function to clear the popup timer
    const clearPopupTimer = () => {
        if (popupTimerRef.current) {
            clearTimeout(popupTimerRef.current);
            popupTimerRef.current = null;
        }
    };

    // Initialize popup state
    const [showPopup, setShowPopup] = useState(false);

    // Cleanup timers on Component Unmount
    useEffect(() => {
        return () => {
            stopCamera();
            clearInactivityTimer();
            clearPopupTimer();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    // Function to Start or Reset Exercise
    const handleStart = async () => {
        try {
            await axios.post(`${API_BASE_URL}reset_exercise`);
            
            setCurrentSetCount(1);
            setCurrentRepCount(0);
            setIsResting(false);
            setExerciseCompleted(false);
            setCaloriesBurned(0);
            setFeedback(selectedExercise === "Squats" ? 
                "Stand with feet shoulder-width apart to begin" : 
                "Please start the exercise.");
            setShowPopup(false);
            clearInactivityTimer();
            clearPopupTimer();

            setCameraActive(true);
        } catch (err) {
            console.error("Error resetting exercise:", err);
            setFeedback("Error starting exercise. Please try again.");
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
                                        <p className="feedback-text">
                                            {feedback}
                                        </p>
                                        {/* Specific Exercise Feedback */}
                                        {selectedExercise === "Squats" && (
                                            <p className="squat-status">Ready to perform squats. Stand with feet shoulder-width apart.</p>
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
                        <option value="Bicep Curl">Bicep Curl</option>
                    </select>

                    {/* Render side selection for Bicep Curl */}
                    {selectedExercise === "Bicep Curl" && (
                        <div className="exercise-config">
                            <h3>Select Arm</h3>
                            <div className="config-row">
                                <div className="config-group">
                                    <label htmlFor="bicepCurlSide">Side:</label>
                                    <select
                                        id="bicepCurlSide"
                                        value={bicepCurlSide}
                                        onChange={(e) => setBicepCurlSide(e.target.value)}
                                    >
                                        <option value="left">Left</option>
                                        <option value="right">Right</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Exercise Configuration for all exercises, including Bicep Curl */}
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

            {/* Inactivity Popup Modal */}
            {showPopup && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <h2>Are you exercising?</h2>
                        <div className="modal-buttons">
                            <button onClick={handlePopupYes}>Yes</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
    }
