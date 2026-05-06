import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  Camera,
  CheckCircle2,
  ListChecks,
  PackageCheck,
  ShieldAlert,
} from "lucide-react";

import { api, ApiError } from "../../lib/api.js";
import StatusBadge from "../../components/StatusBadge.jsx";
import { formatDateTime } from "../../lib/format.js";

const STEPS = [
  { id: 1, label: "Review", icon: ListChecks },
  { id: 2, label: "Condition", icon: PackageCheck },
  { id: 3, label: "Damage notes", icon: ShieldAlert },
  { id: 4, label: "Confirm", icon: CheckCircle2 },
];

const CONDITIONS = [
  { id: "good", label: "Good" },
  { id: "damaged", label: "Damaged" },
  { id: "lost", label: "Lost" },
];

export default function ReturnWizard() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const [unitState, setUnitState] = useState({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .getRequest(id)
      .then((data) => {
        if (cancelled) return;
        if (data.status !== "active") {
          setError(`This request cannot be returned (status: ${data.status}).`);
        }
        setRequest(data);
        const initial = {};
        data.items.forEach((item) => {
          item.issued_unit_ids.forEach((uid) => {
            initial[`${item.component_id}::${uid}`] = { condition: "good", note: "", photo: null };
          });
        });
        setUnitState(initial);
      })
      .catch((err) => {
        if (!cancelled) setError(err instanceof ApiError ? err.message : "Failed to load");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  const flagged = useMemo(
    () =>
      Object.entries(unitState)
        .filter(([, v]) => v.condition !== "good")
        .map(([key, v]) => {
          const [componentId, unitId] = key.split("::");
          return { componentId, unitId, ...v };
        }),
    [unitState]
  );

  function setUnit(key, patch) {
    setUnitState((prev) => ({ ...prev, [key]: { ...prev[key], ...patch } }));
  }

  function assertAllDamageNotes() {
    for (const item of request.items) {
      for (const uid of item.issued_unit_ids) {
        const key = `${item.component_id}::${uid}`;
        const state = unitState[key] || { condition: "good", note: "" };
        if (state.condition !== "good" && !String(state.note || "").trim()) {
          return { unitId: uid, key };
        }
      }
    }
    return null;
  }

  function handleNext() {
    setError(null);
    if (step === 1) {
      setStep(2);
      return;
    }
    if (step === 2) {
      setStep(flagged.length > 0 ? 3 : 4);
      return;
    }
    if (step === 3) {
      const missing = flagged.find((f) => !f.note?.trim());
      if (missing) {
        setError(`Add a note for unit ${missing.unitId} before continuing.`);
        return;
      }
      const strict = assertAllDamageNotes();
      if (strict) {
        setError(`Damage or lost units need a written note (${strict.unitId}).`);
        return;
      }
      setStep(4);
      return;
    }
  }

  function handleBack() {
    setError(null);
    if (step === 4 && flagged.length === 0) {
      setStep(2);
      return;
    }
    setStep((s) => Math.max(1, s - 1));
  }

  async function handleSubmit() {
    if (!request) return;
    setError(null);
    const missing = assertAllDamageNotes();
    if (missing) {
      setError(`Add a damage note for unit ${missing.unitId} before submitting.`);
      setStep(3);
      return;
    }
    try {
      setSubmitting(true);
      const items = request.items.map((item) => ({
        component_id: item.component_id,
        units: item.issued_unit_ids.map((uid) => {
          const state = unitState[`${item.component_id}::${uid}`] || { condition: "good" };
          return {
            unit_id: uid,
            condition: state.condition,
            note: state.condition === "good" ? null : state.note || null,
            photo: state.condition === "good" ? null : state.photo || null,
          };
        }),
      }));
      await api.returnRequest(request._id, { items });
      navigate(`/manager/requests/${request._id}`, { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Return failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <div className="neo-card h-64 animate-pulse bg-neo-bg" />;
  if (!request) {
    return (
      <div className="neo-card p-4 font-semibold border-neo-pink bg-neo-pink/10">{error || "Not found."}</div>
    );
  }
  if (error && request.status !== "active") {
    return (
      <div className="neo-card p-4 font-semibold border-neo-pink bg-neo-pink/10">
        {error}
        <button type="button" onClick={() => navigate(-1)} className="mt-3 neo-btn-secondary block">
          Go back
        </button>
      </div>
    );
  }

  const currentStepNumber = step === 3 && flagged.length === 0 ? 4 : step;
  const visibleSteps = flagged.length === 0 ? STEPS.filter((s) => s.id !== 3) : STEPS;

  return (
    <div className="space-y-4 max-w-4xl">
      <button
        type="button"
        onClick={() => navigate(-1)}
        className="text-sm font-black inline-flex items-center gap-1 neo-btn-ghost px-2"
      >
        <ArrowLeft className="h-4 w-4" /> Back
      </button>

      <header className="neo-card p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-sm">
              <span className="font-mono font-bold text-neo-muted">#{request.request_number}</span>
              <StatusBadge status={request.status} />
            </div>
            <h1 className="mt-2 font-display text-2xl font-bold">Process return</h1>
            <p className="text-sm font-medium text-neo-muted">
              {request.student_name} · {request.project_title}
            </p>
          </div>
        </div>

        <ol className="mt-5 grid grid-cols-4 gap-2">
          {visibleSteps.map((s) => {
            const isCurrent = s.id === currentStepNumber;
            const isDone = s.id < currentStepNumber;
            return (
              <li key={s.id} className="text-center">
                <div
                  className={`mx-auto h-2 w-full border border-neo-line ${
                    isDone || isCurrent ? "bg-neo-green" : "bg-neo-bg"
                  }`}
                />
                <div
                  className={`mt-2 text-xs font-black ${
                    isCurrent ? "text-neo-pink" : isDone ? "text-neo-ink" : "text-neo-muted"
                  }`}
                >
                  {s.label}
                </div>
              </li>
            );
          })}
        </ol>
      </header>

      {error && (
        <div className="neo-card p-3 border-neo-pink bg-neo-pink/10 text-sm font-bold flex items-start gap-2">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" /> {error}
        </div>
      )}

      <div className="neo-card p-5">
        {step === 1 && <Step1Review request={request} />}
        {step === 2 && <Step2Condition request={request} unitState={unitState} setUnit={setUnit} />}
        {step === 3 && (
          <Step3DamageDetails flagged={flagged} request={request} unitState={unitState} setUnit={setUnit} />
        )}
        {step === 4 && <Step4Confirm request={request} flagged={flagged} unitState={unitState} />}
      </div>

      <div className="flex justify-between gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleBack}
          disabled={step === 1 || submitting}
          className="neo-btn-secondary"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
        {step < 4 ? (
          <button type="button" onClick={handleNext} className="neo-btn-primary">
            Next <ArrowRight className="h-4 w-4" />
          </button>
        ) : (
          <button type="button" onClick={handleSubmit} className="neo-btn-primary" disabled={submitting}>
            <CheckCircle2 className="h-4 w-4" />
            {submitting ? "Submitting…" : "Submit return"}
          </button>
        )}
      </div>
    </div>
  );
}

function Step1Review({ request }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display font-bold">Verify items being returned</h2>
      <p className="text-sm font-medium text-neo-muted">
        Issued at {formatDateTime(request.issued_at)}. Confirm every unit is physically present before
        continuing.
      </p>
      <ul className="divide-y-2 divide-neo-line border-2 border-neo-line bg-white shadow-neo-sm">
        {request.items.map((item) => (
          <li key={item.component_id} className="p-3">
            <div className="font-bold">{item.component_name}</div>
            <div className="text-xs font-mono text-neo-muted">
              {item.component_code} · Qty {item.qty}
            </div>
            <div className="mt-1 flex flex-wrap gap-1">
              {item.issued_unit_ids.map((uid) => (
                <span key={uid} className="pill-neutral font-mono text-[10px]">
                  {uid}
                </span>
              ))}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Step2Condition({ request, unitState, setUnit }) {
  return (
    <div className="space-y-3">
      <h2 className="font-display font-bold">Mark each unit&rsquo;s condition</h2>
      <p className="text-sm font-medium text-neo-muted">
        Defaults to Good. Only change rows with visible damage or a missing unit. Damaged / lost requires a
        note in the next step.
      </p>
      <ul className="divide-y-2 divide-neo-line border-2 border-neo-line bg-white shadow-neo-sm">
        {request.items.flatMap((item) =>
          item.issued_unit_ids.map((uid) => {
            const key = `${item.component_id}::${uid}`;
            const state = unitState[key] || { condition: "good" };
            return (
              <li key={key} className="p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm">{item.component_name}</div>
                  <div className="text-xs font-mono text-neo-muted">{uid}</div>
                </div>
                <div className="flex items-center gap-1 flex-wrap">
                  {CONDITIONS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setUnit(key, { condition: c.id })}
                      className={`px-3 py-1 text-xs font-black border-2 border-neo-line shadow-neo-sm ${
                        state.condition === c.id
                          ? c.id === "good"
                            ? "bg-neo-green/50"
                            : c.id === "damaged"
                              ? "bg-neo-pink text-white"
                              : "bg-neo-ink text-white"
                          : "bg-white hover:bg-neo-bg"
                      }`}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </li>
            );
          })
        )}
      </ul>
    </div>
  );
}

function Step3DamageDetails({ flagged, request, unitState, setUnit }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-2 neo-border bg-neo-yellow/50 p-3 text-sm font-bold text-neo-ink">
        <AlertTriangle className="h-4 w-4 mt-0.5 shrink-0" />
        Notes are required for every damaged or lost unit so maintenance staff have context.
      </div>
      <ul className="divide-y-2 divide-neo-line border-2 border-neo-line bg-white shadow-neo-sm">
        {flagged.map(({ componentId, unitId, condition }) => {
          const key = `${componentId}::${unitId}`;
          const state = unitState[key];
          const item = request.items.find((i) => i.component_id === componentId);
          const noteOk = Boolean(String(state?.note || "").trim());
          return (
            <li key={key} className="p-3 space-y-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-xs font-bold">{unitId}</span>
                <span className="text-xs font-medium text-neo-muted">{item?.component_name}</span>
                <span className={`pill ${condition === "damaged" ? "pill-out" : "pill-neutral"}`}>
                  {condition}
                </span>
              </div>
              <div>
                <label className="neo-label" htmlFor={`note-${key}`}>
                  Note <span className="text-neo-pink">*</span>
                </label>
                <textarea
                  id={`note-${key}`}
                  className={`neo-input min-h-[72px] ${!noteOk ? "ring-2 ring-neo-pink" : ""}`}
                  placeholder={
                    condition === "damaged"
                      ? "Describe the damage (e.g. burnt rows on breadboard B-21)"
                      : "What happened to this unit?"
                  }
                  value={state.note}
                  onChange={(e) => setUnit(key, { note: e.target.value })}
                  aria-invalid={!noteOk}
                  required
                />
              </div>
              <div>
                <span className="neo-label">Photo evidence (optional)</span>
                <PhotoInput
                  value={state.photo}
                  onChange={(photo) => setUnit(key, { photo })}
                  label={state.photo ? "Replace photo" : "Attach photo"}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Step4Confirm({ request, flagged, unitState }) {
  return (
    <div className="space-y-4">
      <h2 className="font-display font-bold">Review and submit</h2>
      <div className="grid sm:grid-cols-2 gap-3 text-sm">
        <div className="neo-card p-3">
          <div className="neo-label mb-0">Returned good</div>
          <div className="text-2xl font-black">
            {Object.values(unitState).filter((s) => s.condition === "good").length}
          </div>
        </div>
        <div className="neo-card p-3">
          <div className="neo-label mb-0">Flagged</div>
          <div className="text-2xl font-black text-neo-pink">{flagged.length}</div>
        </div>
      </div>
      {flagged.length > 0 && (
        <ul className="divide-y-2 divide-neo-line border-2 border-neo-line bg-white">
          {flagged.map(({ componentId, unitId, condition, note, photo }) => {
            const item = request.items.find((i) => i.component_id === componentId);
            return (
              <li key={`${componentId}::${unitId}`} className="p-3 flex items-start gap-3">
                {photo && (
                  <img
                    src={photo}
                    alt={`Damage on ${unitId}`}
                    className="h-14 w-14 object-cover border-2 border-neo-line shadow-neo-sm"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-bold">
                    {unitId}{" "}
                    <span className="text-neo-muted font-medium">— {item?.component_name}</span>
                  </div>
                  <span className={`pill mt-1 ${condition === "damaged" ? "pill-out" : "pill-neutral"}`}>
                    {condition}
                  </span>
                  <p className="text-xs font-semibold text-neo-ink mt-1">{note}</p>
                </div>
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-xs font-medium text-neo-muted">
        Submitting returns good units to inventory and sends damaged or lost units to the Maintenance Queue.
        The student receives an in-app notification.
      </p>
    </div>
  );
}

function PhotoInput({ value, onChange, label }) {
  const [localError, setLocalError] = useState(null);

  function handleFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 800_000) {
      setLocalError("Photo too large; please use under 800 KB.");
      return;
    }
    setLocalError(null);
    const reader = new FileReader();
    reader.onload = () => onChange(reader.result);
    reader.readAsDataURL(file);
  }

  return (
    <div className="flex flex-wrap items-center gap-3">
      {value && (
        <img
          src={value}
          alt="damage"
          className="h-16 w-16 object-cover border-2 border-neo-line shadow-neo-sm"
        />
      )}
      <label className="neo-btn-secondary cursor-pointer">
        <Camera className="h-4 w-4" />
        {label}
        <input type="file" accept="image/*" onChange={handleFile} className="hidden" />
      </label>
      {value && (
        <button type="button" onClick={() => onChange(null)} className="neo-btn-ghost text-xs">
          Remove
        </button>
      )}
      {localError && <span className="text-xs font-bold text-neo-pink">{localError}</span>}
    </div>
  );
}
