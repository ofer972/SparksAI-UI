"use client";

import { useState, useEffect } from"react";
import Link from"next/link";
import { useRouter } from"next/navigation";
import { login, getGoogleLoginUrl, getMicrosoftLoginUrl, clearTokens } from"@/lib/auth";
import UnauthorizedAccess from"@/components/UnauthorizedAccess";

const oauthRaw = (process.env.NEXT_PUBLIC_OAUTH_PROVIDERS ?? "").trim().toLowerCase();
const oauthProviders = oauthRaw ? oauthRaw.split(",").map((p) => p.trim()) : [];
const showGoogle = oauthProviders.length === 0 || oauthProviders.includes("google");
const showMicrosoft = oauthProviders.length === 0 || oauthProviders.includes("microsoft");
const showOAuth = showGoogle || showMicrosoft;

export default function LoginPage() {
 const router = useRouter();
 const [email, setEmail] = useState("");
 const [password, setPassword] = useState("");
 const [loading, setLoading] = useState(false);
 const [error, setError] = useState<string | null>(null);
 const [showUnauthorized, setShowUnauthorized] = useState(false);

 useEffect(() => {
 clearTokens();
 }, []);

 async function onSubmit(e: React.FormEvent) {
 e.preventDefault();
 setError(null);
 setShowUnauthorized(false);
 setLoading(true);
 try {
 await login(email, password);
 router.push("/");
 } catch (err: any) {
 const msg = String(err?.message ||"Login failed");
 // Check if error indicates unauthorized email
 if (msg ==="email_not_allowed" || msg.includes("email_not_allowed")) {
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
 <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-gray-50 to-gray-100 dark:from-slate-900 to-surface">
 <div className="w-full max-w-md p-6 bg-surface rounded-xl shadow-lg border border-outline">
 <h1 className="text-2xl font-semibold mb-4 text-center text-content-primary">Login</h1>
 {error && (
 <div className="mb-4 rounded border border-danger-border bg-danger-bg p-2 text-sm text-red-700 text-red-400">
 {error}
 </div>
 )}
 <form onSubmit={onSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium mb-1 text-content-secondary">Email</label>
 <input
 type="email"
 value={email}
 onChange={(e) => setEmail(e.target.value)}
 required
 className="w-full p-2 border border-outline-strong rounded bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
 />
 </div>
 <div>
 <label className="block text-sm font-medium mb-1 text-content-secondary">Password</label>
 <input
 type="password"
 value={password}
 onChange={(e) => setPassword(e.target.value)}
 required
 className="w-full p-2 border border-outline-strong rounded bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
 />
 </div>
 <button
 type="submit"
 disabled={loading}
 className="w-full p-2 bg-brand text-white rounded hover:bg-brand-hover disabled:opacity-50 transition-colors"
 >
 {loading ?"Signing in..." :"Sign in"}
 </button>
 </form>
 {showOAuth && (
 <>
 <div className="relative my-6">
 <div className="absolute inset-0 flex items-center">
 <div className="w-full border-t border-outline" />
 </div>
 <div className="relative flex justify-center text-sm">
 <span className="px-2 bg-surface text-content-tertiary">or</span>
 </div>
 </div>
 <div className="space-y-3">
 {showGoogle && (
 <a
 href={getGoogleLoginUrl()}
 className="flex items-center justify-center gap-3 w-full p-2 border border-outline-strong rounded bg-surface-elevated text-content-primary hover:bg-surface-secondary transition-colors"
 >
 <svg className="w-5 h-5" viewBox="0 0 24 24">
 <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
 <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
 <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
 <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
 </svg>
 Continue with Google
 </a>
 )}
 {showMicrosoft && (
 <a
 href={getMicrosoftLoginUrl()}
 className="flex items-center justify-center gap-3 w-full p-2 border border-outline-strong rounded bg-surface-elevated text-content-primary hover:bg-surface-secondary transition-colors"
 >
 <svg className="w-5 h-5" viewBox="0 0 21 21">
 <rect x="1" y="1" width="9" height="9" fill="#F25022" />
 <rect x="11" y="1" width="9" height="9" fill="#7FBA00" />
 <rect x="1" y="11" width="9" height="9" fill="#00A4EF" />
 <rect x="11" y="11" width="9" height="9" fill="#FFB900" />
 </svg>
 Continue with Microsoft
 </a>
 )}
 </div>
 </>
 )}
 <div className="mt-4 text-center text-sm text-content-tertiary">
 Don&apos;t have an account? {""}
 <Link href="/register" className="text-brand hover:underline">
 Register
 </Link>
 </div>
 </div>
 </div>
 );
}
