import asyncio
from collections import OrderedDict
import logging
import re
import time
from urllib.parse import urlparse, parse_qs, urlunparse, urlencode
import httpx
from playwright.async_api import (
    async_playwright,
    Browser,
    Playwright,
    TimeoutError as PlaywrightTimeoutError,
)

logger = logging.getLogger("facebook_resolver")
if not logger.handlers:
    handler = logging.StreamHandler()
    handler.setFormatter(logging.Formatter("[%(asctime)s] [%(levelname)s] [FacebookResolver] %(message)s"))
    logger.addHandler(handler)
logger.setLevel(logging.INFO)

FACEBOOK_HOSTS = {
    "facebook.com",
    "www.facebook.com",
    "m.facebook.com",
    "web.facebook.com",
    "fb.watch",
}

# Tracking and referral parameters to strip during normalization
TRACKING_QUERY_PARAMS = {
    "fbclid", "mibextid", "ref", "rdid", "hrc", "_rdr",
    "__tn__", "epa", "sfnsn", "extid", "fs", "referral_source",
    "share_url", "hc_ref", "fref"
}

# Semaphore to restrict concurrent Chromium pages and prevent CPU/RAM exhaustion
MAX_CONCURRENT_PLAYWRIGHT_PAGES = 3
_playwright_semaphore = asyncio.Semaphore(MAX_CONCURRENT_PLAYWRIGHT_PAGES)

# Browser lifecycle state
_playwright_instance: Playwright | None = None
_browser_instance: Browser | None = None
_browser_lock = asyncio.Lock()


def validate_facebook_url(url: str) -> bool:
    """Validate that the input string is a valid Facebook URL."""
    try:
        if not url or not isinstance(url, str):
            return False
        clean = url.strip()
        if not clean:
            return False
        parsed = urlparse(clean)
        if parsed.scheme not in {"http", "https"}:
            return False
        hostname = (parsed.hostname or "").lower()
        if not hostname:
            return False
        return hostname in FACEBOOK_HOSTS or hostname.endswith(".facebook.com")
    except Exception:
        return False


def normalize_facebook_url(url: str) -> str:
    """Normalize a Facebook URL by trimming whitespace, standardizing host, and stripping tracking params."""
    clean = url.strip()
    if not clean.startswith(("http://", "https://")):
        clean = "https://" + clean

    parsed = urlparse(clean)
    hostname = (parsed.hostname or "").lower()

    if hostname in {"facebook.com", "m.facebook.com", "web.facebook.com"}:
        hostname = "www.facebook.com"

    # Filter out tracking query parameters while keeping essential parameters like 'v'
    qs = parse_qs(parsed.query, keep_blank_values=False)
    filtered_qs = {k: v for k, v in qs.items() if k.lower() not in TRACKING_QUERY_PARAMS}

    new_query = urlencode(filtered_qs, doseq=True)
    path = parsed.path
    if len(path) > 1 and path.endswith("/"):
        path = path.rstrip("/")

    return urlunparse(("https", hostname, path, "", new_query, ""))


def is_canonical_facebook_video_url(url: str) -> bool:
    """
    Check if a Facebook URL is already in a canonical embeddable format
    that does not require share redirect resolution.
    """
    if not url:
        return False

    parsed = urlparse(url)
    hostname = (parsed.hostname or "").lower()
    if hostname not in {"facebook.com", "www.facebook.com", "web.facebook.com", "m.facebook.com"}:
        return False

    path = parsed.path
    if "/share/" in path:
        return False

    # /watch?v=12345
    if path in {"/watch", "/watch/"}:
        qs = parse_qs(parsed.query)
        if "v" in qs and any(val.isdigit() for val in qs["v"]):
            return True

    # /<profile_or_page>/videos/<id>
    if re.search(r"^/[^/]+/videos/\d+", path):
        return True

    # /reel/<id>
    if re.search(r"^/reel/\d+", path):
        return True

    # /video.php?v=12345
    if path == "/video.php":
        qs = parse_qs(parsed.query)
        if "v" in qs and any(val.isdigit() for val in qs["v"]):
            return True

    return False


def sanitize_url_for_logging(url: str) -> str:
    """Strip query parameters from URL for secure, non-sensitive structured logging."""
    try:
        parsed = urlparse(url)
        return f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
    except Exception:
        return "[sanitized_url]"


class FacebookResolutionCache:
    """
    In-memory bounded LRU cache with TTL and Singleflight deduplication
    to prevent concurrent duplicate resolution work.
    """
    def __init__(self, ttl_seconds: int = 86400, max_size: int = 5000):
        self.ttl_seconds = ttl_seconds
        self.max_size = max_size
        self._cache: OrderedDict[str, tuple[str, float]] = OrderedDict()
        self._in_flight: dict[str, asyncio.Future] = {}
        self._lock = asyncio.Lock()

    def _get_unlocked(self, key: str) -> str | None:
        if key not in self._cache:
            return None
        val, expires_at = self._cache[key]
        if time.time() > expires_at:
            del self._cache[key]
            return None
        self._cache.move_to_end(key)
        return val

    def _set_unlocked(self, key: str, value: str):
        if len(self._cache) >= self.max_size:
            self._cache.popitem(last=False)
        self._cache[key] = (value, time.time() + self.ttl_seconds)

    async def get(self, key: str) -> str | None:
        async with self._lock:
            return self._get_unlocked(key)

    async def set(self, key: str, value: str):
        async with self._lock:
            self._set_unlocked(key, value)

    async def resolve_with_dedup(self, normalized_url: str, resolver_fn):
        """
        Singleflight execution: If resolution for this key is already running,
        wait for the existing task instead of duplicating resolution work.
        """
        async with self._lock:
            cached = self._get_unlocked(normalized_url)
            if cached:
                return cached, "cache"

            if normalized_url in self._in_flight:
                future = self._in_flight[normalized_url]
                is_leader = False
            else:
                is_leader = True
                loop = asyncio.get_running_loop()
                future = loop.create_future()
                self._in_flight[normalized_url] = future

        if not is_leader:
            # Await in-flight resolution performed by leader
            result, stage = await asyncio.shield(future)
            return result, f"dedup_wait({stage})"

        # Leader executes resolution
        try:
            result, stage = await resolver_fn()
            async with self._lock:
                if result:
                    self._set_unlocked(normalized_url, result)
            if not future.done():
                future.set_result((result, stage))
            return result, stage
        except Exception as e:
            if not future.done():
                future.set_exception(e)
            raise
        finally:
            async with self._lock:
                self._in_flight.pop(normalized_url, None)


# Singleton cache instance (24h TTL, 5,000 entries)
resolution_cache = FacebookResolutionCache(ttl_seconds=86400, max_size=5000)


async def resolve_via_http(url: str) -> tuple[str | None, float]:
    """
    Attempt fast, lightweight HTTP resolution using Facebook crawler User-Agent.
    Facebook external hit UA causes Facebook's server to redirect directly
    to the canonical video URL or return OpenGraph meta tags, bypassing Chromium.
    """
    t0 = time.perf_counter()
    headers = {
        "User-Agent": "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
    }

    try:
        async with httpx.AsyncClient(
            headers=headers,
            follow_redirects=True,
            timeout=httpx.Timeout(5.0, connect=3.0)
        ) as client:
            resp = await client.get(url)
            normalized_candidate = normalize_facebook_url(str(resp.url))

            # 1. Did HTTP redirect directly to canonical video URL?
            if is_canonical_facebook_video_url(normalized_candidate):
                return normalized_candidate, (time.perf_counter() - t0) * 1000

            # 2. Check HTML OpenGraph and Canonical tags
            if resp.status_code == 200 and resp.text:
                # og:url
                og_matches = re.findall(
                    r'<meta\s+(?:property|content)=["\'](?:og:url|([^"\']+))["\']\s+(?:content|property)=["\'](?:og:url|([^"\']+))["\']',
                    resp.text,
                    re.IGNORECASE,
                )
                for m in og_matches:
                    raw_candidate = (m[0] or m[1]).replace("&amp;", "&")
                    cand_norm = normalize_facebook_url(raw_candidate)
                    if is_canonical_facebook_video_url(cand_norm):
                        return cand_norm, (time.perf_counter() - t0) * 1000

                # link rel="canonical"
                canon_matches = re.findall(
                    r'<link\s+(?:rel|href)=["\'](?:canonical|([^"\']+))["\']\s+(?:href|rel)=["\'](?:canonical|([^"\']+))["\']',
                    resp.text,
                    re.IGNORECASE,
                )
                for m in canon_matches:
                    raw_candidate = (m[0] or m[1]).replace("&amp;", "&")
                    cand_norm = normalize_facebook_url(raw_candidate)
                    if is_canonical_facebook_video_url(cand_norm):
                        return cand_norm, (time.perf_counter() - t0) * 1000

    except Exception as e:
        logger.debug("Lightweight HTTP resolution failed for %s: %s", sanitize_url_for_logging(url), e)

    return None, (time.perf_counter() - t0) * 1000


async def get_facebook_browser() -> Browser:
    """
    Acquire or heal the global Playwright Chromium browser.
    Ensures safe concurrent access, health check, and crash recovery.
    """
    global _playwright_instance, _browser_instance

    if _browser_instance and _browser_instance.is_connected():
        return _browser_instance

    async with _browser_lock:
        if _browser_instance and _browser_instance.is_connected():
            return _browser_instance

        # Clean up stale instance if disconnected/crashed
        if _browser_instance:
            try:
                await _browser_instance.close()
            except Exception:
                pass
            _browser_instance = None

        if not _playwright_instance:
            _playwright_instance = await async_playwright().start()

        _browser_instance = await _playwright_instance.chromium.launch(
            headless=True,
            args=[
                "--no-sandbox",
                "--disable-setuid-sandbox",
                "--disable-dev-shm-usage",
                "--disable-gpu",
                "--disable-extensions",
                "--disable-component-update",
                "--no-first-run",
                "--mute-audio",
            ]
        )
        logger.info("Playwright Chromium browser launched successfully.")
        return _browser_instance


async def close_facebook_browser():
    """Graceful shutdown of Playwright and Chromium on server shutdown."""
    global _playwright_instance, _browser_instance
    async with _browser_lock:
        if _browser_instance:
            try:
                await _browser_instance.close()
            except Exception as e:
                logger.warning("Error closing Chromium: %s", e)
            _browser_instance = None

        if _playwright_instance:
            try:
                await _playwright_instance.stop()
            except Exception as e:
                logger.warning("Error stopping Playwright: %s", e)
            _playwright_instance = None
        logger.info("Playwright Chromium browser closed.")


async def resolve_via_playwright(url: str) -> tuple[str | None, dict]:
    """
    Fallback browser resolution for URLs requiring client-side JavaScript redirects.
    Uses concurrency limiting, resource route aborting, and event-based URL wait.
    """
    timings = {}
    t_start = time.perf_counter()

    async with _playwright_semaphore:
        context = None
        page = None
        try:
            t_acq = time.perf_counter()
            browser = await get_facebook_browser()
            timings["browser_acq_ms"] = round((time.perf_counter() - t_acq) * 1000, 2)

            t_ctx = time.perf_counter()
            context = await browser.new_context(
                user_agent=(
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                    "AppleWebKit/537.36 (KHTML, like Gecko) "
                    "Chrome/140.0.0.0 Safari/537.36"
                ),
                java_script_enabled=True,
            )

            # Block heavy non-essential resources to speed up page load & reduce RAM
            async def block_resources(route):
                if route.request.resource_type in ["image", "media", "font"]:
                    await route.abort()
                else:
                    await route.continue_()

            await context.route("**/*", block_resources)

            page = await context.new_page()
            timings["context_page_ms"] = round((time.perf_counter() - t_ctx) * 1000, 2)

            # Navigate to the URL
            t_nav = time.perf_counter()
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=12000)
            except PlaywrightTimeoutError:
                logger.info("Playwright navigation timeout on domcontentloaded for %s; checking current URL.", sanitize_url_for_logging(url))
            timings["navigation_ms"] = round((time.perf_counter() - t_nav) * 1000, 2)

            # Wait for client-side JavaScript redirect if still on a share URL
            t_red = time.perf_counter()
            if "/share/" in urlparse(page.url).path:
                try:
                    await page.wait_for_url(lambda u: "/share/" not in urlparse(u).path, timeout=4000)
                except PlaywrightTimeoutError:
                    pass
            timings["redirect_ms"] = round((time.perf_counter() - t_red) * 1000, 2)

            final_url = page.url
            timings["playwright_total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)

            if "/share/" in urlparse(final_url).path:
                return None, timings

            return normalize_facebook_url(final_url), timings

        except Exception as e:
            timings["playwright_error"] = str(e)
            timings["playwright_total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)
            logger.error("Playwright resolution failed for %s: %s", sanitize_url_for_logging(url), e)
            return None, timings
        finally:
            if page:
                try:
                    await page.close()
                except Exception:
                    pass
            if context:
                try:
                    await context.close()
                except Exception:
                    pass


async def resolve_facebook_embed_url(raw_url: str) -> tuple[str, dict]:
    """
    Main resolution pipeline:
    1. Validate URL.
    2. Normalize URL.
    3. Check in-memory TTL cache (returns in <1ms).
    4. Check if already canonical (returns immediately).
    5. Deduplicate concurrent requests (Singleflight).
    6. Stage 1: Async HTTP resolution (takes ~300-800ms, avoids browser).
    7. Stage 2: Managed Playwright fallback (only if HTTP cannot resolve).
    """
    t_start = time.perf_counter()
    metrics = {
        "sanitized_url": sanitize_url_for_logging(raw_url),
        "stage": "unknown",
        "cache_hit": False,
    }

    if not validate_facebook_url(raw_url):
        raise ValueError("Invalid Facebook URL.")

    normalized_input = normalize_facebook_url(raw_url)

    # Fast path: Check cache
    cached = await resolution_cache.get(normalized_input)
    if cached:
        metrics["stage"] = "cache"
        metrics["cache_hit"] = True
        metrics["total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)
        logger.info("Resolved %s from cache in %s ms -> %s", metrics["sanitized_url"], metrics["total_ms"], sanitize_url_for_logging(cached))
        return cached, metrics

    # Fast path: URL is already canonical and not a share link
    if is_canonical_facebook_video_url(normalized_input):
        await resolution_cache.set(normalized_input, normalized_input)
        metrics["stage"] = "fast_canonical"
        metrics["total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)
        logger.info("Resolved %s as already canonical in %s ms", metrics["sanitized_url"], metrics["total_ms"])
        return normalized_input, metrics

    # Resolver task passed to singleflight deduplicator
    async def run_resolution() -> tuple[str | None, str]:
        # Stage 1: Lightweight HTTP resolution
        http_url, http_ms = await resolve_via_http(normalized_input)
        metrics["http_ms"] = round(http_ms, 2)
        if http_url and "/share/" not in urlparse(http_url).path:
            return http_url, "http"

        # Stage 2: Chromium Fallback
        pw_url, pw_timings = await resolve_via_playwright(normalized_input)
        metrics.update(pw_timings)
        if pw_url and "/share/" not in urlparse(pw_url).path:
            return pw_url, "playwright"

        return None, "unresolved"

    resolved_url, stage = await resolution_cache.resolve_with_dedup(normalized_input, run_resolution)
    metrics["stage"] = stage
    metrics["total_ms"] = round((time.perf_counter() - t_start) * 1000, 2)

    if not resolved_url or "/share/" in urlparse(resolved_url).path:
        logger.warning("Failed to resolve %s after %s ms (stage=%s)", metrics["sanitized_url"], metrics["total_ms"], stage)
        raise RuntimeError("Facebook did not resolve the share link.")

    logger.info("Resolved %s via %s in %s ms -> %s", metrics["sanitized_url"], stage, metrics["total_ms"], sanitize_url_for_logging(resolved_url))
    return resolved_url, metrics
