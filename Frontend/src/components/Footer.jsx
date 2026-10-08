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
            <span className="contact-icon">
              <img src="/Icons/map-pin.svg" alt="Map Pin"/>
            </span>
            <span>
              Rampur, Gaighata
              <br />
              24 PGS(N) - 743249
            </span>
          </div>

          <div className="contact-item">
            <span className="contact-icon">
              <img src="/Icons/map-pin.svg" alt="Map Pin"/>
            </span>
            <span>
                Action Area 1B, Newtown
                <br />
                Kolkata - 700156
            </span>
          </div>

          <div className="contact-item">
            <span className="contact-icon">
              <img src="/Icons/email.svg" alt="Email"/>
            </span>
            <span>contact@academicarc.in</span>
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
              disabled={!feedback.trim() || submitting}
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

            {feedbackError && (
              <span className="feedback-error">
                {feedbackError}
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