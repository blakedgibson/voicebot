import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useEffect } from 'react';

interface Notification {
  id: string;
  type: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: string;
}

const STORAGE_KEY = 'voicebot_notif_settings';

function getLocalSettings() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function isDndActive(settings: Record<string, any>): boolean {
  if (!settings.doNotDisturb) return false;
  try {
    const now = new Date();
    const [sh, sm] = (settings.dndStart || '22:00').split(':').map(Number);
    const [eh, em] = (settings.dndEnd || '07:00').split(':').map(Number);
    const nowMins = now.getHours() * 60 + now.getMinutes();
    const startMins = sh * 60 + sm;
    const endMins = eh * 60 + em;
    if (startMins <= endMins) {
      return nowMins >= startMins && nowMins < endMins;
    } else {
      return nowMins >= startMins || nowMins < endMins;
    }
  } catch {
    return false;
  }
}

function fireBrowserNotification(title: string, body: string) {
  if (!('Notification' in window) || Notification.permission !== 'granted') return;
  const s = getLocalSettings();
  if (isDndActive(s)) return;
  try {
    new Notification(title, { body, icon: '/favicon.ico' });
  } catch {}
}

const fetchNotifications = async (): Promise<Notification[]> => {
  const response = await fetch('/api/notifications', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch notifications');
  const data = await response.json();
  return data.notifications;
};

const fetchUnreadCount = async (): Promise<number> => {
  const response = await fetch('/api/notifications/unread-count', { credentials: 'include' });
  if (!response.ok) throw new Error('Failed to fetch unread count');
  const data = await response.json();
  return data.count;
};

const markNotificationsSeen = async () => {
  const response = await fetch('/api/notifications/mark-seen', {
    method: 'POST',
    credentials: 'include',
  });
  if (!response.ok) throw new Error('Failed to mark as seen');
};

export const useNotifications = () => {
  const queryClient = useQueryClient();
  const seenIdsRef = useRef<Set<string>>(new Set());
  const initializedRef = useRef(false);

  const query = useQuery({
    queryKey: ['notifications'],
    queryFn: async () => {
      const notifications = await fetchNotifications();
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
      return notifications;
    },
    refetchInterval: 10000,
  });

  useEffect(() => {
    const notifications = query.data;
    if (!notifications) return;

    if (!initializedRef.current) {
      // On first load, mark all existing IDs as already seen — don't fire notifications for old ones
      notifications.forEach((n) => seenIdsRef.current.add(n.id));
      initializedRef.current = true;
      return;
    }

    // Check for new notifications that weren't seen before
    const s = getLocalSettings();
    notifications.forEach((n) => {
      if (seenIdsRef.current.has(n.id)) return;
      seenIdsRef.current.add(n.id);

      if (n.type === 'flagged_call' && s.flaggedCallAlerts !== false) {
        fireBrowserNotification('🚩 Call Flagged for Follow-up', n.message || 'A call has been flagged and requires your attention.');
      }
    });
  }, [query.data]);

  return query;
};

export const useUnreadCount = () => {
  return useQuery({
    queryKey: ['notificationsUnreadCount'],
    queryFn: fetchUnreadCount,
    refetchInterval: 5000,
  });
};

export const useMarkNotificationsSeen = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: markNotificationsSeen,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notificationsUnreadCount'] });
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
};
