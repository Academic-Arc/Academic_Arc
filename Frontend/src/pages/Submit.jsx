import { useState } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import './Submit.css'

function Submit() {
    const navigate = useNavigate()

    const token = localStorage.getItem('access_token')
    
    const logout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
    }

    const [contentType, setContentType] = useState('Writing')
    const [studentClass, setStudentClass] = useState('')
    const [heading, setHeading] = useState('')
    const [description, setDescription] = useState('')
    const [writtenContent, setWrittenContent] = useState('')
    const [message, setMessage] = useState('')
    const [file, setFile] = useState(null)
    const [mediaUrl, setMediaUrl] = useState('')
    const [mediaType, setMediaType] = useState('video')

    if (!token) {
        return <Navigate to="/login" replace />
    }

    const handleSubmit = async (e) => {
        e.preventDefault()

        if (file && mediaUrl.trim()) {
            setMessage('Please choose either a file or a link, not both.')
            return
        }

        const mediaRequiredTypes = [
            'Drawing',
            'Song',
            'Instrumental',
            'Dance',
        ]

        if (
            mediaRequiredTypes.includes(contentType) &&
            !file &&
            !mediaUrl.trim()
        ) {
            setMessage('Please upload a file or provide a media link.')
            return
        }

        const token = localStorage.getItem('access_token')

        if (!token) {
            setMessage('Please login first.')
            return
        }

        try {
            const response = await fetch(
                'http://127.0.0.1:8000/submissions/',
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        content_type: contentType,
                        student_class: studentClass,
                        heading: heading,
                        description: description,
                        written_content: writtenContent,
                        media_url: mediaUrl.trim() || null,
                        media_type: mediaUrl.trim() ? mediaType : null,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                setMessage(JSON.stringify(data.detail))
                return
            }

            if (file) {
                const uploadData = new FormData()
                uploadData.append('file', file)

                const uploadResponse = await fetch(
                    `http://127.0.0.1:8000/submissions/upload?submission_id=${data.submission_id}`,
                    {
                        method: 'POST',
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                        body: uploadData,
                    }
                )

                const uploadResult = await uploadResponse.json()

                if (!uploadResponse.ok) {
                    setMessage(JSON.stringify(uploadResult.detail))
                    return
                }
            }

            navigate(`/category/${encodeURIComponent(contentType)}`)

        } catch (error) {
            console.error(error)
            setMessage('Could not connect to the backend.')
        }
    }

    return (
        <div className="submit-page">

            <nav className="navbar">

                <Link to="/" className="nav-logo">
                    Academic Arc
                </Link>

                <div className="nav-links">

                    <Link to="/">Home</Link>
                    
                    <Link to="/profile">Profile</Link>

                    {/*<button className="language-button">
                        বাংলা
                    </button>

                    <button onClick={logout}>
                        Logout
                    </button>*/}

                </div>

            </nav>

            <div className="submit-card">

                {/* Page heading */}
                <div className="submit-heading">
                    <span className="section-icon">✎</span>

                    <h1>Your Submission</h1>
                </div>


                <form onSubmit={handleSubmit}>

                    {/* =========================
                        YOUR DETAILS
                       ========================= */}

                    <section className="submit-section">

                        <div className="section-title">
                            <span>♙</span>
                            <h2>Your Details</h2>
                        </div>

                        <div className="form-field">
                            <label>
                                Class
                                <span className="required">*</span>
                            </label>

                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) =>
                                    setStudentClass(e.target.value)
                                }
                                placeholder="Enter your class"
                                required
                            />
                        </div>

                    </section>


                    {/* =========================
                        CONTENT DETAILS
                       ========================= */}

                    <section className="submit-section">

                        <div className="section-title">
                            <span>✎</span>
                            <h2>Your Content</h2>
                        </div>


                        {/* Content type */}
                        <div className="form-field">

                            <label>
                                Choose a category
                                <span className="required">*</span>
                            </label>

                            <div className="content-types">

                                <button
                                    type="button"
                                    className={
                                        contentType === 'Writing'
                                            ? 'content-type selected'
                                            : 'content-type'
                                    }
                                    onClick={() => {
                                        setContentType('Writing')
                                    }}
                                >
                                    <span className="type-icon">
                                        <img src="/Icons/writing.svg" alt="Writing" />
                                    </span>
                                    <span>
                                        <strong>Writing</strong>
                                        <small>Writing</small>
                                    </span>
                                </button>


                                <button
                                    type="button"
                                    className={
                                        contentType === 'Drawing'
                                            ? 'content-type selected'
                                            : 'content-type'
                                    }
                                    onClick={() => {
                                        setContentType('Drawing')
                                        setWrittenContent('')
                                    }}
                                >
                                    <span className="type-icon">
                                        <img src="/Icons/drawing.svg" alt="Drawing" />
                                    </span>
                                    <span>
                                        <strong>Drawing</strong>
                                        <small>Drawing</small>
                                    </span>
                                </button>


                                <button
                                    type="button"
                                    className={
                                        contentType === 'Poem'
                                            ? 'content-type selected'
                                            : 'content-type'
                                    }
                                    onClick={() => {
                                        setContentType('Poem')
                                    }}
                                >
                                    <span className="type-icon">
                                        <img src="/Icons/poem.svg" alt="Poem" />
                                    </span>
                                    <span>
                                        <strong>Poem</strong>
                                        <small>Poem</small>
                                    </span>
                                </button>


                                <button
                                    type="button"
                                    className={
                                        contentType === 'Song'
                                            ? 'content-type selected'
                                            : 'content-type'
                                    }
                                    onClick={() => {
                                        setContentType('Song')
                                        setWrittenContent('')
                                    }}
                                >
                                    <span className="type-icon">
                                        <img src="/Icons/song.svg" alt="Song" />
                                    </span>
                                    <span>
                                        <strong>Song</strong>
                                        <small>Singing</small>
                                    </span>
                                </button>


                                <button
                                    type="button"
                                    className={
                                        contentType === 'Instrumental'
                                            ? 'content-type selected'
                                            : 'content-type'
                                    }
                                    onClick={() => {
                                        setContentType('Instrumental')
                                        setWrittenContent('')
                                    }}
                                >
                                    <span className="type-icon">
                                        <img src="/Icons/instrument.svg" alt="Instrumental" />
                                    </span>
                                    <span>
                                        <strong>Instrumental</strong>
                                        <small>Instruments</small>
                                    </span>
                                </button>


                                <button
                                    type="button"
                                    className={
                                        contentType === 'Dance'
                                            ? 'content-type selected'
                                            : 'content-type'
                                    }
                                    onClick={() => {
                                        setContentType('Dance')
                                        setWrittenContent('')
                                    }}
                                >
                                    <span className="type-icon">
                                        <img src="/Icons/dance.svg" alt="Dance" />
                                    </span>
                                    <span>
                                        <strong>Dance</strong>
                                        <small>Dance</small>
                                    </span>
                                </button>

                            </div>

                        </div>


                        {/* Heading */}
                        <div className="form-field">

                            <label>
                                Title
                                <span className="required">*</span>
                            </label>

                            <input
                                type="text"
                                value={heading}
                                onChange={(e) =>
                                    setHeading(e.target.value)
                                }
                                placeholder="Give your submission a title"
                                required
                            />

                        </div>


                        {/* Description */}
                        <div className="form-field">

                            <label>Description</label>

                            <textarea
                                value={description}
                                onChange={(e) =>
                                    setDescription(e.target.value)
                                }
                                placeholder="Briefly describe your submission..."
                                rows="4"
                            />

                            <div className="character-count">
                                {description.length} characters
                            </div>

                        </div>


                        {/* Written content */}
                        {(contentType === 'Writing' ||
                            contentType === 'Poem') && (
                            <div className="form-field">

                                <label>
                                    Written Content
                                    <span className="required">*</span>
                                </label>

                                <textarea
                                    value={writtenContent}
                                    onChange={(e) =>
                                        setWrittenContent(e.target.value)
                                    }
                                    placeholder="Write your content here..."
                                    rows="9"
                                    required
                                />

                                <div className="character-count">
                                    {writtenContent.length} characters
                                </div>

                            </div>
                        )}

                    </section>


                    {/* =========================
                        UPLOAD
                       ========================= */}

                    <section className="submit-section">

                        <div className="section-title">
                            <span>↥</span>
                            <h2>Upload Your Work</h2>
                        </div>

                        <div className="upload-divider">
                            <span>or upload a file directly</span>
                        </div>

                        <label className="upload-box">

                            <input
                                type="file"
                                onChange={(e) => {
                                    setFile(e.target.files[0] || null)
                                    setMediaUrl('')
                                }}
                            />

                            <div className="upload-icon">↥</div>

                            <strong>
                                {file
                                    ? file.name
                                    : 'Drop your file here'}
                            </strong>

                            <span>
                                or click to browse · Maximum file size 10 MB
                            </span>

                            <small>
                                Supported formats: Word, PDF, PNG, JPG, JPEG
                            </small>

                        </label>

                        {!['Writing', 'Drawing', 'Poem'].includes(contentType) && (
                            <>
                                <div className="upload-divider">
                                    <span>or paste a link</span>
                                </div>

                                <div className="external-media">

                                    <div className="external-media-row">

                                        <input
                                            type="url"
                                            value={mediaUrl}
                                            onChange={(e) => {
                                                setMediaUrl(e.target.value)
                                                setFile(null)
                                            }}
                                            placeholder="https://youtube.com/..."
                                        />

                                        <select
                                            value={mediaType}
                                            onChange={(e) => setMediaType(e.target.value)}
                                        >
                                            <option value="video">Video</option>
                                            <option value="image">Image</option>
                                            <option value="audio">Audio</option>
                                        </select>

                                    </div>

                                    <small>
                                        Supported websites: YouTube, Facebook, Google Drive
                                    </small>

                                </div>
                            </>
                        )}


                        {/* Privacy notice */}
                        <div className="privacy-notice">
                            <span>♢</span>

                            <p>
                                Your personal information is secure.
                                Submissions will only be used for
                                publication purposes and will not be
                                shared with third parties.
                            </p>
                        </div>


                        {/* Consent */}
                        <label className="consent">

                            <input type="checkbox" required />

                            <span>
                                I confirm that this is my original work
                                and give permission for it to be published
                                on Academic Arc.
                            </span>

                        </label>

                    </section>


                    <div className="submit-footer">

                        <button
                            type="submit"
                            className="submit-button"
                        >
                            ✓ Submit
                        </button>

                    </div>

                </form>


                {message && (
                    <p className="submit-message">
                        {message}
                    </p>
                )}

            </div>

        </div>
    )
}

export default Submit