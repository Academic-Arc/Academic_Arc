import { useEffect, useState } from 'react'
import {
    Link,
    Navigate,
    useNavigate,
    useSearchParams
} from 'react-router-dom'
import './Submit.css'

function Submit() {
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()

    const editId = searchParams.get('edit')
    const isEditMode = Boolean(editId)

    const token = localStorage.getItem('access_token')

    const [contentType, setContentType] = useState('Writing')
    const [studentClass, setStudentClass] = useState('')
    const [heading, setHeading] = useState('')
    const [description, setDescription] = useState('')
    const [writtenContent, setWrittenContent] = useState('')

    const [message, setMessage] = useState('')

    const [file, setFile] = useState(null)
    const [mediaUrl, setMediaUrl] = useState('')
    const [mediaType, setMediaType] = useState('video')

    const [currentMediaUrl, setCurrentMediaUrl] = useState('')
    const [currentMediaType, setCurrentMediaType] = useState('')

    const [loadingSubmission, setLoadingSubmission] = useState(
        isEditMode
    )

    const [saving, setSaving] = useState(false)

    const logout = () => {
        localStorage.removeItem('access_token')
        navigate('/login')
    }

    /*
     * Load existing submission when editing
     */
    useEffect(() => {
        if (!isEditMode) return

        const loadSubmission = async () => {
            try {
                const response = await fetch(
                    'http://127.0.0.1:8000/submissions/',
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                )

                if (!response.ok) {
                    throw new Error(
                        'Unable to load your submissions.'
                    )
                }

                const submissions = await response.json()

                const submission = submissions.find(
                    (item) =>
                        String(item.id) === String(editId)
                )

                if (!submission) {
                    throw new Error(
                        'Submission not found.'
                    )
                }

                setContentType(
                    submission.content_type || 'Writing'
                )

                setStudentClass(
                    submission.student_class || ''
                )

                setHeading(
                    submission.heading || ''
                )

                setDescription(
                    submission.description || ''
                )

                setWrittenContent(
                    submission.written_content || ''
                )

                setCurrentMediaUrl(
                    submission.media_url || ''
                )

                setCurrentMediaType(
                    submission.media_type || ''
                )

                /*
                 * External links are placed directly into
                 * the editable media URL field.
                 *
                 * Uploaded files remain displayed as
                 * the current media but cannot be placed
                 * into the browser file input.
                 */
                if (
                    submission.media_url &&
                    !submission.media_url.includes(
                        '/storage/v1/object/public/submissions/'
                    )
                ) {
                    setMediaUrl(
                        submission.media_url
                    )

                    setMediaType(
                        submission.media_type || 'video'
                    )
                }

            } catch (error) {
                console.error(
                    'Error loading submission:',
                    error
                )

                setMessage(error.message)
            } finally {
                setLoadingSubmission(false)
            }
        }

        loadSubmission()
    }, [isEditMode, editId, token])

    if (!token) {
        return <Navigate to="/login" replace />
    }

    if (loadingSubmission) {
        return (
            <div className="submit-page">

                <nav className="navbar">

                    <Link
                        to="/"
                        className="nav-logo"
                    >
                        Academic Arc
                    </Link>

                </nav>

                <div className="submit-card">
                    <p>Loading submission...</p>
                </div>

            </div>
        )
    }

    const mediaRequiredTypes = [
        'Drawing',
        'Song',
        'Instrumental',
        'Dance',
    ]

    const isCurrentUploadedFile =
        currentMediaUrl &&
        currentMediaUrl.includes(
            '/storage/v1/object/public/submissions/'
        )

    const handleSubmit = async (e) => {
        e.preventDefault()

        setMessage('')

        if (file && mediaUrl.trim()) {
            setMessage(
                'Please choose either a file or a link, not both.'
            )
            return
        }

        /*
         * For a new submission, media is required for
         * these categories.
         *
         * During editing, existing media counts as
         * satisfying this requirement.
         */
        const hasExistingMedia =
            Boolean(currentMediaUrl)

        if (
            mediaRequiredTypes.includes(contentType) &&
            !file &&
            !mediaUrl.trim() &&
            !hasExistingMedia
        ) {
            setMessage(
                'Please upload a file or provide a media link.'
            )
            return
        }

        if (!token) {
            setMessage('Please login first.')
            return
        }

        setSaving(true)

        try {

            /*
             * ==========================
             * EDIT EXISTING SUBMISSION
             * ==========================
             */

            if (isEditMode) {

                /*
                 * Determine what media URL should initially
                 * be stored.
                 *
                 * If a new file is selected, we keep the
                 * current URL temporarily and let the upload
                 * endpoint replace it.
                 */
                let updatedMediaUrl = currentMediaUrl || null
                let updatedMediaType = currentMediaType || null

                /*
                 * If the user supplied a new external link,
                 * that replaces the current media.
                 */
                if (mediaUrl.trim()) {
                    updatedMediaUrl = mediaUrl.trim()
                    updatedMediaType = mediaType
                }

                /*
                 * If category no longer needs media and the
                 * user hasn't supplied new media, clear it.
                 */
                if (
                    !mediaUrl.trim() &&
                    !file &&
                    ['Writing', 'Poem'].includes(contentType)
                ) {
                    updatedMediaUrl = null
                    updatedMediaType = null
                }

                const response = await fetch(
                    `http://127.0.0.1:8000/submissions/${editId}`,
                    {
                        method: 'PATCH',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            content_type: contentType,
                            student_class: studentClass,
                            heading: heading,
                            description: description,
                            written_content:
                                writtenContent || null,
                            media_url:
                                updatedMediaUrl,
                            media_type:
                                updatedMediaType,
                        }),
                    }
                )

                const data = await response.json()

                if (!response.ok) {
                    setMessage(
                        JSON.stringify(data.detail)
                    )
                    setSaving(false)
                    return
                }

                /*
                 * If a new file was selected, replace the
                 * existing uploaded media after the normal
                 * submission update succeeds.
                 */
                if (file) {

                    const uploadData = new FormData()

                    uploadData.append(
                        'file',
                        file
                    )

                    const uploadResponse = await fetch(
                        `http://127.0.0.1:8000/submissions/upload?submission_id=${editId}`,
                        {
                            method: 'POST',
                            headers: {
                                Authorization: `Bearer ${token}`,
                            },
                            body: uploadData,
                        }
                    )

                    const uploadResult =
                        await uploadResponse.json()

                    if (!uploadResponse.ok) {
                        setMessage(
                            JSON.stringify(
                                uploadResult.detail
                            )
                        )
                        setSaving(false)
                        return
                    }
                }

                navigate(
                    `/category/${encodeURIComponent(
                        contentType
                    )}`
                )

                return
            }


            /*
             * ==========================
             * CREATE NEW SUBMISSION
             * ==========================
             */

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
                        written_content:
                            writtenContent,
                        media_url:
                            mediaUrl.trim() || null,
                        media_type:
                            mediaUrl.trim()
                                ? mediaType
                                : null,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                setMessage(
                    JSON.stringify(data.detail)
                )
                setSaving(false)
                return
            }

            if (file) {

                const uploadData = new FormData()

                uploadData.append(
                    'file',
                    file
                )

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

                const uploadResult =
                    await uploadResponse.json()

                if (!uploadResponse.ok) {
                    setMessage(
                        JSON.stringify(
                            uploadResult.detail
                        )
                    )
                    setSaving(false)
                    return
                }
            }

            navigate(
                `/category/${encodeURIComponent(
                    contentType
                )}`
            )

        } catch (error) {

            console.error(error)

            setMessage(
                'Could not connect to the backend.'
            )

        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="submit-page">

            <nav className="navbar">

                <Link
                    to="/"
                    className="nav-logo"
                >
                    Academic Arc
                </Link>

                <div className="nav-links">

                    <Link to="/">
                        Home
                    </Link>

                    <Link to="/profile">
                        Profile
                    </Link>

                </div>

            </nav>


            <div className="submit-card">

                <div className="submit-heading">

                    <span className="section-icon">
                        ✎
                    </span>

                    <h1>
                        {isEditMode
                            ? 'Edit Your Submission'
                            : 'Your Submission'}
                    </h1>

                </div>


                <form onSubmit={handleSubmit}>

                    {/* YOUR DETAILS */}

                    <section className="submit-section">

                        <div className="section-title">
                            <span>♙</span>
                            <h2>Your Details</h2>
                        </div>

                        <div className="form-field">

                            <label>
                                Class
                                <span className="required">
                                    *
                                </span>
                            </label>

                            <input
                                type="text"
                                value={studentClass}
                                onChange={(e) =>
                                    setStudentClass(
                                        e.target.value
                                    )
                                }
                                placeholder="Enter your class"
                                required
                            />

                        </div>

                    </section>


                    {/* CONTENT DETAILS */}

                    <section className="submit-section">

                        <div className="section-title">
                            <span>✎</span>
                            <h2>Your Content</h2>
                        </div>


                        {/* CATEGORY */}

                        <div className="form-field">

                            <label>
                                Choose a category
                                <span className="required">
                                    *
                                </span>
                            </label>

                            <div className="content-types">

                                {[
                                    ['Writing', 'writing.svg', 'Writing'],
                                    ['Drawing', 'drawing.svg', 'Drawing'],
                                    ['Poem', 'poem.svg', 'Poem'],
                                    ['Song', 'song.svg', 'Singing'],
                                    ['Instrumental', 'instrument.svg', 'Instruments'],
                                    ['Dance', 'dance.svg', 'Dance'],
                                ].map(
                                    ([type, icon, subtitle]) => (

                                        <button
                                            key={type}
                                            type="button"
                                            className={
                                                contentType === type
                                                    ? 'content-type selected'
                                                    : 'content-type'
                                            }
                                            onClick={() => {

                                                setContentType(
                                                    type
                                                )

                                                if (
                                                    ![
                                                        'Writing',
                                                        'Poem',
                                                    ].includes(type)
                                                ) {
                                                    setWrittenContent(
                                                        ''
                                                    )
                                                }

                                            }}
                                        >

                                            <span className="type-icon">
                                                <img
                                                    src={`/Icons/${icon}`}
                                                    alt={type}
                                                />
                                            </span>

                                            <span>
                                                <strong>
                                                    {type}
                                                </strong>

                                                <small>
                                                    {subtitle}
                                                </small>
                                            </span>

                                        </button>

                                    )
                                )}

                            </div>

                        </div>


                        {/* TITLE */}

                        <div className="form-field">

                            <label>
                                Title
                                <span className="required">
                                    *
                                </span>
                            </label>

                            <input
                                type="text"
                                value={heading}
                                onChange={(e) =>
                                    setHeading(
                                        e.target.value
                                    )
                                }
                                placeholder="Give your submission a title"
                                required
                            />

                        </div>


                        {/* DESCRIPTION */}

                        <div className="form-field">

                            <label>
                                Description
                            </label>

                            <textarea
                                value={description}
                                onChange={(e) =>
                                    setDescription(
                                        e.target.value
                                    )
                                }
                                placeholder="Briefly describe your submission..."
                                rows="4"
                            />

                            <div className="character-count">
                                {description.length}
                                {' '}
                                characters
                            </div>

                        </div>


                        {/* WRITTEN CONTENT */}

                        {(
                            contentType === 'Writing' ||
                            contentType === 'Poem'
                        ) && (

                            <div className="form-field">

                                <label>
                                    Written Content
                                    <span className="required">
                                        *
                                    </span>
                                </label>

                                <textarea
                                    value={
                                        writtenContent
                                    }
                                    onChange={(e) =>
                                        setWrittenContent(
                                            e.target.value
                                        )
                                    }
                                    placeholder="Write your content here..."
                                    rows="9"
                                    required
                                />

                                <div className="character-count">
                                    {
                                        writtenContent.length
                                    }
                                    {' '}
                                    characters
                                </div>

                            </div>

                        )}

                    </section>


                    {/* UPLOAD */}

                    <section className="submit-section">

                        <div className="section-title">
                            <span>↥</span>
                            <h2>
                                Upload Your Work
                            </h2>
                        </div>


                        {/* CURRENT MEDIA */}

                        {isEditMode &&
                            currentMediaUrl && (

                            <div className="current-media">

                                <strong>
                                    Current submission media
                                </strong>

                                {isCurrentUploadedFile ? (

                                    <span>
                                        Existing uploaded file
                                        is currently attached.
                                        Choose a new file below
                                        to replace it.
                                    </span>

                                ) : (

                                    <a
                                        href={currentMediaUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                    >
                                        View current media ↗
                                    </a>

                                )}

                            </div>

                        )}


                        <div className="upload-divider">
                            <span>
                                {isEditMode
                                    ? 'choose a new file to replace the current one'
                                    : 'or upload a file directly'}
                            </span>
                        </div>


                        {/* FILE UPLOAD */}

                        {!mediaUrl.trim() && (
                            <label className="upload-box">

                                <input
                                    type="file"
                                    onChange={(e) => {
                                        const selectedFile =
                                            e.target.files[0] || null

                                        setFile(selectedFile)

                                        if (selectedFile) {
                                            setMediaUrl('')
                                        }
                                    }}
                                />

                                <div className="upload-icon">
                                    ↥
                                </div>

                                <strong>
                                    {file
                                        ? file.name
                                        : 'Drop your file here'}
                                </strong>

                                <span>
                                    or click to browse · Maximum file size 10 MB
                                </span>

                                <small>
                                    Supported formats: Word, PDF, PNG, JPG, JPEG, MP4
                                </small>

                            </label>
                        )}


                        {/* EXTERNAL LINK */}

                        {![
                            'Writing',
                            'Drawing',
                            'Poem',
                        ].includes(contentType) &&
                            !file && (
                                <>
                                    <div className="upload-divider">
                                        <span>
                                            or paste a link
                                        </span>
                                    </div>

                                    <div className="external-media">

                                        <div className="external-media-row">

                                            <input
                                                type="url"
                                                value={mediaUrl}
                                                onChange={(e) => {
                                                    const value =
                                                        e.target.value

                                                    setMediaUrl(value)

                                                    if (value.trim()) {
                                                        setFile(null)
                                                    }
                                                }}
                                                placeholder="https://youtube.com/..."
                                            />

                                            <select
                                                value={mediaType}
                                                onChange={(e) =>
                                                    setMediaType(
                                                        e.target.value
                                                    )
                                                }
                                            >
                                                <option value="video">
                                                    Video
                                                </option>

                                                <option value="image">
                                                    Image
                                                </option>

                                                <option value="audio">
                                                    Audio
                                                </option>
                                            </select>

                                        </div>

                                        <small>
                                            Supported websites: YouTube, Facebook, Google Drive
                                        </small>

                                    </div>
                                </>
                            )}


                        {/* PRIVACY */}

                        <div className="privacy-notice">

                            <span>♢</span>

                            <p>
                                Your personal information is secure.
                                Submissions will only be used for
                                publication purposes and will not be
                                shared with third parties.
                            </p>

                        </div>


                        {/* CONSENT */}

                        <label className="consent">

                            <input
                                type="checkbox"
                                required
                            />

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
                            disabled={saving}
                        >
                            {saving
                                ? 'Saving...'
                                : isEditMode
                                    ? '✓ Save Changes'
                                    : '✓ Submit'}
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