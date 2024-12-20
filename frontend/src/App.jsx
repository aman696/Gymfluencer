import { useState } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { SocialSidebar } from "./components/SocialSidebar";
import { Services } from "./components/Services";
import { FitnessHub } from "./components/FitnessHub";
import { TestimonialSection } from "./components/TestimonialSection";
import { FAQSection } from "./components/FaqSection";
import { Footer } from "./components/Footer";
import { Analyze } from "./pages/Analyze"; // Import Analyze Component
import { Train } from "./pages/Train";
import { Track } from "./pages/Track";
import "./App.css";

export default function App() {
  const [isServicesOpen, setIsServicesOpen] = useState(false);

  return (
    <Router>
      <div className="app">

        {/* React Router Routes */}
        <Routes>
          {/* Home Page */}
          <Route
            path="/"
            element={
              <>
                  <Header/>
                <Hero />
                <Services />
                <FitnessHub />
                <TestimonialSection />
                <FAQSection />
                <SocialSidebar />
                <Footer/>

              </>
            }
          />

          {/* Individual Pages */}
          <Route path="/analyze" element={<Analyze />} />
          <Route path="/train" element={<Train />} />
          <Route path="/diet" element={<Track />} />  
        </Routes>

      </div>
    </Router>
  );
}
