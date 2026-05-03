import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Trophy, MousePointerClick, UserPlus, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { formatPrice } from "@/lib/format";

export const Route = createFileRoute("/admin/affiliate")({
  component: AdminAffiliate,
});

type Row = { inviter_id: string; total: number; count: number; clicks: number; signups: number; profile: { full_name: string | null; email: string | null; referral_code: string | null } | null };

function AdminAffiliate() {
  const [rows, setRows] = useState<Row[]>([]);
  const [totals, setTotals] = useState({ paid: 0, clicks: 0, signups: 0 });

  useEffect(() => {
    (async () => {
      const [{ data: earnings }, { data: clicks }, { data: signups }] = await Promise.all([
        supabase.from("referral_earnings")
          .select("inviter_id,amount,profile:profiles!referral_earnings_inviter_id_fkey(full_name,email,referral_code)")
          .limit(1000),
        supabase.from("referral_clicks").select("inviter_id").limit(5000),
        supabase.from("profiles").select("id,referred_by").not("referred_by", "is", null).limit(5000),
      ]);

      const map = new Map<string, Row>();
      let totalPaid = 0;
      type EarnRow = { inviter_id: string; amount: number; profile: Row["profile"] };
      (earnings ?? []).forEach((r) => {
        const er = r as EarnRow;
        totalPaid += Number(er.amount);
        const ex = map.get(er.inviter_id);
        if (ex) { ex.total += Number(er.amount); ex.count += 1; }
        else map.set(er.inviter_id, { inviter_id: er.inviter_id, total: Number(er.amount), count: 1, clicks: 0, signups: 0, profile: er.profile });
      });
      (clicks ?? []).forEach((c: { inviter_id: string }) => {
        if (!map.has(c.inviter_id)) map.set(c.inviter_id, { inviter_id: c.inviter_id, total: 0, count: 0, clicks: 0, signups: 0, profile: null });
        map.get(c.inviter_id)!.clicks += 1;
      });
      (signups ?? []).forEach((s) => {
        const rid = (s as { referred_by: string | null }).referred_by;
        if (!rid) return;
        if (!map.has(rid)) map.set(rid, { inviter_id: rid, total: 0, count: 0, clicks: 0, signups: 0, profile: null });
        map.get(rid)!.signups += 1;
      });

      // Hydrate any missing profiles
      const missing = [...map.values()].filter(r => !r.profile).map(r => r.inviter_id);
      if (missing.length) {
        const { data: profs } = await supabase.from("profiles").select("id,full_name,email,referral_code").in("id", missing);
        (profs ?? []).forEach((p: { id: string; full_name: string | null; email: string | null; referral_code: string }) => {
          const r = map.get(p.id); if (r) r.profile = p;
        });
      }

      setRows([...map.values()].sort((a, b) => b.total - a.total || b.signups - a.signups));
      setTotals({ paid: totalPaid, clicks: (clicks ?? []).length, signups: (signups ?? []).length });
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground">Affiliate Tracker</h1>
        <p className="text-sm text-sidebar-foreground/60">Clicks, sign-ups, and commissions across all inviters</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <Stat icon={<MousePointerClick className="h-4 w-4" />} label="Total clicks" value={String(totals.clicks)} />
        <Stat icon={<UserPlus className="h-4 w-4" />} label="Total sign-ups" value={String(totals.signups)} />
        <Stat icon={<Coins className="h-4 w-4" />} label="Total paid out" value={formatPrice(totals.paid, "XAF")} highlight />
      </div>

      <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border overflow-hidden">
        {rows.length === 0 ? (
          <div className="p-10 text-center text-sidebar-foreground/60">No referral activity yet</div>
        ) : (
          <div className="divide-y divide-sidebar-border">
            <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase font-bold text-sidebar-foreground/60">
              <div className="col-span-1">#</div>
              <div className="col-span-5">Inviter</div>
              <div className="col-span-2 text-right">Clicks</div>
              <div className="col-span-2 text-right">Signups</div>
              <div className="col-span-2 text-right">Earned</div>
            </div>
            {rows.map((r, i) => (
              <div key={r.inviter_id} className="grid grid-cols-12 gap-2 px-4 py-3 items-center">
                <div className="col-span-1 font-display font-extrabold">
                  {i === 0 ? <Trophy className="h-4 w-4 text-warning inline" /> : `${i + 1}`}
                </div>
                <div className="col-span-5 min-w-0">
                  <div className="font-bold truncate">{r.profile?.full_name ?? "—"}</div>
                  <div className="text-xs text-sidebar-foreground/60 truncate">{r.profile?.email} · <span className="font-mono">{r.profile?.referral_code}</span></div>
                </div>
                <div className="col-span-2 text-right font-bold">{r.clicks}</div>
                <div className="col-span-2 text-right font-bold">{r.signups}</div>
                <div className="col-span-2 text-right font-bold text-success">{formatPrice(r.total, "XAF")}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: boolean }) {
  return (
    <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-4">
      <div className="text-xs text-sidebar-foreground/60 uppercase font-bold flex items-center gap-1.5">{icon}{label}</div>
      <div className={`font-display text-2xl font-extrabold mt-1 ${highlight ? "text-success" : "text-sidebar-foreground"}`}>{value}</div>
    </div>
  );
}
