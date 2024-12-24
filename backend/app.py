import math
import os
import logging
from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import mediapipe as mp
import google.generativeai as genai
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)

app = Flask(__name__)
CORS(app)

##############################################################################
# MEDIAPIPE POSE AND HANDS INITIALIZATION
##############################################################################

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    enable_segmentation=False,
    min_detection_confidence=0.1,
    min_tracking_confidence=0.1
)

mp_hands = mp.solutions.hands
hands = mp_hands.Hands(
    static_image_mode=False,
    max_num_hands=2,
    model_complexity=1,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

##############################################################################
# EXERCISE STATE (3-STATE MACHINE)
##############################################################################

class ExerciseState:
    def __init__(self):
        self.rep_count = 0
        self.position_state = 0
        self.holding_dumbbells_overall = False
        self.dumbbells_detected = False  # New flag to track dumbbell detection

    def reset(self):
        self.rep_count = 0
        self.position_state = 0
        self.holding_dumbbells_overall = False
        self.dumbbells_detected = False  # Reset the flag

exercise_state = ExerciseState()

def reset_exercise_state():
    exercise_state.reset()

def are_landmarks_too_clustered(landmarks):
    """
    Checks if the specified landmarks are too close to each other.
    This can help in determining if the user is too close to the camera or if the detection is unreliable.
    """
    points = [
        (landmarks[11].x, landmarks[11].y),  # left shoulder
        (landmarks[12].x, landmarks[12].y),  # right shoulder
        (landmarks[13].x, landmarks[13].y),  # left elbow
        (landmarks[14].x, landmarks[14].y),  # right elbow
        (landmarks[15].x, landmarks[15].y),  # left wrist
        (landmarks[16].x, landmarks[16].y),  # right wrist
        (landmarks[23].x, landmarks[23].y),  # left hip
        (landmarks[24].x, landmarks[24].y),  # right hip
        (landmarks[25].x, landmarks[25].y),  # left knee
        (landmarks[26].x, landmarks[26].y)   # right knee
    ]
    
    MIN_DISTANCE = 0.05  # Minimum allowed distance between points
    
    # Check distances between all point pairs
    for i in range(len(points)):
        for j in range(i + 1, len(points)):
            dx = points[i][0] - points[j][0]
            dy = points[i][1] - points[j][1]
            distance = math.sqrt(dx**2 + dy**2)
            if distance < MIN_DISTANCE:
                logging.debug(f"Landmarks {i} and {j} are too close: {distance}")
                return True
    return False

##############################################################################
# 1) LATERAL RAISE (Chest line check only, no angles)
##############################################################################

def count_lateral_raise_chest(landmarks):
    """
    3-state logic for Lateral Raise using only the chest line:
      - State 0 => arms down (wrists below chest line)
      - State 1 => arms up (wrists above chest line)
      - State 2 => returning down
      A rep is counted after arms fully return down from being up.
    """
    if are_landmarks_too_clustered(landmarks):
        logging.debug("Landmarks are too clustered. Skipping rep count.")
        return exercise_state.rep_count

    # Shoulders
    left_shoulder = (landmarks[11].x, landmarks[11].y)
    right_shoulder = (landmarks[12].x, landmarks[12].y)
    # Wrists
    left_wrist = (landmarks[15].x, landmarks[15].y)
    right_wrist = (landmarks[16].x, landmarks[16].y)

    # Chest line = midpoint of shoulders
    chest_x = (left_shoulder[0] + right_shoulder[0]) / 2
    chest_y = (left_shoulder[1] + right_shoulder[1]) / 2

    # Arms up => both wrists above chest line => y < chest_y
    arms_up = (left_wrist[1] < chest_y) and (right_wrist[1] < chest_y)
    # Arms down => both wrists below chest line => y > chest_y
    arms_down = (left_wrist[1] > chest_y) and (right_wrist[1] > chest_y)

    current_state = exercise_state.position_state

    if current_state == 0:
        # Starting down
        if arms_up:
            exercise_state.position_state = 1
            logging.debug("Transition to State 1: Arms Up")
    elif current_state == 1:
        # Arms are up
        if not arms_up:
            exercise_state.position_state = 2
            logging.debug("Transition to State 2: Returning Down")
    else:  # current_state == 2 => returning
        if arms_down:
            exercise_state.rep_count += 1
            exercise_state.position_state = 0
            logging.info(f"Lateral Raise Rep Count: {exercise_state.rep_count}")

    return exercise_state.rep_count

def get_lateral_raise_chest_feedback(landmarks):
    left_shoulder = (landmarks[11].x, landmarks[11].y)
    right_shoulder = (landmarks[12].x, landmarks[12].y)
    left_wrist = (landmarks[15].x, landmarks[15].y)
    right_wrist = (landmarks[16].x, landmarks[16].y)

    chest_x = (left_shoulder[0] + right_shoulder[0]) / 2
    chest_y = (left_shoulder[1] + right_shoulder[1]) / 2

    arms_up = (left_wrist[1] < chest_y) and (right_wrist[1] < chest_y)
    arms_down = (left_wrist[1] > chest_y) and (right_wrist[1] > chest_y)

    current_state = exercise_state.position_state
    feedback = "Lift your wrists above chest level to do a lateral raise."

    if current_state == 0:
        if arms_up:
            feedback = "Arms raised! Now lower them back down slowly."
        else:
            feedback = "Arms down. Raise both wrists above your chest."
    elif current_state == 1:
        if not arms_up:
            feedback = "Lower your arms slowly to finish the rep."
        else:
            feedback = "Hold arms above your chest line, then start lowering."
    else:  # current_state == 2 => returning
        if arms_down:
            feedback = "Rep complete! Arms fully down. Get ready for the next raise."
        else:
            feedback = "Keep lowering until your wrists are below your chest line."

    return feedback

##############################################################################
# 2) SHOULDER PRESS (Angle + Nose crossing)
##############################################################################

def calculate_angle(A, B, C):
    """
    Calculates the angle at point B formed by points A, B, and C.
    """
    BA = (A[0] - B[0], A[1] - B[1])
    BC = (C[0] - B[0], C[1] - B[1])

    dot_product = BA[0]*BC[0] + BA[1]*BC[1]
    magBA = math.sqrt(BA[0]**2 + BA[1]**2)
    magBC = math.sqrt(BC[0]**2 + BC[1]**2)

    if magBA == 0 or magBC == 0:
        return 0.0

    cos_angle = dot_product / (magBA * magBC)
    cos_angle = max(min(cos_angle, 1.0), -1.0)
    angle = math.degrees(math.acos(cos_angle))
    return angle

def count_shoulder_press_combined(landmarks):
    """
    3-state Shoulder Press:
      - State 0 => Elbows at ~90° (below nose)
      - State 1 => Overhead (elbow crosses nose => elbow.y < nose.y)
      - State 2 => Returning to ~90°
      A rep is counted when user returns to ~90° from overhead.
    """
    if are_landmarks_too_clustered(landmarks):
        logging.debug("Landmarks are too clustered. Skipping rep count.")
        return exercise_state.rep_count

    left_shoulder_pt = (landmarks[11].x, landmarks[11].y)
    left_elbow_pt    = (landmarks[13].x, landmarks[13].y)
    left_wrist_pt    = (landmarks[15].x, landmarks[15].y)
    nose_pt          = (landmarks[0].x,  landmarks[0].y)

    elbow_angle = calculate_angle(left_shoulder_pt, left_elbow_pt, left_wrist_pt)
    elbow_above_nose = (left_elbow_pt[1] < nose_pt[1])

    START_ANGLE_LOW  = 70
    START_ANGLE_HIGH = 110

    current_state = exercise_state.position_state

    if current_state == 0:
        # wait for elbow.y < nose.y => overhead => state 1
        if elbow_above_nose:
            exercise_state.position_state = 1
            logging.debug("Transition to State 1: Elbows Overhead")
    elif current_state == 1:
        # overhead => if user not elbow_above_nose => state 2
        if not elbow_above_nose:
            exercise_state.position_state = 2
            logging.debug("Transition to State 2: Returning to ~90°")
    else:  # state 2 => returning
        # if elbow angle is ~90° and elbow not above nose => rep++
        if (START_ANGLE_LOW <= elbow_angle <= START_ANGLE_HIGH) and not elbow_above_nose:
            exercise_state.rep_count += 1
            exercise_state.position_state = 0
            logging.info(f"Shoulder Press Rep Count: {exercise_state.rep_count}")

    return exercise_state.rep_count

def get_shoulder_press_feedback_combined(landmarks):
    left_shoulder_pt = (landmarks[11].x, landmarks[11].y)
    left_elbow_pt    = (landmarks[13].x, landmarks[13].y)
    left_wrist_pt    = (landmarks[15].x, landmarks[15].y)
    nose_pt          = (landmarks[0].x,  landmarks[0].y)

    elbow_angle = calculate_angle(left_shoulder_pt, left_elbow_pt, left_wrist_pt)
    elbow_above_nose = (left_elbow_pt[1] < nose_pt[1])

    START_ANGLE_LOW  = 70
    START_ANGLE_HIGH = 110
    current_state = exercise_state.position_state

    if current_state == 0:
        if elbow_above_nose:
            feedback = "Great! Elbows overhead. Now bring them down."
        else:
            if elbow_angle < START_ANGLE_LOW:
                feedback = "Extend elbows more (~90°)."
            elif elbow_angle > START_ANGLE_HIGH:
                feedback = "Bend elbows more (~90°)."
            else:
                feedback = "Push elbows overhead until they cross your nose."
    elif current_state == 1:
        if not elbow_above_nose:
            feedback = "Lower elbows to ~90° to finish the rep."
        else:
            feedback = "Hold overhead, then begin lowering."
    else:  # state 2 => returning
        if (START_ANGLE_LOW <= elbow_angle <= START_ANGLE_HIGH) and not elbow_above_nose:
            feedback = "Rep complete! You're back at the starting position."
        else:
            feedback = "Bring elbows back to ~90° to complete the rep."

    return feedback

##############################################################################
# 3) SQUATS (Pose Landmarks Only, No Angles, 
#    Rep counted once user returns fully to original standing position)
##############################################################################

def count_squats_pose_only(landmarks):
    """
    3-state logic for Squats with NO angles:
      - State 0 => standing (hip definitely above knee)
      - State 1 => bottom (hip below knee)
      - State 2 => returning
      A rep is counted once user returns fully to standing (hip definitely above knee).
    """
    if are_landmarks_too_clustered(landmarks):
        logging.debug("Landmarks are too clustered. Skipping rep count.")
        return exercise_state.rep_count

    left_hip_pt   = (landmarks[23].x, landmarks[23].y)
    left_knee_pt  = (landmarks[25].x, landmarks[25].y)

    # We define 'hip below knee' => hip.y > knee.y
    hip_below_knee = (left_hip_pt[1] > left_knee_pt[1])
    # We define 'hip above knee' => hip.y < knee.y 
    hip_above_knee = (left_hip_pt[1] < left_knee_pt[1])

    current_state = exercise_state.position_state

    if current_state == 0:
        # We assume user is "fully standing" if hip is above knee
        # Move to state 1 if hip goes below knee
        if hip_below_knee:
            exercise_state.position_state = 1
            logging.debug("Transition to State 1: Squat Bottom")
    elif current_state == 1:
        # bottom => if user starts raising => hip no longer below knee => state 2
        if not hip_below_knee:
            exercise_state.position_state = 2
            logging.debug("Transition to State 2: Returning to Standing")
    else:  # state 2 => returning
        # rep is counted only once user is "fully standing" => hip again above knee
        if hip_above_knee:
            exercise_state.rep_count += 1
            exercise_state.position_state = 0
            logging.info(f"Squat Rep Count: {exercise_state.rep_count}")

    return exercise_state.rep_count

def get_squats_pose_feedback(landmarks):
    left_hip_pt   = (landmarks[23].x, landmarks[23].y)
    left_knee_pt  = (landmarks[25].x, landmarks[25].y)

    hip_below_knee = (left_hip_pt[1] > left_knee_pt[1])
    hip_above_knee = (left_hip_pt[1] < left_knee_pt[1])

    current_state = exercise_state.position_state

    # Provide more verbose feedback
    if current_state == 0:
        # fully standing => user is above knee
        if hip_below_knee:
            feedback = "Good squat depth! Now drive upward through your heels."
        else:
            feedback = "Stand tall. Push hips down until they're below your knees."
    elif current_state == 1:
        # bottom => must rise
        if not hip_below_knee:
            feedback = "Great! Drive upward to return to standing."
        else:
            feedback = "Hold the bottom briefly, then push upwards."
    else:  # state 2 => returning
        if hip_above_knee:
            feedback = "Rep complete! You're back at the starting position."
        else:
            feedback = "Keep extending hips to fully stand up."

    return feedback

##############################################################################
# HAND HOLDING DETECTION
##############################################################################

def is_hand_holding_object(hand_landmarks):
    """
    Determines if a hand is holding an object based on finger landmarks.
    Returns True if the majority of fingers are curled or if the spread of fingertips is small.
    """
    # Define finger tip and pip landmarks indices
    FINGER_TIPS = [4, 8, 12, 16, 20]
    FINGER_PIPS = [3, 6, 10, 14, 18]
    
    # Criterion 1: Majority of fingers are curled
    curled_fingers = 0
    for tip, pip in zip(FINGER_TIPS, FINGER_PIPS):
        # In MediaPipe, higher y-value means lower in the image (assuming origin at top-left)
        if hand_landmarks[tip].y > hand_landmarks[pip].y:
            curled_fingers += 1
    
    # Criterion 2: Spread of fingertips is small
    # Calculate average distance between all pairs of fingertips
    tips = [hand_landmarks[tip] for tip in FINGER_TIPS]
    distances = []
    for i in range(len(tips)):
        for j in range(i + 1, len(tips)):
            dx = tips[i].x - tips[j].x
            dy = tips[i].y - tips[j].y
            distance = math.sqrt(dx**2 + dy**2)
            distances.append(distance)
    
    if distances:
        avg_distance = sum(distances) / len(distances)
    else:
        avg_distance = 0
    
    # Threshold for considering the spread as small
    SPREAD_THRESHOLD = 0.2  # Adjust based on testing
    
    small_spread = avg_distance < SPREAD_THRESHOLD
    
    # Logging for debugging
    logging.debug(f"Curled fingers: {curled_fingers}, Average fingertip distance: {avg_distance}, Small spread: {small_spread}")
    
    # Determine holding status based on criteria
    if curled_fingers >= 3 or small_spread:
        return True
    else:
        return False

##############################################################################
# MAIN FEEDBACK ROUTER
##############################################################################

def get_exercise_feedback(landmarks, exercise_type):
    if exercise_type == "Lateral Raise":
        return get_lateral_raise_chest_feedback(landmarks)
    elif exercise_type == "Shoulder Press":
        return get_shoulder_press_feedback_combined(landmarks)
    elif exercise_type == "Squats":
        return get_squats_pose_feedback(landmarks)
    else:
        return "Move to start position or select a valid exercise."

##############################################################################
# FLASK ROUTES
##############################################################################

@app.route("/")
def home():
    return jsonify({
        "message": "Welcome to the Gymfluencer API!",
        "endpoints": {
            "/process_frame": "POST - Process exercise frames",
            "/reset_exercise": "POST - Reset exercise state",
            "/generate_plan": "POST - Generate a personalized diet plan",
            "/workout_plan": "POST - Generate a personalized workout plan"
        }
    }), 200

@app.route("/process_frame", methods=["POST"])
def process_frame():
    if "frame" not in request.files:
        return jsonify({"error": "No frame provided"}), 400

    try:
        exercise_type = request.form.get("exercise_type", "Lateral Raise")
        file = request.files["frame"].read()

        # Decode image
        np_frame = np.frombuffer(file, np.uint8)
        frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)

        # Process Pose
        pose_results = pose.process(frame_rgb)

        # Initialize variables
        landmarks = []
        rep_count = exercise_state.rep_count
        feedback = "Stand upright to start your exercise."
        hand_landmarks = {
            "left_hand": [],
            "right_hand": []
        }
        holding_left = False
        holding_right = False

        # Process Pose Landmarks
        if pose_results.pose_landmarks:
            raw_landmarks = pose_results.pose_landmarks.landmark

            # Add Pose Landmarks to response
            landmarks = [
                {
                    "id": idx,
                    "x": lm.x,
                    "y": lm.y,
                    "z": lm.z,
                    "visibility": lm.visibility
                }
                for idx, lm in enumerate(raw_landmarks) if idx >= 11
            ]

            # Count Reps + Feedback using pose landmarks
            if exercise_type == "Lateral Raise":
                rep_count = count_lateral_raise_chest(raw_landmarks)
                feedback = get_lateral_raise_chest_feedback(raw_landmarks)

            elif exercise_type == "Shoulder Press":
                rep_count = count_shoulder_press_combined(raw_landmarks)
                feedback = get_shoulder_press_feedback_combined(raw_landmarks)

            elif exercise_type == "Squats":
                rep_count = count_squats_pose_only(raw_landmarks)
                feedback = get_squats_pose_feedback(raw_landmarks)

        # Process Hands only if dumbbells are not already detected
        if not exercise_state.dumbbells_detected:
            hands_results = hands.process(frame_rgb)
            if hands_results.multi_hand_landmarks:
                for hand_landmark, hand_handedness in zip(hands_results.multi_hand_landmarks, hands_results.multi_handedness):
                    hand_label = hand_handedness.classification[0].label.lower()
                    landmarks_list = [
                        {
                            "id": idx,
                            "x": lm.x,
                            "y": lm.y,
                            "z": lm.z,
                            "visibility": lm.visibility
                        }
                        for idx, lm in enumerate(hand_landmark.landmark)
                    ]
                    hand_landmarks[f"{hand_label}_hand"] = landmarks_list

                    # Determine if the hand is holding an object
                    holding = is_hand_holding_object(hand_landmark.landmark)
                    if hand_label == "left":
                        holding_left = holding
                    else:
                        holding_right = holding

            holding_dumbbell = holding_left and holding_right
            if holding_dumbbell:
                exercise_state.dumbbells_detected = True
                exercise_state.holding_dumbbells_overall = True
                logging.info("Both dumbbells detected. Stopping hand tracking.")
            else:
                exercise_state.holding_dumbbells_overall = False

        return jsonify({
            "pose_landmarks": landmarks,
            "hand_landmarks": hand_landmarks if not exercise_state.dumbbells_detected else None,
            "rep_count": rep_count,
            "feedback": feedback,
            "holding_dumbbell": holding_left and holding_right,
            "holding_dumbbells_overall": exercise_state.holding_dumbbells_overall,
            "dumbbells_detected": exercise_state.dumbbells_detected
        }), 200

    except Exception as e:
        logging.error(f"Error processing frame: {e}")
        return jsonify({"error": str(e)}), 500


@app.route("/reset_exercise", methods=["POST"])
def reset_exercise():
    reset_exercise_state()
    exercise_state.holding_dumbbells_overall = False  # Reset holding status
    logging.info("Exercise state has been reset.")
    return jsonify({"message": "Exercise state reset"}), 200


##############################################################################
# GEMINI AI DIET & WORKOUT PLAN ROUTES
##############################################################################

@app.route("/generate_plan", methods=["POST"])
def generate_plan():
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))  # Use environment variable
        model = genai.GenerativeModel("gemini-1.5-flash")

        data = request.json
        fitness_goal = data.get("fitness_goal")
        current_weight = data.get("current_weight")
        height = data.get("height")
        gender = data.get("gender")
        monthly_budget = data.get("monthly_budget")
        workout_days = data.get("workout_days")
        allergic_foods = data.get("allergic_foods", "")
        diet_preference = data.get("diet_preference", "")
        meals_per_day = data.get("meals_per_day", 3)

        prompt = (
            f"You are a diet and fitness expert AI tasked with creating a highly personalized and "
            f"optimized monthly diet plan in Markdown format. The Markdown should include a 7-day "
            f"rotating diet plan with each day containing specific meals. "
            f"Use proper Markdown syntax for headings, subheadings, bullet points, and lists to "
            f"ensure readability.\n\n"
            f"Input Parameters:\n"
            f"- Height: {height} cm\n"
            f"- Weight: {current_weight} kg\n"
            f"- Gender: {gender}\n"
            f"- Monthly Budget: ₹{monthly_budget}\n"
            f"- Fitness Goal: {fitness_goal}\n"
            f"- Number of Workout Days Per Week: {workout_days}\n"
            f"- Dietary Preferences: {diet_preference}\n"
            f"- Allergic Foods: {allergic_foods}\n"
            f"- Number of Meals Per Day: {meals_per_day}\n"
            f"- Food Availability: Prioritize locally available and cost-effective foods.\n\n"
            f"Output Requirements:\n"
            f"- Provide a detailed 7-day rotating diet plan for the month.\n"
            f"- Use Markdown headings for each day (e.g., ### Monday).\n"
            f"- List meals using bullet points with sub-bullets for food items, preparation methods, "
            f"and quantities.\n"
            f"- Include daily totals for calories, protein, carbohydrates, and fats.\n"
            f"- Ensure compliance with the budget and suggest alternative food items for cost-effectiveness.\n"
            f"- Emphasize hydration and include affordable beverage suggestions.\n"
            f"- Consider dietary preferences and allergies.\n"
            f"- If the budget is too little to provide a diet, inform the user and generate a diet "
            f"plan that meets the closest possible budget.\n"
        )

        response = model.generate_content(prompt)
        plan_text = response.text
        return jsonify({"plan": plan_text}), 200

    except Exception as e:
        logging.error(f"Error generating plan: {e}")
        return jsonify({"error": str(e)}), 500

@app.route("/workout_plan", methods=["POST"])
def workout_plan():
    try:
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))  # Use environment variable
        model = genai.GenerativeModel("gemini-1.5-flash")

        data = request.json
        fitness_goal = data.get("fitness_goal")
        experience_level = data.get("experience_level")
        workout_days = data.get("workout_days")

        prompt = (
            f"You are a fitness expert AI tasked with creating a personalized workout plan. "
            f"The user details are as follows:\n\n"
            f"- Fitness Goal: {fitness_goal}\n"
            f"- Experience Level: {experience_level}\n"
            f"- Workout Days per Week: {workout_days}\n\n"
            f"Create a detailed {workout_days}-day workout plan that aligns with the user's fitness "
            f"goal and experience level. Include main exercises and alternative exercises in case "
            f"machines are not available. Provide clear instructions and set the number of sets "
            f"and reps for each exercise."
        )

        response = model.generate_content(prompt)
        plan_text = response.text
        return jsonify({"plan": plan_text}), 200

    except Exception as e:
        logging.error(f"Error generating workout plan: {e}")
        return jsonify({"error": str(e)}), 500

##############################################################################
# MAIN
##############################################################################

if __name__ == "__main__":
    reset_exercise_state()
    logging.info("Starting Gymfluencer API Server...")
    app.run(host='0.0.0.0', port=5000, debug=True)
