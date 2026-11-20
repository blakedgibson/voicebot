import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import logoImage from "@assets/Screenshot_2025-09-07_at_12.57.13_PM-removebg-preview_1757268155334.png";

export default function Landing() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  const handleDemo = () => {
    // Scroll to features section
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navigation */}
      <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center">
                <img src={logoImage} alt="VoiceBot Logo" className="w-8 h-8 object-contain" />
              </div>
              <span className="text-xl font-bold text-gray-900">VoiceBot</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <a href="#industries" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                Industries
              </a>
              <a href="#integrations" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                Integrations
              </a>
              <a href="#pricing" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                Pricing
              </a>
              <a href="/contact" className="text-gray-700 hover:text-gray-900 font-medium transition-colors">
                Contact
              </a>
            </div>
            <div className="flex items-center space-x-4">
              <Button variant="ghost" onClick={handleLogin} data-testid="button-login" className="hidden sm:flex">
                Sign In
              </Button>
              <Button onClick={handleLogin} data-testid="button-signup" className="hidden sm:flex">
                Get Started
              </Button>
              {/* Mobile hamburger menu button */}
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

          {/* Mobile Navigation Menu */}
          {isMobileMenuOpen && (
            <div className="md:hidden border-t border-gray-200 py-4">
              <div className="space-y-2">
                <a
                  href="#industries"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Industries
                </a>
                <a
                  href="#integrations"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Integrations
                </a>
                <a
                  href="#pricing"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Pricing
                </a>
                <a
                  href="/contact"
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg"
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  Contact
                </a>
                <div className="pt-2 space-y-2">
                  <Button
                    variant="ghost"
                    onClick={handleLogin}
                    className="w-full"
                    data-testid="button-mobile-login"
                  >
                    Sign In
                  </Button>
                  <Button
                    onClick={handleLogin}
                    className="w-full"
                    data-testid="button-mobile-signup"
                  >
                    Get Started
                  </Button>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-primary/5 via-secondary/5 to-accent/5 py-12 sm:py-16 md:py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-4xl mx-auto">
            <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4 sm:mb-6 leading-tight">
              AI Voice Receptionists for
              <span className="bg-gradient-to-r from-orange-500 to-red-500 bg-clip-text text-transparent">
                {" "}Your Business
              </span>
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-2xl mx-auto px-2">
              Automatically extract your business information from websites and Google Maps,
              then create an intelligent voice receptionist that handles appointments, customer inquiries, and support 24/7.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center items-stretch sm:items-center px-4 sm:px-0">
              <Button
                size="lg"
                className="bg-orange-500 hover:bg-orange-600 text-white px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 transform hover:scale-105 shadow-lg hover:shadow-xl text-sm sm:text-base w-full sm:w-auto"
                onClick={() => { window.location.href = 'tel:+12604685943'; }}
                data-testid="button-create-agent"
              >
                <i className="fas fa-phone-alt mr-2"></i>
                Create Your AI Agent
              </Button>
              <Button 
                variant="outline" 
                size="lg"
                className="border border-gray-300 hover:border-primary text-gray-700 hover:text-primary px-6 sm:px-8 py-3 sm:py-4 rounded-xl font-semibold transition-all duration-200 text-sm sm:text-base w-full sm:w-auto"
                onClick={handleDemo}
                data-testid="button-watch-demo"
              >
                <i className="fas fa-play mr-2"></i>
                Watch Demo
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="py-12 sm:py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">Powerful Features for Your Business</h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
              Everything your business needs in an AI voice receptionist, automatically configured from your existing information.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-comments text-orange-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Human-Like Conversational Ability</h3>
                <p className="text-gray-600 text-sm">
                  Your AI receptionist sounds and feels like a real person. It understands intent, follows natural conversation flow, and responds with tone, rhythm, and emotion that make every interaction feel genuine and effortless.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-clock text-blue-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">24/7 Availability and Unlimited Capacity</h3>
                <p className="text-gray-600 text-sm">
                  Never miss a call again. Your AI receptionist is always available, handling customers around the clock and managing unlimited calls at once with no holds or missed opportunities.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-plug text-green-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Seamless System Integration</h3>
                <p className="text-gray-600 text-sm">
                  Your AI connects smoothly with the tools you already use, including your POS, CRM, calendars, and marketing platforms. It keeps everything synchronized and automated so you can focus on running your business.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-calendar-check text-purple-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Lead Capture and Appointment Scheduling</h3>
                <p className="text-gray-600 text-sm">
                  Every call becomes a potential customer. The AI qualifies leads, books reservations, manages your calendar, and sends automated reminders to reduce no-shows without any extra effort.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-sliders-h text-red-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Extensive Customization</h3>
                <p className="text-gray-600 text-sm">
                  Your AI receptionist adapts to your brand and communication style. Choose the tone, voice, and personality that fit your business and serve customers in multiple languages with ease.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200">
              <CardContent className="p-6 text-center">
                <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                  <i className="fas fa-chart-line text-yellow-500 text-xl"></i>
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">Advanced Analytics and Reporting</h3>
                <p className="text-gray-600 text-sm">
                  Track performance in real time with detailed call insights, transcripts, and metrics. Understand your customers better and make data-driven improvements that strengthen your business.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-12 sm:py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-8 sm:mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-3 sm:mb-4 px-2">How It Works</h2>
            <p className="text-sm sm:text-base text-gray-600 max-w-2xl mx-auto px-4">
              Get your voice agent up and running in minutes with our simple 3-step process.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 relative">
              <div className="absolute -top-3 -right-3 w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                1
              </div>
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-orange-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <i className="fas fa-link text-orange-500 text-xl sm:text-2xl"></i>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">Enter Business Info</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Simply provide your website URL or business name. We'll automatically extract all the details we need.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 relative">
              <div className="absolute -top-3 -right-3 w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                2
              </div>
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-blue-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <img src={logoImage} alt="VoiceBot Logo" className="w-6 h-6 sm:w-8 sm:h-8 object-contain" />
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">Choose Your Voice</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Select from our collection of professional voices that match your business's personality and brand.
                </p>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-lg hover:shadow-xl transition-shadow duration-200 relative">
              <div className="absolute -top-3 -right-3 w-7 h-7 sm:w-8 sm:h-8 bg-orange-500 text-white rounded-full flex items-center justify-center font-bold text-sm sm:text-base">
                3
              </div>
              <CardContent className="p-6 sm:p-8 text-center">
                <div className="w-12 h-12 sm:w-16 sm:h-16 bg-green-100 rounded-lg flex items-center justify-center mx-auto mb-3 sm:mb-4">
                  <i className="fas fa-rocket text-green-500 text-xl sm:text-2xl"></i>
                </div>
                <h3 className="text-lg sm:text-xl font-semibold text-gray-900 mb-2 sm:mb-3">Go Live</h3>
                <p className="text-sm sm:text-base text-gray-600">
                  Your AI receptionist is ready! Connect it to your phone system and start handling calls automatically.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12 sm:py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 sm:gap-8 mb-6 sm:mb-8">
            <div className="md:col-span-2">
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-8 h-8 bg-gradient-to-br from-primary to-secondary rounded-lg flex items-center justify-center">
                  <img src={logoImage} alt="VoiceBot Logo" className="w-4 h-4 object-contain" />
                </div>
                <span className="text-xl font-bold">VoiceBot</span>
              </div>
              <p className="text-gray-400 mb-6 max-w-md">
                Create, customize, and deploy intelligent voice agents for any industry. 
                Build the future of conversational AI with VoiceBot.
              </p>
              <div className="flex space-x-4">
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <i className="fab fa-twitter"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <i className="fab fa-linkedin"></i>
                </a>
                <a href="#" className="text-gray-400 hover:text-white transition-colors">
                  <i className="fab fa-github"></i>
                </a>
              </div>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
                <li><a href="#" className="hover:text-white transition-colors">API Documentation</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li><a href="#" className="hover:text-white transition-colors">Help Center</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Contact Us</a></li>
                <li><a href="#" className="hover:text-white transition-colors">Community</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center">
              <p className="text-gray-400 text-sm">
                © 2024 VoiceBot. All rights reserved.
              </p>
              <div className="flex space-x-6 mt-4 md:mt-0">
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Privacy Policy</a>
                <a href="#" className="text-gray-400 hover:text-white text-sm transition-colors">Terms of Service</a>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
