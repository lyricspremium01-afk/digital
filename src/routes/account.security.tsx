import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/account/security")({
  component: SecurityPage,
});

function SecurityPage() {
  const { user } = useAuth();
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);
  const [resetBusy, setResetBusy] = useState(false);

  const setPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Min 6 characters"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Password set! You can now sign in with email + password."); setPwd(""); }
  };

  const sendReset = async () => {
    if (!user?.email) return;
    setResetBusy(true);
    const { error } = await supabase.auth.resetPasswordForEmail(user.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setResetBusy(false);
    if (error) toast.error(error.message);
    else toast.success("Check your email for the reset link");
  };

  return (
    <div className="mx-auto max-w-2xl px-4 pt-6 pb-24 space-y-5">
      <h1 className="font-display text-2xl font-extrabold">Account security</h1>

      <form onSubmit={setPassword} className="rounded-2xl bg-card p-5 shadow-card space-y-3">
        <h2 className="font-bold">Set / change password</h2>
        <p className="text-xs text-muted-foreground">If you signed up with Google, set a password here so you can also log in with email.</p>
        <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} placeholder="New password (min 6 chars)" required minLength={6}
          className="w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:bg-card focus:border-primary focus:outline-none" />
        <button disabled={busy} type="submit"
          className="rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-60">
          {busy ? "…" : "Save password"}
        </button>
      </form>

      <div className="rounded-2xl bg-card p-5 shadow-card space-y-3">
        <h2 className="font-bold">Forgot your password?</h2>
        <p className="text-xs text-muted-foreground">We'll email you a secure reset link.</p>
        <button onClick={sendReset} disabled={resetBusy}
          className="rounded-full border border-border bg-muted px-6 py-3 text-sm font-bold disabled:opacity-60">
          {resetBusy ? "Sending…" : "Email me a reset link"}
        </button>
      </div>
    </div>
  );
}
