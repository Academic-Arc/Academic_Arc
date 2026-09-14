import { useEffect, useState } from 'react'
import { Navigate, Link } from 'react-router-dom'
import './Profile.css'

function Profile() {
    const token = localStorage.getItem('access_token')

    const [user, setUser] = useState(null)
    const [submissions, setSubmissions] = useState([])
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(true)

    const [showEditProfile, setShowEditProfile] = useState(false)
    const [name, setName] = useState('')
    const [district, setDistrict] = useState('')
    const [villageLocality, setVillageLocality] = useState('')
    const [selectedImage, setSelectedImage] = useState(null)
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')

    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)

    const [savingProfile, setSavingProfile] = useState(false)
    const [uploadingPicture, setUploadingPicture] = useState(false)

    if (!token) {
        return <Navigate to="/login" replace />
    }

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const [profileResponse, submissionsResponse] = await Promise.all([
                    fetch('http://127.0.0.1:8000/auth/me', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                    fetch('http://127.0.0.1:8000/submissions/', {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }),
                ])

                if (!profileResponse.ok) {
                    throw new Error('Could not load profile.')
                }

                if (!submissionsResponse.ok) {
                    throw new Error('Could not load submissions.')
                }

                const profileData = await profileResponse.json()
                const submissionsData = await submissionsResponse.json()

                setUser(profileData)
                setSubmissions(submissionsData)

                setName(profileData.name || '')
                setDistrict(profileData.district || '')
                setVillageLocality(profileData.village_locality || '')
            } catch (err) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }

        fetchProfile()
    }, [token])

    const getInitial = () => {
        if (!user?.name) return '?'

        return user.name
            .trim()
            .charAt(0)
            .toUpperCase()
    }

    const formatDate = (dateString) => {
        if (!dateString) return ''

        return new Date(dateString).toLocaleDateString('en-US', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
        })
    }

    const handleImageChange = (event) => {
        const file = event.target.files?.[0]

        if (!file) return

        const allowedTypes = [
            'image/jpeg',
            'image/png',
            'image/webp',
        ]

        if (!allowedTypes.includes(file.type)) {
            alert('Please select a JPG, PNG, or WebP image.')
            return
        }

        setSelectedImage(file)
    }

    const uploadProfilePicture = async () => {
        if (!selectedImage) return

        const formData = new FormData()
        formData.append('file', selectedImage)

        setUploadingPicture(true)

        try {
            const response = await fetch(
                'http://127.0.0.1:8000/auth/profile-picture',
                {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.detail || 'Could not upload profile picture.'
                )
            }

            setUser((previousUser) => ({
                ...previousUser,
                profile_picture: data.profile_picture,
            }))

            setSelectedImage(null)
        } catch (err) {
            alert(err.message)
        } finally {
            setUploadingPicture(false)
        }
    }

    const handleSaveProfile = async () => {
        setSavingProfile(true)

        try {
            const response = await fetch(
                'http://127.0.0.1:8000/auth/profile',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        name,
                        email: email || null,
                        phone: phone || null,
                        district: district || null,
                        village_locality: villageLocality || null,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    data.detail || 'Could not update profile.'
                )
            }

            setUser((previousUser) => ({
                ...previousUser,
                name,
                email: email || null,
                phone: phone || null,
                district: district || null,
                village_locality: villageLocality || null,
            }))

            if (selectedImage) {
                await uploadProfilePicture()
            }

            setShowEditProfile(false)
        } catch (err) {
            alert(err.message)
        } finally {
            setSavingProfile(false)
        }
    }

    const handleChangePassword = async () => {
        if (!currentPassword || !newPassword || !confirmNewPassword) {
            alert('Please fill in all password fields.')
            return
        }

        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match.')
            return
        }

        setChangingPassword(true)

        try {
            const response = await fetch(
                'http://127.0.0.1:8000/auth/change-password',
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                alert(data.detail || 'Could not change password.')
                return
            }

            alert('Password changed successfully.')

            setCurrentPassword('')
            setNewPassword('')
            setConfirmNewPassword('')

        } catch (err) {
            alert('Could not connect to the backend.')
        } finally {
            setChangingPassword(false)
        }
    }

    if (error) {
        return (
            <div className="profile-page">
                <p className="profile-error">{error}</p>
            </div>
        )
    }

    if (loading || !user) {
        return (
            <div className="profile-page">
                <p className="profile-loading">Loading profile...</p>
            </div>
        )
    }

    return (
        <div className="profile-page">

            <nav className="navbar">

                <Link to="/" className="nav-logo">
                    Academic Arc
                </Link>

                <div className="nav-links">

                    <Link to="/">Home</Link>
                    
                    <Link to="/submit">Submit</Link>

                    {/*<button className="language-button">
                        বাংলা
                    </button>

                    <button onClick={logout}>
                        Logout
                    </button>*/}

                </div>

            </nav>

            <div className="profile-container">

                <div className="profile-topbar">
                    <span>My Profile</span>
                </div>

                <section className="profile-card">

                    <div className="profile-header">

                        <div className="profile-identity">

                            <div className="profile-picture">
                                {user.profile_picture ? (
                                    <img
                                        src={user.profile_picture}
                                        alt={`${user.name}'s profile`}
                                    />
                                ) : (
                                    <span>{getInitial()}</span>
                                )}
                            </div>

                            <div className="profile-name-area">
                                <h1>{user.name}</h1>

                                <p>{user.email}</p>
                            </div>

                        </div>

                        <button
                            className="edit-profile-button"
                            onClick={() => {
                                setName(user.name || '')
                                setEmail(user.email || '')
                                setPhone(user.phone || '')
                                setDistrict(user.district || '')
                                setVillageLocality(user.village_locality || '')
                                setSelectedImage(null)

                                setCurrentPassword('')
                                setNewPassword('')
                                setConfirmNewPassword('')

                                setShowEditProfile(true)
                            }}
                        >
                            Edit Profile
                        </button>

                    </div>

                    <div className="profile-details">

                        {user.student && (
                            <div className="profile-pill">
                                <span>🎓</span>
                                <span>
                                    Class {user.student.student_class}
                                    {user.student.school && ` · ${user.student.school}`}
                                </span>
                            </div>
                        )}

                        {(user.village_locality || user.district) && (
                            <div className="profile-pill">
                                <span>📍</span>
                                <span>
                                    {user.village_locality}
                                    {user.village_locality && user.district && ', '}
                                    {user.district}
                                </span>
                            </div>
                        )}

                        <div className="profile-pill">
                            <span>📅</span>
                            <span>
                                Joined {formatDate(user.created_at)}
                            </span>
                        </div>

                    </div>

                </section>

                <section className="submissions-section">

                    <div className="section-heading">
                        <span>YOUR WORK</span>
                        <h2>My Submissions ({submissions.length})</h2>
                    </div>

                    {submissions.length === 0 ? (
                        <div className="empty-submissions">
                            <p>You haven't submitted anything yet.</p>
                        </div>
                    ) : (
                        <div className="submission-list">

                            {submissions.map((submission) => (
                                <div
                                    className="profile-submission-card"
                                    key={submission.id}
                                >

                                    <div className="submission-icon">
                                        {submission.content_type === 'Poem'
                                            ? '✎'
                                            : submission.content_type === 'Drawing'
                                                ? '▧'
                                                : submission.content_type === 'Writing'
                                                    ? '▤'
                                                    : '♪'}
                                    </div>

                                    <div className="submission-info">

                                        <h3>{submission.heading}</h3>

                                        <div className="submission-meta">
                                            <span>
                                                {submission.content_type}
                                            </span>

                                            <span>•</span>

                                            <span>
                                                {formatDate(
                                                    submission.created_at
                                                )}
                                            </span>
                                        </div>

                                    </div>

                                </div>
                            ))}

                        </div>
                    )}

                </section>

            </div>

            {showEditProfile && (
                <div
                    className="profile-modal-overlay"
                    onClick={() => setShowEditProfile(false)}
                >
                    <div
                        className="profile-modal"
                        onClick={(event) => event.stopPropagation()}
                    >

                        <div className="modal-header">
                            <h2>Edit Profile</h2>

                            <button
                                className="modal-close"
                                onClick={() => setShowEditProfile(false)}
                            >
                                ×
                            </button>
                        </div>

                        <div className="modal-content">

                            <div className="picture-editor">

                                <div className="edit-picture">
                                    {selectedImage ? (
                                        <img
                                            src={URL.createObjectURL(
                                                selectedImage
                                            )}
                                            alt="Selected profile"
                                        />
                                    ) : user.profile_picture ? (
                                        <img
                                            src={user.profile_picture}
                                            alt="Profile"
                                        />
                                    ) : (
                                        <span>{getInitial()}</span>
                                    )}
                                </div>

                                <label className="change-picture-button">
                                    Change Picture
                                    <input
                                        type="file"
                                        accept="image/jpeg,image/png,image/webp"
                                        onChange={handleImageChange}
                                    />
                                </label>

                            </div>

                            <div className="form-group">
                                <label>Name</label>

                                <input
                                    type="text"
                                    value={name}
                                    onChange={(event) =>
                                        setName(event.target.value)
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Email</label>

                                <input
                                    type="email"
                                    value={email}
                                    onChange={(event) => setEmail(event.target.value)}
                                    placeholder="your@email.com"
                                />
                            </div>

                            <div className="form-group">
                                <label>Phone Number</label>

                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(event) => setPhone(event.target.value)}
                                    placeholder="Enter phone number"
                                />
                            </div>

                            <p className="profile-edit-note">
                                At least one of email or phone number is required.
                            </p>

                            <div className="form-group">
                                <label>District</label>

                                <input
                                    type="text"
                                    value={district}
                                    onChange={(event) =>
                                        setDistrict(event.target.value)
                                    }
                                />
                            </div>

                            <div className="form-group">
                                <label>Village / Locality</label>

                                <input
                                    type="text"
                                    value={villageLocality}
                                    onChange={(event) =>
                                        setVillageLocality(
                                            event.target.value
                                        )
                                    }
                                />
                            </div>

                            <div className="password-change-section">

                                <h3>Change Password</h3>

                                <div className="form-group">
                                    <label>Current Password</label>

                                    <div className="password-input-wrapper">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(event) =>
                                                setCurrentPassword(event.target.value)
                                            }
                                            placeholder="Enter current password"
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() =>
                                                setShowCurrentPassword(!showCurrentPassword)
                                            }
                                        >
                                            {showCurrentPassword ? (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            ) : (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M3 3l18 18" />
                                                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                                    <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-3.2 4.4" />
                                                    <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 8 10 8c1.4 0 2.7-.3 3.9-.8" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>New Password</label>

                                    <div className="password-input-wrapper">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(event) =>
                                                setNewPassword(event.target.value)
                                            }
                                            placeholder="Enter new password"
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() =>
                                                setShowNewPassword(!showNewPassword)
                                            }
                                        >
                                            {showNewPassword ? (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            ) : (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M3 3l18 18" />
                                                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                                    <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-3.2 4.4" />
                                                    <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 8 10 8c1.4 0 2.7-.3 3.9-.8" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>Confirm New Password</label>

                                    <div className="password-input-wrapper">
                                        <input
                                            type={showConfirmNewPassword ? 'text' : 'password'}
                                            value={confirmNewPassword}
                                            onChange={(event) =>
                                                setConfirmNewPassword(event.target.value)
                                            }
                                            placeholder="Confirm new password"
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                        >
                                            {showConfirmNewPassword ? (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12z" />
                                                    <circle cx="12" cy="12" r="3" />
                                                </svg>
                                            ) : (
                                                <svg
                                                    width="20"
                                                    height="20"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="1.8"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                >
                                                    <path d="M3 3l18 18" />
                                                    <path d="M10.6 10.6a2 2 0 0 0 2.8 2.8" />
                                                    <path d="M9.9 4.2A10.7 10.7 0 0 1 12 4c6.5 0 10 8 10 8a17.7 17.7 0 0 1-3.2 4.4" />
                                                    <path d="M6.6 6.6C3.7 8.5 2 12 2 12s3.5 8 10 8c1.4 0 2.7-.3 3.9-.8" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="button"
                                    className="change-password-button"
                                    onClick={handleChangePassword}
                                    disabled={changingPassword}
                                >
                                    {changingPassword
                                        ? 'Changing Password...'
                                        : 'Change Password'}
                                </button>

                            </div>

                            <div className="modal-actions">

                                <button
                                    type="button"
                                    className="cancel-button"
                                    onClick={() =>
                                        setShowEditProfile(false)
                                    }
                                >
                                    Cancel
                                </button>

                                <button
                                    type="button"
                                    className="save-button"
                                    onClick={handleSaveProfile}
                                    disabled={
                                        savingProfile ||
                                        uploadingPicture
                                    }
                                >
                                    {savingProfile
                                        ? 'Saving...'
                                        : 'Save Changes'}
                                </button>

                            </div>

                        </div>

                    </div>
                </div>
            )}

        </div>
    )
}

export default Profile