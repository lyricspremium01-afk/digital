import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, Upload, Package, TrendingUp, DollarSign, Eye, Trash2, FileUp } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice, slugify, levelLabel } from "@/lib/format";

export const Route = createFileRoute("/account/sell")({
  component: SellPage,
});

type Cat = { id: string; name: string; slug: string };
type SellerProduct = {
  id: string; slug: string; title: string; price: number; currency: string;
  status: string; cover_url: string | null; views: number; sales_count: number;
  product_type: string;
};

const PRODUCT_TYPES = [
  { value: "ebook", label: "📘 Ebook (PDF/EPUB)" },
  { value: "file", label: "📂 File / Digital Download" },
  { value: "account", label: "👤 Social Media Account" },
  { value: "project", label: "💻 Project / Source Code" },
  { value: "course", label: "🎓 Course / Video link" },
  { value: "digital", label: "✨ Other digital product" },
];

function SellPage() {
  const { user, profile, loading } = useAuth();
  const nav = useNavigate();
  const [tab, setTab] = useState<"list" | "new">("list");
  const [products, setProducts] = useState<SellerProduct[]>([]);
  const [revenue, setRevenue] = useState(0);

  useEffect(() => {
    if (!loading && !user) nav({ to: "/auth", search: { redirect: "/account/sell" } });
  }, [loading, user, nav]);

  const refresh = () => {
    if (!user) return;
    supabase.from("products")
      .select("id,slug,title,price,currency,status,cover_url,views,sales_count,product_type")
      .eq("seller_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setProducts((data as SellerProduct[]) ?? []));

    supabase.from("ledger").select("amount").eq("user_id", user.id).eq("kind", "sale_credit")
      .then(({ data }) => {
        const total = (data ?? []).reduce((s, r: { amount: number }) => s + Number(r.amount), 0);
        setRevenue(total);
      });
  };
  useEffect(refresh, [user]);

  if (loading || !user) return <div className="p-10 text-center text-muted-foreground">…</div>;

  const totalSales = products.reduce((s, p) => s + p.sales_count, 0);
  const totalViews = products.reduce((s, p) => s + p.views, 0);

  return (
    <div className="mx-auto max-w-4xl px-4 pt-6 pb-24">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold">Seller Dashboard</h1>
          <p className="text-sm text-muted-foreground">{levelLabel(profile?.level ?? 1)} · {profile?.total_sales ?? 0} confirmed sales</p>
        </div>
        <button onClick={() => setTab(tab === "new" ? "list" : "new")}
          className="inline-flex items-center gap-2 rounded-full bg-gradient-primary px-4 py-2 text-sm font-bold text-primary-foreground shadow-elegant">
          <Plus className="h-4 w-4" /> {tab === "new" ? "Cancel" : "New product"}
        </button>
      </div>

      <div className="mt-5 grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat icon={<Package className="h-4 w-4" />} label="Products" value={String(products.length)} color="text-primary" />
        <Stat icon={<Eye className="h-4 w-4" />} label="Views" value={String(totalViews)} color="text-warning" />
        <Stat icon={<TrendingUp className="h-4 w-4" />} label="Sales" value={String(totalSales)} color="text-success" />
        <Stat icon={<DollarSign className="h-4 w-4" />} label="Revenue" value={formatPrice(revenue, "XAF")} color="text-success" small />
      </div>

      {tab === "new" ? (
        <NewProductForm onCreated={() => { setTab("list"); refresh(); }} />
      ) : (
        <div className="mt-6">
          <h2 className="font-display font-bold mb-3">Your products</h2>
          {products.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-card p-10 text-center text-muted-foreground">
              No products yet. Click "New product" to upload your first one.
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((p) => <ProductRow key={p.id} p={p} onChange={refresh} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ icon, label, value, color, small }: { icon: React.ReactNode; label: string; value: string; color: string; small?: boolean }) {
  return (
    <div className="rounded-2xl bg-card p-4 shadow-card">
      <div className={`flex items-center gap-1.5 text-xs font-bold ${color}`}>{icon}{label}</div>
      <div className={`mt-1 font-display font-extrabold ${small ? "text-base" : "text-2xl"}`}>{value}</div>
    </div>
  );
}

function statusColor(s: string) {
  return s === "approved" ? "bg-success/15 text-success"
    : s === "pending" ? "bg-warning/15 text-warning"
    : s === "rejected" ? "bg-destructive/15 text-destructive"
    : "bg-muted text-muted-foreground";
}

function ProductRow({ p, onChange }: { p: SellerProduct; onChange: () => void }) {
  const remove = async () => {
    if (!confirm("Delete this product?")) return;
    const { error } = await supabase.from("products").delete().eq("id", p.id);
    if (error) toast.error(error.message); else { toast.success("Deleted"); onChange(); }
  };
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-card p-3 shadow-card">
      <div className="h-14 w-14 shrink-0 rounded-xl bg-gradient-hero overflow-hidden">
        {p.cover_url ? <img src={p.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <Link to="/p/$slug" params={{ slug: p.slug }} className="font-bold truncate hover:text-primary">{p.title}</Link>
          <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${statusColor(p.status)}`}>{p.status}</span>
        </div>
        <div className="text-xs text-muted-foreground">{PRODUCT_TYPES.find(t => t.value === p.product_type)?.label ?? p.product_type} · {formatPrice(Number(p.price), p.currency)} · {p.sales_count} sales</div>
      </div>
      <button onClick={remove} className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-destructive/10 text-destructive hover:bg-destructive/20">
        <Trash2 className="h-4 w-4" />
      </button>
    </div>
  );
}

function NewProductForm({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [cats, setCats] = useState<Cat[]>([]);
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [productType, setProductType] = useState("ebook");
  const [base, setBase] = useState({
    title: "", category_id: "", price: "", short_desc: "", description: "",
    what_youll_learn: "", who_its_for: "", delivery_link: "",
  });
  // type-specific
  const [acct, setAcct] = useState({ platform: "instagram", followers_count: "", niche: "", engagement_rate: "", monetized: false, country: "", account_age: "" });
  const [proj, setProj] = useState({ tech_stack: "", demo_url: "", repo_url: "" });

  useEffect(() => { supabase.from("categories").select("id,name,slug").order("sort_order").then(({ data }) => setCats((data as Cat[]) ?? [])); }, []);

  const needsFile = productType === "ebook" || productType === "file" || productType === "project";
  const needsLink = productType === "course" || productType === "digital" || productType === "account";

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (needsFile && !file && !base.delivery_link) {
      toast.error("Please upload a file or provide a delivery link"); return;
    }
    if (needsLink && !base.delivery_link) {
      toast.error("Delivery link is required"); return;
    }
    setBusy(true);
    try {
      let cover_url: string | null = null;
      if (cover) {
        const path = `${user.id}/${Date.now()}-${cover.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: upErr } = await supabase.storage.from("product-covers").upload(path, cover, { upsert: false });
        if (upErr) throw upErr;
        cover_url = supabase.storage.from("product-covers").getPublicUrl(path).data.publicUrl;
      }

      let delivery = base.delivery_link;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error: fErr } = await supabase.storage.from("product-files").upload(path, file, { upsert: false });
        if (fErr) throw fErr;
        delivery = supabase.storage.from("product-files").getPublicUrl(path).data.publicUrl;
      }

      const baseSlug = slugify(base.title);
      const slug = `${baseSlug}-${Math.random().toString(36).slice(2, 6)}`;

      const extra: Record<string, unknown> = {};
      const insertData: Record<string, unknown> = {
        seller_id: user.id,
        title: base.title,
        slug,
        category_id: base.category_id || null,
        price: Number(base.price),
        currency: "XAF",
        short_desc: base.short_desc || null,
        description: base.description || null,
        what_youll_learn: base.what_youll_learn || null,
        who_its_for: base.who_its_for || null,
        delivery_link: delivery,
        cover_url,
        status: "pending",
        product_type: productType,
      };

      if (productType === "account") {
        insertData.platform = acct.platform;
        insertData.followers_count = acct.followers_count ? Number(acct.followers_count) : null;
        insertData.niche = acct.niche || null;
        insertData.engagement_rate = acct.engagement_rate ? Number(acct.engagement_rate) : null;
        insertData.monetized = acct.monetized;
        insertData.country = acct.country || null;
        insertData.account_age = acct.account_age || null;
      }
      if (productType === "project") {
        extra.tech_stack = proj.tech_stack;
        extra.demo_url = proj.demo_url;
        extra.repo_url = proj.repo_url;
      }
      insertData.extra = extra;

      const { error } = await supabase.from("products").insert(insertData as never);
      if (error) throw error;
      toast.success("Submitted! Awaiting admin approval.");
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4 rounded-2xl bg-card p-5 shadow-card">
      <h2 className="font-display font-bold">Upload a digital product</h2>

      <label className="block">
        <span className="text-sm font-bold">Product type *</span>
        <select value={productType} onChange={(e) => setProductType(e.target.value)}
          className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm">
          {PRODUCT_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </label>

      <Field label="Title *" value={base.title} onChange={(v) => setBase({ ...base, title: v })} required placeholder="e.g. Complete Forex Trading Mastery" />

      <label className="block">
        <span className="text-sm font-bold">Category *</span>
        <select required value={base.category_id} onChange={(e) => setBase({ ...base, category_id: e.target.value })}
          className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm">
          <option value="">Select category…</option>
          {cats.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </label>

      <Field label="Price (F CFA) *" type="number" value={base.price} onChange={(v) => setBase({ ...base, price: v })} required placeholder="5000" />

      <Field label="Short description" value={base.short_desc} onChange={(v) => setBase({ ...base, short_desc: v })} placeholder="One catchy line" />
      <TextArea label="Description" value={base.description} onChange={(v) => setBase({ ...base, description: v })} placeholder="Full description…" />

      {/* Type-specific fields */}
      {productType === "account" && (
        <div className="space-y-3 rounded-xl bg-muted/40 p-4">
          <h3 className="font-bold text-sm">Account details</h3>
          <label className="block">
            <span className="text-xs font-bold">Platform</span>
            <select value={acct.platform} onChange={(e) => setAcct({ ...acct, platform: e.target.value })}
              className="mt-1 w-full rounded-2xl border border-border bg-card px-4 py-2.5 text-sm">
              <option value="instagram">Instagram</option>
              <option value="tiktok">TikTok</option>
              <option value="youtube">YouTube</option>
              <option value="facebook">Facebook</option>
              <option value="twitter">X / Twitter</option>
              <option value="telegram">Telegram</option>
              <option value="other">Other</option>
            </select>
          </label>
          <Field label="Followers count" type="number" value={acct.followers_count} onChange={(v) => setAcct({ ...acct, followers_count: v })} />
          <Field label="Niche" value={acct.niche} onChange={(v) => setAcct({ ...acct, niche: v })} placeholder="e.g. Fitness, Crypto" />
          <Field label="Engagement rate (%)" type="number" value={acct.engagement_rate} onChange={(v) => setAcct({ ...acct, engagement_rate: v })} />
          <Field label="Country" value={acct.country} onChange={(v) => setAcct({ ...acct, country: v })} placeholder="e.g. Cameroon" />
          <Field label="Account age" value={acct.account_age} onChange={(v) => setAcct({ ...acct, account_age: v })} placeholder="e.g. 2 years" />
          <label className="flex items-center gap-2 text-sm font-bold">
            <input type="checkbox" checked={acct.monetized} onChange={(e) => setAcct({ ...acct, monetized: e.target.checked })} />
            Monetized
          </label>
        </div>
      )}

      {productType === "project" && (
        <div className="space-y-3 rounded-xl bg-muted/40 p-4">
          <h3 className="font-bold text-sm">Project details</h3>
          <Field label="Tech stack" value={proj.tech_stack} onChange={(v) => setProj({ ...proj, tech_stack: v })} placeholder="React, Node, Postgres…" />
          <Field label="Demo URL (optional)" value={proj.demo_url} onChange={(v) => setProj({ ...proj, demo_url: v })} placeholder="https://demo.example.com" />
          <Field label="Repo URL (optional public preview)" value={proj.repo_url} onChange={(v) => setProj({ ...proj, repo_url: v })} placeholder="https://github.com/…" />
        </div>
      )}

      {(productType === "ebook" || productType === "file" || productType === "project") && (
        <TextArea label="What you'll learn / get" value={base.what_youll_learn} onChange={(v) => setBase({ ...base, what_youll_learn: v })} />
      )}
      <TextArea label="Who it's for" value={base.who_its_for} onChange={(v) => setBase({ ...base, who_its_for: v })} />

      {/* Delivery */}
      {needsFile && (
        <label className="block">
          <span className="text-sm font-bold">Upload file {productType === "ebook" ? "(PDF, EPUB)" : "(ZIP, PDF, etc.)"}</span>
          <div className="mt-1">
            <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-muted px-4 py-3 text-sm font-semibold hover:bg-muted/70">
              <FileUp className="h-4 w-4" /> {file ? file.name : "Choose file"}
              <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <span className="text-xs text-muted-foreground mt-1 block">Or paste an external link below.</span>
        </label>
      )}
      <Field label={`Delivery link ${needsLink ? "*" : "(optional if file uploaded)"}`} value={base.delivery_link} onChange={(v) => setBase({ ...base, delivery_link: v })} required={needsLink} placeholder="https://drive.google.com/…" />

      <label className="block">
        <span className="text-sm font-bold">Cover image</span>
        <div className="mt-1">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-2xl border border-dashed border-border bg-muted px-4 py-3 text-sm font-semibold hover:bg-muted/70">
            <Upload className="h-4 w-4" /> {cover ? cover.name : "Choose image"}
            <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
          </label>
        </div>
      </label>

      <button disabled={busy} type="submit"
        className="w-full rounded-full bg-gradient-primary px-6 py-3 text-sm font-bold text-primary-foreground shadow-elegant disabled:opacity-60">
        {busy ? "Uploading…" : "Submit for review"}
      </button>
    </form>
  );
}

function Field({ label, value, onChange, type = "text", placeholder, required }: {
  label: string; value: string; onChange: (v: string) => void; type?: string; placeholder?: string; required?: boolean;
}) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <input type={type} value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} required={required}
        className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:bg-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}
function TextArea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label className="block">
      <span className="text-sm font-bold">{label}</span>
      <textarea value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={4}
        className="mt-1 w-full rounded-2xl border border-border bg-muted px-4 py-3 text-sm focus:bg-card focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20" />
    </label>
  );
}
