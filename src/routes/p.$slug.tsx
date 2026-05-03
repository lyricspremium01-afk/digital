import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Star, ShieldCheck, Zap, Box, Target, CheckCircle2, Share2, Flame } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { useI18n } from "@/lib/i18n";
import { formatPrice, levelLabel } from "@/lib/format";

export const Route = createFileRoute("/p/$slug")({
  component: ProductPage,
});

type Product = {
  id: string;
  slug: string;
  title: string;
  short_desc: string | null;
  description: string | null;
  what_youll_learn: string | null;
  who_its_for: string | null;
  price: number;
  currency: string;
  cover_url: string | null;
  is_hot: boolean;
  is_featured: boolean;
  rating_avg: number;
  rating_count: number;
  sales_count: number;
  seller_id: string;
  categories: { name: string; slug: string } | null;
  profiles: { id: string; full_name: string | null; level: number; avatar_url: string | null } | null;
};

function ProductPage() {
  const { slug } = Route.useParams();
  const { t } = useI18n();
  const { user } = useAuth();
  const nav = useNavigate();
  const [p, setP] = useState<Product | null>(null);
  const [storeLink, setStoreLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [buying, setBuying] = useState(false);

  useEffect(() => {
    setLoading(true);
    supabase
      .from("products")
      .select("*,categories(name,slug),profiles!products_seller_id_fkey(id,full_name,level,avatar_url)")
      .eq("slug", slug)
      .maybeSingle()
      .then(async ({ data }) => {
        const prod = (data as unknown as Product) ?? null;
        setP(prod);
        if (prod?.seller_id) {
          const { data: s } = await supabase.from("stores").select("store_link").eq("user_id", prod.seller_id).maybeSingle();
          setStoreLink((s as { store_link: string } | null)?.store_link ?? null);
        }
        setLoading(false);
      });
  }, [slug]);

  const share = async () => {
    const url = typeof window !== "undefined" ? window.location.href : "";
    try {
      if (navigator.share) await navigator.share({ title: p?.title, url });
      else { await navigator.clipboard.writeText(url); toast.success("Link copied"); }
    } catch {}
  };

  const startCheckout = async () => {
    if (!p) return;
    if (!user) { nav({ to: "/auth", search: { redirect: `/p/${slug}` } }); return; }
    setBuying(true);
    const { data, error } = await supabase.from("orders").insert({
      buyer_id: user.id,
      buyer_email: user.email ?? "",
      buyer_name: user.user_metadata?.full_name ?? "",
      buyer_phone: user.user_metadata?.phone ?? "",
      product_id: p.id,
      seller_id: p.seller_id,
      amount: p.price,
      currency: p.currency,
      payment_method: "soleaspay",
    }).select("id").single();
    setBuying(false);
    if (error) { toast.error(error.message); return; }
    nav({ to: "/checkout/$orderId", params: { orderId: data.id } });
  };

  if (loading) return <div className="mx-auto max-w-3xl px-4 py-10"><div className="animate-pulse h-96 rounded-3xl bg-muted" /></div>;
  if (!p) return (
    <div className="mx-auto max-w-3xl px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Product not found</h1>
      <Link to="/shop" className="mt-4 inline-block text-primary font-semibold">← Back to shop</Link>
    </div>
  );

  return (
    <div className="mx-auto max-w-3xl px-4 pt-4 pb-32">
      <Link to="/shop" className="inline-flex text-primary font-semibold text-sm">← {t("shop")}</Link>

      <div className="mt-3 relative aspect-[4/3] rounded-3xl overflow-hidden bg-gradient-hero shadow-card">
        {p.cover_url ? (
          <img src={p.cover_url} alt={p.title} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-7xl">📦</div>
        )}
        <div className="absolute top-3 left-3 flex gap-1.5">
          {p.is_hot && <span className="inline-flex items-center gap-1 rounded-full bg-gradient-hot px-3 py-1 text-xs font-bold text-hot-foreground shadow-md"><Flame className="h-3 w-3" /> {t("hot")}</span>}
        </div>
        <button onClick={share} aria-label="Share" className="absolute top-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-full bg-card/90 backdrop-blur text-foreground shadow-card hover:bg-card transition">
          <Share2 className="h-4 w-4" />
        </button>
      </div>

      <div className="mt-5">
        <div className="text-xs font-bold uppercase tracking-wide text-primary">{p.categories?.name}</div>
        <h1 className="mt-1 font-display text-2xl md:text-3xl font-extrabold leading-tight">{p.title}</h1>
        <div className="mt-2 flex items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 font-semibold"><Star className="h-4 w-4 fill-warning text-warning" /> {p.rating_avg ? Number(p.rating_avg).toFixed(1) : "—"} <span className="text-muted-foreground">({p.rating_count})</span></span>
          <span className="text-muted-foreground">· {p.sales_count} sales</span>
        </div>
        <div className="mt-4 inline-flex items-baseline gap-2">
          <span className="font-display text-3xl font-extrabold text-primary">{formatPrice(Number(p.price), p.currency)}</span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3">
        <Card icon={<Zap className="h-4 w-4" />} title="24h Delivery" sub="via WhatsApp" />
        <Card icon={<ShieldCheck className="h-4 w-4" />} title="Secure" sub="Pay via SoleasPay" />
      </div>

      {p.description && (
        <Section icon="📝" title="About this product">
          <p className="text-sm text-muted-foreground whitespace-pre-line">{p.description}</p>
        </Section>
      )}
      {p.what_youll_learn && (
        <Section icon={<CheckCircle2 className="h-5 w-5 text-success" />} title="What you'll learn">
          <p className="text-sm text-muted-foreground whitespace-pre-line">{p.what_youll_learn}</p>
        </Section>
      )}
      {p.who_its_for && (
        <Section icon={<Target className="h-5 w-5 text-destructive" />} title="Who it's for">
          <p className="text-sm text-muted-foreground whitespace-pre-line">{p.who_its_for}</p>
        </Section>
      )}

      <Section icon={<Box className="h-5 w-5 text-warning" />} title="How delivery works">
        <ol className="space-y-2.5">
          {[
            "Click Buy Now and complete payment via SoleasPay",
            "Upload your payment screenshot as proof",
            "Receive your product within 24h via WhatsApp + your account",
          ].map((s, i) => (
            <li key={i} className="flex gap-3 text-sm">
              <span className="shrink-0 font-display font-bold text-primary">{i + 1}</span>
              <span className="text-muted-foreground">{s}</span>
            </li>
          ))}
        </ol>
      </Section>

      {p.profiles && (
        <div className="mt-5 rounded-2xl bg-card p-4 shadow-card flex items-center gap-3">
          <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground font-bold">
            {(p.profiles.full_name ?? "S").charAt(0).toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-semibold truncate">{p.profiles.full_name ?? "Seller"}</div>
            <div className="text-xs text-primary font-bold">{levelLabel(p.profiles.level)}</div>
          </div>
          {storeLink && (
            <Link to="/store/$link" params={{ link: storeLink }}
              className="rounded-full bg-primary/10 text-primary px-3 py-1.5 text-xs font-bold hover:bg-primary/20">
              Visit Store →
            </Link>
          )}
        </div>
      )}

      {/* Sticky CTA */}
      <div className="fixed bottom-16 md:bottom-0 inset-x-0 z-30 bg-background/95 backdrop-blur border-t border-border">
        <div className="mx-auto max-w-3xl px-4 py-3 flex items-center gap-3">
          <div className="flex-1">
            <div className="text-xs text-muted-foreground">Total</div>
            <div className="font-display text-lg font-extrabold">{formatPrice(Number(p.price), p.currency)}</div>
          </div>
          <button
            disabled={buying}
            onClick={startCheckout}
            className="flex-1 rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-60"
          >
            {buying ? "…" : t("buy_now")}
          </button>
        </div>
      </div>
    </div>
  );
}

function Card({ icon, title, sub }: { icon: React.ReactNode; title: string; sub: string }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className="flex items-center gap-2 text-primary font-bold">{icon}<span className="text-success">{title}</span></div>
      <div className="text-xs text-muted-foreground mt-1">{sub}</div>
    </div>
  );
}
function Section({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <section className="mt-4 rounded-2xl bg-card p-4 shadow-card">
      <h2 className="flex items-center gap-2 font-display font-bold">
        <span>{icon}</span>{title}
      </h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}
