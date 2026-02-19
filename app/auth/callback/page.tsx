"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTokens, consumeAuthRedirect } from "@/lib/auth";
import UnauthorizedAccess from "@/components/UnauthorizedAccess";

function OAuthCallbackContent() {
  const router = useRouter();
  const params = useSearchParams();
  const [message, setMessage] = useState("Completing sign-in...");
  const [showUnauthorized, setShowUnauthorized] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    // Check for error parameter indicating unauthorized access
    const error = params.get("error");
    const email = params.get("email");
    
    if (error === "email_not_allowed" || error === "unauthorized") {
      setUserEmail(email || null);
      setShowUnauthorized(true);
      return;
    }

    const access = params.get("access_token") || params.get("access-token");
    const refresh = params.get("refresh_token") || params.get("refresh-token");
    if (access && refresh) {
      saveTokens({ accessToken: access, refreshToken: refresh });
      setMessage("Signed in. Redirecting...");
      const redirect = params.get("redirect") ?? consumeAuthRedirect() ?? "/";
      const target = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
      const timer = setTimeout(() => {
        // router.push() strips hashes; use full URL for deep links to ensure hash is preserved
        if (target.includes("#")) {
          window.location.href = window.location.origin + target;
        } else {
          router.push(target);
        }
      }, 500);
      return () => clearTimeout(timer);
    }
    // If tokens not present, just redirect home; backend may have already issued session or provided another flow
    const redirect = params.get("redirect") ?? consumeAuthRedirect() ?? "/";
    const target = redirect.startsWith("/") && !redirect.startsWith("//") ? redirect : "/";
    const timer = setTimeout(() => {
      if (target.includes("#")) {
        window.location.href = window.location.origin + target;
      } else {
        router.push(target);
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [params, router]);

  if (showUnauthorized) {
    return <UnauthorizedAccess email={userEmail || undefined} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-surface rounded shadow text-center">
        <p>{message}</p>
      </div>
    </div>
  );
}

export default function OAuthCallbackPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="w-full max-w-md p-6 bg-surface rounded shadow text-center">
          <p>Completing sign-in...</p>
        </div>
      </div>
    }>
      <OAuthCallbackContent />
    </Suspense>
  );
}
