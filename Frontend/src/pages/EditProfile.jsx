import { useEffect, useState } from 'react'
import { Link, Navigate, useNavigate, useSearchParams } from 'react-router-dom'
import { API_URL } from '../config'
import Navbar from '../components/Navbar'
import './EditProfile.css'

function EditProfile() {
    const navigate = useNavigate()
    const [searchParams, setSearchParams] = useSearchParams()

    const token = localStorage.getItem('access_token')

    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [toast, setToast] = useState(null)

    // User Data States
    const [user, setUser] = useState(null)
    const [name, setName] = useState('')
    const [email, setEmail] = useState('')
    const [phone, setPhone] = useState('')
    const [dob, setDob] = useState('')
    const [district, setDistrict] = useState('')
    const [villageLocality, setVillageLocality] = useState('')

    // Academic States
    const [isStudent, setIsStudent] = useState(false)
    const [school, setSchool] = useState('')
    const [studentClass, setStudentClass] = useState('')

    // Profile Picture States
    const [profilePicture, setProfilePicture] = useState(null)
    const [selectedImage, setSelectedImage] = useState(null)
    const [uploadingPicture, setUploadingPicture] = useState(false)
    const [removingPicture, setRemovingPicture] = useState(false)

    // Google Connection States
    const [isGoogleConnected, setIsGoogleConnected] = useState(false)
    const [googleEmail, setGoogleEmail] = useState('')
    const [disconnectingGoogle, setDisconnectingGoogle] = useState(false)

    // Password States
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')
    const [showCurrentPassword, setShowCurrentPassword] = useState(false)
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)
    const [changingPassword, setChangingPassword] = useState(false)

    const showToast = (message, type = 'success') => {
        setToast({ message, type })
        setTimeout(() => setToast(null), 4500)
    }

    // Check query params for OAuth feedback
    useEffect(() => {
        const oauthSuccess = searchParams.get('oauth_success')
        const oauthError = searchParams.get('oauth_error')
        const oauthInfo = searchParams.get('oauth_info')

        if (oauthSuccess === 'google_connected') {
            showToast('Google account connected successfully!', 'success')
        } else if (oauthError === 'already_linked_to_other') {
            showToast('This Google account is already linked to another user.', 'error')
        } else if (oauthError === 'user_not_found') {
            showToast('User session not found. Please log in again.', 'error')
        } else if (oauthInfo === 'already_linked') {
            showToast('This Google account is already connected to your profile.', 'info')
        }

        if (oauthSuccess || oauthError || oauthInfo) {
            // Clean up url
            const newParams = new URLSearchParams(searchParams)
            newParams.delete('oauth_success')
            newParams.delete('oauth_error')
            newParams.delete('oauth_info')
            setSearchParams(newParams, { replace: true })
        }
    }, [searchParams, setSearchParams])

    // Load User Profile
    useEffect(() => {
        if (!token) return

        let isMounted = true

        const fetchProfile = async () => {
            try {
                const response = await fetch(`${API_URL}/auth/me`, {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                })

                if (!response.ok) {
                    throw new Error('Failed to load profile details.')
                }

                const data = await response.json()
                if (!isMounted) return

                setUser(data)
                setName(data.name || '')
                setEmail(data.email || '')
                setPhone(data.phone || '')
                setDistrict(data.district || '')
                setVillageLocality(data.village_locality || '')
                setProfilePicture(data.profile_picture || null)

                // Date of birth
                if (data.dob) {
                    setDob(data.dob.split('T')[0])
                }

                // Student details
                setIsStudent(Boolean(data.is_student))
                if (data.student) {
                    setSchool(data.student.school || '')
                    setStudentClass(data.student.student_class || '')
                }

                // Google connection
                setIsGoogleConnected(Boolean(data.is_google_connected))
                setGoogleEmail(data.google_email || '')
            } catch (error) {
                console.error(error)
                showToast('Could not load profile details.', 'error')
            } finally {
                if (isMounted) setLoading(false)
            }
        }

        fetchProfile()

        return () => {
            isMounted = false
        }
    }, [token])

    if (!token) {
        return <Navigate to="/login" replace />
    }

    const getInitial = () => {
        if (!name) return '?'
        return name.trim().charAt(0).toUpperCase()
    }

    const handleImageSelect = (event) => {
        const file = event.target.files[0]
        if (!file) return

        if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
            showToast('Only JPG, PNG, and WebP images are allowed.', 'error')
            return
        }

        if (file.size > 5 * 1024 * 1024) {
            showToast('Profile picture must be 5 MB or smaller.', 'error')
            return
        }

        setSelectedImage(file)
    }

    const handleRemovePicture = async () => {
        if (!window.confirm('Are you sure you want to remove your profile picture?')) {
            return
        }

        setRemovingPicture(true)
        try {
            const response = await fetch(`${API_URL}/auth/profile-picture`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Could not remove profile picture.')
            }

            setProfilePicture(null)
            setSelectedImage(null)
            showToast('Profile picture removed successfully.', 'success')
        } catch (error) {
            console.error(error)
            showToast(error.message, 'error')
        } finally {
            setRemovingPicture(false)
        }
    }

    const handleSaveProfile = async (e) => {
        e.preventDefault()

        if (!name.trim()) {
            showToast('Full name is required.', 'error')
            return
        }

        if (!email.trim() && !phone.trim()) {
            showToast('Either an email or phone number is required.', 'error')
            return
        }

        if (isStudent) {
            if (!school.trim()) {
                showToast('School name is required for students.', 'error')
                return
            }
            if (!studentClass.trim()) {
                showToast('Class is required for students.', 'error')
                return
            }
        }

        setSaving(true)

        try {
            // 1. Update Profile Fields
            const response = await fetch(`${API_URL}/auth/profile`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    name: name.trim(),
                    email: email.trim() || null,
                    phone: phone.trim() || null,
                    district: district.trim() || null,
                    village_locality: villageLocality.trim() || null,
                    dob: dob || null,
                    is_student: isStudent,
                    school: isStudent ? school.trim() : null,
                    student_class: isStudent ? studentClass.trim() : null,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(
                    typeof data.detail === 'string'
                        ? data.detail
                        : JSON.stringify(data.detail) || 'Could not update profile.'
                )
            }

            // 2. Upload New Profile Picture if selected
            if (selectedImage) {
                setUploadingPicture(true)
                const formData = new FormData()
                formData.append('file', selectedImage)

                const uploadResponse = await fetch(`${API_URL}/auth/profile-picture`, {
                    method: 'POST',
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    body: formData,
                })

                const uploadData = await uploadResponse.json()

                if (uploadResponse.ok) {
                    setProfilePicture(uploadData.profile_picture)
                    setSelectedImage(null)
                } else {
                    showToast('Profile saved, but picture upload failed: ' + uploadData.detail, 'info')
                }
            }

            showToast('Profile updated successfully!', 'success')
        } catch (error) {
            console.error(error)
            showToast(error.message, 'error')
        } finally {
            setSaving(false)
            setUploadingPicture(false)
        }
    }

    const handleConnectGoogle = () => {
        window.location.href = `${API_URL}/auth/google?link_token=${token}`
    }

    const handleDisconnectGoogle = async () => {
        if (!window.confirm('Are you sure you want to disconnect your Google account?')) {
            return
        }

        setDisconnectingGoogle(true)
        try {
            const response = await fetch(`${API_URL}/auth/google/disconnect`, {
                method: 'DELETE',
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Could not disconnect Google account.')
            }

            setIsGoogleConnected(false)
            setGoogleEmail('')
            showToast('Google account disconnected successfully.', 'success')
        } catch (error) {
            console.error(error)
            showToast(error.message, 'error')
        } finally {
            setDisconnectingGoogle(false)
        }
    }

    const handleChangePassword = async (e) => {
        e.preventDefault()

        if (!currentPassword || !newPassword || !confirmNewPassword) {
            showToast('Please fill in all password fields.', 'error')
            return
        }

        if (newPassword.length < 8) {
            showToast('New password must be at least 8 characters long.', 'error')
            return
        }

        if (newPassword !== confirmNewPassword) {
            showToast('New passwords do not match.', 'error')
            return
        }

        setChangingPassword(true)

        try {
            const response = await fetch(`${API_URL}/auth/change-password`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    current_password: currentPassword,
                    new_password: newPassword,
                }),
            })

            const data = await response.json()

            if (!response.ok) {
                throw new Error(data.detail || 'Could not change password.')
            }

            setCurrentPassword('')
            setNewPassword('')
            setConfirmNewPassword('')
            showToast('Password changed successfully!', 'success')
        } catch (error) {
            console.error(error)
            showToast(error.message, 'error')
        } finally {
            setChangingPassword(false)
        }
    }

    if (loading) {
        return (
            <div className="edit-profile-page">
                <Navbar theme="light" showLanguage={false} />
                <div className="edit-profile-container loading-state">
                    <p>Loading your profile...</p>
                </div>
            </div>
        )
    }

    return (
        <div className="edit-profile-page">
            <Navbar theme="light" showLanguage={false} />

            {/* TOAST NOTIFICATION */}
            {toast && (
                <div className={`edit-profile-toast ${toast.type}`}>
                    <span>
                        {toast.type === 'success' && '✓'}
                        {toast.type === 'error' && '⚠'}
                        {toast.type === 'info' && 'ℹ'}
                    </span>
                    <p>{toast.message}</p>
                    <button type="button" onClick={() => setToast(null)}>×</button>
                </div>
            )}

            <div className="edit-profile-container">

                {/* HEADER */}
                <div className="edit-profile-header">
                    <Link to="/profile" className="back-link">
                        ← Back to Profile
                    </Link>
                    <h1>Edit Profile</h1>
                    <p>Manage your account settings, personal details, academic information, and connected services.</p>
                </div>

                <div className="edit-profile-layout">

                    {/* MAIN FORM COLUMN */}
                    <div className="edit-profile-main">

                        {/* SECTION 1: PROFILE PICTURE */}
                        <div className="edit-card">
                            <div className="card-header">
                                <span className="card-icon">👤</span>
                                <div>
                                    <h2>Profile Photo</h2>
                                    <p>Upload a high-quality picture to personalize your account</p>
                                </div>
                            </div>

                            <div className="picture-uploader-row">
                                <div className="avatar-preview">
                                    {selectedImage ? (
                                        <img
                                            src={URL.createObjectURL(selectedImage)}
                                            alt="Preview"
                                        />
                                    ) : profilePicture ? (
                                        <img
                                            src={profilePicture}
                                            alt={name}
                                        />
                                    ) : (
                                        <span className="avatar-fallback">{getInitial()}</span>
                                    )}
                                </div>

                                <div className="avatar-actions">
                                    <div className="avatar-buttons">
                                        <label className="btn-upload">
                                            <span>↥ Change Picture</span>
                                            <input
                                                type="file"
                                                accept="image/jpeg,image/png,image/webp"
                                                onChange={handleImageSelect}
                                            />
                                        </label>

                                        {(profilePicture || selectedImage) && (
                                            <button
                                                type="button"
                                                className="btn-remove-pic"
                                                onClick={handleRemovePicture}
                                                disabled={removingPicture}
                                            >
                                                {removingPicture ? 'Removing...' : 'Remove Photo'}
                                            </button>
                                        )}
                                    </div>
                                    <small className="avatar-hint">JPG, PNG or WebP · Max size 5 MB</small>
                                </div>
                            </div>
                        </div>

                        {/* SECTION 2: PERSONAL INFORMATION */}
                        <form onSubmit={handleSaveProfile}>
                            <div className="edit-card">
                                <div className="card-header">
                                    <span className="card-icon">✎</span>
                                    <div>
                                        <h2>Personal Information</h2>
                                        <p>Update your contact details and basic information</p>
                                    </div>
                                </div>

                                <div className="form-grid">
                                    <div className="form-field full-width">
                                        <label>Full Name <span className="req">*</span></label>
                                        <input
                                            type="text"
                                            value={name}
                                            onChange={(e) => setName(e.target.value)}
                                            placeholder="Your full name"
                                            required
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Email Address</label>
                                        <input
                                            type="email"
                                            value={email}
                                            onChange={(e) => setEmail(e.target.value)}
                                            placeholder="your@email.com"
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>Phone Number</label>
                                        <input
                                            type="tel"
                                            value={phone}
                                            onChange={(e) => setPhone(e.target.value)}
                                            placeholder="e.g. 9876543210"
                                        />
                                    </div>

                                    <div className="form-notice full-width">
                                        <span>ℹ</span>
                                        <small>At least one of Email Address or Phone Number is required for account security.</small>
                                    </div>

                                    <div className="form-field">
                                        <label>Date of Birth</label>
                                        <input
                                            type="date"
                                            value={dob}
                                            onChange={(e) => setDob(e.target.value)}
                                        />
                                    </div>

                                    <div className="form-field">
                                        <label>District</label>
                                        <input
                                            type="text"
                                            value={district}
                                            onChange={(e) => setDistrict(e.target.value)}
                                            placeholder="e.g. Kamrup Metro"
                                        />
                                    </div>

                                    <div className="form-field full-width">
                                        <label>Village / Locality</label>
                                        <input
                                            type="text"
                                            value={villageLocality}
                                            onChange={(e) => setVillageLocality(e.target.value)}
                                            placeholder="e.g. Dispur, Guwahati"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* SECTION 3: ACADEMIC DETAILS */}
                            <div className="edit-card">
                                <div className="card-header">
                                    <span className="card-icon">🎓</span>
                                    <div>
                                        <h2>Academic Information</h2>
                                        <p>Tell us if you are a student and keep your school/class updated</p>
                                    </div>
                                </div>

                                <div className="student-toggle-wrapper">
                                    <label className="toggle-label">
                                        <input
                                            type="checkbox"
                                            checked={isStudent}
                                            onChange={(e) => setIsStudent(e.target.checked)}
                                        />
                                        <span className="toggle-switch"></span>
                                        <div className="toggle-text">
                                            <strong>I am currently a student</strong>
                                            <span>Enable this to display your school and class on your submissions and profile.</span>
                                        </div>
                                    </label>
                                </div>

                                {isStudent ? (
                                    <div className="form-grid student-fields-animated">
                                        <div className="form-field">
                                            <label>School / Institution Name <span className="req">*</span></label>
                                            <input
                                                type="text"
                                                value={school}
                                                onChange={(e) => setSchool(e.target.value)}
                                                placeholder="Enter your school name"
                                                required={isStudent}
                                            />
                                        </div>

                                        <div className="form-field">
                                            <label>Class / Grade <span className="req">*</span></label>
                                            <input
                                                type="text"
                                                value={studentClass}
                                                onChange={(e) => setStudentClass(e.target.value)}
                                                placeholder="e.g. 10th, 12th, B.Sc"
                                                required={isStudent}
                                            />
                                        </div>
                                    </div>
                                ) : (
                                    <div className="non-student-notice">
                                        <span>👤</span>
                                        <p>Your profile is configured as a general user. Submissions will not require class or school details.</p>
                                    </div>
                                )}
                            </div>

                            {/* SAVE BUTTON BAR */}
                            <div className="save-bar">
                                <button
                                    type="button"
                                    className="btn-cancel"
                                    onClick={() => navigate('/profile')}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="btn-save-primary"
                                    disabled={saving || uploadingPicture}
                                >
                                    {saving || uploadingPicture ? 'Saving Changes...' : '✓ Save Profile Changes'}
                                </button>
                            </div>
                        </form>

                    </div>

                    {/* SIDEBAR COLUMN (CONNECTED ACCOUNTS & SECURITY) */}
                    <div className="edit-profile-side">

                        {/* SECTION 4: CONNECTED ACCOUNTS */}
                        <div className="edit-card">
                            <div className="card-header">
                                <span className="card-icon">🔗</span>
                                <div>
                                    <h2>Connected Accounts</h2>
                                    <p>Manage third-party login providers</p>
                                </div>
                            </div>

                            <div className="connected-provider-item">
                                <div className="provider-info">
                                    <div className="google-icon-wrapper">
                                        <svg viewBox="0 0 24 24" width="24" height="24">
                                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                                        </svg>
                                    </div>
                                    <div className="provider-texts">
                                        <strong>Google</strong>
                                        {isGoogleConnected ? (
                                            <span className="provider-status connected">
                                                Connected {googleEmail ? `(${googleEmail})` : ''}
                                            </span>
                                        ) : (
                                            <span className="provider-status not-connected">Not connected</span>
                                        )}
                                    </div>
                                </div>

                                {isGoogleConnected ? (
                                    <button
                                        type="button"
                                        className="btn-disconnect"
                                        onClick={handleDisconnectGoogle}
                                        disabled={disconnectingGoogle}
                                    >
                                        {disconnectingGoogle ? 'Disconnecting...' : 'Disconnect'}
                                    </button>
                                ) : (
                                    <button
                                        type="button"
                                        className="btn-connect-google"
                                        onClick={handleConnectGoogle}
                                    >
                                        Connect Google
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* SECTION 5: CHANGE PASSWORD */}
                        <div className="edit-card">
                            <div className="card-header">
                                <span className="card-icon">🔒</span>
                                <div>
                                    <h2>Change Password</h2>
                                    <p>Update your account password</p>
                                </div>
                            </div>

                            <form onSubmit={handleChangePassword}>
                                <div className="form-field full-width">
                                    <label>Current Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showCurrentPassword ? 'text' : 'password'}
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            placeholder="Enter current password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="toggle-eye"
                                            onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                                        >
                                            {showCurrentPassword ? '👁' : '🙈'}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-field full-width">
                                    <label>New Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Min. 8 characters"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="toggle-eye"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                        >
                                            {showNewPassword ? '👁' : '🙈'}
                                        </button>
                                    </div>
                                </div>

                                <div className="form-field full-width">
                                    <label>Confirm New Password</label>
                                    <div className="password-input-wrapper">
                                        <input
                                            type={showConfirmNewPassword ? 'text' : 'password'}
                                            value={confirmNewPassword}
                                            onChange={(e) => setConfirmNewPassword(e.target.value)}
                                            placeholder="Repeat new password"
                                            required
                                        />
                                        <button
                                            type="button"
                                            className="toggle-eye"
                                            onClick={() => setShowConfirmNewPassword(!showConfirmNewPassword)}
                                        >
                                            {showConfirmNewPassword ? '👁' : '🙈'}
                                        </button>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="btn-update-password"
                                    disabled={changingPassword}
                                >
                                    {changingPassword ? 'Updating Password...' : 'Update Password'}
                                </button>
                            </form>
                        </div>

                    </div>

                </div>

            </div>
        </div>
    )
}

export default EditProfile
