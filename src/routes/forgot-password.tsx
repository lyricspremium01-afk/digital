import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/forgot-password")({
  component: ForgotPassword,
});

function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the reset link");
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl bg-card p-6 shadow-card">
        <h1 className="font-display text-2xl font-extrabold">Forgot password</h1>
        <p className="mt-2 text-sm text-muted-foreground">Enter your email and we'll send you a reset link.</p>
        <form onSubmit={submit} className="mt-5 space-y-3">
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" required
            className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:bg-card focus:border-primary focus:outline-none" />
          <button disabled={busy} type="submit"
            className="w-full rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-60">
            {busy ? "…" : "Send reset link"}
          </button>
        </form>
        <p className="mt-4 text-center text-sm">
          <Link to="/auth" className="text-primary font-semibold">← Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
