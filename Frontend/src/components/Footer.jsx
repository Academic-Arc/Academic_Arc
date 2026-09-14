import { useState } from "react";
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
            Mascot
          </div>
        </div>

        {/* About Placeholder */}
        <div className="footer-about">
          <div className="footer-placeholder footer-icon-placeholder">
            Logo
          </div>

          <h3>About Us</h3>

          <p>
            Your magazine description will go here. This space will contain
            a short introduction about the magazine and its purpose.
          </p>
        </div>

        {/* Contact + Feedback */}
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

          <div className="contact-item">
            <span className="contact-icon">Icon</span>
            <span>0000000000</span>
          </div>

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

        {/* Photographer Placeholders */}
        <div className="footer-photographers">
          <div className="photographer">
            <div className="footer-placeholder photographer-placeholder">
              Photo
            </div>

            <p>
              Photographer
              <br />
              information
              <br />
              will go here
            </p>
          </div>

          <div className="photographer">
            <div className="footer-placeholder photographer-placeholder">
              Photo
            </div>

            <p>
              Photographer
              <br />
              information
              <br />
              will go here
            </p>
          </div>
        </div>

      </div>

      {/* Bottom Bar */}
      <div className="footer-bottom">
        <p>
          © 2025 Magazine Name. Department of School Education,
          Government of West Bengal
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