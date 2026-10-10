import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

function OAuthCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    const hash = window.location.hash.substring(1);
    const params = new URLSearchParams(hash);

    const accessToken = params.get("access_token");
    const setupRequired = params.get("setup_required");

    if (!accessToken) {
        const storedToken = localStorage.getItem("access_token");

        if (storedToken) {
            const storedSetupRequired =
            sessionStorage.getItem("oauth_setup_required");

            if (storedSetupRequired === "true") {
            navigate("/profile?oauth_setup=true", {
                replace: true
            });
            } else {
            navigate("/dashboard", {
                replace: true
            });
            }

            return;
        }

        navigate("/login?oauth_error=missing_token", {
            replace: true
        });

        return;
        }

    localStorage.setItem("access_token", accessToken);

    sessionStorage.setItem(
        "oauth_setup_required",
        setupRequired === "true" ? "true" : "false"
    );

    // Remove the token from the browser URL/history.
    window.history.replaceState(
      null,
      "",
      window.location.pathname
    );

    if (setupRequired === "true") {
      navigate("/profile?oauth_setup=true", {
        replace: true
      });
    } else {
      navigate("/dashboard", {
        replace: true
      });
    }
  }, [navigate]);

  return (
    <div>
      Signing you in...
    </div>
  );
}

export default OAuthCallback;