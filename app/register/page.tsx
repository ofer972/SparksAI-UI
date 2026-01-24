"use client";

import { useState } from"react";
import Link from"next/link";
import { useRouter } from"next/navigation";
import { register as registerUser } from"@/lib/auth";
import UnauthorizedAccess from"@/components/UnauthorizedAccess";

export default function RegisterPage() {
 const router = useRouter();
 const [name, setName] = useState("");
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
 await registerUser(name, email, password);
 router.push("/");
 } catch (err: any) {
 const msg = String(err?.message ||"Registration failed");
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
 <h1 className="text-2xl font-semibold mb-4 text-center text-content-primary">Register</h1>
 {error && (
 <div className="mb-4 rounded border border-danger-border bg-danger-bg p-2 text-sm text-red-700 text-red-400">
 {error}
 </div>
 )}
 <form onSubmit={onSubmit} className="space-y-4">
 <div>
 <label className="block text-sm font-medium mb-1 text-content-secondary">Name</label>
 <input
 type="text"
 value={name}
 onChange={(e) => setName(e.target.value)}
 required
 className="w-full p-2 border border-outline-strong rounded bg-surface-elevated text-content-primary focus:outline-none focus:ring-2 focus:ring-brand"
 />
 </div>
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
 {loading ?"Creating..." :"Create account"}
 </button>
 </form>
 <div className="mt-4 text-center text-sm text-content-tertiary">
 Already have an account? {""}
 <Link href="/login" className="text-brand hover:underline">
 Login
 </Link>
 </div>
 </div>
 </div>
 );
}
