import React, { useState } from "react";
import "./FAQSection.css";

const faqs = [
  {
    question: "What is StrongX?",
    answer:
      "StrongX is a fitness app that helps users achieve their health goals through personalized workout plans, progress tracking, and expert guidance.",
  },
  {
    question: "How can I track my workouts?",
    answer:
      "You can log your workouts using our intuitive workout tracker, which keeps track of your progress over time.",
  },
  {
    question: "Are the workout plans customizable?",
    answer:
      "Yes, our workout plans are fully customizable to match your fitness goals and preferences.",
  },
  {
    question: "Do I need any special equipment?",
    answer:
      "No special equipment is required. You can perform many of the exercises using your body weight or common household items.",
  },
  {
    question: "Can I access the app on multiple devices?",
    answer:
      "Yes, StrongX is available on all devices, and your progress is synced across them.",
  },
];

export function FAQSection() {
  const [activeIndex, setActiveIndex] = useState(null);

  const toggleFAQ = (index) => {
    setActiveIndex(index === activeIndex ? null : index);
  };

  return (
    <section className="faq-section">
      <h3 className="faq-title">Frequently Asked Questions</h3>
      <div className="faq-container">
        {faqs.map((faq, index) => (
          <div
            key={index}
            className={`faq-item ${activeIndex === index ? "active" : ""}`}
            onClick={() => toggleFAQ(index)}
          >
            <div className="faq-question">
              <h4>{faq.question}</h4>
              <span className="faq-toggle">
                {activeIndex === index ? "-" : "+"}
              </span>
            </div>
            <div className="faq-answer">
              <p>{faq.answer}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
