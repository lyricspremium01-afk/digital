import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Copy, MousePointerClick, UserPlus, ShoppingBag, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/account/affiliate")({
  component: Affiliate,
});

type Invitee = { id: string; full_name: string | null; email: string | null; created_at: string; total_sales: number };
type Earning = { amount: number; created_at: string; is_first_sale: boolean; invitee_id: string };

function Affiliate() {
  const { user, profile } = useAuth();
  const [clicks, setClicks] = useState<{ created_at: string }[]>([]);
  const [invitees, setInvitees] = useState<Invitee[]>([]);
  const [earnings, setEarnings] = useState<Earning[]>([]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [c, i, e] = await Promise.all([
        supabase.from("referral_clicks").select("created_at").eq("inviter_id", user.id).order("created_at", { ascending: false }).limit(500),
        supabase.from("profiles").select("id,full_name,email,created_at,total_sales").eq("referred_by", user.id),
        supabase.from("referral_earnings").select("amount,created_at,is_first_sale,invitee_id").eq("inviter_id", user.id),
      ]);
      setClicks((c.data as { created_at: string }[]) ?? []);
      setInvitees((i.data as Invitee[]) ?? []);
      setEarnings((e.data as Earning[]) ?? []);
    })();
  }, [user]);

  const link = typeof window !== "undefined" && profile ? `${window.location.origin}/?ref=${profile.referral_code}` : "";
  const totalEarned = earnings.reduce((s, x) => s + Number(x.amount), 0);

  // Build last 14 days chart
  const days: { d: string; clicks: number; signups: number; sales: number }[] = [];
  for (let i = 13; i >= 0; i--) {
    const dt = new Date(); dt.setDate(dt.getDate() - i);
    const key = dt.toISOString().slice(0, 10);
    days.push({
      d: key,
      clicks: clicks.filter(c => c.created_at.slice(0, 10) === key).length,
      signups: invitees.filter(v => v.created_at.slice(0, 10) === key).length,
      sales: earnings.filter(v => v.created_at.slice(0, 10) === key).length,
    });
  }
  const max = Math.max(1, ...days.map(d => Math.max(d.clicks, d.signups, d.sales)));

  return (
    <div className="mx-auto max-w-3xl px-4 pt-6 pb-24">
      <h1 className="font-display text-2xl font-extrabold">Affiliate Tracker</h1>
      <p className="mt-2 text-muted-foreground text-sm">Earn 5% on first sale + 1% recurring on every future sale.</p>

      {profile && (
        <div className="mt-5 rounded-2xl bg-card p-4 shadow-card">
          <div className="text-xs font-bold uppercase tracking-wide text-muted-foreground">Your invite link</div>
          <div className="mt-2 flex items-center gap-2">
            <input readOnly value={link} className="flex-1 rounded-xl bg-muted px-3 py-2 text-sm" />
            <button onClick={() => { navigator.clipboard.writeText(link); toast.success("Copied!"); }}
              className="inline-flex items-center gap-1 rounded-xl bg-gradient-primary px-3 py-2 text-sm font-bold text-primary-foreground">
              <Copy className="h-4 w-4" />Copy
            </button>
          </div>
          <div className="mt-3 text-xs text-muted-foreground">Code: <span className="font-mono font-bold text-primary">{profile.referral_code}</span></div>
        </div>
      )}

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<MousePointerClick className="h-4 w-4" />} color="text-primary" label="Clicks" value={String(clicks.length)} />
        <Stat icon={<UserPlus className="h-4 w-4" />} color="text-warning" label="Sign-ups" value={String(invitees.length)} />
        <Stat icon={<ShoppingBag className="h-4 w-4" />} color="text-success" label="Sales" value={String(earnings.length)} />
        <Stat icon={<Coins className="h-4 w-4" />} color="text-success" label="Earned" value={formatPrice(totalEarned, "XAF")} small />
      </div>

      <div className="mt-5 rounded-2xl bg-card p-4 shadow-card">
        <h2 className="font-bold mb-3">Last 14 days</h2>
        <div className="flex items-end gap-1 h-32">
          {days.map((d) => (
            <div key={d.d} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full flex items-end gap-0.5 h-full">
                <div className="flex-1 rounded-t bg-primary/60" style={{ height: `${(d.clicks / max) * 100}%` }} title={`${d.clicks} clicks`} />
                <div className="flex-1 rounded-t bg-warning/70" style={{ height: `${(d.signups / max) * 100}%` }} title={`${d.signups} signups`} />
                <div className="flex-1 rounded-t bg-success/70" style={{ height: `${(d.sales / max) * 100}%` }} title={`${d.sales} sales`} />
              </div>
              <div className="text-[9px] text-muted-foreground">{d.d.slice(5)}</div>
            </div>
          ))}
        </div>
        <div className="mt-3 flex gap-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-primary/60 rounded-sm" /> Clicks</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-warning/70 rounded-sm" /> Signups</span>
          <span className="inline-flex items-center gap-1"><span className="h-2 w-2 bg-success/70 rounded-sm" /> Sales</span>
        </div>
      </div>

      <div className="mt-5 rounded-2xl bg-card p-4 shadow-card">
        <h2 className="font-bold mb-3">Your invitees</h2>
        {invitees.length === 0 ? (
          <p className="text-sm text-muted-foreground">No one signed up with your link yet.</p>
        ) : (
          <div className="divide-y divide-border">
            {invitees.map((inv) => {
              const earned = earnings.filter(e => e.invitee_id === inv.id).reduce((s, e) => s + Number(e.amount), 0);
              const sales = earnings.filter(e => e.invitee_id === inv.id).length;
              return (
                <div key={inv.id} className="flex items-center gap-3 py-3">
                  <div className="h-9 w-9 rounded-full bg-gradient-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {(inv.full_name ?? inv.email ?? "U").charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate">{inv.full_name ?? inv.email}</div>
                    <div className="text-xs text-muted-foreground">{sales} sales · joined {new Date(inv.created_at).toLocaleDateString()}</div>
                  </div>
                  <div className="text-sm font-bold text-success">{formatPrice(earned, "XAF")}</div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, color, small }: { icon: React.ReactNode; label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-3 shadow-card">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${color}`}>{icon}{label}</div>
      <div className={`mt-1 font-display font-extrabold ${small ? "text-base" : "text-2xl"}`}>{value}</div>
    </div>
  );
}
