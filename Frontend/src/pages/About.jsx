import { useRef } from "react";
import { Link } from "react-router-dom";
import "./About.css";

function About() {

  const teamMembers = [
    {
      name: "Aryak",
      role: "Editor",
      photo: "/team/aryak.jpg",
    },
    {
      name: "Person 2",
      role: "Photographer",
      photo: "/team/person2.jpg",
    },
    {
      name: "Person 3",
      role: "Designer",
      photo: "/team/person3.jpg",
    },
  ];

  const teamCarouselRef = useRef(null);

  const scrollTeam = (direction) => {
    if (teamCarouselRef.current) {
      teamCarouselRef.current.scrollBy({
        left: direction === "left" ? -350 : 350,
        behavior: "smooth",
      });
    }
  };

  return (
    <div className="about-page">

      <nav className="about-navbar">
        <Link to="/dashboard" className="about-logo">
          <img src="/Icons/Logo_Black.svg" alt="Logo" />
        </Link>

        <Link to="/dashboard" className="about-home">
          ← Home
        </Link>
      </nav>
      
      <div className="about-container">

        <h1>About Academic Arc</h1>

        <p className="about-intro">
          More than a magazine. A showcase of creativity, talent, and expression.
        </p>

        <section>
          <h2>What is Academic Arc?</h2>
          <p>
            Academic Arc is a cultural magazine created to celebrate creativity 
            and expression beyond the classroom.
          </p>

          <p>
            From writing and poetry, artwork, music, dance,
            instrumental performances, and videos, Academic Arc provides a platform to 
            showcase and share the diverse talents of our school community.
          </p>

          <p>
            It is a space where ideas, emotions, experiences, and original work come
            together — giving students a voice and a stage to express who they are.
          </p>

          <p>
            We believe creativity takes many different forms, and every form deserves
            the opportunity to be seen, heard, and appreciated.
          </p>
        </section>

        <section>
          <h2>Our Purpose</h2>
          <p>
            We believe every student has something worth sharing. Academic Arc gives
            students a space to create, express themselves, discover the work of
            others, and inspire their peers.
          </p>

          <p>
            Our purpose is to nurture creativity, encourage self-expression, and build
            a community where every voice matters — whether it is through a poem, a
            photograph, a melody, a performance, or a simple story.
          </p>

          <p>
            Academic Arc is also about discovering talents that may otherwise remain
            unseen. A student's creativity should not be limited to a classroom,
            notebook, stage, or annual publication.
          </p>

          <p>
            Here, students can take their ideas beyond those boundaries and share them
            with the wider school community.
          </p>
        </section>

        <section>
          <h2>More Than a Magazine</h2>
          <p>
            Academic Arc takes the spirit of a traditional school magazine and brings
            it into a digital space. Instead of being limited to a once-a-year
            publication, creativity can be shared and discovered throughout the year.
          </p>

          <p>
            It is a living, evolving platform where students can continuously share
            their work, explore new perspectives, and celebrate the talent within our
            community.
          </p>

          <p>
            Unlike a traditional magazine, a digital platform allows different forms
            of creativity to exist together. A written story can sit alongside a
            photograph, a musical performance, a dance, or a video.
          </p>

          <p>
            This makes Academic Arc not just a collection of publications, but a
            growing archive of the ideas, creativity, and experiences of our students.
          </p>
        </section>

        <section>
          <h2>Built for Our School Community</h2>
          <p>
            Academic Arc is a space where students can showcase their talents, explore
            different forms of creativity, and become part of a community that values
            ideas, expression, and imagination.
          </p>

          <p>
            It is designed for students, by students — a platform that grows with your
            creativity and gives you the freedom to share what you love.
          </p>

          <p>
            We hope that discovering someone else's work can be just as inspiring as
            sharing your own. A poem might encourage someone to write, a photograph
            might inspire someone to create, and a performance might encourage someone
            else to step onto a stage.
          </p>

          <p>
            In this way, every contribution becomes part of a larger creative
            conversation within our school community.
          </p>
        </section>

        <section>
          <h2>Our Vision</h2>
          <p>
            We envision Academic Arc as a growing digital archive of student
            creativity — a place where stories, ideas, performances, and expressions
            can live beyond a single school year.
          </p>

          <p>
            Because student life is about more than academics. There are stories to
            tell, ideas to explore, talents to discover, and voices that deserve to be
            heard.
          </p>

          <p>
            We hope Academic Arc continues to grow alongside the students who
            contribute to it, preserving a record of creativity and expression that
            can be revisited long after a particular school year has ended.
          </p>

          <p>
            Every contribution adds something new to that story.
          </p>

          <p>
            Academic Arc is where those voices meet.
          </p>
        </section>

        <div className="about-motto">
          <strong>Create. Share. Inspire.</strong>
        </div>

        <section className="about-team">
          <h2>Meet the Team</h2>

          <p className="team-intro">
            The people behind Academic Arc.
          </p>

          <div className="team-carousel-wrapper">

            <button
              className="team-arrow team-arrow-left"
              onClick={() => scrollTeam("left")}
              aria-label="Previous team member"
            >
              <img
                  src="/Icons/dropdown.svg"
                  alt=""
                  className="carousel-arrow previous"
              />
            </button>

            <div className="team-carousel" ref={teamCarouselRef}>
              {teamMembers.map((member, index) => (
                <div className="team-card" key={index}>

                  <div className="team-photo">
                    <img
                      src={member.photo}
                      alt={member.name}
                    />
                  </div>

                  <h3>{member.name}</h3>
                  <p>{member.role}</p>

                </div>
              ))}
            </div>

            <button
              className="team-arrow team-arrow-right"
              onClick={() => scrollTeam("right")}
              aria-label="Next team member"
            >
              <img
                  src="/Icons/dropdown.svg"
                  alt=""
                  className="carousel-arrow next"
              />
            </button>

          </div>
        </section>

      </div>
    </div>
  );
}

export default About;