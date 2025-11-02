"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { saveTokens } from "@/lib/auth";
import UnauthorizedAccess from "@/components/UnauthorizedAccess";

export default function OAuthCallbackPage() {
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
      const timer = setTimeout(() => router.push("/"), 500);
      return () => clearTimeout(timer);
    }
    // If tokens not present, just redirect home; backend may have already issued session or provided another flow
    const timer = setTimeout(() => router.push("/"), 1000);
    return () => clearTimeout(timer);
  }, [params, router]);

  if (showUnauthorized) {
    return <UnauthorizedAccess email={userEmail || undefined} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-white rounded shadow text-center">
        <p>{message}</p>
      </div>
    </div>
  );
}
