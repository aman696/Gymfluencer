import React from "react";
import "./Services.css";

// Import service images
import trackImage from "../assets/track.jpg";
import analyzeImage from "../assets/analyze.jpg";
import trainImage from "../assets/train.jpg";
import connectImage from "../assets/connect.jpg";
import challengeImage from "../assets/challenge.jpg";
import { Link } from "react-router-dom"; // Import Link from react-router-dom

// Example service data with standardized link paths
const services = [
  { title: "Diet", image: trackImage, link: "/diet" },
  { title: "Analyze", image: analyzeImage, link: "/analyze" },
  { title: "Train", image: trainImage, link: "/train" },
];

export function Services() {
  return (
    <section className="services-section">
      <div className="services-header">
        <h2 className="services-title">Our Services</h2>
        <p className="services-description">
          GymFluencer offers 5 essential services to help you achieve your fitness goals with ease and flexibility.
        </p>
      </div>
      <div className="services-grid">
        {services.map((service, index) => (
          <Link key={index} to={service.link} className="service-card">
            <div className="service-image-container">
              <img
                src={service.image}
                alt={service.title}
                className="service-image"
              />
              <div className="service-overlay">
                <h3 className="service-title">{service.title}</h3>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
