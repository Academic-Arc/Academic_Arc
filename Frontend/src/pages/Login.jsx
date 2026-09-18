import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from "../config";
import './Login.css'

function Login() {
    const navigate = useNavigate()
    const [identifier, setIdentifier] = useState('')
    const [password, setPassword] = useState('')
    const [showPassword, setShowPassword] = useState(false)

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

                    {/* Login / Signup tabs */}
                    <div className="auth-tabs">
                        <button
                            type="button"
                            className="auth-tab active"
                        >
                            Login
                        </button>

                        <button
                            type="button"
                            className="auth-tab"
                            onClick={() => navigate('/signup')}
                        >
                            Sign Up
                        </button>
                    </div>

                    <form onSubmit={handleLogin}>

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

                        {/* Password */}
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

                        {/* Remember / Forgot */}
                        <div className="login-options">

                            <label className="remember-me">
                                <input type="checkbox" />
                                <span>Remember me</span>
                            </label>

                            <button
                                type="button"
                                className="forgot-password"
                            >
                                Forgot password?
                            </button>

                        </div>

                        {/* Login button */}
                        <button
                            type="submit"
                            className="login-button"
                        >
                            Login
                        </button>

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