import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { API_URL } from "../config";
import './Signup.css'

function Signup() {
    const navigate = useNavigate()

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
        is_student: true,
        dob: '',
        school: '',
        student_class: '',
    })

    const [showPassword, setShowPassword] = useState(false)
    const [showConfirmPassword, setShowConfirmPassword] = useState(false)

    const handleChange = (e) => {
        const { name, value } = e.target

        setFormData({
            ...formData,
            [name]: value,
        })
    }

    const handleStudentChange = (value) => {
        setFormData({
            ...formData,
            is_student: value,
        })
    }

    const handleSignup = async (e) => {
        e.preventDefault()

        if (!formData.email && !formData.phone) {
            alert('Please enter either an email address or phone number')
            return
        }

        if (formData.password !== formData.confirmPassword) {
            alert('Passwords do not match')
            return
        }

        try {
            const dataToSend = {
                name: formData.name,
                email: formData.email || null,
                phone: formData.phone || null,
                password: formData.password,
                is_student: formData.is_student,
                dob: formData.dob,
            }

            if (formData.is_student) {
                dataToSend.school = formData.school
                dataToSend.student_class = formData.student_class
            }

            const response = await fetch(
                `${API_URL}/auth/signup`,
                {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify(dataToSend),
                }
            )

            const data = await response.json()

            console.log(data)

            if (!response.ok) {
                console.error('Signup error:', data)
                alert(JSON.stringify(data.detail, null, 2))
                return
            }

            localStorage.setItem('access_token', data.access_token)

            alert('Signup successful!')
            navigate('/')
        } catch (error) {
            console.error(error)
            alert('Could not connect to the backend')
        }
    }

    return (
        <div className="signup-page">

            {/* LEFT SIDE */}
            <div className="signup-left">

                <div className="signup-left-content">

                    <div className="signup-quote-mark">"</div>

                    <h2>
                        Education is the foundation of Society.
                    </h2>

                    <div className="signup-stats">

                        <div className="signup-stat-card">
                            <strong>1,240+</strong>
                            <span>Writings Published</span>
                        </div>

                        <div className="signup-stat-card">
                            <strong>86</strong>
                            <span>Schools</span>
                        </div>

                        <div className="signup-stat-card">
                            <strong>36</strong>
                            <span>Total</span>
                        </div>

                    </div>

                </div>

            </div>


            {/* RIGHT SIDE */}
            <div className="signup-right">

                  <button
                      type="button"
                      className="auth-home-button"
                      onClick={() => navigate('/')}
                  >
                      ← Go Back
                  </button>

                <div className="signup-container">

                    <h1>Join Us Today!</h1>

                    <p className="signup-subtitle">
                        Create an account and share your writing
                    </p>


                    {/* Login / Signup tabs */}
                    <div className="auth-tabs">

                        <button
                            type="button"
                            className="auth-tab"
                            onClick={() => navigate('/login')}
                        >
                            Login
                        </button>

                        <button
                            type="button"
                            className="auth-tab active"
                        >
                            Sign Up
                        </button>

                    </div>


                    <form onSubmit={handleSignup}>

                        {/* Full Name */}
                        <div className="signup-field">
                            <label>
                                Full Name
                                <span className="required">*</span>
                            </label>

                            <input
                                type="text"
                                name="name"
                                value={formData.name}
                                onChange={handleChange}
                                placeholder="Enter your full name"
                                required
                            />
                        </div>


                        {/* Student status */}
                        <div className="signup-field">
                            <label>
                                Are you a student?
                                <span className="required">*</span>
                            </label>

                            <div className="student-options">

                                <button
                                    type="button"
                                    className={
                                        formData.is_student
                                            ? 'student-option selected'
                                            : 'student-option'
                                    }
                                    onClick={() =>
                                        handleStudentChange(true)
                                    }
                                >
                                    Yes, I'm a student
                                </button>

                                <button
                                    type="button"
                                    className={
                                        !formData.is_student
                                            ? 'student-option selected'
                                            : 'student-option'
                                    }
                                    onClick={() =>
                                        handleStudentChange(false)
                                    }
                                >
                                    No, I'm not
                                </button>

                            </div>
                        </div>


                        {/* Student-only fields */}
                        {formData.is_student && (
                            <div className="signup-row">

                                <div className="signup-field">
                                    <label>
                                        Class
                                        <span className="required">*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="student_class"
                                        value={formData.student_class}
                                        onChange={handleChange}
                                        placeholder="Enter your class"
                                        required
                                    />
                                </div>

                                <div className="signup-field">
                                    <label>
                                        School
                                        <span className="required">*</span>
                                    </label>

                                    <input
                                        type="text"
                                        name="school"
                                        value={formData.school}
                                        onChange={handleChange}
                                        placeholder="Enter your school"
                                        required
                                    />
                                </div>

                            </div>
                        )}


                        {/* Email */}
                        <div className="signup-field">
                            <label>
                                Email
                            </label>

                            <input
                                type="email"
                                name="email"
                                value={formData.email}
                                onChange={handleChange}
                                placeholder="Enter your email"
                            />
                        </div>


                        {/* Phone + DOB */}
                        <div className="signup-row">

                            <div className="signup-field">
                                <label>
                                    Phone Number
                                </label>

                                <input
                                    type="tel"
                                    name="phone"
                                    value={formData.phone}
                                    onChange={handleChange}
                                    placeholder="Enter your phone number"
                                />
                            </div>

                            <div className="signup-field">
                                <label>
                                    Date of Birth
                                    <span className="required">*</span>
                                </label>

                                <input
                                    type="date"
                                    name="dob"
                                    value={formData.dob}
                                    onChange={handleChange}
                                    required
                                />
                            </div>

                        </div>


                        {/* Password + Confirm Password */}
                        <div className="signup-row">

                            <div className="signup-field">
                                <label>
                                    Password
                                    <span className="required">*</span>
                                </label>

                                <div className="password-wrapper">
                                    <input
                                        type={
                                            showPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        name="password"
                                        value={formData.password}
                                        onChange={handleChange}
                                        placeholder="Enter password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowPassword(!showPassword)
                                        }
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


                            <div className="signup-field">
                                <label>
                                    Confirm Password
                                    <span className="required">*</span>
                                </label>

                                <div className="password-wrapper">
                                    <input
                                        type={
                                            showConfirmPassword
                                                ? 'text'
                                                : 'password'
                                        }
                                        name="confirmPassword"
                                        value={formData.confirmPassword}
                                        onChange={handleChange}
                                        placeholder="Confirm password"
                                        required
                                    />

                                    <button
                                        type="button"
                                        className="password-toggle"
                                        onClick={() =>
                                            setShowConfirmPassword(!showConfirmPassword)
                                        }
                                        aria-label={
                                            showConfirmPassword
                                                ? 'Hide confirm password'
                                                : 'Show confirm password'
                                        }
                                    >
                                        {showConfirmPassword ? (
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

                        </div>


                        <p className="terms-text">
                            By signing up, you agree to our{' '}
                            <span>Terms of Use</span> and{' '}
                            <span>Privacy Policy</span>.
                        </p>


                        <button
                            type="submit"
                            className="signup-button"
                        >
                            Create Account
                        </button>

                    </form>


                    <p className="login-prompt">
                        Already have an account?

                        <button
                            type="button"
                            onClick={() => navigate('/login')}
                        >
                            Login
                        </button>
                    </p>

                </div>

            </div>

        </div>
    )
}

export default Signup