"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Home() {
  const [mode, setMode] = useState("login");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
    const body = mode === "login"
      ? { username, password }
      : { username, password, displayName: displayName || username };

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Something went wrong");
        setLoading(false);
        return;
      }
      router.push("/library");
    } catch {
      setError("Connection error");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <div className="w-full max-w-md">
        {/* Brand */}
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl font-bold text-accent mb-2">Marginalia</h1>
          <p className="text-text-dim text-sm italic tracking-wider uppercase">A Literary Companion</p>
        </div>

        {/* Card */}
        <div className="bg-surface border border-border rounded-xl p-8">
          {/* Tabs */}
          <div className="flex mb-8 border-b border-border">
            <button
              onClick={() => { setMode("login"); setError(""); }}
              className={`flex-1 pb-3 text-sm uppercase tracking-wider font-body border-b-2 transition-colors ${
                mode === "login" ? "border-accent text-accent" : "border-transparent text-text-dim hover:text-text-muted"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => { setMode("register"); setError(""); }}
              className={`flex-1 pb-3 text-sm uppercase tracking-wider font-body border-b-2 transition-colors ${
                mode === "register" ? "border-accent text-accent" : "border-transparent text-text-dim hover:text-text-muted"
              }`}
            >
              Create Account
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs text-text-dim uppercase tracking-wider mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text font-body text-sm outline-none focus:border-accent-dim transition-colors"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-dim uppercase tracking-wider mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text font-body text-sm outline-none focus:border-accent-dim transition-colors"
                required
              />
            </div>
            {mode === "register" && (
              <div>
                <label className="block text-xs text-text-dim uppercase tracking-wider mb-1.5">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="How others see you"
                  className="w-full px-4 py-3 bg-bg border border-border rounded-lg text-text font-body text-sm outline-none focus:border-accent-dim transition-colors placeholder:text-text-dim"
                />
              </div>
            )}

            {error && (
              <p className="text-danger text-sm text-center">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-accent-dim hover:bg-accent text-text font-body font-medium text-sm rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? "..." : mode === "login" ? "Enter the Library" : "Join the Readers"}
            </button>
          </form>
        </div>

        <p className="text-center text-text-dim text-xs mt-6">
          Guided reading through AI-powered reflection
        </p>
      </div>
    </div>
  );
}
