import { useState } from "react";
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
import AccountSettings from "@/components/AccountSettings";
import logoImage from "@assets/Screenshot_2025-09-07_at_12.57.13_PM-removebg-preview_1757268155334.png";

export default function Navigation() {
  const [location] = useLocation();
  const { user, isAuthenticated } = useAuth();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isAccountSettingsOpen, setIsAccountSettingsOpen] = useState(false);
  
  // Debug logging
  console.log('Navigation render:', { isAccountSettingsOpen });

  const handleLogout = () => {
    window.location.href = "/api/logout";
  };

  const navItems = [
    { href: "/", label: "Dashboard", icon: "fas fa-chart-line" },
    { href: "/builder", label: "General Agent", icon: "fas fa-plus" },
    { href: "/restaurant", label: "Restaurant Agent", icon: "fas fa-utensils" },
    { href: "/explore", label: "Explore", icon: "fas fa-compass" },
  ];

  const getUserInitials = () => {
    if (!user || typeof user !== 'object') return "U";
    const typedUser = user as any;
    if (!typedUser?.firstName && !typedUser?.lastName) return "U";
    return `${typedUser?.firstName?.[0] || ""}${typedUser?.lastName?.[0] || ""}`.toUpperCase();
  };

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-[60]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link href="/" className="flex items-center space-x-3" data-testid="link-logo">
            <div className="w-8 h-8 flex items-center justify-center" style={{ transform: 'translateZ(0)' }}>
              <img src={logoImage} alt="VoiceBot Logo" className="w-8 h-8 object-contain" />
            </div>
            <span className="text-xl font-bold text-gray-900">VoiceBot</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex space-x-6">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-2 px-3 py-2 rounded-lg transition-colors ${
                  location === item.href
                    ? "text-primary bg-primary/10"
                    : "text-gray-700 hover:text-primary hover:bg-gray-100"
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(" ", "-")}`}
              >
                <i className={`${item.icon} text-sm`}></i>
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Right side */}
          <div className="flex items-center space-x-4">
            {/* Notifications */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="sm"
                  className="hidden md:flex transition-all duration-300 focus:ring-0 focus:outline-none focus-visible:ring-0 data-[state=open]:ring-0 data-[state=closed]:ring-0"
                  onMouseDown={(e) => e.preventDefault()}
                  data-testid="button-notifications"
                >
                  <i className="fas fa-bell"></i>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 z-[70]">
                <div className="p-2 text-sm text-gray-500">No notifications</div>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* User Menu */}
            {isAuthenticated ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="flex items-center space-x-2 focus:ring-0 focus:outline-none focus-visible:ring-0 data-[state=open]:ring-0 data-[state=closed]:ring-0" data-testid="button-user-menu">
                    <Avatar className="w-8 h-8">
                      <AvatarImage src={(user as any)?.profileImageUrl || ""} alt="User avatar" />
                      <AvatarFallback>{getUserInitials()}</AvatarFallback>
                    </Avatar>
                    <span className="hidden md:block text-gray-700">
                      {(user as any)?.firstName || "User"}
                    </span>
                    <i className="fas fa-chevron-down text-xs text-gray-500"></i>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56 z-[70]">
                  <DropdownMenuItem className="flex items-center space-x-2" data-testid="menu-profile">
                    <i className="fas fa-user text-gray-400"></i>
                    <span>Profile</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center space-x-2" 
                    onClick={() => {
                      console.log('Settings clicked, setting isAccountSettingsOpen to true');
                      setIsAccountSettingsOpen(true);
                    }}
                    data-testid="menu-settings"
                  >
                    <i className="fas fa-cog text-gray-400"></i>
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem className="flex items-center space-x-2" data-testid="menu-help">
                    <i className="fas fa-question-circle text-gray-400"></i>
                    <span>Help & Support</span>
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    className="flex items-center space-x-2 text-red-600"
                    onClick={handleLogout}
                    data-testid="menu-logout"
                  >
                    <i className="fas fa-sign-out-alt"></i>
                    <span>Sign Out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <Button onClick={() => window.location.href = "/api/login"} data-testid="button-sign-in">
                Sign In
              </Button>
            )}

            {/* Mobile menu button */}
            <Button
              variant="ghost"
              size="sm"
              className="md:hidden"
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              data-testid="button-mobile-menu"
            >
              <i className={`fas ${isMobileMenuOpen ? "fa-times" : "fa-bars"}`}></i>
            </Button>
          </div>
        </div>

        {/* Mobile Navigation */}
        {isMobileMenuOpen && (
          <div className="md:hidden border-t border-gray-200 py-4">
            <div className="space-y-2">
              {navItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                    location === item.href
                      ? "text-primary bg-primary/10"
                      : "text-gray-700 hover:text-primary hover:bg-gray-100"
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                  data-testid={`mobile-nav-${item.label.toLowerCase().replace(" ", "-")}`}
                >
                  <i className={item.icon}></i>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Account Settings Modal */}
      <AccountSettings 
        open={isAccountSettingsOpen} 
        onClose={() => setIsAccountSettingsOpen(false)} 
      />
    </nav>
  );
}
