import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";

export default function SiteNav() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 50);
    window.addEventListener("scroll", handleScroll);
    handleScroll();
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleLogin = () => { window.location.href = "/login"; };
  const handleSignup = () => { window.location.href = "/signup"; };

  return (
    <>
      <nav
        ref={navRef}
        className={`fixed top-0 left-0 right-0 z-50 navbar-blur transition-all duration-300 ${isScrolled ? "scrolled" : ""}`}
      >
        <div className="w-full px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            {/* Logo */}
            <Link href="/" className="flex items-center space-x-2">
              <img src={logoImage} alt="VoiceBot Logo" className="h-7 w-7 object-contain filter brightness-0 invert flex-shrink-0" />
              <span className="text-2xl font-display font-bold text-white">VoiceBot</span>
            </Link>

            {/* Desktop Nav Links */}
            <div className="hidden md:flex items-center space-x-8">
              <Link href="/results" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                Results
              </Link>
              <Link href="/pricing" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                Pricing
              </Link>
              <Link href="/contact" className="text-gray-400 hover:text-white transition-colors duration-200 text-sm">
                Contact
              </Link>
            </div>

            {/* CTA Buttons */}
            <div className="flex items-center space-x-3">
              <Button
                onClick={handleLogin}
                className="hidden md:flex text-gray-400 hover:text-white bg-transparent hover:bg-gray-800/50 px-4 py-2 rounded-lg text-sm font-medium btn-enhanced touch-target"
              >
                Login
              </Button>
              <Button
                onClick={handleSignup}
                className="bg-blue-600 hover:bg-blue-700 text-white px-3 sm:px-4 py-2 rounded-lg text-xs sm:text-sm font-medium btn-enhanced touch-target"
              >
                Start Free
              </Button>
              <Button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="md:hidden text-gray-400 hover:text-white bg-transparent hover:bg-gray-800/50 px-3 py-2 rounded-lg"
              >
                <i className={`fas ${isMobileMenuOpen ? "fa-times" : "fa-bars"} text-xl`}></i>
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Full-screen mobile menu */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 z-50 md:hidden bg-black/95 backdrop-blur-lg">
          <div className="flex flex-col h-full">
            <div className="flex justify-between items-center h-20 px-6 border-b border-gray-800">
              <Link href="/" className="flex items-center space-x-2">
                <img src={logoImage} alt="VoiceBot Logo" className="h-7 w-7 object-contain filter brightness-0 invert flex-shrink-0" />
                <span className="text-2xl font-display font-bold text-white">VoiceBot</span>
              </Link>
              <Button
                onClick={() => setIsMobileMenuOpen(false)}
                className="text-gray-400 hover:text-white bg-transparent hover:bg-gray-800/50 px-3 py-2 rounded-lg"
              >
                <i className="fas fa-times text-2xl"></i>
              </Button>
            </div>

            <div className="flex-1 flex flex-col justify-center px-8 space-y-8">
              <button
                onClick={() => { window.location.href = "/results"; setIsMobileMenuOpen(false); }}
                className="text-4xl font-display font-light text-white/90 hover:text-white transition-all duration-300 text-center py-3 tracking-tight"
              >
                Results
              </button>
              <button
                onClick={() => { window.location.href = "/pricing"; setIsMobileMenuOpen(false); }}
                className="text-4xl font-display font-light text-white/90 hover:text-white transition-all duration-300 text-center py-3 tracking-tight"
              >
                Pricing
              </button>
              <button
                onClick={() => { window.location.href = "/contact"; setIsMobileMenuOpen(false); }}
                className="text-4xl font-display font-light text-white/90 hover:text-white transition-all duration-300 text-center py-3 tracking-tight"
              >
                Contact
              </button>
            </div>

            <div className="px-8 pb-8 space-y-4">
              <Button
                onClick={handleLogin}
                className="w-full text-white bg-transparent border border-gray-800 hover:bg-gray-800/50 px-6 py-4 rounded-lg text-lg font-semibold"
              >
                Login
              </Button>
              <Button
                onClick={handleSignup}
                className="w-full bg-white text-black hover:bg-gray-100 px-6 py-4 rounded-lg text-lg font-semibold"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
