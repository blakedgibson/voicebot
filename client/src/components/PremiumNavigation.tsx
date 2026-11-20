import { useState, useEffect, useRef } from "react";
import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { NotificationList } from "@/components/NotificationList";
import { useNotifications, useUnreadCount, useMarkNotificationsSeen } from "@/hooks/useNotifications";
import logoImage from "@assets/Screenshot_2025-09-07_at_12.57.13_PM-removebg-preview_1757268155334.png";

interface Notification {
  id: string;
  type: string;
  priority: 'urgent' | 'high' | 'normal' | 'low';
  title: string;
  message: string;
  actionUrl?: string;
  createdAt: string;
}

// Request browser notification permission
const requestNotificationPermission = async () => {
  if ('Notification' in window && Notification.permission === 'default') {
    await Notification.requestPermission();
  }
};

// Show browser notification - checks user preference and browser permission
const showBrowserNotification = (title: string, message: string, url?: string, desktopAlertsEnabled: boolean = true) => {
  // First check if desktop alerts are enabled in user preferences
  if (!desktopAlertsEnabled) {
    return; // User has disabled desktop notifications
  }

  // Then check browser permission and show notification
  if ('Notification' in window && Notification.permission === 'granted') {
    const notification = new Notification(title, {
      body: message,
      icon: logoImage,
      badge: logoImage,
      tag: 'voicebot-notification',
    });

    if (url) {
      notification.onclick = () => {
        window.focus();
        window.location.href = url;
        notification.close();
      };
    }
  }
};

export default function PremiumNavigation() {
  const [location, navigate] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { data: notifications = [], isLoading: notificationsLoading } = useNotifications();
  const { data: unreadCount = 0 } = useUnreadCount();
  const { mutate: markAsSeen } = useMarkNotificationsSeen();
  const prevNotificationsRef = useRef<Notification[]>([]);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [desktopAlertsEnabled, setDesktopAlertsEnabled] = useState(true); // Default to enabled

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  // Fetch desktop alerts preference on mount
  useEffect(() => {
    if (isAuthenticated) {
      fetch('/api/notifications/email-settings', { credentials: 'include' })
        .then(res => res.ok ? res.json() : null)
        .then(data => {
          if (data && typeof data.notifyDesktopAlerts === 'boolean') {
            setDesktopAlertsEnabled(data.notifyDesktopAlerts);
          }
        })
        .catch(err => console.error('Failed to fetch notification preferences:', err));
    }
  }, [isAuthenticated]);

  // Request notification permission on mount
  useEffect(() => {
    if (isAuthenticated) {
      requestNotificationPermission();
    }
  }, [isAuthenticated]);

  // Show browser notifications for new notifications
  useEffect(() => {
    if (!isAuthenticated || !notifications || notifications.length === 0) return;

    const prevNotifications = prevNotificationsRef.current;
    const newNotifications = notifications.filter(
      (notif: Notification) => !prevNotifications.some((prev) => prev.id === notif.id)
    );

    // Show browser notification for each new notification (only if user has enabled desktop alerts)
    newNotifications.forEach((notif: Notification) => {
      showBrowserNotification(notif.title, notif.message, notif.actionUrl, desktopAlertsEnabled);
    });

    prevNotificationsRef.current = notifications;
  }, [notifications, isAuthenticated, desktopAlertsEnabled]);

  const handleNotificationClick = (notification: Notification) => {
    if (notification.actionUrl) {
      navigate(notification.actionUrl);
      setIsDropdownOpen(false);
    }
  };

  const handleDropdownOpenChange = (open: boolean) => {
    setIsDropdownOpen(open);
    if (open && unreadCount > 0) {
      // Mark notifications as seen when dropdown opens
      markAsSeen();
    }
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: "fas fa-chart-line" },
    { href: "/restaurant", label: "Restaurant Agent", icon: "fas fa-utensils" },
    { href: "/builder", label: "General Agent", icon: "fas fa-plus" },
    { href: "/explore", label: "Explore", icon: "fas fa-compass" },
  ];

  const getUserInitials = () => {
    if (!user || typeof user !== 'object') return "U";
    const typedUser = user as any;
    if (!typedUser?.firstName && !typedUser?.lastName) return "U";
    return `${typedUser?.firstName?.[0] || ""}${typedUser?.lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <nav className="glass sticky top-0 z-[60] border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3" data-testid="link-logo">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center animate-glow" style={{ willChange: 'box-shadow', transform: 'translateZ(0)' }}>
              <img src={logoImage} alt="VoiceBot Logo" className="w-10 h-10 object-contain filter brightness-0 invert" />
            </div>
            <span className="text-2xl font-display font-bold text-gradient-gold">VoiceBot</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-8">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-4 py-2 rounded-xl transition-all duration-300 ${
                  location === item.href
                    ? "text-yellow-400 bg-yellow-400/10 glow-gold"
                    : "text-gray-300 hover:text-yellow-400 hover:bg-gray-800"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <i className={`${item.icon} text-sm`}></i>
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications Dropdown - Desktop and Mobile */}
            {isAuthenticated && (
              <DropdownMenu open={isDropdownOpen} onOpenChange={handleDropdownOpenChange}>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="relative text-gray-300 hover:text-yellow-400 hover:bg-gray-800 rounded-xl transition-all duration-300 focus:ring-0 focus:outline-none focus-visible:ring-0 data-[state=open]:ring-0 data-[state=closed]:ring-0"
                    onMouseDown={(e) => e.preventDefault()}
                    data-testid="button-notifications"
                  >
                    <i className="fas fa-bell"></i>
                    {unreadCount > 0 && (
                      <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white">
                        {unreadCount}
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-96 bg-gray-900 border-gray-800 text-gray-100 p-4 z-[70]">
                  <div className="mb-2 pb-2 border-b border-gray-800">
                    <h3 className="text-sm font-semibold text-white">Notifications</h3>
                  </div>
                  <NotificationList
                    notifications={notifications}
                    onNotificationClick={handleNotificationClick}
                  />
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center space-x-2 text-gray-300 hover:text-yellow-400 hover:bg-gray-800 rounded-xl transition-all duration-300 focus:ring-0 focus:outline-none focus-visible:ring-0 data-[state=open]:ring-0 data-[state=closed]:ring-0"
                    data-testid="button-user-menu"
                  >
                    <Avatar className="w-8 h-8 ring-2 ring-yellow-400/20">
                      <AvatarImage src={(user as any)?.profileImageUrl || ""} alt="User avatar" />
                      <AvatarFallback className="bg-gradient-to-br from-yellow-400 to-yellow-600 text-black font-bold">
                        {getUserInitials()}
                      </AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block font-medium">
                      {(user as any)?.firstName || "User"}
                    </span>
                    <i className="fas fa-chevron-down text-xs"></i>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 bg-gray-900 border-gray-800 text-gray-100 z-[70]">
                  <DropdownMenuItem className="flex items-center space-x-2 hover:bg-gray-800 hover:text-yellow-400" data-testid="menu-profile">
                    <i className="fas fa-user text-gray-400"></i>
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-2 hover:bg-gray-800 hover:text-yellow-400" data-testid="menu-settings">
                    <i className="fas fa-cog text-gray-400"></i>
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-2 hover:bg-gray-800 hover:text-yellow-400" data-testid="menu-help">
                    <i className="fas fa-question-circle text-gray-400"></i>
                    <span>Help & Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center space-x-2 text-red-400 hover:bg-red-900/20 hover:text-red-300"
                    onClick={handleLogout}
                    data-testid="menu-logout"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-4">
                <Button 
                  onClick={() => window.location.href = "/api/login"} 
                  className="btn-gold-outline px-6 py-2 rounded-xl font-semibold glow-gold-hover"
                  data-testid="button-sign-in"
                >
                  Sign In
                </Button>
                <Button 
                  onClick={() => window.location.href = "/api/login"} 
                  className="btn-gold px-6 py-2 rounded-xl font-semibold glow-gold-hover"
                  data-testid="button-get-started"
                >
                  Get Started
                </Button>
              </div>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden text-gray-300 hover:text-yellow-400"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <i className={`fas ${isMobileMenuOpen ? "fa-times" : "fa-bars"}`}></i>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-800 py-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                    location === item.href
                      ? "text-yellow-400 bg-yellow-400/10 glow-gold"
                      : "text-gray-300 hover:text-yellow-400 hover:bg-gray-800"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <i className={item.icon}></i>
                  <span className="font-medium">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
}