import React from "react";
import "./Footer.css";

export function Footer() {
  return (
    <footer className="footer-section">
      <div className="footer-container">
        {/* Logo and Description */}
        <div className="footer-logo">
          <h2 className="logo-text">StrongX</h2>
          <p className="footer-description">
            Your trusted companion for achieving fitness goals with personalized plans and expert guidance.
          </p>
        </div>

        {/* Footer Links */}
        <div className="footer-links">
          <div className="footer-column">
            <h3>Company</h3>
            <ul>
              <li><a href="#about">About Us</a></li>
              <li><a href="#services">Services</a></li>
              <li><a href="#careers">Careers</a></li>
              <li><a href="#blog">Blog</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3>Support</h3>
            <ul>
              <li><a href="#faq">FAQ</a></li>
              <li><a href="#contact">Contact Us</a></li>
              <li><a href="#terms">Terms of Service</a></li>
              <li><a href="#privacy">Privacy Policy</a></li>
            </ul>
          </div>
          <div className="footer-column">
            <h3>Follow Us</h3>
            <ul>
              <li><a href="#facebook">Facebook</a></li>
              <li><a href="#instagram">Instagram</a></li>
              <li><a href="#twitter">Twitter</a></li>
              <li><a href="#youtube">YouTube</a></li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer Bottom */}
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} StrongX. All rights reserved.</p>
      </div>
    </footer>
  );
}
