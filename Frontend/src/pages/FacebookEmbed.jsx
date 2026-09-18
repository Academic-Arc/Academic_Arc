import { useEffect, useRef, useState } from 'react'
import { API_URL } from "../config";

function loadFacebookSDK() {
  return new Promise((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB)
      return
    }

    const existingScript = document.getElementById('facebook-jssdk')

    if (existingScript) {
      const checkFB = setInterval(() => {
        if (window.FB) {
          clearInterval(checkFB)

          if (window.FB) {
            resolve(window.FB)
          }
        }
      }, 100)

      setTimeout(() => {
        clearInterval(checkFB)

        if (!window.FB) {
          reject(new Error('Facebook SDK failed to load'))
        }
      }, 10000)

      return
    }

    const script = document.createElement('script')

    script.id = 'facebook-jssdk'
    script.src =
      'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v26.0'
    script.async = true
    script.defer = true
    script.crossOrigin = 'anonymous'

    script.onload = () => {
      if (window.FB) {
        resolve(window.FB)
      } else {
        reject(new Error('Facebook SDK loaded but FB is unavailable'))
      }
    }

    script.onerror = () => {
      reject(new Error('Failed to load Facebook SDK'))
    }

    document.body.appendChild(script)
  })
}

function FacebookEmbed({ url, className = '' }) {
  const containerRef = useRef(null)
  const [embedUrl, setEmbedUrl] = useState(null)
  const [error, setError] = useState(false)

  useEffect(() => {
    if (!url) return

    const resolveUrl = async () => {
      try {
        setError(false)

        const response = await fetch(
          `${API_URL}/submissions/facebook-embed?url=${encodeURIComponent(url)}`
        )

        if (!response.ok) {
          throw new Error('Failed to resolve Facebook URL')
        }

        const data = await response.json()

        console.log('Resolved Facebook URL:', data.url)

        setEmbedUrl(data.url)
      } catch (error) {
        console.error('Facebook URL resolution error:', error)
        setError(true)
      }
    }

    resolveUrl()
  }, [url])

  useEffect(() => {
    if (!embedUrl || !containerRef.current) return

    let cancelled = false

    const renderFacebookVideo = async () => {
      try {
        const FB = await loadFacebookSDK()

        if (cancelled || !containerRef.current) return

        containerRef.current.innerHTML = ''

        const video = document.createElement('div')

        video.className = 'fb-video'
        video.setAttribute('data-href', embedUrl)
        video.setAttribute('data-show-text', 'false')

        containerRef.current.appendChild(video)

        FB.XFBML.parse(
          containerRef.current,
          () => {
            console.log('Facebook video rendered')
          }
        )
      } catch (error) {
        console.error('Facebook SDK error:', error)
        setError(true)
      }
    }

    renderFacebookVideo()

    return () => {
      cancelled = true
    }
  }, [embedUrl])

  if (error) {
    return (
      <div className="facebook-embed-fallback">
        <a
          href={url}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open video on Facebook ↗
        </a>
      </div>
    )
  }

  return (
    <div
      ref={containerRef}
      className={`facebook-embed-container ${className}`}
    />
  )
}

export default FacebookEmbed