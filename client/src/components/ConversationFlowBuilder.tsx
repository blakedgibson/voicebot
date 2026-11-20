import { useState, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Edit3, Check, X, Loader2, AlertCircle, RefreshCw, ChevronDown, ChevronUp, Plus, Zap } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

// ─── Action function metadata ─────────────────────────────────────────────────

interface ActionFunc {
  name: string;
  displayText: string;
  color: string;       // Tailwind color token without suffix, e.g. "blue"
  category: string;
  description: string;
}

const APPOINTMENT_FUNCS = new Set([
  'book_appointment','modify_appointment','create_reservation','book_service',
  'book_calendar_event','cancel_session','book_class','cancel_appointment',
  'reschedule_appointment','check_current_appointment','modify_appointment_details',
  'book_daycare','book_training','book_showing','schedule_class','enroll_student',
]);
const CRM_FUNCS = new Set([
  'customer_memory','get_customer_details','update_customer_preferences','log_feedback',
  'log_inquiry','update_patient_record','manage_membership','update_membership',
  'cancel_membership','update_pet_record','update_client_record','update_student_record',
  'add_client_note','record_feedback','log_customer_request',
]);
const POS_FUNCS = new Set([
  'place_order','update_service_status','request_estimate','update_treatment_request',
  'update_service_request','update_procedure','update_job_status',
  'request_prescription_refill','submit_maintenance_request','update_lease',
]);
const CALL_FUNCS = new Set(['transfer_call','end_call','hangup','disconnect_call']);
const MSG_FUNCS  = new Set([
  'notify_team','sms_order_confirmation','sms_reservation_confirmation',
  'sms_delivery_tracking','sms_appointment_confirmation','sms_modification_alert',
  'sms_catering_confirmation','sms_feedback_confirmation',
]);

function getActionColor(name: string): string {
  if (APPOINTMENT_FUNCS.has(name)) return "blue";
  if (CRM_FUNCS.has(name))         return "purple";
  if (POS_FUNCS.has(name))         return "green";
  if (CALL_FUNCS.has(name))        return "cyan";
  if (MSG_FUNCS.has(name))         return "orange";
  // Pattern-based fallback
  const n = name.toLowerCase();
  if (n === 'cancel' || n === 'modify' || n === 'reschedule' || n === 'rebook' ||
      /^(book|schedule|cancel|modify|reschedule|rebook)_/.test(n) || n.includes('appointment') || n.includes('reservation')) return "blue";
  if (n === 'update' || n === 'lookup' || /^(update_customer|get_customer|log_|update_patient|update_pet|update_client|manage_member)/.test(n)) return "purple";
  if (/^(sms_|send_sms|notify_|send_text)/.test(n)) return "orange";
  if (/^(transfer|end_call|hangup|disconnect)/.test(n)) return "cyan";
  return "gray";
}

function getActionCategory(name: string): string {
  if (APPOINTMENT_FUNCS.has(name)) return "Scheduling";
  if (CRM_FUNCS.has(name))         return "Customer Info";
  if (POS_FUNCS.has(name))         return "Orders & Services";
  if (CALL_FUNCS.has(name))        return "Call";
  if (MSG_FUNCS.has(name))         return "Messaging";
  // Pattern-based fallback
  const n = name.toLowerCase();
  if (n === 'cancel' || n === 'modify' || n === 'reschedule' || n === 'rebook' ||
      /^(book|schedule|cancel|modify|reschedule|rebook)_/.test(n) || n.includes('appointment') || n.includes('reservation')) return "Scheduling";
  if (n === 'update' || n === 'lookup' || /^(update_customer|get_customer|log_|update_patient|update_pet|update_client|manage_member)/.test(n)) return "Customer Info";
  if (/^(sms_|send_sms|notify_|send_text)/.test(n)) return "Messaging";
  if (/^(transfer|end_call|hangup|disconnect)/.test(n)) return "Call";
  return "Custom";
}

function formatFuncName(name: string): string {
  return name.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

function buildActionList(raw: any[]): ActionFunc[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((fn: any) => {
    const name = fn.name || "";
    return {
      name,
      displayText: formatFuncName(name),
      color: getActionColor(name),
      category: getActionCategory(name),
      description: fn.description || "",
    };
  });
}

// ─── Static Tailwind color class maps ────────────────────────────────────────
// Dynamic class interpolation (e.g. `text-${color}-400`) is invisible at
// runtime because Tailwind JIT only includes classes it finds as static
// strings during build. Every color variant must be listed explicitly here.

const CHIP_CLASSES: Record<string, string> = {
  blue:   "bg-blue-500/15 text-blue-400 border-blue-500/20 hover:bg-blue-500/25 hover:border-blue-500/40",
  purple: "bg-purple-500/15 text-purple-400 border-purple-500/20 hover:bg-purple-500/25 hover:border-purple-500/40",
  green:  "bg-green-500/15 text-green-400 border-green-500/20 hover:bg-green-500/25 hover:border-green-500/40",
  cyan:   "bg-cyan-500/15 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/25 hover:border-cyan-500/40",
  orange: "bg-orange-500/15 text-orange-400 border-orange-500/20 hover:bg-orange-500/25 hover:border-orange-500/40",
  gray:   "bg-gray-500/15 text-gray-400 border-gray-500/20 hover:bg-gray-500/25 hover:border-gray-500/40",
  sky:    "bg-sky-500/15 text-sky-400 border-sky-500/20 hover:bg-sky-500/25 hover:border-sky-500/40",
  indigo: "bg-indigo-500/15 text-indigo-400 border-indigo-500/20 hover:bg-indigo-500/25 hover:border-indigo-500/40",
  violet: "bg-violet-500/15 text-violet-400 border-violet-500/20 hover:bg-violet-500/25 hover:border-violet-500/40",
  rose:   "bg-rose-500/15 text-rose-400 border-rose-500/20 hover:bg-rose-500/25 hover:border-rose-500/40",
  amber:  "bg-amber-500/15 text-amber-400 border-amber-500/20 hover:bg-amber-500/25 hover:border-amber-500/40",
  yellow: "bg-yellow-500/15 text-yellow-400 border-yellow-500/20 hover:bg-yellow-500/25 hover:border-yellow-500/40",
  teal:   "bg-teal-500/15 text-teal-400 border-teal-500/20 hover:bg-teal-500/25 hover:border-teal-500/40",
  emerald:"bg-emerald-500/15 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/25 hover:border-emerald-500/40",
  lime:   "bg-lime-500/15 text-lime-400 border-lime-500/20 hover:bg-lime-500/25 hover:border-lime-500/40",
};

const PREVIEW_TEXT_CLASSES: Record<string, string> = {
  blue:   "font-semibold text-blue-400",
  purple: "font-semibold text-purple-400",
  green:  "font-semibold text-green-400",
  cyan:   "font-semibold text-cyan-400",
  orange: "font-semibold text-orange-400",
  gray:   "font-semibold text-gray-400",
  sky:    "font-semibold text-sky-400",
  indigo: "font-semibold text-indigo-400",
  violet: "font-semibold text-violet-400",
  rose:   "font-semibold text-rose-400",
  amber:  "font-semibold text-amber-400",
  yellow: "font-semibold text-yellow-400",
  teal:   "font-semibold text-teal-400",
  emerald:"font-semibold text-emerald-400",
  lime:   "font-semibold text-lime-400",
};

function getChipClass(color: string): string {
  return CHIP_CLASSES[color] ?? CHIP_CLASSES.gray;
}

function getPreviewTextClass(color: string): string {
  return PREVIEW_TEXT_CLASSES[color] ?? PREVIEW_TEXT_CLASSES.gray;
}

// ─── Node metadata ────────────────────────────────────────────────────────────

interface NodeMeta {
  label: string;
  description: string;
  icon: string;          // FA class
  color: string;         // Tailwind color token
  section: "start" | "branch" | "wrapup" | "end";
}

const COLOR_MAP: Record<string, string> = {
  blue:    "#2563EB", sky:     "#0EA5E9", indigo:  "#4F46E5",
  violet:  "#7C3AED", purple:  "#9333EA", rose:    "#E11D48",
  pink:    "#EC4899", red:     "#DC2626", orange:  "#EA580C",
  amber:   "#D97706", yellow:  "#CA8A04", lime:    "#65A30D",
  green:   "#16A34A", emerald: "#059669", teal:    "#0D9488",
  cyan:    "#0891B2", gray:    "#6B7280",
};

function getNodeMeta(id: string, type: string): NodeMeta {
  const t = (type || "").toLowerCase();
  const k = (id  || "").toLowerCase();

  if (k === "greeting" || t === "greeting")
    return { label: "Welcome Greeting", description: "How your AI greets every caller when they call in.", icon: "fa-phone-volume", color: "blue", section: "start" };

  if (t === "end_call" || k === "end_call" || k === "end" || k === "goodbye")
    return { label: "End Call", description: "The AI wraps up the conversation and says goodbye.", icon: "fa-phone-xmark", color: "gray", section: "end" };

  if (t === "transfer_call" || k.includes("transfer"))
    return { label: "Transfer to Staff", description: "Connect the caller to a live team member.", icon: "fa-phone-arrow-right", color: "cyan", section: "branch" };

  if (k.includes("book") || k === "book_appointment" || k === "book_calendar_event")
    return { label: "Book Appointment", description: "Schedule a new appointment or booking for the caller.", icon: "fa-calendar-plus", color: "blue", section: "branch" };

  if (k.includes("reschedule"))
    return { label: "Reschedule Appointment", description: "Move an existing booking to a different date or time.", icon: "fa-calendar-xmark", color: "sky", section: "branch" };

  if (k.includes("cancel_appointment") || k === "cancel")
    return { label: "Cancel Appointment", description: "Cancel a booking the caller no longer needs.", icon: "fa-calendar-minus", color: "rose", section: "branch" };

  if (k.includes("modify"))
    return { label: "Modify Appointment", description: "Make changes to an existing appointment.", icon: "fa-pen-to-square", color: "violet", section: "branch" };

  if (k.includes("check_appointment") || k.includes("check_status"))
    return { label: "Check Appointment", description: "Look up details about an upcoming booking.", icon: "fa-calendar-check", color: "indigo", section: "branch" };

  if (k.includes("place_order") || k.includes("order"))
    return { label: "Place an Order", description: "Take a food or product order from the caller.", icon: "fa-bag-shopping", color: "green", section: "branch" };

  if (k.includes("create_reservation") || k === "reservation")
    return { label: "Make a Reservation", description: "Reserve a table or spot for the caller.", icon: "fa-chair", color: "teal", section: "branch" };

  if (k.includes("schedule_delivery") || k.includes("delivery"))
    return { label: "Schedule Delivery", description: "Arrange a delivery for the caller's order.", icon: "fa-truck", color: "emerald", section: "branch" };

  if (k.includes("catering"))
    return { label: "Catering Inquiry", description: "Help the caller plan a catering order or event.", icon: "fa-utensils", color: "lime", section: "branch" };

  if (k === "walk_in_inquiry" || k.includes("walk_in"))
    return { label: "Walk-In Info", description: "Answer questions about walk-in availability and wait times.", icon: "fa-person-walking-arrow-right", color: "orange", section: "branch" };

  if (k === "gift_card" || k.includes("gift"))
    return { label: "Gift Cards", description: "Handle inquiries and purchases for gift cards.", icon: "fa-gift", color: "purple", section: "branch" };

  if (k === "pricing_inquiry" || k.includes("pricing") || k.includes("price"))
    return { label: "Pricing Questions", description: "Answer questions about prices, rates, or packages.", icon: "fa-tag", color: "yellow", section: "branch" };

  if (k.includes("membership"))
    return { label: "Membership", description: "Manage membership sign-ups, updates, and questions.", icon: "fa-id-card", color: "violet", section: "branch" };

  if (k.includes("alternative") || k.includes("fallback"))
    return { label: "Offer Alternatives", description: "Suggest other available times or options if the first choice isn't available.", icon: "fa-clock-rotate-left", color: "amber", section: "wrapup" };

  if (k.includes("feedback"))
    return { label: "Collect Feedback", description: "Ask the caller how their experience was before ending the call.", icon: "fa-star", color: "yellow", section: "wrapup" };

  return {
    label: id.replace(/_/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
    description: "Custom conversation step.",
    icon: "fa-message",
    color: "gray",
    section: "branch",
  };
}

// Escape special regex characters in a string
function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// ─── Action chip row (inside edit panel) ─────────────────────────────────────

const CATEGORY_ORDER = ["Scheduling", "Orders & Services", "Customer Info", "Messaging", "Call", "Custom"];
const CATEGORY_ICONS: Record<string, string> = {
  "Scheduling":        "fa-calendar",
  "Orders & Services": "fa-shopping-bag",
  "Customer Info":     "fa-user",
  "Messaging":         "fa-comment",
  "Call":              "fa-phone",
  "Custom":            "fa-plug",
};

function ActionPalette({ actions, onInsert }: { actions: ActionFunc[]; onInsert: (a: ActionFunc) => void }) {
  const [openCat, setOpenCat] = useState<string | null>(null);

  const byCategory: Record<string, ActionFunc[]> = {};
  actions.forEach(a => {
    (byCategory[a.category] = byCategory[a.category] || []).push(a);
  });

  const cats = CATEGORY_ORDER.filter(c => byCategory[c]?.length);

  if (actions.length === 0) return null;

  return (
    <div className="mt-2 border border-gray-800 rounded-lg overflow-hidden">
      <div className="flex items-center gap-2 px-3 py-2 bg-gray-900/60 border-b border-gray-800">
        <Zap className="w-3.5 h-3.5 text-gray-500" />
        <span className="text-xs text-gray-500 font-medium">Add an Action</span>
        <span className="text-xs text-gray-600 ml-auto">Tap to insert into instructions</span>
      </div>
      <div className="p-2 space-y-1">
        {cats.map(cat => (
          <div key={cat}>
            <button
              onClick={() => setOpenCat(openCat === cat ? null : cat)}
              className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-gray-800 transition-colors text-left"
            >
              <i className={`fas ${CATEGORY_ICONS[cat] || "fa-plug"} text-xs text-gray-500 w-4`} />
              <span className="text-xs text-gray-400 font-medium flex-1">{cat}</span>
              <span className="text-xs text-gray-600">{byCategory[cat].length}</span>
              {openCat === cat ? <ChevronUp className="w-3 h-3 text-gray-600" /> : <ChevronDown className="w-3 h-3 text-gray-600" />}
            </button>
            {openCat === cat && (
              <div className="flex flex-wrap gap-1.5 px-2 pb-2 mt-1">
                {byCategory[cat].map(a => (
                  <button
                    key={a.name}
                    onClick={() => onInsert(a)}
                    title={a.description}
                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border transition-colors ${getChipClass(a.color)}`}
                  >
                    <Plus className="w-2.5 h-2.5" />
                    {a.displayText}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Instruction preview with action chips highlighted ────────────────────────

function InstructionPreview({ text, actions, expanded }: { text: string; actions: ActionFunc[]; expanded: boolean }) {
  if (!text.trim()) {
    return <p className="text-xs text-gray-600 italic mt-1">No custom instructions yet. The AI will use the default behavior for this step.</p>;
  }

  // Highlight action names in the text using properly escaped regex
  const actionNames = actions.map(a => a.name);
  if (actionNames.length === 0) {
    return (
      <p className={`text-xs text-gray-400 mt-1 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
        {text}
      </p>
    );
  }

  const pattern = new RegExp(`\\b(${actionNames.map(escapeRegex).join("|")})\\b`, "g");
  const parts: { text: string; isAction?: boolean; action?: ActionFunc }[] = [];
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text)) !== null) {
    if (match.index > last) parts.push({ text: text.slice(last, match.index) });
    const action = actions.find(a => a.name === match![0]);
    parts.push({ text: match[0], isAction: true, action });
    last = match.index + match[0].length;
  }
  if (last < text.length) parts.push({ text: text.slice(last) });

  return (
    <p className={`text-xs text-gray-400 mt-1 leading-relaxed ${expanded ? "" : "line-clamp-3"}`}>
      {parts.map((p, i) =>
        p.isAction && p.action ? (
          <span key={i} className={getPreviewTextClass(p.action.color)}>
            {formatFuncName(p.action.name)}
          </span>
        ) : (
          <span key={i}>{p.text}</span>
        )
      )}
    </p>
  );
}

// ─── Single node card ─────────────────────────────────────────────────────────

const MAX_INSTRUCTION_LENGTH = 4000;

interface NodeCardProps {
  node: any;
  agentId: string;
  conversationFlowId: string;
  actions: ActionFunc[];
  onSaved: () => void;
  variant?: "start" | "end" | "branch" | "wrapup";
}

function NodeCard({ node, agentId, conversationFlowId, actions, onSaved, variant = "branch" }: NodeCardProps) {
  const meta = getNodeMeta(node.id, node.type);
  const instruction: string = node.instruction?.text || node.instruction?.content || "";
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(instruction);
  const [expanded, setExpanded] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();

  const saveMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", "/api/agent/conversation-flow-nodes", {
      agentId,
      conversationFlowId,
      nodeId: node.id,
      instruction: draft.trim(),
    }),
    onSuccess: () => {
      setEditing(false);
      onSaved();
      toast({ title: "Saved", description: `"${meta.label}" updated.` });
    },
    onError: (error: any) => {
      toast({
        title: "Could not save",
        description: error?.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  function startEdit() {
    setDraft(instruction);
    setEditing(true);
  }

  function cancelEdit() {
    setDraft(instruction);
    setEditing(false);
  }

  function insertAction(action: ActionFunc) {
    const ta = textareaRef.current;
    if (!ta) {
      setDraft(d => d + (d.endsWith(" ") || d === "" ? "" : " ") + action.name + " ");
      return;
    }
    const start = ta.selectionStart;
    const end   = ta.selectionEnd;
    const before = draft.slice(0, start);
    const after  = draft.slice(end);
    const sep = before.length > 0 && !before.endsWith(" ") ? " " : "";
    const newText = before + sep + action.name + " " + after;
    if (newText.length > MAX_INSTRUCTION_LENGTH) return;
    setDraft(newText);
    requestAnimationFrame(() => {
      ta.focus();
      const pos = start + sep.length + action.name.length + 1;
      ta.setSelectionRange(pos, pos);
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
      e.preventDefault();
      if (!saveMutation.isPending && draft.trim().length > 0) {
        saveMutation.mutate();
      }
    }
  }

  const isStart = variant === "start";
  const isEnd   = variant === "end";
  const accent  = COLOR_MAP[meta.color] || COLOR_MAP.gray;
  const overLimit = draft.length > MAX_INSTRUCTION_LENGTH;

  const cardCls = [
    "relative rounded-xl border transition-all duration-200",
    "bg-[#111111]",
    isStart  ? "border-blue-500/40"  :
    isEnd    ? "border-gray-700/60"  :
    `border-gray-800/60 hover:border-gray-700/80`,
  ].join(" ");

  return (
    <div className={cardCls}>
      {/* Colored top border accent */}
      <div className="absolute top-0 left-0 right-0 h-[2px] rounded-t-xl"
           style={{ background: isEnd ? "transparent" : accent + "66" }} />

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          {/* Icon */}
          <div
            className="w-11 h-11 rounded-full flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: accent + "22", border: `1px solid ${accent}44` }}
          >
            <i className={`fas ${meta.icon} text-base`} style={{ color: accent }} />
          </div>

          {/* Label & description */}
          <div className="flex-1 min-w-0 pt-0.5">
            <h3 className="text-sm font-semibold text-white leading-snug">{meta.label}</h3>
            <p className="text-xs text-gray-500 mt-0.5 leading-relaxed">{meta.description}</p>
          </div>

          {/* Edit button (hidden for end_call) */}
          {!isEnd && !editing && (
            <button
              onClick={startEdit}
              className="flex-shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-300 hover:bg-gray-800 transition-colors mt-0.5"
              title="Customize this step"
            >
              <Edit3 className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Instruction preview (read mode) */}
        {!editing && (
          <div className="mt-3 pl-[60px]">
            <InstructionPreview text={instruction} actions={actions} expanded={expanded} />
            {instruction.length > 180 && (
              <button
                onClick={() => setExpanded(e => !e)}
                className="mt-1 text-xs text-gray-600 hover:text-gray-400 transition-colors flex items-center gap-1"
              >
                {expanded ? <><ChevronUp className="w-3 h-3" />Show less</> : <><ChevronDown className="w-3 h-3" />Show more</>}
              </button>
            )}
          </div>
        )}

        {/* Instruction editor (edit mode) */}
        {editing && (
          <div className="mt-4 space-y-2">
            <label className="text-xs text-gray-400 font-medium block">
              Instructions for this step
              <span className="ml-1 text-gray-600 font-normal">— write in plain language, the AI will follow these</span>
            </label>
            <textarea
              ref={textareaRef}
              value={draft}
              onChange={e => {
                if (e.target.value.length <= MAX_INSTRUCTION_LENGTH) {
                  setDraft(e.target.value);
                }
              }}
              onKeyDown={handleKeyDown}
              rows={6}
              placeholder={`Describe what the AI should do in this step...\n\nFor example: "Ask the caller for their name and preferred date. Confirm the details back before booking."`}
              className={`w-full rounded-lg bg-gray-900/80 border text-gray-200 text-sm p-3 resize-y outline-none focus:ring-1 leading-relaxed transition-colors placeholder:text-gray-700 ${
                overLimit
                  ? "border-red-500/60 focus:border-red-500/60 focus:ring-red-500/20"
                  : "border-gray-700 focus:border-blue-500/60 focus:ring-blue-500/20"
              }`}
              autoFocus
            />

            {/* Character counter */}
            <div className="flex justify-end">
              <span className={`text-xs ${draft.length > MAX_INSTRUCTION_LENGTH * 0.9 ? "text-amber-400" : "text-gray-600"}`}>
                {draft.length} / {MAX_INSTRUCTION_LENGTH}
              </span>
            </div>

            {/* Action palette */}
            <ActionPalette actions={actions} onInsert={insertAction} />

            {/* Save / Cancel */}
            <div className="flex justify-end gap-2 pt-1">
              <button
                onClick={cancelEdit}
                disabled={saveMutation.isPending}
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg text-gray-400 hover:text-white hover:bg-gray-800 transition-colors"
              >
                <X className="w-3.5 h-3.5" />
                Cancel
              </button>
              <button
                onClick={() => saveMutation.mutate()}
                disabled={saveMutation.isPending || overLimit || draft.trim().length === 0}
                title="Save (Ctrl+Enter)"
                className="flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-60"
              >
                {saveMutation.isPending
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <Check className="w-3.5 h-3.5" />}
                Save changes
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Section divider ──────────────────────────────────────────────────────────

function FlowDivider({ label, sublabel }: { label: string; sublabel?: string }) {
  return (
    <div className="relative flex flex-col items-center py-3 select-none">
      <div className="w-px h-5 bg-gray-800" />
      <div className="w-2.5 h-2.5 rounded-full bg-gray-700 ring-2 ring-gray-800 my-1" />
      <div className="px-4 py-1.5 rounded-lg bg-gray-900 border border-gray-800 text-center max-w-[280px]">
        <p className="text-[11px] font-medium text-gray-400">{label}</p>
        {sublabel && <p className="text-[10px] text-gray-600 mt-0.5">{sublabel}</p>}
      </div>
      <div className="w-px h-5 bg-gray-800 mt-1" />
    </div>
  );
}

function BranchDivider({ count }: { count: number }) {
  return (
    <div className="relative flex flex-col items-center py-2 select-none">
      <div className="w-px h-4 bg-gray-800" />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
        <div className="w-2 h-2 rounded-full bg-gray-700" />
        <p className="text-[11px] font-medium text-gray-400">
          Routes to {count} option{count !== 1 ? "s" : ""} below
        </p>
      </div>
      <div className="relative w-full mt-1 flex justify-center">
        <div className="w-px h-4 bg-gray-800" />
      </div>
    </div>
  );
}

function MergeDivider() {
  return (
    <div className="relative flex flex-col items-center py-2 select-none">
      <div className="w-px h-4 bg-gray-800" />
      <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-900 border border-gray-800">
        <p className="text-[11px] font-medium text-gray-400">After handling the caller's request</p>
      </div>
      <div className="w-px h-4 bg-gray-800 mt-1" />
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

interface ConversationFlowBuilderProps {
  agentId: string;
}

export function ConversationFlowBuilder({ agentId }: ConversationFlowBuilderProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Load flow nodes via apiRequest for consistent auth/error handling
  const { data, isLoading, isError, refetch } = useQuery<any>({
    queryKey: ["/api/agent/conversation-flow-nodes", agentId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/agent/conversation-flow-nodes?agentId=${agentId}`);
      if (!res.ok) throw new Error("Failed to load flow");
      return res.json();
    },
    enabled: !!agentId,
    staleTime: 30_000,
  });

  // Load available actions — surface a toast if this fails so user knows why the palette is empty
  const { data: rawFunctions, isError: actionsError } = useQuery<any[]>({
    queryKey: ["/api/integrations/retell-functions", agentId],
    queryFn: async () => {
      const res = await apiRequest("GET", `/api/integrations/retell-functions?agentId=${agentId}`);
      if (!res.ok) throw new Error("Failed to load actions");
      return res.json();
    },
    enabled: !!agentId,
    staleTime: 60_000,
  });

  // Notify once if actions failed to load
  if (actionsError) {
    toast({
      title: "Couldn't load actions",
      description: "The action palette is unavailable. You can still edit instructions manually.",
      variant: "destructive",
    });
  }

  // For conversation-flow agents the retell-functions endpoint returns [] because there is no LLM.
  // Fall back to the tools array embedded in the conversation flow itself (already fetched above).
  const actions = buildActionList(
    rawFunctions?.length ? rawFunctions : (data?.tools || [])
  );
  const nodes: any[] = data?.nodes || [];
  const conversationFlowId: string = data?.conversationFlowId || "";

  function invalidate() {
    queryClient.invalidateQueries({ queryKey: ["/api/agent/conversation-flow-nodes", agentId] });
  }

  // ── Categorise nodes by section ──────────────────────────────────────────
  const startNodes:  any[] = [];
  const branchNodes: any[] = [];
  const wrapupNodes: any[] = [];
  const endNodes:    any[] = [];

  nodes.forEach(n => {
    const meta = getNodeMeta(n.id, n.type);
    switch (meta.section) {
      case "start":  startNodes.push(n);  break;
      case "branch": branchNodes.push(n); break;
      case "wrapup": wrapupNodes.push(n); break;
      case "end":    endNodes.push(n);    break;
    }
  });

  // ─── Loading state ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
        <p className="text-sm">Loading your call flow…</p>
      </div>
    );
  }

  // ─── Error state ─────────────────────────────────────────────────────────
  if (isError || !data) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-500">
        <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center">
          <AlertCircle className="w-6 h-6 text-red-400" />
        </div>
        <div className="text-center">
          <p className="text-sm text-gray-300 font-medium">Couldn't load the call flow</p>
          <p className="text-xs text-gray-500 mt-1">Check your connection and try again.</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 text-sm rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Try again
        </button>
      </div>
    );
  }

  // ─── Empty state ─────────────────────────────────────────────────────────
  if (nodes.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-500">
        <div className="w-12 h-12 rounded-full bg-gray-800 flex items-center justify-center">
          <i className="fas fa-sitemap text-gray-600 text-lg" />
        </div>
        <p className="text-sm text-gray-400">No conversation steps set up yet.</p>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-400 transition-colors"
        >
          <RefreshCw className="w-3 h-3" />
          Refresh
        </button>
      </div>
    );
  }

  const sharedProps = { agentId, conversationFlowId, actions, onSaved: invalidate };

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* ── Scrollable canvas ── */}
      <div className="flex-1 overflow-y-auto px-4 py-6 space-y-0">
        {/* ─── "Call Starts" label ─── */}
        <div className="flex items-center gap-2 justify-center mb-4">
          <div className="h-px flex-1 max-w-[80px] bg-gray-800" />
          <span className="text-[10px] font-medium text-gray-600 uppercase tracking-widest px-2">Call starts here</span>
          <div className="h-px flex-1 max-w-[80px] bg-gray-800" />
        </div>

        {/* ─── Start nodes (Greeting) ─── */}
        {startNodes.map(n => (
          <NodeCard key={n.id} node={n} variant="start" {...sharedProps} />
        ))}

        {/* ─── Branch section ─── */}
        {branchNodes.length > 0 && (
          <>
            <BranchDivider count={branchNodes.length} />

            <div className="mb-3">
              <p className="text-[11px] text-gray-600 text-center">
                The AI listens and routes the call to the right option
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {branchNodes.map(n => (
                <NodeCard key={n.id} node={n} variant="branch" {...sharedProps} />
              ))}
            </div>
          </>
        )}

        {/* ─── Wrap-up section ─── */}
        {wrapupNodes.length > 0 && (
          <>
            <MergeDivider />
            <div className="space-y-3">
              {wrapupNodes.map(n => (
                <NodeCard key={n.id} node={n} variant="wrapup" {...sharedProps} />
              ))}
            </div>
          </>
        )}

        {/* ─── End nodes (End Call) ─── */}
        {endNodes.length > 0 && (
          <>
            <FlowDivider label="Call ends" sublabel="The AI says goodbye and closes the call" />
            {endNodes.map(n => (
              <NodeCard key={n.id} node={n} variant="end" {...sharedProps} />
            ))}
          </>
        )}

        {/* ─── "Call Ends" label ─── */}
        <div className="flex items-center gap-2 justify-center mt-6">
          <div className="h-px flex-1 max-w-[80px] bg-gray-800" />
          <span className="text-[10px] font-medium text-gray-600 uppercase tracking-widest px-2">Call ends here</span>
          <div className="h-px flex-1 max-w-[80px] bg-gray-800" />
        </div>

        <div className="h-8" />
      </div>
    </div>
  );
}
