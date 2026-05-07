import { useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Boxes,
  CheckCircle2,
  Clock4,
  Minus,
  PackageOpen,
  Plus,
  Search,
  ShoppingCart,
  Trash2,
  X,
} from "lucide-react";

import { api } from "../../lib/api.js";
import { availabilityLabel } from "../../lib/format.js";
import { useAuth } from "../../contexts/AuthContext.jsx";
import EmptyState from "../../components/EmptyState.jsx";
import RequestPanel from "./RequestPanel.jsx";

const TYPES = [
  "All",
  "Microcontroller",
  "Test Equipment",
  "Prototyping",
  "Sensor",
  "Cabling",
  "Display",
  "Passive",
  "Tool",
];

const AVAILABILITY = [
  { id: "all", label: "All" },
  { id: "available", label: "Available" },
  { id: "limited", label: "Limited" },
  { id: "out", label: "Out of stock" },
];

const INVENTORY_TYPES = TYPES.filter((t) => t !== "All");

export default function Catalog() {
  const { user } = useAuth();
  const managerView = user?.role === "manager";
  const [query, setQuery] = useState("");
  const [type, setType] = useState("All");
  const [availability, setAvailability] = useState("all");
  const [components, setComponents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [cart, setCart] = useState([]);
  const [panelOpen, setPanelOpen] = useState(false);
  const [toast, setToast] = useState(null);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addForm, setAddForm] = useState({
    code: "",
    name: "",
    type: INVENTORY_TYPES[0] ?? "Microcontroller",
    description: "",
    quantity: "1",
  });
  const [addSubmitting, setAddSubmitting] = useState(false);
  const [addError, setAddError] = useState(null);
  const [inventoryBusyId, setInventoryBusyId] = useState(null);

  const userId = user?._id ?? user?.id;

  const filters = useMemo(
    () => ({
      q: query || undefined,
      type: type === "All" ? undefined : type,
      availability: availability === "all" ? undefined : availability,
    }),
    [query, type, availability]
  );

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .listComponents(filters)
      .then((data) => {
        if (!cancelled) setComponents(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [filters]);

  useEffect(() => {
    if (!addModalOpen) return;
    setAddForm({
      code: "",
      name: "",
      type: INVENTORY_TYPES[0] ?? "Microcontroller",
      description: "",
      quantity: "1",
    });
    setAddError(null);
    setAddSubmitting(false);
  }, [addModalOpen]);

  useEffect(() => {
    if (!addModalOpen) return;
    function onKey(event) {
      if (event.key === "Escape") setAddModalOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [addModalOpen]);

  async function refreshComponents() {
    try {
      const data = await api.listComponents(filters);
      setComponents(data);
    } catch {
      /* leave list unchanged */
    }
  }

  async function handleAdjustStock(componentId, body) {
    setInventoryBusyId(componentId);
    try {
      await api.adjustComponentStock(componentId, body);
      await refreshComponents();
      setToast({ type: "success", message: "Stock updated." });
      setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setToast({ type: "error", message: err.message });
      setTimeout(() => setToast(null), 2800);
    } finally {
      setInventoryBusyId(null);
    }
  }

  async function handleDeleteComponent(componentId, name) {
    if (!window.confirm(`Remove "${name}" from inventory? This cannot be undone.`)) return;
    setInventoryBusyId(componentId);
    try {
      await api.deleteComponent(componentId);
      await refreshComponents();
      setToast({ type: "success", message: "Item removed from inventory." });
      setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setToast({ type: "error", message: err.message });
      setTimeout(() => setToast(null), 2800);
    } finally {
      setInventoryBusyId(null);
    }
  }

  async function handleAddItemSubmit(event) {
    event.preventDefault();
    setAddError(null);
    const code = addForm.code.trim();
    const name = addForm.name.trim();
    const qty = Number.parseInt(addForm.quantity, 10);
    if (!code || !name) {
      setAddError("Code and name are required.");
      return;
    }
    if (Number.isNaN(qty) || qty < 0 || qty > 500) {
      setAddError("Quantity must be between 0 and 500.");
      return;
    }
    setAddSubmitting(true);
    try {
      await api.createComponent({
        code,
        name,
        type: addForm.type,
        description: addForm.description.trim(),
        quantity: qty,
      });
      await refreshComponents();
      setAddModalOpen(false);
      setToast({ type: "success", message: "Inventory item added." });
      setTimeout(() => setToast(null), 2200);
    } catch (err) {
      setAddError(err.message);
    } finally {
      setAddSubmitting(false);
    }
  }

  const cartCount = cart.reduce((sum, e) => sum + e.qty, 0);

  function addToCart(component) {
    const cid = component._id ?? component.id;
    setCart((prev) => {
      const existing = prev.find((entry) => entry.component_id === cid);
      if (existing) {
        return prev.map((entry) =>
          entry.component_id === cid
            ? { ...entry, qty: Math.min(entry.qty + 1, component.total_qty) }
            : entry
        );
      }
      return [
        ...prev,
        {
          component_id: cid,
          component_code: component.code,
          component_name: component.name,
          total_qty: component.total_qty,
          available_qty: component.available_qty,
          qty: 1,
        },
      ];
    });
    setToast({ type: "success", message: `${component.name} added to your request.` });
    setTimeout(() => setToast(null), 2200);
  }

  async function joinWaitlist(component) {
    const cid = component._id ?? component.id;
    try {
      const result = await api.toggleWaitlist(cid);
      setToast({
        type: "success",
        message: result.on_waitlist
          ? `You’re on the waitlist (#${result.position}). We’ll notify you when it’s free.`
          : "Removed from waitlist.",
      });
      setTimeout(() => setToast(null), 2800);
      setComponents((prev) =>
        prev.map((c) => {
          const id = c._id ?? c.id;
          if (id !== cid) return c;
          const wl = c.waitlist || [];
          if (result.on_waitlist) {
            if (wl.includes(userId)) return c;
            return { ...c, waitlist: [...wl, userId] };
          }
          return { ...c, waitlist: wl.filter((id) => id !== userId) };
        })
      );
    } catch (err) {
      setToast({ type: "error", message: err.message });
      setTimeout(() => setToast(null), 2800);
    }
  }

  function updateQty(componentId, qty) {
    setCart((prev) =>
      prev.map((entry) =>
        entry.component_id === componentId
          ? { ...entry, qty: Math.max(1, Math.min(qty, entry.total_qty)) }
          : entry
      )
    );
  }

  function removeFromCart(componentId) {
    setCart((prev) => prev.filter((entry) => entry.component_id !== componentId));
  }

  return (
    <div className={`space-y-6 ${managerView ? "pb-6" : "pb-24 md:pb-6"}`}>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">
            {managerView ? "Inventory" : "Component catalog"}
          </h1>
          <p className="text-sm font-medium text-neo-muted mt-1">
            {managerView
              ? "Browse stock, add or remove units, add new SKUs, or delete lines. Process requests from the dashboard."
              : "Search, filter by availability, then add parts to your request basket."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end">
          {managerView && (
            <button
              type="button"
              className="neo-btn-primary px-5 py-3 text-base"
              onClick={() => setAddModalOpen(true)}
            >
              <Plus className="h-5 w-5" />
              Add inventory item
            </button>
          )}
          {!managerView && (
            <button
              type="button"
              className="neo-btn-primary px-5 py-3 text-base relative"
              onClick={() => setPanelOpen(true)}
              disabled={cart.length === 0}
            >
              <ShoppingCart className="h-5 w-5" />
              Review request
              {cartCount > 0 && (
                <span className="absolute -top-2 -right-2 min-w-[1.75rem] h-7 px-1 flex items-center justify-center rounded-sm border-2 border-neo-line bg-neo-pink text-white text-sm font-black shadow-neo-sm">
                  {cartCount > 99 ? "99+" : cartCount}
                </span>
              )}
            </button>
          )}
        </div>
      </div>

      <div className="neo-card p-4 flex flex-col md:flex-row gap-3 md:items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-neo-muted" aria-hidden />
          <input
            className="neo-input pl-9"
            placeholder="Search by name, code, or type"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            aria-label="Search components"
          />
        </div>
        <select
          className="neo-input md:w-48"
          value={type}
          onChange={(e) => setType(e.target.value)}
          aria-label="Filter by type"
        >
          {TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </select>
        <div className="flex gap-1 flex-wrap">
          {AVAILABILITY.map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => setAvailability(opt.id)}
              className={`px-3 py-1.5 text-xs font-bold border-2 border-neo-line shadow-neo-sm ${
                availability === opt.id
                  ? "bg-neo-cyan/50"
                  : "bg-white hover:bg-neo-bg"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <div className="neo-card p-4 flex items-start gap-2 text-sm font-semibold border-neo-pink bg-neo-pink/10">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          {error}
        </div>
      )}

      {loading ? (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="neo-card h-44 animate-pulse bg-neo-bg" />
          ))}
        </div>
      ) : components.length === 0 ? (
        <EmptyState
          icon={Boxes}
          title="No components match your filters"
          description="Try a different search term or clear the availability filter."
        />
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {components.map((component) => (
            <ComponentCard
              key={component._id ?? component.id}
              component={component}
              cart={cart}
              userId={userId}
              managerView={managerView}
              inventoryBusy={inventoryBusyId === (component._id ?? component.id)}
              onAdjustStock={handleAdjustStock}
              onDeleteComponent={handleDeleteComponent}
              onAdd={() => addToCart(component)}
              onToggleWaitlist={() => joinWaitlist(component)}
            />
          ))}
        </div>
      )}

      {!managerView && (
        <RequestPanel
          open={panelOpen}
          onClose={() => setPanelOpen(false)}
          cart={cart}
          onUpdateQty={updateQty}
          onRemove={removeFromCart}
          onSubmitted={() => {
            setCart([]);
            setPanelOpen(false);
            setToast({ type: "success", message: "Request submitted." });
            setTimeout(() => setToast(null), 2200);
            api.listComponents(filters).then(setComponents).catch(() => {});
          }}
        />
      )}

      {!managerView && cart.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 p-3 md:hidden z-30 bg-neo-bg/95 border-t-2 border-neo-line shadow-[0_-4px_0_0_#0f0f0f]">
          <button
            type="button"
            className="w-full neo-btn-primary py-3 justify-center relative"
            onClick={() => setPanelOpen(true)}
          >
            <PackageOpen className="h-5 w-5" />
            Review & submit request
            <span className="ml-1 inline-flex min-w-[1.5rem] justify-center rounded-sm border-2 border-neo-line bg-neo-pink text-white text-sm px-1 font-black">
              {cartCount}
            </span>
          </button>
        </div>
      )}

      {toast && (
        <div
          role="status"
          className={`fixed bottom-6 left-1/2 z-50 -translate-x-1/2 px-5 py-3 neo-border max-w-[90vw] font-bold text-sm flex items-center gap-2 shadow-neo ${
            toast.type === "success" ? "bg-neo-ink text-white border-white" : "bg-neo-pink text-white border-neo-line"
          }`}
        >
          {toast.type === "success" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {toast.message}
        </div>
      )}

      {addModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-neo-ink/50"
            onClick={() => !addSubmitting && setAddModalOpen(false)}
            aria-hidden
          />
          <div
            className="relative neo-card w-full max-w-md p-5 max-h-[90vh] overflow-y-auto"
            role="dialog"
            aria-modal="true"
            aria-labelledby="inv-add-title"
          >
            <header className="flex items-start justify-between mb-3">
              <div>
                <h2 id="inv-add-title" className="font-display text-lg font-bold">
                  Add inventory item
                </h2>
                <p className="text-xs font-medium text-neo-muted mt-0.5">
                  Creates a new SKU with the chosen number of good shelf units.
                </p>
              </div>
              <button
                type="button"
                onClick={() => !addSubmitting && setAddModalOpen(false)}
                className="neo-btn-ghost p-1.5"
                aria-label="Close"
                disabled={addSubmitting}
              >
                <X className="h-4 w-4" />
              </button>
            </header>

            <form onSubmit={handleAddItemSubmit} className="space-y-3">
              <div>
                <label htmlFor="inv-code" className="neo-label">
                  Stock code <span className="text-neo-pink">*</span>
                </label>
                <input
                  id="inv-code"
                  className="neo-input font-mono"
                  value={addForm.code}
                  onChange={(e) => setAddForm((f) => ({ ...f, code: e.target.value }))}
                  placeholder="e.g. ARD-NANO"
                  autoFocus
                  required
                />
              </div>
              <div>
                <label htmlFor="inv-name" className="neo-label">
                  Name <span className="text-neo-pink">*</span>
                </label>
                <input
                  id="inv-name"
                  className="neo-input"
                  value={addForm.name}
                  onChange={(e) => setAddForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="Component display name"
                  required
                />
              </div>
              <div>
                <label htmlFor="inv-type" className="neo-label">
                  Type
                </label>
                <select
                  id="inv-type"
                  className="neo-input"
                  value={addForm.type}
                  onChange={(e) => setAddForm((f) => ({ ...f, type: e.target.value }))}
                >
                  {INVENTORY_TYPES.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="inv-desc" className="neo-label">
                  Description
                </label>
                <input
                  id="inv-desc"
                  className="neo-input"
                  value={addForm.description}
                  onChange={(e) => setAddForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional short description"
                />
              </div>
              <div>
                <label htmlFor="inv-qty" className="neo-label">
                  Initial good units
                </label>
                <input
                  id="inv-qty"
                  className="neo-input"
                  type="number"
                  min={0}
                  max={500}
                  value={addForm.quantity}
                  onChange={(e) => setAddForm((f) => ({ ...f, quantity: e.target.value }))}
                />
              </div>

              {addError && (
                <div className="neo-border bg-neo-pink/10 p-3 text-sm font-semibold text-neo-ink flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  {addError}
                </div>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="neo-btn-secondary flex-1"
                  disabled={addSubmitting}
                >
                  Cancel
                </button>
                <button type="submit" className="neo-btn-primary flex-1" disabled={addSubmitting}>
                  {addSubmitting ? "Saving…" : "Add item"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ComponentCard({
  component,
  cart,
  userId,
  onAdd,
  onToggleWaitlist,
  managerView,
  inventoryBusy,
  onAdjustStock,
  onDeleteComponent,
}) {
  const cid = component._id ?? component.id;
  const availability = availabilityLabel(component);
  const isOut = component.available_qty === 0;
  const inCart = cart.find((c) => c.component_id === cid);
  const damagedCount = component.units?.filter((u) => u.condition === "damaged").length ?? 0;
  const isWaitlisted = Boolean(userId && (component.waitlist || []).includes(userId));
  const waitlistCount = (component.waitlist || []).length;

  return (
    <article className="neo-card p-4 flex flex-col h-full">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="text-[10px] font-bold uppercase tracking-wider text-neo-muted">
            {component.type}
          </div>
          <h3 className="mt-1 font-display font-bold leading-snug">{component.name}</h3>
          <div className="mt-1 text-xs font-mono font-semibold text-neo-muted">{component.code}</div>
        </div>
        <span className={availability.className}>{availability.label}</span>
      </div>
      <p className="mt-3 text-sm font-medium text-neo-ink/80 line-clamp-2 flex-1">{component.description}</p>

      {damagedCount > 0 && (
        <div className="mt-3 flex items-center gap-1.5 text-xs font-bold text-neo-ink bg-neo-yellow/40 border-2 border-neo-line px-2 py-1 w-fit">
          <Clock4 className="h-3.5 w-3.5" aria-hidden />
          {damagedCount} in maintenance
        </div>
      )}

      {managerView ? (
        <div className="mt-4 pt-3 border-t-2 border-neo-line space-y-2 text-xs font-bold font-mono">
          <div>
            {component.available_qty} / {component.total_qty} available
          </div>
          {waitlistCount > 0 && (
            <div className="font-sans font-semibold text-neo-muted">
              {waitlistCount} on waitlist
            </div>
          )}
          <div className="flex flex-wrap gap-2 font-sans">
            <button
              type="button"
              className="neo-btn-secondary flex-1 min-w-[6.5rem] text-xs py-2"
              disabled={inventoryBusy || component.available_qty <= 0}
              onClick={() => onAdjustStock(cid, { remove_good: 1 })}
            >
              <Minus className="h-4 w-4" /> −1 unit
            </button>
            <button
              type="button"
              className="neo-btn-secondary flex-1 min-w-[6.5rem] text-xs py-2"
              disabled={inventoryBusy}
              onClick={() => onAdjustStock(cid, { add_good: 1 })}
            >
              <Plus className="h-4 w-4" /> +1 unit
            </button>
          </div>
          <button
            type="button"
            className="neo-btn-danger w-full text-xs py-2 font-sans"
            disabled={inventoryBusy}
            onClick={() => onDeleteComponent(cid, component.name)}
          >
            <Trash2 className="h-4 w-4" /> Remove SKU
          </button>
        </div>
      ) : (
        <div className="mt-4 flex items-center gap-2">
          {isOut ? (
            <button
              type="button"
              onClick={onToggleWaitlist}
              className={isWaitlisted ? "neo-btn-secondary flex-1 bg-neo-cyan/30" : "neo-btn-secondary flex-1"}
            >
              <Clock4 className="h-4 w-4" />
              {isWaitlisted ? "On waitlist · tap to leave" : "Join waitlist"}
            </button>
          ) : inCart ? (
            <button type="button" onClick={onAdd} className="neo-btn-secondary flex-1">
              <Plus className="h-4 w-4" /> Add more ({inCart.qty})
            </button>
          ) : (
            <button type="button" onClick={onAdd} className="neo-btn-primary flex-1">
              <Plus className="h-4 w-4" /> Add to request
            </button>
          )}
        </div>
      )}
    </article>
  );
}
