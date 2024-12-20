import { useState, useEffect } from 'react'
import { Clock, Phone, Mail, ChevronDown, ArrowRight } from 'lucide-react'
import './Header.css'
import logo from '../assets/logo.png'
export function Header({ isServicesOpen, setIsServicesOpen }) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 0)
    }
    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  return (
    <header className={`header ${scrolled ? 'scrolled' : ''}`}>
      <div className="top-bar">
        <div className="container">
          <div className="contact-info">
            <div className="info-item">
              <Clock className="icon" />
              <span>6 a.m - 9 p.m (Mon - Sun)</span>
            </div>
            <div className="info-item">
              <Phone className="icon" />
              <span>+259 (0) 256 215</span>
            </div>
          </div>
          <div className="info-item">
            <Mail className="icon" />
            <span>contact@strongx.com</span>
          </div>
        </div>
      </div>
      <div className="main-header container">
        <a href="/" className="logo geometric-text">
          <img src={logo} alt="StrongX" className="logo-image" />
          <span className="logo-text">
            <span className="text-primary">StrongX</span>
          </span>
        </a>
        <nav className="nav">
          <a href="/" className="nav-item">Home</a>
          <a href="/" className="nav-item">About us</a>
          <a href="/" className="nav-item">Services</a>
          <a href="/" className="nav-item">Blog</a>
          <a href="/" className="nav-item">Contact us</a>
        </nav>
      </div>
    </header>
  )
}
