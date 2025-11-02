"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { login, getGoogleLoginUrl } from "@/lib/auth";
import UnauthorizedAccess from "@/components/UnauthorizedAccess";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showUnauthorized, setShowUnauthorized] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setShowUnauthorized(false);
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: any) {
      const msg = String(err?.message || "Login failed");
      // Check if error indicates unauthorized email
      if (msg === "email_not_allowed" || msg.includes("email_not_allowed")) {
        setShowUnauthorized(true);
      } else {
        setError(msg);
      }
    } finally {
      setLoading(false);
    }
  }

  if (showUnauthorized) {
    return <UnauthorizedAccess email={email} />;
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md p-6 bg-white rounded shadow">
        <h1 className="text-2xl font-semibold mb-4 text-center">Login</h1>
        {error && (
          <div className="mb-4 rounded border border-red-200 bg-red-50 p-2 text-sm text-red-700">
            {error}
          </div>
        )}
        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="w-full p-2 border rounded"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full p-2 bg-blue-600 text-white rounded disabled:opacity-50"
          >
            {loading ? "Signing in..." : "Sign in"}
          </button>
        </form>
        <div className="mt-4 text-center">
          <a
            href={getGoogleLoginUrl()}
            className="inline-block w-full text-center p-2 border rounded hover:bg-gray-50"
          >
            Continue with Google
          </a>
        </div>
        <div className="mt-4 text-center text-sm">
          Don&apos;t have an account? {" "}
          <Link href="/register" className="text-blue-600 hover:underline">
            Register
          </Link>
        </div>
      </div>
    </div>
  );
}
