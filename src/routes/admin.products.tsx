import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, Pause, Play, Plus, Upload, FileUp } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { formatPrice, slugify } from "@/lib/format";

export const Route = createFileRoute("/admin/products")({
  component: AdminProducts,
});

type P = {
  id: string; slug: string; title: string; price: number; currency: string;
  status: string; cover_url: string | null; delivery_link: string;
  sales_count: number; views: number; created_at: string;
  is_featured: boolean; is_hot: boolean;
  seller: { full_name: string | null; email: string | null } | null;
  categories: { name: string } | null;
};

const FILTERS = ["all", "pending", "approved", "paused", "rejected"] as const;

function AdminProducts() {
  const [items, setItems] = useState<P[]>([]);
  const [filter, setFilter] = useState<typeof FILTERS[number]>("pending");
  const [showNew, setShowNew] = useState(false);

  const load = async () => {
    let q = supabase.from("products")
      .select("id,slug,title,price,currency,status,cover_url,delivery_link,sales_count,views,created_at,is_featured,is_hot,seller:profiles!products_seller_id_fkey(full_name,email),categories(name)")
      .order("created_at", { ascending: false });
    if (filter !== "all") q = q.eq("status", filter);
    const { data } = await q.limit(100);
    setItems((data as unknown as P[]) ?? []);
  };
  useEffect(() => { load(); }, [filter]);

  const setStatus = async (id: string, status: "pending" | "approved" | "rejected" | "paused", reason?: string) => {
    const args: { _product: string; _status: typeof status; _reason?: string } = { _product: id, _status: status };
    if (reason) args._reason = reason;
    const { error } = await supabase.rpc("admin_set_product_status", args);
    if (error) toast.error(error.message); else { toast.success("Updated"); load(); }
  };

  const toggleFeature = async (p: P, field: "is_featured" | "is_hot") => {
    const update = { [field]: !p[field] } as { is_featured?: boolean; is_hot?: boolean };
    const { error } = await supabase.from("products").update(update).eq("id", p.id);
    if (error) toast.error(error.message); else load();
  };

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-extrabold text-sidebar-foreground">Products</h1>
          <p className="text-sm text-sidebar-foreground/60">Approve seller submissions, feature top picks, or upload your own</p>
        </div>
        <button onClick={() => setShowNew(!showNew)}
          className="inline-flex items-center gap-2 rounded-full bg-sidebar-primary px-4 py-2 text-xs font-bold text-sidebar-primary-foreground">
          <Plus className="h-4 w-4" /> {showNew ? "Cancel" : "New product"}
        </button>
      </div>

      {showNew && <AdminNewProduct onCreated={() => { setShowNew(false); load(); }} />}

      <div className="flex gap-2 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button key={f} onClick={() => setFilter(f)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-xs font-bold transition ${filter === f ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar-accent text-sidebar-foreground/70"}`}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <div className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-10 text-center text-sidebar-foreground/60">No products</div>
      ) : (
        <div className="space-y-3">
          {items.map((p) => (
            <div key={p.id} className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-4">
              <div className="flex items-start gap-3">
                <div className="h-14 w-14 shrink-0 rounded-xl bg-sidebar/60 overflow-hidden">
                  {p.cover_url ? <img src={p.cover_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center text-2xl">📦</div>}
                </div>
                <div className="flex-1 min-w-0">
                  <Link to="/p/$slug" params={{ slug: p.slug }} className="font-bold hover:text-sidebar-primary">{p.title}</Link>
                  <div className="text-xs text-sidebar-foreground/60">
                    {p.categories?.name ?? "—"} · by <strong>{p.seller?.full_name ?? p.seller?.email}</strong> · {p.sales_count} sales · {p.views} views
                  </div>
                  <div className="text-xs mt-1 break-all">
                    <span className="text-sidebar-foreground/60">Delivery: </span>
                    <a href={p.delivery_link} target="_blank" rel="noreferrer" className="text-sidebar-primary hover:underline">{p.delivery_link}</a>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className="font-display font-extrabold">{formatPrice(Number(p.price), p.currency)}</div>
                  <div className="text-[10px] uppercase font-bold text-sidebar-foreground/60">{p.status}</div>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {p.status !== "approved" && (
                  <button onClick={() => setStatus(p.id, "approved")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-success-foreground">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Approve
                  </button>
                )}
                {p.status === "approved" && (
                  <button onClick={() => setStatus(p.id, "paused")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-warning/80 px-3 py-1.5 text-xs font-bold text-warning-foreground">
                    <Pause className="h-3.5 w-3.5" /> Pause
                  </button>
                )}
                {p.status === "paused" && (
                  <button onClick={() => setStatus(p.id, "approved")}
                    className="inline-flex items-center gap-1.5 rounded-full bg-success px-3 py-1.5 text-xs font-bold text-success-foreground">
                    <Play className="h-3.5 w-3.5" /> Unpause
                  </button>
                )}
                {p.status !== "rejected" && (
                  <button onClick={() => { const r = prompt("Rejection reason?"); if (r) setStatus(p.id, "rejected", r); }}
                    className="inline-flex items-center gap-1.5 rounded-full bg-destructive/80 px-3 py-1.5 text-xs font-bold text-destructive-foreground">
                    <XCircle className="h-3.5 w-3.5" /> Reject
                  </button>
                )}
                <button onClick={() => toggleFeature(p, "is_featured")}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${p.is_featured ? "bg-sidebar-primary text-sidebar-primary-foreground" : "bg-sidebar/60 text-sidebar-foreground/70"}`}>
                  {p.is_featured ? "★ Featured" : "Feature"}
                </button>
                <button onClick={() => toggleFeature(p, "is_hot")}
                  className={`rounded-full px-3 py-1.5 text-xs font-bold ${p.is_hot ? "bg-hot text-hot-foreground" : "bg-sidebar/60 text-sidebar-foreground/70"}`}>
                  {p.is_hot ? "🔥 Hot" : "Mark hot"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function AdminNewProduct({ onCreated }: { onCreated: () => void }) {
  const { user } = useAuth();
  const [cats, setCats] = useState<{ id: string; name: string }[]>([]);
  const [busy, setBusy] = useState(false);
  const [cover, setCover] = useState<File | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [form, setForm] = useState({
    title: "", category_id: "", price: "0", short_desc: "", description: "",
    delivery_link: "", product_type: "ebook", is_free: true,
  });

  useEffect(() => {
    supabase.from("categories").select("id,name").order("sort_order").then(({ data }) => setCats(data ?? []));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    try {
      let cover_url: string | null = null;
      if (cover) {
        const path = `${user.id}/${Date.now()}-${cover.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error } = await supabase.storage.from("product-covers").upload(path, cover);
        if (error) throw error;
        cover_url = supabase.storage.from("product-covers").getPublicUrl(path).data.publicUrl;
      }
      let delivery = form.delivery_link;
      if (file) {
        const path = `${user.id}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
        const { error } = await supabase.storage.from("product-files").upload(path, file);
        if (error) throw error;
        delivery = supabase.storage.from("product-files").getPublicUrl(path).data.publicUrl;
      }
      if (!delivery) { toast.error("Provide a file or delivery link"); setBusy(false); return; }

      const slug = `${slugify(form.title)}-${Math.random().toString(36).slice(2, 6)}`;
      const { error } = await supabase.from("products").insert({
        seller_id: user.id,
        title: form.title,
        slug,
        category_id: form.category_id || null,
        price: form.is_free ? 0 : Number(form.price),
        currency: "XAF",
        short_desc: form.short_desc || null,
        description: form.description || null,
        delivery_link: delivery,
        cover_url,
        status: "approved",
        product_type: form.product_type,
      } as never);
      if (error) throw error;
      toast.success(form.is_free ? "Free product published!" : "Product published!");
      onCreated();
    } catch (err) {
      toast.error((err as Error).message);
    } finally { setBusy(false); }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl bg-sidebar-accent border border-sidebar-border p-5 space-y-3">
      <h2 className="font-bold">New product (auto-approved)</h2>

      <label className="flex items-center gap-2 text-sm font-bold">
        <input type="checkbox" checked={form.is_free} onChange={(e) => setForm({ ...form, is_free: e.target.checked })} />
        🎁 Free product (price = 0)
      </label>

      <input className="w-full rounded-xl bg-sidebar/60 px-3 py-2 text-sm" placeholder="Title *"
        value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />

      <div className="grid grid-cols-2 gap-2">
        <select className="rounded-xl bg-sidebar/60 px-3 py-2 text-sm"
          value={form.product_type} onChange={(e) => setForm({ ...form, product_type: e.target.value })}>
          <option value="ebook">Ebook</option>
          <option value="file">File</option>
          <option value="course">Course / link</option>
          <option value="account">Account</option>
          <option value="project">Project</option>
          <option value="digital">Other digital</option>
        </select>
        <select className="rounded-xl bg-sidebar/60 px-3 py-2 text-sm" required
          value={form.category_id} onChange={(e) => setForm({ ...form, category_id: e.target.value })}>
          <option value="">Category…</option>
          {cats.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {!form.is_free && (
        <input className="w-full rounded-xl bg-sidebar/60 px-3 py-2 text-sm" type="number" placeholder="Price (F CFA)"
          value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} required />
      )}

      <input className="w-full rounded-xl bg-sidebar/60 px-3 py-2 text-sm" placeholder="Short description"
        value={form.short_desc} onChange={(e) => setForm({ ...form, short_desc: e.target.value })} />
      <textarea className="w-full rounded-xl bg-sidebar/60 px-3 py-2 text-sm" rows={3} placeholder="Description"
        value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />

      <label className="block">
        <span className="text-xs font-bold">Upload file (optional)</span>
        <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-sidebar-border bg-sidebar/40 px-3 py-2 text-xs font-semibold">
          <FileUp className="h-3 w-3" /> {file ? file.name : "Choose file"}
          <input type="file" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
        </label>
      </label>
      <input className="w-full rounded-xl bg-sidebar/60 px-3 py-2 text-sm" placeholder="Or delivery link"
        value={form.delivery_link} onChange={(e) => setForm({ ...form, delivery_link: e.target.value })} />

      <label className="block">
        <span className="text-xs font-bold">Cover image</span>
        <label className="mt-1 inline-flex cursor-pointer items-center gap-2 rounded-xl border border-dashed border-sidebar-border bg-sidebar/40 px-3 py-2 text-xs font-semibold">
          <Upload className="h-3 w-3" /> {cover ? cover.name : "Choose image"}
          <input type="file" accept="image/*" className="hidden" onChange={(e) => setCover(e.target.files?.[0] ?? null)} />
        </label>
      </label>

      <button type="submit" disabled={busy}
        className="w-full rounded-full bg-success px-6 py-2.5 text-sm font-bold text-success-foreground disabled:opacity-60">
        {busy ? "Publishing…" : "Publish"}
      </button>
    </form>
  );
}
