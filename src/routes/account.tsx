import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect } from "react";
import { Package, Store, Crown, MessageCircle, Globe, Coins, LogOut, ChevronRight, Users, Wallet, StoreIcon, Lock } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatPrice, levelLabel } from "@/lib/format";

export const Route = createFileRoute("/account")({
  component: AccountLayout,
});

function AccountLayout() {
  const { user, profile, isAdmin, loading, signOut } = useAuth();
  const { t, lang, setLang } = useI18n();
  const nav = useNavigate();
  const path = useRouterState({ select: (r) => r.location.pathname });

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/account" } });
  }, [loading, user, nav]);

  if (loading || !user) return <div className="p-10 text-center text-muted-foreground">…</div>;

  // If sub-route, render outlet (reactive to route changes)
  if (path !== "/account") {
    return <Outlet />;
  }

  const initial = (profile?.full_name ?? user.email ?? "U").charAt(0).toUpperCase();

  return (
    <div className="bg-background min-h-screen pb-24">
      <div className="bg-gradient-to-br from-primary to-primary-glow text-primary-foreground px-4 pt-6 pb-10">
        <div className="mx-auto max-w-3xl">
          <div className="flex items-center gap-3">
            <div className="h-16 w-16 rounded-2xl bg-card text-primary flex items-center justify-center font-display text-2xl font-extrabold shadow-elegant">
              {initial}
            </div>
            <div className="min-w-0">
              <div className="font-display text-lg font-extrabold truncate">{profile?.full_name ?? user.email}</div>
              <div className="text-sm opacity-90 truncate">{user.email}</div>
              <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-card/20 px-2.5 py-0.5 text-xs font-bold backdrop-blur">
                {isAdmin ? <><Crown className="h-3 w-3" /> Admin</> : <>👤 {levelLabel(profile?.level ?? 1)}</>}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-3xl px-4 -mt-6">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Orders" value={String(profile?.total_sales ?? 0)} color="text-primary" />
          <Stat label="Balance" value={formatPrice(Number(profile?.balance ?? 0), "XAF")} color="text-success" small />
          <Stat label="Level" value={String(profile?.level ?? 1)} color="text-warning" />
        </div>

        <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Quick Access</h3>
        <div className="mt-2 rounded-2xl bg-card shadow-card divide-y divide-border">
          <Row to="/account/orders" icon={<Package className="h-4 w-4" />} bg="bg-primary/10 text-primary" label="My Orders" />
          <Row to="/account/sell" icon={<Store className="h-4 w-4" />} bg="bg-success/10 text-success" label="Seller Dashboard" />
          <Row to="/account/store" icon={<StoreIcon className="h-4 w-4" />} bg="bg-primary/10 text-primary" label="My Store" />
          <Row to="/account/affiliate" icon={<Users className="h-4 w-4" />} bg="bg-warning/10 text-warning" label="Affiliate Board" />
          <Row to="/account/withdraw" icon={<Wallet className="h-4 w-4" />} bg="bg-primary/10 text-primary" label="Withdraw Earnings" />
          <Row to="/account/security" icon={<Lock className="h-4 w-4" />} bg="bg-muted text-foreground" label="Security & Password" />
          {isAdmin && <Row to="/admin" icon={<Crown className="h-4 w-4" />} bg="bg-destructive/10 text-destructive" label="Admin Panel" />}
          <a href="https://wa.me/237651010478" target="_blank" rel="noreferrer" className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-success/10 text-success"><MessageCircle className="h-4 w-4" /></span>
            <span className="flex-1 font-semibold">WhatsApp Support</span>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        <h3 className="mt-6 text-xs font-bold uppercase tracking-wider text-muted-foreground">Language & Currency</h3>
        <div className="mt-2 rounded-2xl bg-card shadow-card divide-y divide-border">
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 text-primary"><Globe className="h-4 w-4" /></span>
            <span className="flex-1 font-semibold">Language</span>
            <div className="inline-flex rounded-full bg-muted p-0.5 text-xs font-bold">
              {(["en", "fr"] as const).map((l) => (
                <button key={l} onClick={() => setLang(l)} className={`px-3 py-1 rounded-full ${lang === l ? "bg-card shadow-sm" : "text-muted-foreground"}`}>
                  {l.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3.5">
            <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-warning/10 text-warning"><Coins className="h-4 w-4" /></span>
            <span className="flex-1 font-semibold">Currency</span>
            <span className="text-sm font-semibold text-muted-foreground">XAF (F CFA)</span>
          </div>
        </div>

        <button onClick={() => { signOut(); nav({ to: "/" }); }}
          className="mt-4 w-full rounded-2xl bg-card shadow-card flex items-center gap-3 px-4 py-3.5 text-destructive font-bold hover:bg-destructive/5 transition">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10"><LogOut className="h-4 w-4" /></span>
          {t("sign_out")}
          <ChevronRight className="h-4 w-4 ml-auto" />
        </button>
      </div>
    </div>
  );
}

function Stat({ label, value, color, small }: { label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card text-center">
      <div className={`font-display ${small ? "text-base" : "text-2xl"} font-extrabold ${color}`}>{value}</div>
      <div className="text-xs text-muted-foreground mt-0.5">{label}</div>
    </div>
  );
}
function Row({ to, icon, bg, label }: { to: string; icon: React.ReactNode; bg: string; label: string }) {
  return (
    <Link to={to} className="flex items-center gap-3 px-4 py-3.5 hover:bg-muted/50 transition">
      <span className={`inline-flex h-9 w-9 items-center justify-center rounded-xl ${bg}`}>{icon}</span>
      <span className="flex-1 font-semibold">{label}</span>
      <ChevronRight className="h-4 w-4 text-muted-foreground" />
    </Link>
  );
}
