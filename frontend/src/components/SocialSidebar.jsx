import { Twitter, Instagram, Linkedin, Youtube } from 'lucide-react'
import './SocialSidebar.css'

export function SocialSidebar() {
  return (
    <div className="social-sidebar">
      <div className="social-links">
        <a href="#" className="social-link" aria-label="Twitter">
          <Twitter className="icon" />
        </a>
        <a href="#" className="social-link" aria-label="Instagram">
          <Instagram className="icon" />
        </a>
        <a href="#" className="social-link" aria-label="LinkedIn">
          <Linkedin className="icon" />
        </a>
        <a href="#" className="social-link" aria-label="YouTube">
          <Youtube className="icon" />
        </a>
        <div className="follow-text">Follow us</div>
      </div>
    </div>
  )
}

