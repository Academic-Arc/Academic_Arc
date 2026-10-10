import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { API_URL } from "../config";
import './Login.css'

function Login() {
    const navigate = useNavigate()
    const location = useLocation()
    const oauthError =
        new URLSearchParams(location.search).get('oauth_error')
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)
    const [forgotPassword, setForgotPassword] = useState(false)
    const [recoveryToken, setRecoveryToken] = useState('')
    const [securityQuestions, setSecurityQuestions] = useState([])
    const [securityAnswers, setSecurityAnswers] = useState({})
    const [resetMode, setResetMode] = useState(false)
    const [newPassword, setNewPassword] = useState('')
    const [confirmNewPassword, setConfirmNewPassword] = useState('')
    const [showNewPassword, setShowNewPassword] = useState(false)
    const [showConfirmNewPassword, setShowConfirmNewPassword] = useState(false)

    const handleForgotPassword = async (e) => {
        e.preventDefault()

        if (!identifier) {
            alert('Please enter your email or phone number')
            return
        }

        try {
            const response = await fetch(
                `${API_URL}/auth/forgot-password`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        identifier,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                alert(data.detail || 'Could not start password recovery')
                return
            }

            setRecoveryToken(data.recovery_token)
            setSecurityQuestions(data.questions)

            const initialAnswers = {}

            data.questions.forEach((question) => {
                initialAnswers[question.id] = ''
            })

            setSecurityAnswers(initialAnswers)

        } catch (error) {
            console.error(error)
            alert('Could not connect to the backend')
        }
    }

    const handleSecurityAnswerChange = (questionId, value) => {
        setSecurityAnswers({
            ...securityAnswers,
            [questionId]: value,
        })
    }

    const handleVerifySecurityAnswers = async (e) => {
        e.preventDefault()

        try {
            const response = await fetch(
                `${API_URL}/auth/verify-security-answers`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        recovery_token: recoveryToken,
                        answers: securityAnswers,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                alert(data.detail || 'Incorrect security answers')
                return
            }

            setRecoveryToken(data.reset_token)
            setResetMode(true)

        } catch (error) {
            console.error(error)
            alert('Could not connect to the backend')
        }
    }

    const handleResetPassword = async (e) => {
        e.preventDefault()

        try {
            const response = await fetch(
                `${API_URL}/auth/reset-password`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({
                        reset_token: recoveryToken,
                        new_password: newPassword,
                    }),
                }
            )

            const data = await response.json()

            if (!response.ok) {
                alert(data.detail || 'Could not reset password')
                return
            }

            alert('Password reset successfully!')

            setForgotPassword(false)
            setResetMode(false)
            setRecoveryToken('')
            setSecurityQuestions([])
            setSecurityAnswers({})
            setNewPassword('')
            setConfirmNewPassword('')
            setPassword('')

        } catch (error) {
            console.error(error)
            alert('Could not connect to the backend')
        }
    }

    const handleGoogleLogin = () => {
        window.location.href = `${API_URL}/auth/google`
    }

    const handleLogin = async (e) => {
        e.preventDefault()

        try {
            const response = await fetch(`${API_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    identifier,
                    password,
                }),
            })

            const data = await response.json()

            console.log(data)

            if (!response.ok) {
                alert(data.detail || 'Login failed')
                return
            }

            localStorage.setItem('access_token', data.access_token)

            if (data.role === 'admin') {
                navigate('/admin')
            } else {
                navigate('/dashboard')
            }
        } catch (error) {
            console.error(error)
            alert('Could not connect to the backend')
        }
    }

    return (
        <div className="login-page">

            {/* LEFT SIDE */}
            <div className="login-left">

                <div className="left-content">

                    <div className="quote-mark">"</div>

                    <h2>Education is the foundation of Society.</h2>

                    <div className="stats">

                        <div className="stat-card">
                            <strong>1,240+</strong>
                            <span>Writings Published</span>
                        </div>

                        <div className="stat-card">
                            <strong>86</strong>
                            <span>Schools</span>
                        </div>

                        <div className="stat-card">
                            <strong>36</strong>
                            <span>Total</span>
                        </div>

                    </div>

                </div>

            </div>

            {/* RIGHT SIDE */}
            <div className="login-right">
                
                <button
                    type="button"
                    className="auth-home-button"
                    onClick={() => navigate('/')}
                >
                    ← Go Back
                </button>

                <div className="login-container">

                    <h1>Welcome Back!</h1>

                    <p className="login-subtitle">
                        Log in to your account
                    </p>

                    {oauthError === 'account_exists' && (
                        <div
                            style={{
                                background: '#fff3e6',
                                border: '1px solid #f0c79b',
                                color: '#8a4b08',
                                borderRadius: '8px',
                                padding: '12px 14px',
                                marginBottom: '16px',
                                fontSize: '14px',
                                lineHeight: '1.5',
                            }}
                        >
                            <strong>An account already exists with this email.</strong>
                            <br />
                            Please log in with your Academic Arc password.
                        </div>
                    )}

                    {/* Login / Signup tabs */}
                    <div className="auth-tabs">
                        <button
                            type="button"
                            className="auth-tab active"
                        >
                            Log In
                        </button>

                        <button
                            type="button"
                            className="auth-tab"
                            onClick={() => navigate('/signup')}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form
                        onSubmit={
                            resetMode
                                ? handleResetPassword
                                : forgotPassword
                                    ? (
                                        securityQuestions.length > 0
                                            ? handleVerifySecurityAnswers
                                            : handleForgotPassword
                                    )
                                    : handleLogin
                        }
                    >

                        {resetMode && (
                            <div className="reset-password-section">

                                <h3>Reset Your Password</h3>

                                <p>
                                    Enter a new password for your account.
                                </p>

                                <div className="form-field">
                                    <label>
                                        New Password
                                        <span className="required">*</span>
                                    </label>

                                    <div className="password-wrapper">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            placeholder="Enter your new password"
                                            required
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() => setShowNewPassword(!showNewPassword)}
                                            aria-label={showNewPassword ? 'Hide password' : 'Show password'}
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
                                    <p className="password-requirement">
                                        Password must be at least 8 characters long.
                                    </p>
                                </div>

                                <div className="form-field">
                                    <label>
                                        Confirm New Password
                                        <span className="required">*</span>
                                    </label>

                                    <div className="password-wrapper">
                                        <input
                                            type={showConfirmNewPassword ? 'text' : 'password'}
                                            value={confirmNewPassword}
                                            onChange={(e) =>
                                                setConfirmNewPassword(e.target.value)
                                            }
                                            placeholder="Confirm your new password"
                                            required
                                        />

                                        <button
                                            type="button"
                                            className="password-toggle"
                                            onClick={() =>
                                                setShowConfirmNewPassword(!showConfirmNewPassword)
                                            }
                                            aria-label={
                                                showConfirmNewPassword
                                                    ? 'Hide password'
                                                    : 'Show password'
                                            }
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
                                    {confirmNewPassword &&
                                        newPassword !== confirmNewPassword && (
                                            <p className="password-error">
                                                Passwords do not match.
                                            </p>
                                        )}
                                </div>

                            </div>
                        )}

                        {!resetMode && (
                            <>

                                {/* Email / Phone */}
                                <div className="form-field">
                                    <label>
                                        Email or Phone Number
                                        <span className="required">*</span>
                                    </label>

                                    <input
                                        type="text"
                                        value={identifier}
                                        onChange={(e) => setIdentifier(e.target.value)}
                                        placeholder="Enter your email or phone number"
                                        required
                                    />
                                </div>
                            </>
                        )}

                        {forgotPassword && !resetMode && securityQuestions.length > 0 && (
                            <div className="security-recovery-section">

                                <h3>Verify Your Identity</h3>

                                <p>
                                    Answer both security questions to continue.
                                </p>

                                {securityQuestions.map((question) => (
                                    <div className="form-field" key={question.id}>

                                        <label>
                                            {question.question}
                                            <span className="required">*</span>
                                        </label>

                                        <input
                                            type="text"
                                            value={securityAnswers[question.id] || ''}
                                            onChange={(e) =>
                                                handleSecurityAnswerChange(
                                                    question.id,
                                                    e.target.value
                                                )
                                            }
                                            placeholder="Enter your answer"
                                            required
                                        />

                                    </div>
                                ))}

                            </div>
                        )}

                        {/* Password */}
                        {!forgotPassword && (
                            <div className="form-field">
                                <label>
                                    Password
                                    <span className="required">*</span>
                                </label>

                                <div className="password-wrapper">
                                    <input
                                        type={showPassword ? 'text' : 'password'}
                                        value={password}
                                        onChange={(e) => setPassword(e.target.value)}
                                        placeholder="Enter your password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() => setShowPassword(!showPassword)}
                                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                                    >
                                        {showPassword ? (
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
                        )}

                        {/* Remember / Forgot */}
                        {!forgotPassword && (
                            <div className="login-options">

                                <label className="remember-me">
                                    <input type="checkbox" />
                                    <span>Remember me</span>
                                </label>

                                <button
                                    type="button"
                                    className="forgot-password"
                                    onClick={() => setForgotPassword(true)}
                                >
                                    Forgot password?
                                </button>

                            </div>
                        )}

                        {/* Login button */}
                        <button
                            type="submit"
                            className="login-button"
                        >
                            {forgotPassword ? 'Continue' : 'Login'}
                        </button>

                        {!forgotPassword && (
                            <>
                                <div className="oauth-divider">
                                    <span>or</span>
                                </div>

                                <button
                                    type="button"
                                    className="google-login-button"
                                    onClick={handleGoogleLogin}
                                >
                                    Google
                                </button>
                            </>
                        )}

                    </form>

                    <p className="signup-prompt">
                        Don't have an account?

                        <button
                            type="button"
                            onClick={() => navigate('/signup')}
                        >
                            Sign Up
                        </button>
                    </p>

                </div>
            </div>

        </div>
    )
}

export default Login