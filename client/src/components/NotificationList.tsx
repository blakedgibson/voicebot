import { Bell, AlertCircle, Clock, User, MapPin, TrendingUp, CreditCard, Phone, MessageSquare, Flag, Eye } from 'lucide-react';

interface NotificationMetadata {
  callId?: string;
  customerName?: string | null;
  phoneNumber?: string | null;
  duration?: number | null;
  startTime?: string | null;
  agentId?: string | null;
}

interface Notification {
  id: string;
  type: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: string;
  metadata?: NotificationMetadata | null;
  relatedEntityId?: string;
}

interface NotificationListProps {
  notifications: Notification[];
  onNotificationClick?: (notification: Notification) => void;
  onViewMoreClick?: (callId: string) => void;
  onUnflagClick?: (callId: string, agentId: string) => void;
}

const getNotificationIcon = (type: string) => {
  switch (type) {
    case 'flagged_call': return <Flag className="w-5 h-5" />;
    case 'trial_expiring': return <Clock className="w-5 h-5" />;
    case 'missing_profile': return <User className="w-5 h-5" />;
    case 'setup_incomplete': return <MapPin className="w-5 h-5" />;
    case 'usage_warning': return <TrendingUp className="w-5 h-5" />;
    case 'usage_limit': return <TrendingUp className="w-5 h-5" />;
    case 'subscription_renewed': return <CreditCard className="w-5 h-5" />;
    case 'payment_failed': return <CreditCard className="w-5 h-5" />;
    case 'subscription_cancelled': return <CreditCard className="w-5 h-5" />;
    case 'card_expiring': return <CreditCard className="w-5 h-5" />;
    default: return <AlertCircle className="w-5 h-5" />;
  }
};

const getPriorityColor = (priority: string) => {
  switch (priority) {
    case 'urgent': return 'bg-red-500';
    case 'high': return 'bg-orange-500';
    case 'normal': return 'bg-blue-500';
    case 'low': return 'bg-gray-500';
    default: return 'bg-gray-500';
  }
};

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return null;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
};

const formatPhone = (phone?: string | null) => {
  if (!phone) return null;
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 11 && digits[0] === '1') {
    return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return phone;
};

const formatDateTime = (iso?: string | null) => {
  if (!iso) return null;
  const d = new Date(iso);
  return d.toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
};

const FlaggedCallCard = ({
  notification,
  onViewMoreClick,
  onUnflagClick,
}: {
  notification: Notification;
  onViewMoreClick?: (callId: string) => void;
  onUnflagClick?: (callId: string, agentId: string) => void;
}) => {
  const meta = notification.metadata;
  const callId = meta?.callId || notification.relatedEntityId;
  const phone = meta?.phoneNumber;
  const agentId = meta?.agentId;

  return (
    <div className="p-4 rounded-lg bg-orange-500/10 border border-orange-500/20">
      {/* Header */}
      <div className="flex items-start gap-3 mb-3">
        <div className="bg-orange-500 p-2 rounded-full text-white flex-shrink-0">
          <Flag className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white">Call Flagged for Follow-up</h3>
          {(meta?.customerName || phone) && (
            <p className="text-sm text-orange-300 font-medium mt-0.5">
              {meta?.customerName && <span>{meta.customerName}</span>}
              {meta?.customerName && phone && <span className="text-gray-500 mx-1">·</span>}
              {phone && <span>{formatPhone(phone)}</span>}
            </p>
          )}
        </div>
      </div>

      {/* Summary */}
      {notification.message && (
        <p className="text-xs text-gray-300 mb-3 leading-relaxed line-clamp-3">
          {notification.message}
        </p>
      )}

      {/* Meta row: duration + date/time */}
      <div className="flex items-center gap-3 mb-3 text-xs text-gray-500">
        {meta?.duration && (
          <span className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDuration(meta.duration)}
          </span>
        )}
        {meta?.startTime && (
          <span>{formatDateTime(meta.startTime)}</span>
        )}
        {!meta?.duration && !meta?.startTime && (
          <span>{new Date(notification.createdAt).toLocaleString('en-US', {
            month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true,
          })}</span>
        )}
      </div>

      {/* Action buttons */}
      <div className="grid grid-cols-2 gap-1.5">
        {phone && (
          <a
            href={`tel:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-green-600/20 hover:bg-green-600/40 text-green-400 text-xs font-medium transition-colors"
          >
            <Phone className="w-3 h-3" />
            Call
          </a>
        )}
        {phone && (
          <a
            href={`sms:${phone}`}
            onClick={(e) => e.stopPropagation()}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-600/20 hover:bg-blue-600/40 text-blue-400 text-xs font-medium transition-colors"
          >
            <MessageSquare className="w-3 h-3" />
            Text
          </a>
        )}
        {callId && agentId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onUnflagClick?.(callId, agentId);
            }}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 text-gray-400 text-xs font-medium transition-colors"
          >
            <Flag className="w-3 h-3" />
            Unflag
          </button>
        )}
        {callId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewMoreClick?.(callId);
            }}
            className="flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 text-white text-xs font-medium transition-colors"
          >
            <Eye className="w-3 h-3" />
            View More
          </button>
        )}
        {/* Fill remaining grid cells if only some buttons show */}
        {!phone && !callId && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onViewMoreClick?.(callId || '');
            }}
            className="col-span-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md bg-gray-700/50 hover:bg-gray-700 text-white text-xs font-medium transition-colors"
          >
            <Eye className="w-3 h-3" />
            View More
          </button>
        )}
      </div>
    </div>
  );
};

export const NotificationList = ({ notifications, onNotificationClick, onViewMoreClick, onUnflagClick }: NotificationListProps) => {
  if (notifications.length === 0) {
    return (
      <div className="text-center py-8 text-gray-400">
        <Bell className="w-12 h-12 mx-auto mb-3 opacity-50" />
        <p>No notifications</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {notifications.map((notification) => {
        if (notification.type === 'flagged_call') {
          return (
            <FlaggedCallCard
              key={notification.id}
              notification={notification}
              onViewMoreClick={onViewMoreClick}
              onUnflagClick={onUnflagClick}
            />
          );
        }

        return (
          <div
            key={notification.id}
            onClick={() => onNotificationClick?.(notification)}
            className="p-4 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-pointer transition-colors"
          >
            <div className="flex items-start gap-3">
              <div className={`${getPriorityColor(notification.priority)} p-2 rounded-full text-white flex-shrink-0`}>
                {getNotificationIcon(notification.type)}
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium text-white">{notification.title}</h3>
                <p className="text-xs text-gray-400 mt-1">{notification.message}</p>
                <p className="text-xs text-gray-500 mt-2">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
