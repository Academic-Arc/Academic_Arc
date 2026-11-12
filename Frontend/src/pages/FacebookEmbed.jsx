import { useEffect, useRef, useState } from 'react'
import { API_URL } from "../config";

// Module-level singleton promise to guarantee Facebook SDK is loaded only once
let fbSdkPromise = null

function loadFacebookSDK() {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Window not available'))
  }

  if (window.FB) {
    return Promise.resolve(window.FB)
  }

  if (fbSdkPromise) {
    return fbSdkPromise
  }

  fbSdkPromise = new Promise((resolve, reject) => {
    if (window.FB) {
      resolve(window.FB)
      return
    }

    // Set timeout to avoid hanging indefinitely if blocked by adblockers or network
    const timeoutId = setTimeout(() => {
      fbSdkPromise = null
      reject(new Error('Facebook SDK load timed out (adblocker or network issue)'))
    }, 10000)

    // Hook into fbAsyncInit for immediate SDK readiness notification
    const existingInit = window.fbAsyncInit
    window.fbAsyncInit = function () {
      if (typeof existingInit === 'function') {
        try {
          existingInit()
        } catch (e) {
          console.warn('Existing fbAsyncInit error:', e)
        }
      }
      clearTimeout(timeoutId)
      if (window.FB) {
        resolve(window.FB)
      }
    }

    let script = document.getElementById('facebook-jssdk')
    if (!script) {
      script = document.createElement('script')
      script.id = 'facebook-jssdk'
      script.src = 'https://connect.facebook.net/en_US/sdk.js#xfbml=1&version=v26.0'
      script.async = true
      script.defer = true
      script.crossOrigin = 'anonymous'

      script.onload = () => {
        // Some browsers may trigger onload before or after fbAsyncInit
        setTimeout(() => {
          if (window.FB) {
            clearTimeout(timeoutId)
            resolve(window.FB)
          }
        }, 50)
      }

      script.onerror = () => {
        clearTimeout(timeoutId)
        fbSdkPromise = null
        reject(new Error('Failed to load Facebook SDK script'))
      }

      document.body.appendChild(script)
    }
  })

  return fbSdkPromise
}

// Preload SDK as soon as this module is evaluated in the browser
if (typeof window !== 'undefined') {
  loadFacebookSDK().catch(() => {})
}

function FacebookEmbed({ url, className = '' }) {
  const containerRef = useRef(null)
  const [embedUrl, setEmbedUrl] = useState(null)
  const [error, setError] = useState(false)

  // 1. Resolve URL with backend (using AbortController for cancellation)
  useEffect(() => {
    if (!url) return

    const abortController = new AbortController()
    setError(false)
    setEmbedUrl(null)

    const t0 = performance.now()

    const resolveUrl = async () => {
      try {
        const response = await fetch(
          `${API_URL}/submissions/facebook-embed?url=${encodeURIComponent(url)}`,
          { signal: abortController.signal }
        )

        if (!response.ok) {
          throw new Error(`Failed to resolve Facebook URL: ${response.status}`)
        }

        const data = await response.json()
        const tResolve = performance.now()

        if (!abortController.signal.aborted) {
          if (import.meta.env.DEV) {
            console.log(`[FacebookEmbed] Resolved in ${(tResolve - t0).toFixed(1)}ms:`, data.url)
          }
          setEmbedUrl(data.url)
        }
      } catch (err) {
        if (err.name === 'AbortError') {
          return // User navigated away or URL changed
        }
        console.error('[FacebookEmbed] URL resolution error:', err)
        if (!abortController.signal.aborted) {
          setError(true)
        }
      }
    }

    resolveUrl()

    return () => {
      abortController.abort()
    }
  }, [url])

  // 2. Render Facebook video once BOTH embedUrl and SDK are ready
  useEffect(() => {
    if (!embedUrl || !containerRef.current) return

    let cancelled = false
    const tStartRender = performance.now()

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

        const detectOrientation = () => {
          if (cancelled || !containerRef.current) return
          const span = containerRef.current.querySelector('span')
          const iframe = containerRef.current.querySelector('iframe')

          let width = 0
          let height = 0

          if (span && span.style) {
            const spanH = parseFloat(span.style.height)
            const spanW = parseFloat(span.style.width)
            if (spanH && spanW) {
              height = spanH
              width = spanW
            }
          }

          if (!height && iframe) {
            const hAttr = parseFloat(iframe.getAttribute('height'))
            const wAttr = parseFloat(iframe.getAttribute('width'))
            if (hAttr && wAttr) {
              height = hAttr
              width = wAttr
            }
          }

          if (!height && iframe) {
            height = iframe.clientHeight
            width = iframe.clientWidth
          }

          if (width && height) {
            if (width > height * 1.15) {
              containerRef.current.classList.add('fb-landscape')
              containerRef.current.classList.remove('fb-portrait')
            } else {
              containerRef.current.classList.add('fb-portrait')
              containerRef.current.classList.remove('fb-landscape')
            }
          }
        }

        FB.XFBML.parse(containerRef.current, () => {
          if (!cancelled && import.meta.env.DEV) {
            console.log(
              `[FacebookEmbed] Video rendered in ${(performance.now() - tStartRender).toFixed(1)}ms`
            )
          }
          detectOrientation()
          setTimeout(detectOrientation, 500)
          setTimeout(detectOrientation, 1500)
        })
      } catch (err) {
        if (!cancelled) {
          console.error('[FacebookEmbed] SDK rendering error:', err)
          setError(true)
        }
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
