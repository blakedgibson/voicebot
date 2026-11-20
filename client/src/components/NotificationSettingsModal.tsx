import { useState, useEffect, useCallback, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Bell, MessageSquare, Mail, Flag, Calendar, UserX, Clock, Send, Laptop, Gauge, AlertTriangle, CreditCard } from "lucide-react";

const STORAGE_KEY = "voicebot_notif_settings";

interface LocalNotifSettings {
  emailEnabled: boolean;
  desktopAlertsEnabled: boolean;
  flaggedCallAlerts: boolean;
  appointmentAlerts: boolean;
  transferAlerts: boolean;
  doNotDisturb: boolean;
  dndStart: string;
  dndEnd: string;
  minuteUsageAlert: boolean;
  minuteUsagePercent: number;
  minuteLimitAlert: boolean;
  paymentAlerts: boolean;
}

const defaultSettings: LocalNotifSettings = {
  emailEnabled: false,
  desktopAlertsEnabled: true,
  flaggedCallAlerts: true,
  appointmentAlerts: true,
  transferAlerts: true,
  doNotDisturb: false,
  dndStart: "22:00",
  dndEnd: "07:00",
  minuteUsageAlert: true,
  minuteUsagePercent: 80,
  minuteLimitAlert: true,
  paymentAlerts: true,
};

function loadSettings(): LocalNotifSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) };
  } catch {}
  return defaultSettings;
}

function saveSettings(s: LocalNotifSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
}

async function fetchEmailSettings(): Promise<{ notifyEmailAlerts: boolean; notifyDesktopAlerts: boolean; notifyCallFlagged: boolean }> {
  const res = await fetch('/api/notifications/email-settings', { credentials: 'include' });
  if (!res.ok) return { notifyEmailAlerts: false, notifyDesktopAlerts: true, notifyCallFlagged: true };
  return res.json();
}

async function persistEmailSettings(notifyEmailAlerts: boolean, notifyDesktopAlerts: boolean, notifyCallFlagged: boolean): Promise<void> {
  await fetch('/api/notifications/email-settings', {
    method: 'PUT',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notifyEmailAlerts, notifyDesktopAlerts, notifyCallFlagged }),
  }).catch(() => {});
}

interface Props {
  open: boolean;
  onClose: () => void;
  notificationPermission: NotificationPermission | "unsupported";
  onRequestDesktopPermission: (checked: boolean) => void;
  smsEnabled: boolean;
  onToggleSMS: (val: boolean) => void;
  smsPending?: boolean;
}

interface SettingRowProps {
  icon: React.ReactNode;
  iconBg: string;
  label: string;
  hint: string;
  checked: boolean;
  onCheckedChange: (val: boolean) => void;
  disabled?: boolean;
  warning?: string;
  children?: React.ReactNode;
}

const SettingRow = ({ icon, iconBg, label, hint, checked, onCheckedChange, disabled, warning, children }: SettingRowProps) => (
  <div className="flex items-start justify-between gap-4 py-3">
    <div className="flex items-start gap-3 flex-1 min-w-0">
      <div className={`${iconBg} p-2 rounded-lg text-white flex-shrink-0 mt-0.5`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5 leading-relaxed">{hint}</p>
        {warning && <p className="text-xs text-yellow-400 mt-1">{warning}</p>}
        {children}
      </div>
    </div>
    <Switch
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      className="flex-shrink-0 mt-1"
    />
  </div>
);

const SectionHeader = ({ label }: { label: string }) => (
  <p className="text-xs font-semibold uppercase tracking-widest text-gray-500 mb-1 mt-2">{label}</p>
);

export function NotificationSettingsModal({
  open,
  onClose,
  notificationPermission,
  onRequestDesktopPermission,
  smsEnabled,
  onToggleSMS,
  smsPending,
}: Props) {
  const [settings, setSettings] = useState<LocalNotifSettings>(defaultSettings);
  // Tracks whether the async DB fetch has completed
  const dbFetchDone = useRef(false);
  // Tracks whether the user explicitly changed a DB-backed field before the fetch completed
  const userHasChangedRef = useRef(false);

  // On open: load from localStorage immediately, then hydrate DB-backed fields async
  useEffect(() => {
    if (!open) {
      dbFetchDone.current = false;
      userHasChangedRef.current = false;
      return;
    }
    const local = loadSettings();
    setSettings(local);

    fetchEmailSettings().then(({ notifyEmailAlerts, notifyDesktopAlerts, notifyCallFlagged }) => {
      // Only overwrite if the user hasn't explicitly toggled anything while the fetch was in flight
      if (!userHasChangedRef.current) {
        setSettings(prev => ({
          ...prev,
          emailEnabled: notifyEmailAlerts,
          desktopAlertsEnabled: notifyDesktopAlerts,
          flaggedCallAlerts: notifyCallFlagged,
        }));
      }
      dbFetchDone.current = true;
    });
  }, [open]);

  // Persist to localStorage whenever settings change while modal is open (proper side-effect location)
  useEffect(() => {
    if (!open) return;
    saveSettings(settings);
  }, [settings, open]);

  // Persist DB-backed fields to backend whenever they change.
  // Allow save if user has explicitly changed something even before the DB fetch finished.
  useEffect(() => {
    if (!open) return;
    if (!dbFetchDone.current && !userHasChangedRef.current) return;
    persistEmailSettings(settings.emailEnabled, settings.desktopAlertsEnabled, settings.flaggedCallAlerts);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [settings.emailEnabled, settings.desktopAlertsEnabled, settings.flaggedCallAlerts, open]);

  // Simple updater — marks DB-backed changes immediately so they survive the async fetch
  const update = useCallback((patch: Partial<LocalNotifSettings>) => {
    const dbFields: (keyof LocalNotifSettings)[] = ['emailEnabled', 'desktopAlertsEnabled', 'flaggedCallAlerts'];
    if (dbFields.some(f => f in patch)) {
      userHasChangedRef.current = true;
    }
    setSettings(prev => ({ ...prev, ...patch }));
  }, []);

  const [testSending, setTestSending] = useState(false);
  const [testResult, setTestResult] = useState<string | null>(null);

  const sendTestNotification = async () => {
    setTestResult(null);
    const results: string[] = [];

    // Desktop notification
    if (settings.desktopAlertsEnabled && "Notification" in window) {
      if (Notification.permission === "granted") {
        new Notification("Test Notification", {
          body: "Your AI receptionist notifications are working correctly.",
        });
        results.push("desktop");
      } else {
        onRequestDesktopPermission(true);
      }
    }

    // Email notification
    if (settings.emailEnabled) {
      setTestSending(true);
      try {
        const res = await fetch('/api/notifications/send-test-email', {
          method: 'POST',
          credentials: 'include',
        });
        if (res.ok) {
          results.push("email");
        } else {
          const data = await res.json().catch(() => ({}));
          setTestResult(`Email failed: ${data.message || 'Unknown error'}`);
        }
      } catch {
        setTestResult("Email failed: network error");
      } finally {
        setTestSending(false);
      }
    }

    if (results.length > 0 && !testResult) {
      setTestResult(`Test sent via: ${results.join(" & ")}`);
      setTimeout(() => setTestResult(null), 4000);
    }
  };

  const desktopGranted = notificationPermission === "granted";
  const desktopDenied = notificationPermission === "denied";
  const desktopUnsupported = notificationPermission === "unsupported";

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="premium-card border border-gray-700 text-white max-w-md w-full mx-auto max-h-[85vh] flex flex-col p-0">
        <DialogHeader className="px-6 pt-6 pb-0 flex-shrink-0">
          <DialogTitle className="text-white text-lg font-semibold flex items-center gap-2">
            <Bell className="w-5 h-5 text-blue-400" />
            Notification Settings
          </DialogTitle>
        </DialogHeader>

        <div className="overflow-y-auto flex-1 px-6 py-2">
          <div className="divide-y divide-gray-800">

            {/* Delivery Methods */}
            <div className="pb-1">
              <SectionHeader label="Delivery Methods" />

              <SettingRow
                icon={<Laptop className="w-4 h-4" />}
                iconBg="bg-blue-600"
                label="Desktop Notifications"
                hint="Browser pop-ups when your AI receptionist handles a call"
                checked={settings.desktopAlertsEnabled}
                onCheckedChange={(val) => update({ desktopAlertsEnabled: val })}
                disabled={desktopUnsupported}
                warning={
                  desktopUnsupported
                    ? "Your browser does not support desktop notifications"
                    : !desktopGranted && settings.desktopAlertsEnabled
                    ? "Desktop notifications are enabled but browser permission is needed. Click 'Request Permission' below."
                    : undefined
                }
              >
                {settings.desktopAlertsEnabled && !desktopGranted && !desktopUnsupported && (
                  <Button
                    onClick={() => onRequestDesktopPermission(true)}
                    size="sm"
                    variant="outline"
                    className="mt-2 text-xs"
                  >
                    Request Browser Permission
                  </Button>
                )}
                {settings.desktopAlertsEnabled && desktopDenied && (
                  <p className="text-xs text-red-400 mt-2">
                    Browser permission denied — click the lock icon in the address bar to allow notifications
                  </p>
                )}
              </SettingRow>

              <SettingRow
                icon={<MessageSquare className="w-4 h-4" />}
                iconBg="bg-green-600"
                label="SMS Alerts"
                hint="Text message alerts for urgent call events"
                checked={smsEnabled}
                onCheckedChange={onToggleSMS}
                disabled={smsPending}
              />

              <SettingRow
                icon={<Mail className="w-4 h-4" />}
                iconBg="bg-indigo-600"
                label="Email Alerts"
                hint="Receive email notifications for important events and summaries"
                checked={settings.emailEnabled}
                onCheckedChange={(v) => update({ emailEnabled: v })}
              />
            </div>

            {/* AI Smart Triggers */}
            <div className="py-1">
              <SectionHeader label="AI Smart Triggers" />

              <SettingRow
                icon={<Flag className="w-4 h-4" />}
                iconBg="bg-orange-600"
                label="Call Flagged"
                hint="Alert when a call is flagged by the AI for follow-up"
                checked={settings.flaggedCallAlerts}
                onCheckedChange={(v) => update({ flaggedCallAlerts: v })}
              />

              <SettingRow
                icon={<Calendar className="w-4 h-4" />}
                iconBg="bg-teal-600"
                label="Appointment Confirmed"
                hint="Alert when the AI successfully books or confirms an appointment"
                checked={settings.appointmentAlerts}
                onCheckedChange={(v) => update({ appointmentAlerts: v })}
              />

              <SettingRow
                icon={<UserX className="w-4 h-4" />}
                iconBg="bg-red-600"
                label="Human Transfer Requested"
                hint="Alert when a caller asks to speak with a real person"
                checked={settings.transferAlerts}
                onCheckedChange={(v) => update({ transferAlerts: v })}
              />
            </div>

            {/* Minute Usage */}
            <div className="py-1">
              <SectionHeader label="Minute Usage" />

              <SettingRow
                icon={<Gauge className="w-4 h-4" />}
                iconBg="bg-yellow-600"
                label="Minute Usage Alert"
                hint="Alert when your used minutes reach a percentage of your plan limit"
                checked={settings.minuteUsageAlert}
                onCheckedChange={(v) => update({ minuteUsageAlert: v })}
              >
                {settings.minuteUsageAlert && (
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-400">Notify me at</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min={10}
                        max={99}
                        value={settings.minuteUsagePercent}
                        onChange={(e) => {
                          const v = Math.min(99, Math.max(10, Number(e.target.value)));
                          update({ minuteUsagePercent: v });
                        }}
                        className="bg-gray-800 border border-gray-800 rounded px-2 py-1 text-xs text-white w-16 text-center focus:outline-none focus:border-blue-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                      />
                      <span className="absolute right-2 text-xs text-gray-400 pointer-events-none">%</span>
                    </div>
                    <span className="text-xs text-gray-400">usage</span>
                  </div>
                )}
              </SettingRow>

              <SettingRow
                icon={<AlertTriangle className="w-4 h-4" />}
                iconBg="bg-red-700"
                label="Minute Limit Alert"
                hint="Alert when you've reached 100% of your plan's minute allowance"
                checked={settings.minuteLimitAlert}
                onCheckedChange={(v) => update({ minuteLimitAlert: v })}
              />

              <SettingRow
                icon={<CreditCard className="w-4 h-4" />}
                iconBg="bg-purple-600"
                label="Payment Alerts"
                hint="Alert for billing events such as renewals, failed payments, and overages"
                checked={settings.paymentAlerts}
                onCheckedChange={(v) => update({ paymentAlerts: v })}
              />
            </div>

            {/* Timing / DND */}
            <div className="pt-1 pb-2">
              <SectionHeader label="Timing" />

              <SettingRow
                icon={<Clock className="w-4 h-4" />}
                iconBg="bg-gray-600"
                label="Do Not Disturb"
                hint="Mute desktop notifications during the selected hours"
                checked={settings.doNotDisturb}
                onCheckedChange={(v) => update({ doNotDisturb: v })}
              >
                {settings.doNotDisturb && (
                  <div className="flex items-center gap-2 mt-2">
                    <input
                      type="time"
                      value={settings.dndStart}
                      onChange={(e) => update({ dndStart: e.target.value })}
                      className="bg-gray-800 border border-gray-800 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none focus:border-blue-500"
                    />
                    <span className="text-gray-400 text-xs">to</span>
                    <input
                      type="time"
                      value={settings.dndEnd}
                      onChange={(e) => update({ dndEnd: e.target.value })}
                      className="bg-gray-800 border border-gray-800 rounded px-2 py-1 text-xs text-white w-28 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                )}
              </SettingRow>
            </div>

          </div>
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 border-t border-gray-800">
          {testResult && (
            <div className={`px-6 py-2 text-xs text-center ${testResult.startsWith('Email failed') ? 'text-red-400' : 'text-green-400'}`}>
              {testResult}
            </div>
          )}
          <div className="flex items-center justify-between px-6 py-4">
            <Button
              variant="ghost"
              size="sm"
              className="text-blue-400 hover:text-blue-300 hover:bg-blue-950/30 text-xs gap-1.5"
              onClick={sendTestNotification}
              disabled={testSending}
            >
              <Send className="w-3.5 h-3.5" />
              {testSending ? 'Sending...' : 'Send Test Notification'}
            </Button>
            <Button
              size="sm"
              className="bg-blue-600 hover:bg-blue-700 text-white text-xs"
              onClick={onClose}
            >
              Done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
