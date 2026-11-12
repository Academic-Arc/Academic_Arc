import { useState } from "react";
import { Link } from "react-router-dom";
import "./Policy.css";

function Policy() {
  const [activeTab, setActiveTab] = useState("all"); // 'all' | 'privacy' | 'copyright'

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="policy-page">
      <nav className="policy-navbar">
        <Link to="/dashboard" className="policy-logo" aria-label="Academic Arc Home">
          <img src="/Icons/Logo_Black.svg" alt="Academic Arc Logo" />
        </Link>

        <Link to="/dashboard" className="policy-home">
          ← Home
        </Link>
      </nav>

      <main className="policy-container">
        <header className="policy-header">
          <span className="policy-badge">Legal & Editorial Standards</span>
          <h1>Privacy & Copyright Policy</h1>
          <p className="policy-intro">
            At Academic Arc, we celebrate student creativity, talent, and expression beyond the classroom. 
            We are dedicated to safeguarding student privacy, honoring intellectual property rights, and 
            maintaining transparent community standards.
          </p>
          <div className="policy-meta">
            <span>Last Updated: November 2026</span>
            <span>•</span>
            <span>Applicable to all contributors, visitors, and school community members</span>
          </div>

          <div className="policy-tabs">
            <button
              type="button"
              className={`policy-tab-btn ${activeTab === "all" ? "active" : ""}`}
              onClick={() => setActiveTab("all")}
            >
              All Policies
            </button>
            <button
              type="button"
              className={`policy-tab-btn ${activeTab === "privacy" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("privacy");
                scrollToSection("privacy-policy");
              }}
            >
              Privacy Policy
            </button>
            <button
              type="button"
              className={`policy-tab-btn ${activeTab === "copyright" ? "active" : ""}`}
              onClick={() => {
                setActiveTab("copyright");
                scrollToSection("copyright-policy");
              }}
            >
              Copyright & IP
            </button>
          </div>
        </header>

        {/* ================= PRIVACY POLICY ================= */}
        {(activeTab === "all" || activeTab === "privacy") && (
          <section id="privacy-policy" className="policy-section">
            <div className="section-header-tag">Section 1</div>
            <h2>Privacy Policy</h2>
            <p className="section-lead">
              Your privacy is of paramount importance to us. This policy details how Academic Arc collects, uses, 
              and safeguards information when you visit our magazine, submit creative works, or communicate with us.
            </p>

            <article className="policy-block">
              <h3>1. Information We Collect</h3>
              <p>We only collect information necessary to operate, curate, and celebrate creative works across our magazine:</p>
              <ul>
                <li>
                  <strong>Account & Contributor Data:</strong> When you register or submit works, we may collect your name, email address, grade/class, school affiliation, and optional profile avatar.
                </li>
                <li>
                  <strong>Creative Submissions:</strong> Literary texts (poetry, essays, fiction), visual artworks, photography, audio recordings (songs, instrumental pieces), performance videos, and accompanying descriptions.
                </li>
                <li>
                  <strong>Feedback & Inquiries:</strong> Messages, suggestions, and optional contact emails sent via our feedback forms or contact addresses.
                </li>
                <li>
                  <strong>Technical Data:</strong> Basic browser telemetry, IP addresses, and secure authentication session tokens necessary for security, performance optimization, and spam prevention.
                </li>
              </ul>
            </article>

            <article className="policy-block">
              <h3>2. How We Use Your Information</h3>
              <p>Academic Arc uses collected data solely for educational, cultural, and community purposes:</p>
              <ul>
                <li>To publish, attribute, and showcase original student submissions in digital issues, blogs, and curated gallery showcases.</li>
                <li>To review, moderate, and provide editorial feedback on submissions.</li>
                <li>To maintain account security and prevent unauthorized access or abusive behavior.</li>
                <li>To respond to user inquiries, technical support tickets, and feedback submissions.</li>
              </ul>
              <p className="policy-callout">
                <strong>Our Promise:</strong> We never sell, rent, or trade your personal information to third-party advertisers or commercial brokers.
              </p>
            </article>

            <article className="policy-block">
              <h3>3. Protection of Students & Minors</h3>
              <p>
                As a cultural magazine focused on school and youth communities, we exercise extraordinary care regarding student privacy:
              </p>
              <ul>
                <li>We do not publicly display private contact details (phone numbers, personal addresses, or personal email addresses) on publication pages.</li>
                <li>Authors and contributors may request pseudonyms or first-name-only attribution if preferred for privacy reasons.</li>
                <li>Parents, legal guardians, and school authorities may contact us at any time to review, modify, or remove published works or profile information concerning their children.</li>
              </ul>
            </article>

            <article className="policy-block">
              <h3>4. Data Security</h3>
              <p>
                We implement robust security controls, including encrypted HTTPS transmission, secure credential hashing, role-based access permissions, and periodic reviews to safeguard user data from unauthorized access, alteration, or loss.
              </p>
            </article>

            <article className="policy-block">
              <h3>5. Third-Party Integrations & Embedded Media</h3>
              <p>
                Certain magazine articles may embed media players (such as YouTube, audio players, or social embeds) to showcase student performances. These third-party services operate under their own privacy policies. We encourage users to review the privacy notices of external platforms.
              </p>
            </article>
          </section>
        )}

        {/* ================= COPYRIGHT POLICY ================= */}
        {(activeTab === "all" || activeTab === "copyright") && (
          <section id="copyright-policy" className="policy-section">
            <div className="section-header-tag">Section 2</div>
            <h2>Copyright & Intellectual Property Policy</h2>
            <p className="section-lead">
              Academic Arc exists to amplify creative voices, not to appropriate them. We respect the intellectual 
              property rights of student creators and expect everyone in our community to do the same.
            </p>

            <article className="policy-block">
              <h3>1. Creator Ownership Retained</h3>
              <p>
                <strong>You own your work.</strong> Every student, author, poet, musician, and artist who contributes to Academic Arc retains 100% of their underlying copyright and moral rights in their original creative creation.
              </p>
            </article>

            <article className="policy-block">
              <h3>2. License Granted to Academic Arc</h3>
              <p>
                By submitting creative work to Academic Arc, you grant us a non-exclusive, worldwide, royalty-free license to:
              </p>
              <ul>
                <li>Publish, reproduce, format, and display your work across Academic Arc digital magazine editions, website archives, and editorial newsletters.</li>
                <li>Feature excerpts or previews of your submission on official Academic Arc social channels and school presentations for the purpose of community promotion and recognition.</li>
                <li>Archive your published contribution as part of the cultural record of our school community.</li>
              </ul>
              <p>
                Because this license is <em>non-exclusive</em>, you are free to submit, publish, or perform your work in other publications, competitions, or personal portfolios at any time.
              </p>
            </article>

            <article className="policy-block">
              <h3>3. Originality & Anti-Plagiarism Standards</h3>
              <p>
                Honesty and authenticity are the foundation of Academic Arc:
              </p>
              <ul>
                <li>All submissions must be the original creation of the student author or artist.</li>
                <li>Plagiarism, uncredited paraphrasing, unauthorized use of copyrighted visual assets or music tracks, or submitting another person's work is strictly prohibited.</li>
                <li>If inspiration, reference materials, or quotes are utilized, they must be properly cited and attributed according to standard editorial guidelines.</li>
                <li>Any submission discovered to infringe third-party copyright will be removed immediately, and future submissions from the contributor may be restricted.</li>
              </ul>
            </article>

            <article className="policy-block">
              <h3>4. Copyright Infringement & Takedown Notices</h3>
              <p>
                If you believe that any material published on Academic Arc infringes upon your copyright or the copyright of someone you represent, please send a written notification containing:
              </p>
              <ol>
                <li>Identification of the copyrighted work claimed to have been infringed.</li>
                <li>The specific URL or title of the submission on Academic Arc that you seek to have removed or modified.</li>
                <li>Your full name, contact information, and proof of copyright ownership or authorized representation.</li>
                <li>A statement made in good faith that the disputed use is not authorized by the copyright owner, its agent, or the law.</li>
              </ol>
              <p>
                Please email all takedown notices directly to{" "}
                <a href="mailto:contact@academicarc.in" className="policy-link">
                  contact@academicarc.in
                </a>
                . We investigate and resolve copyright notices promptly upon receipt.
              </p>
            </article>
          </section>
        )}

        {/* ================= CONTACT SECTION ================= */}
        <section className="policy-contact-box">
          <h2>Questions or Concerns?</h2>
          <p>
            If you have questions regarding this Privacy and Copyright Policy, or wish to exercise your rights regarding personal data or published submissions, please reach out to our editorial team:
          </p>
          <div className="policy-contact-details">
            <div className="contact-detail-card">
              <span className="contact-label">Email Us</span>
              <a href="mailto:contact@academicarc.in">contact@academicarc.in</a>
            </div>
            <div className="contact-detail-card">
              <span className="contact-label">Location 1</span>
              <span>Rampur, Gaighata, 24 PGS(N) - 743249</span>
            </div>
            <div className="contact-detail-card">
              <span className="contact-label">Location 2</span>
              <span>Action Area 1B, Newtown, Kolkata - 700156</span>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Policy;
