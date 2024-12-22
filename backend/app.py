# app.py

from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import mediapipe as mp
import google.generativeai as genai
import os
from dotenv import load_dotenv

load_dotenv()
app = Flask(__name__)
CORS(app)

mp_pose = mp.solutions.pose
pose = mp_pose.Pose(
    static_image_mode=False,
    model_complexity=1,
    smooth_landmarks=True,
    enable_segmentation=False,
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5
)

class ExerciseState:
    def __init__(self):
        self.rep_count = 0
        self.position_state = 0

exercise_state = ExerciseState()

def reset_exercise_state():
    exercise_state.rep_count = 0
    exercise_state.position_state = 0

def count_squats(landmarks):
    hip = landmarks[23]
    knee = landmarks[25]
    stand_threshold = knee.y - 0.05

    if exercise_state.position_state == 0:
        if hip.y > stand_threshold:
            exercise_state.rep_count += 1
            exercise_state.position_state = 1
    else:
        if hip.y < stand_threshold:
            exercise_state.position_state = 0
    return exercise_state.rep_count

def count_lateral_raise(landmarks):
    left_wrist = landmarks[15]
    left_shoulder = landmarks[11]
    right_wrist = landmarks[16]
    right_shoulder = landmarks[12]

    left_arm_up = (left_wrist.y <= left_shoulder.y) and (left_wrist.x > left_shoulder.x)
    right_arm_up = (right_wrist.y <= right_shoulder.y) and (right_wrist.x < right_shoulder.x)

    arms_raised = left_arm_up and right_arm_up

    if exercise_state.position_state == 0:
        if arms_raised:
            exercise_state.rep_count += 1
            exercise_state.position_state = 1
    else:
        if not arms_raised:
            exercise_state.position_state = 0

    return exercise_state.rep_count

def count_shoulder_press(landmarks):
    left_elbow = landmarks[13]
    nose = landmarks[0]

    elbow_up = left_elbow.y < nose.y
    if exercise_state.position_state == 0:
        if elbow_up:
            exercise_state.rep_count += 1
            exercise_state.position_state = 1
    else:
        if not elbow_up:
            exercise_state.position_state = 0

    return exercise_state.rep_count
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
        np_frame = np.frombuffer(file, np.uint8)
        frame = cv2.imdecode(np_frame, cv2.IMREAD_COLOR)
        frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        results = pose.process(frame_rgb)

        landmarks = []
        rep_count = exercise_state.rep_count

        if results.pose_landmarks:
            raw_landmarks = results.pose_landmarks.landmark
            landmarks = [
                {
                    "x": lm.x,
                    "y": lm.y,
                    "z": lm.z,
                    "visibility": lm.visibility
                }
                for lm in raw_landmarks
            ]

            if exercise_type == "Lateral Raise":
                rep_count = count_lateral_raise(raw_landmarks)
            elif exercise_type == "Shoulder Press":
                rep_count = count_shoulder_press(raw_landmarks)
            elif exercise_type == "Squats":
                rep_count = count_squats(raw_landmarks)

        return jsonify({
            "pose_landmarks": landmarks,
            "rep_count": rep_count
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/reset_exercise", methods=["POST"])
def reset_exercise():
    reset_exercise_state()
    return jsonify({"message": "Exercise state reset"}), 200

@app.route("/generate_plan", methods=["POST"])
def generate_plan():
    try:
        # Configure Gemini API
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))  # Use environment variable
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Collect data from the request
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

        # Pre-made prompt for Gemini API to return Markdown
        prompt = (
            f"You are a diet and fitness expert AI tasked with creating a highly personalized and optimized monthly diet plan in Markdown format. "
            f"The Markdown should include a 7-day rotating diet plan with each day containing specific meals. "
            f"Use proper Markdown syntax for headings, subheadings, bullet points, and lists to ensure readability.\n\n"
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
            f"- List meals using bullet points with sub-bullets for food items, preparation methods, and quantities.\n"
            f"- Include daily totals for calories, protein, carbohydrates, and fats.\n"
            f"- Ensure compliance with the budget and suggest alternative food items for cost-effectiveness.\n"
            f"- Emphasize hydration and include affordable beverage suggestions.\n"
            f"- Consider dietary preferences and allergies.\n"
            f"- If the budget is too little to provide a diet, inform the user and generate a diet plan that meets the closest possible budget.\n"
        )

        # Generate content using Gemini API
        response = model.generate_content(prompt)
        plan_text = response.text

        return jsonify({"plan": plan_text}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route("/workout_plan", methods=["POST"])
def workout_plan():
    try:
        # Configure Gemini API
        genai.configure(api_key=os.getenv("GEMINI_API_KEY"))  # Use environment variable
        model = genai.GenerativeModel("gemini-1.5-flash")

        # Collect data from the request
        data = request.json
        fitness_goal = data.get("fitness_goal")
        experience_level = data.get("experience_level")
        workout_days = data.get("workout_days")

        # Create prompt for workout plan
        prompt = (
            f"You are a fitness expert AI tasked with creating a personalized workout plan. "
            f"The user details are as follows:\n\n"
            f"- Fitness Goal: {fitness_goal}\n"
            f"- Experience Level: {experience_level}\n"
            f"- Workout Days per Week: {workout_days}\n\n"
            f"Create a detailed {workout_days}-day workout plan that aligns with the user's fitness goal and experience level. "
            f"Include main exercises and alternative exercises in case machines are not available. "
            f"Provide clear instructions and set the number of sets and reps for each exercise."
        )

        # Generate content using Gemini API
        response = model.generate_content(prompt)
        plan_text = response.text

        return jsonify({"plan": plan_text}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    reset_exercise_state()
    app.run(debug=True)
