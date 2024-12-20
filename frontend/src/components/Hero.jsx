import React from "react";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import "./Hero.css";
import gymImage from "../assets/gym.jpg";

export function Hero() {
  const scrollingText = [
    "Motivation",
    "Progress",
    "Fitness",
    "Wellness",
    "Work",
    "Community",
    "Strength",
  ];

  return (
    <div className="hero-container">
      <section className="hero">
        <div className="hero-background">
          {/* Modified to motion.img to animate on entering viewport */}
          <motion.img
            src={gymImage}
            alt="Gym environment"
            className="hero-image"
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 1 }}
            viewport={{ once: true, amount: 0.5 }}
          />
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              width: "100%",
              height: "100%",
              background: "rgba(0, 0, 0, 0.6)",
              zIndex: 1,
            }}
          />
        </div>

        <div className="hero-content-wrapper">
          <div className="hero-content">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="trust-badge"
            >
              Trusted by 100k+ clients
            </motion.div>
            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="hero-title geometric-text"
            >
              <h2 className="text-center">Transform</h2>
              <h2 className="text-primary text-center">Body and Mind</h2>
              <h2 className="text-center">at StrongX</h2>
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="hero-description"
              position="center"
            >
              With ten years of experience in the health and wellness industry, our fitness solution
              continues to be a top option throughout the U.S.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6 }}
            >
            </motion.div>
          </div>
        </div>
      </section>

      {/* Scrolling Text Section */}
      <div className="scrolling-text-wrapper">
        <motion.div
          className="scrolling-row upper-row"
          animate={{ x: ["100%", "-100%"] }}
          transition={{
            repeat: Infinity,
            duration: 15,
            ease: "linear",
          }}
        >
          {scrollingText.map((text, index) => (
            <span key={index} className="scrolling-text">
              {text} /
            </span>
          ))}
        </motion.div>

        <motion.div
          className="scrolling-row lower-row"
          animate={{ x: ["-100%", "100%"] }}
          transition={{
            repeat: Infinity,
            duration: 15,
            ease: "linear",
          }}
        >
          {scrollingText.map((text, index) => (
            <span key={index} className="scrolling-text secondary">
              {text} /
            </span>
          ))}
        </motion.div>
      </div>

      {/* Mission Section */}
      <div className="mission-section">
        <div className="mission-content">
          <h2 className="mission-title">YOUR FITNESS.<br />OUR MISSION.</h2>
          <p className="mission-description">
            At StrongX, our mission is simple: to provide the tools and support you need to
            reach your fitness goals. We combine innovative technology with personalized guidance
            to make fitness easier, more accessible, and more motivating. Join us as we help you
            transform your fitness journey, one workout at a time.
          </p>
        </div>
        <div className="mission-stats">
          <div className="stat-item">
            <h3>463k+</h3>
            <p>Workouts logged and progress tracked every month</p>
          </div>
          <div className="stat-item">
            <h3>163k+</h3>
            <p>Fitness enthusiasts connected through our platform</p>
          </div>
          <div className="stat-item">
            <h3>13+</h3>
            <p>Countries where StrongX is making an impact</p>
          </div>
        </div>
      </div>

      {/* Slices Container */}
      
    </div>
  );
}
