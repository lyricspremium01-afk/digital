import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  component: ResetPassword,
});

function ResetPassword() {
  const nav = useNavigate();
  const [ready, setReady] = useState(false);
  const [pwd, setPwd] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    // Supabase puts the recovery token in the URL hash; getSession will pick it up.
    supabase.auth.getSession().then(({ data }) => {
      setReady(!!data.session);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pwd.length < 6) { toast.error("Min 6 characters"); return; }
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Password updated"); nav({ to: "/account" }); }
  };

  return (
    <div className="mx-auto max-w-md px-4 py-10">
      <div className="rounded-3xl bg-card p-6 shadow-card">
        <h1 className="font-display text-2xl font-extrabold">Reset password</h1>
        {!ready ? (
          <p className="mt-3 text-sm text-muted-foreground">Open the link from your email to continue.</p>
        ) : (
          <form onSubmit={submit} className="mt-5 space-y-3">
            <label className="block">
              <span className="text-sm font-bold">New password</span>
              <input type="password" value={pwd} onChange={(e) => setPwd(e.target.value)} required minLength={6}
                className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:bg-card focus:border-primary focus:outline-none" />
            </label>
            <button disabled={busy} type="submit"
              className="w-full rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-60">
              {busy ? "…" : "Update password"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
