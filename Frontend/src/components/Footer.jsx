import { useState } from "react";
import { Link } from "react-router-dom";
import "./Footer.css";

const Footer = () => {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!feedback.trim()) return;

    // Backend/API submission will be added later
    setSubmitted(true);
    setFeedback("");

    setTimeout(() => {
      setSubmitted(false);
    }, 3000);
  };

  return (
    <footer className="site-footer">
      <div className="footer-main">

        {/* Mascot Placeholder */}
        <div className="footer-brand">
          <div className="footer-placeholder footer-mascot-placeholder">
            <img
                src="Mascot.png"
                alt="Mascot"
            />
          </div>
        </div>

        {/* About Placeholder */}
        <div className="footer-about">
          <div className="footer-placeholder footer-icon-placeholder">
            <img
                src="Short Logo.png"
                alt="Logo"
            />
          </div>

          <h3>About Us</h3>

          <p>
            Academic Arc is a cultural magazine celebrating creativity, talent, and 
            expression beyond the classroom. From writing and poetry to music, dance, 
            and art, we provide a platform to showcase and share the diverse talents of our 
            school community.
          </p>

          <Link to="/about" className="about-know-more">
            Know More →
          </Link>
        </div>

        {/* Contact */}
        <div className="footer-contact">
          <h3>Contact Us</h3>

          <div className="contact-item">
            <span className="contact-icon">Icon</span>
            <span>
            Department of School Education,
            <br />
            Bikash Bhavan, Kolkata
            </span>
          </div>

          <div className="contact-item">
            <span className="contact-icon">Icon</span>
            <span>email@example.com</span>
          </div>
        </div>

        {/* Feedback */}
        <div className="footer-feedback">
        <form className="feedback-form" onSubmit={handleSubmit}>
            <label htmlFor="feedback">Your Feedback</label>

            <div className="feedback-input-wrapper">
            <input
                id="feedback"
                type="text"
                placeholder="Share your feedback..."
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
            />

            <button
                type="submit"
                className="feedback-submit"
                disabled={!feedback.trim()}
                aria-label="Submit feedback"
            >
                <svg
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                >
                <path
                    d="M21 3L10.2 13.8"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <path
                    d="M21 3L14.1 21L10.2 13.8L3 9.9L21 3Z"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinejoin="round"
                />
                </svg>
            </button>
            </div>

            {submitted && (
            <span className="feedback-success">
                Feedback submitted!
            </span>
            )}
        </form>
        </div>

        {/* Social Media */}
        <div className="footer-social">
          <h3>Follow Us</h3>

          <p>Stay connected with Academic Arc.</p>

          <div className="social-links">

            <a
              href="https://www.instagram.com/academicarc.in"
              className="social-link"
              aria-label="Instagram"
            >
              <img
                  src="/Icons/instagram.svg"
                  alt=""
                  className="Instagram"
              />
            </a>

            <a
              href="https://www.facebook.com/academicarc.in"
              className="social-link"
              aria-label="Facebook"
            >
              <img
                  src="/Icons/facebook.svg"
                  alt=""
                  className="Facebook"
              />
            </a>

            <a
              href="https://www.linkedin.com/company/academic-arc2026/home/"
              className="social-link"
              aria-label="LinkedIn"
            >
              <img
                  src="/Icons/linkedin.svg"
                  alt=""
                  className="LinkedIn"
              />
            </a>

          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>
          © 2026 Academic Arc. All Rights Reserved.
        </p>

        <div className="footer-links">
          <span>Privacy Policy</span>
          <span>|</span>
          <span>Copyright Policy</span>
          <span>|</span>
          <span>Sitemap</span>
        </div>
      </div>
    </footer>
  );
};

export default Footer;