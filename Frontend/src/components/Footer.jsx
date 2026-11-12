import { useState } from "react";
import { Link } from "react-router-dom";
import { API_URL } from "../config";
import "./Footer.css";

const Footer = () => {
  const [feedback, setFeedback] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [feedbackError, setFeedbackError] = useState("");
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [guestEmail, setGuestEmail] = useState("");
  const [placeholderToast, setPlaceholderToast] = useState("");

  const handlePlaceholderClick = (e, name) => {
    e.preventDefault();
    setPlaceholderToast(`${name} page is coming soon!`);
    setTimeout(() => {
      setPlaceholderToast("");
    }, 2500);
  };

  const handleContactClick = (e) => {
    e.preventDefault();
    const contactSection = document.getElementById("footer-contact-info");
    if (contactSection) {
      contactSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!feedback.trim() || submitting) return;

    const token = localStorage.getItem("access_token");

    // Guests get the option to provide an email.
    if (!token) {
      setShowEmailModal(true);
      return;
    }

    await submitFeedback(token);
  };

  const submitFeedback = async (token = null, email = null) => {
    if (!feedback.trim() || submitting) return;

    setSubmitting(true);
    setSubmitted(false);
    setFeedbackError("");

    try {
      const headers = {
        "Content-Type": "application/json",
      };

      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }

      const response = await fetch(`${API_URL}/feedback`, {
        method: "POST",
        headers,
        body: JSON.stringify({
          feedback: feedback.trim(),
          ...(email ? { email: email.trim() } : {}),
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.detail || "Unable to submit feedback.");
      }

      setSubmitted(true);
      setFeedback("");
      setGuestEmail("");
      setShowEmailModal(false);

      setTimeout(() => {
        setSubmitted(false);
      }, 3000);

    } catch (error) {
      console.error("Feedback submission failed:", error);
      setFeedbackError(
        error.message || "Unable to submit feedback. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleGuestFeedbackSubmit = async (e) => {
    e.preventDefault();
    await submitFeedback(null, guestEmail || null);
  };

  const handleSkipGuestEmail = async () => {
    await submitFeedback(null, null);
  };

  return (
    <footer className="site-footer">
      <div className="footer-main">

        {/* 1. Owl Mascot Column */}
        <div className="footer-mascot-col">
          <div className="footer-mascot-wrapper">
            <img
              src="/Mascot.png"
              alt="Academic Arc Mascot"
              className="footer-mascot-img"
            />
          </div>
        </div>

        {/* 2. About Us Column */}
        <div className="footer-about-col">
          <div className="footer-logo-badge">
            <img
              src="/Short Logo.png"
              alt="Academic Arc"
              className="footer-short-logo"
            />
          </div>

          <h3 className="footer-col-title">About Us</h3>

          <p className="footer-about-text">
            Academic Arc is a cultural magazine celebrating creativity, talent, and 
            expression beyond the classroom. From writing and poetry to music, dance, 
            and art, we provide a platform to showcase and share the diverse talents of our 
            school community.
          </p>
        </div>

        {/* 3. Contact Us Column */}
        <div className="footer-contact-col" id="footer-contact-info">
          <h3 className="footer-col-title">Contact Us</h3>

          <div className="footer-contact-list">
            <div className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </span>
              <span className="footer-contact-text">
                Rampur, Gaighata
                <br />
                24 PGS(N) - 743249
              </span>
            </div>

            <div className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2a7 7 0 0 0-7 7c0 5 7 13 7 13s7-8 7-13a7 7 0 0 0-7-7z" />
                  <circle cx="12" cy="9" r="2.5" />
                </svg>
              </span>
              <span className="footer-contact-text">
                Action Area 1B, Newtown
                <br />
                Kolkata - 700156
              </span>
            </div>

            <div className="footer-contact-item">
              <span className="footer-contact-icon" aria-hidden="true">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2.5" y="4.5" width="19" height="15" rx="2.5" />
                  <path d="m3.5 6.5 8.5 6 8.5-6" />
                </svg>
              </span>
              <a href="mailto:contact@academicarc.in" className="footer-contact-link">
                contact@academicarc.in
              </a>
            </div>
          </div>
        </div>

        {/* 4. Quick Links Column */}
        <div className="footer-quick-links-col">
          <h3 className="footer-col-title footer-quick-links-title">QUICK LINKS</h3>

          <ul className="footer-quick-links-list">
            <li>
              <Link to="/about" className="footer-nav-link">
                About Us
              </Link>
            </li>
            <li>
              <a
                href="#editorial-policy"
                onClick={(e) => handlePlaceholderClick(e, "Editorial Policy")}
                className="footer-nav-link"
              >
                Editorial Policy
              </a>
            </li>
            <li>
              <a
                href="#submission-guidelines"
                onClick={(e) => handlePlaceholderClick(e, "Submission Guidelines")}
                className="footer-nav-link"
              >
                Submission Guidelines
              </a>
            </li>
            <li>
              <a
                href="#award-winners"
                onClick={(e) => handlePlaceholderClick(e, "Award Winners")}
                className="footer-nav-link"
              >
                Award Winners
              </a>
            </li>
            <li>
              <a
                href="#archive"
                onClick={(e) => handlePlaceholderClick(e, "Archive")}
                className="footer-nav-link"
              >
                Archive
              </a>
            </li>
            <li>
              <a
                href="#contact"
                onClick={handleContactClick}
                className="footer-nav-link"
              >
                Contact
              </a>
            </li>
          </ul>

          {placeholderToast && (
            <div className="footer-toast" role="status">
              {placeholderToast}
            </div>
          )}
        </div>

        {/* 5. Feedback & Social Media Column */}
        <div className="footer-interactive-col">

          {/* Feedback Section */}
          <div className="footer-feedback-section">
            <h3 className="footer-col-title">Your Feedback</h3>

            <form className="footer-feedback-form" onSubmit={handleSubmit}>
              <div className="footer-feedback-pill">
                <input
                  id="footer-feedback-input"
                  type="text"
                  placeholder="Share your feedback..."
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  aria-label="Share your feedback"
                />

                <button
                  type="submit"
                  className="footer-feedback-send-btn"
                  disabled={!feedback.trim() || submitting}
                  aria-label="Send feedback"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M22 2L11 13" />
                    <path d="M22 2L15 22L11 13L2 9L22 2Z" />
                  </svg>
                </button>
              </div>

              {submitted && (
                <span className="footer-feedback-status success">
                  Feedback submitted! Thank you.
                </span>
              )}

              {feedbackError && (
                <span className="footer-feedback-status error">
                  {feedbackError}
                </span>
              )}
            </form>
          </div>

          {/* Follow Us Section */}
          <div className="footer-social-section">
            <h3 className="footer-col-title">Follow Us</h3>
            <p className="footer-social-subtext">Stay connected with Academic Arc.</p>

            <div className="footer-social-icons">
              <a
                href="https://www.instagram.com/academicarc.in"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-icon-btn"
                aria-label="Academic Arc on Instagram"
              >
                <img
                  src="/Icons/instagram.svg"
                  alt="Instagram"
                  width="26"
                  height="26"
                />
              </a>

              <a
                href="https://www.facebook.com/academicarc.in"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-icon-btn"
                aria-label="Academic Arc on Facebook"
              >
                <img
                  src="/Icons/facebook.svg"
                  alt="Facebook"
                  width="26"
                  height="26"
                />
              </a>

              <a
                href="https://www.linkedin.com/company/academic-arc2026/home/"
                target="_blank"
                rel="noopener noreferrer"
                className="footer-social-icon-btn"
                aria-label="Academic Arc on LinkedIn"
              >
                <img
                  src="/Icons/linkedin.svg"
                  alt="LinkedIn"
                  width="26"
                  height="26"
                />
              </a>
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p className="footer-copyright">
          © 2026 Academic Arc. All Rights Reserved.
        </p>

        <div className="footer-bottom-links">
          <Link to="/policy" className="footer-bottom-policy-link">
            Copyright & Privacy Policy
          </Link>
        </div>
      </div>

      {/* Guest Feedback Email Modal */}
      {showEmailModal && (
        <div
          className="feedback-modal-overlay"
          onClick={() => {
            if (!submitting) {
              setShowEmailModal(false);
            }
          }}
        >
          <div
            className="feedback-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              className="feedback-modal-close"
              onClick={() => setShowEmailModal(false)}
              disabled={submitting}
              aria-label="Close"
            >
              ×
            </button>

            <h3>Would you like a reply?</h3>

            <p>
              You can optionally provide your email address. We'll use it only
              to respond to your feedback.
            </p>

            <form onSubmit={handleGuestFeedbackSubmit}>
              <input
                type="email"
                value={guestEmail}
                onChange={(e) => setGuestEmail(e.target.value)}
                placeholder="Your email address (optional)"
                maxLength={255}
              />

              <button
                type="submit"
                className="feedback-modal-submit"
                disabled={submitting}
              >
                {submitting ? "Submitting..." : "Submit Feedback"}
              </button>

              <button
                type="button"
                className="feedback-modal-anonymous"
                onClick={handleSkipGuestEmail}
                disabled={submitting}
              >
                Continue Anonymously
              </button>
            </form>
          </div>
        </div>
      )}

    </footer>
  );
};

export default Footer;
