import { useState, useEffect, useRef } from "react";
import { setPageMeta } from '@/lib/pageMeta';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
import { apiRequest } from '@/lib/queryClient';
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Link } from "wouter";
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";
import { RetellWebClient } from "retell-client-js-sdk";
import SiteNav from "@/components/SiteNav";

export default function PremiumLanding() {
  const { isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    setPageMeta({
      title: 'AI Receptionist Platform | VoiceBot',
      description: 'VoiceBot gives your salon or business a 24/7 AI receptionist that answers calls, books appointments, and handles inquiries — powered by real phone numbers and voice AI.',
      canonical: 'https://voicebot.one/',
    });
  }, []);

  const [activeDemo, setActiveDemo] = useState(false);
  const [demoState, setDemoState] = useState<'idle' | 'checking' | 'calling' | 'completed' | 'limited'>('idle');
  const [demoTimeLeft, setDemoTimeLeft] = useState<number | null>(null);
  const [currentDemoSession, setCurrentDemoSession] = useState<any>(null);
  const { toast } = useToast();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [googleMapsQuery, setGoogleMapsQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [selectedSuggestionIndex, setSelectedSuggestionIndex] = useState(-1);
  const [showSuggestionsAbove, setShowSuggestionsAbove] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [extractionMode, setExtractionMode] = useState<'location' | 'website'>('location');
  const [showAllIntegrations, setShowAllIntegrations] = useState(false);
  const [showSources, setShowSources] = useState(false);
  const [ctaWebsite, setCtaWebsite] = useState('');
  const retellWebClientRef = useRef<RetellWebClient | null>(null);
  const [callButtonScrolled, setCallButtonScrolled] = useState(false);
  const heroRef = useRef<HTMLDivElement>(null);
  
  const handleLogin = () => {
    window.location.href = "/login";
  };

  const handleSignup = () => {
    // If user is already authenticated, redirect to dashboard
    if (isAuthenticated) {
      window.location.href = "/dashboard";
    } else {
      // If not authenticated, proceed with normal signup
      window.location.href = "/signup";
    }
  };

  const handleWebsiteRedirect = (url: string) => {
    const trimmed = url.trim();
    if (trimmed) {
      window.location.href = `/signup?website=${encodeURIComponent(trimmed)}`;
    } else {
      window.location.href = "/signup";
    }
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const handleDemo = async () => {
    if (activeDemo) {
      // If demo is active, hang up the call
      if (retellWebClientRef.current) {
        retellWebClientRef.current.stopCall();
      }
      setActiveDemo(false);
      setDemoState('idle');
      return;
    }

    try {
      setDemoState('checking');

      // Request microphone permission first
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        // Stop the stream immediately - we just needed to check permissions
        stream.getTracks().forEach(track => track.stop());
      } catch (permissionError: any) {
        console.error('Microphone permission denied:', permissionError);
        setDemoState('idle');

        toast({
          title: "Microphone access required",
          description: "Please allow microphone access to talk to the AI receptionist.",
          variant: "destructive"
        });
        return;
      }

      setActiveDemo(true);

      // Create web call and get access token
      const response = await apiRequest('POST', '/api/demo/create-web-call', {});
      const result = await response.json();

      if (!result.success) {
        throw new Error(result.message || 'Failed to create web call');
      }

      // Initialize Retell Web Client if not already initialized
      if (!retellWebClientRef.current) {
        retellWebClientRef.current = new RetellWebClient();

        // Set up event listeners
        retellWebClientRef.current.on("call_started", () => {
          console.log("Call started");
          setDemoState('calling');
        });

        retellWebClientRef.current.on("call_ended", () => {
          console.log("Call ended");
          setDemoState('completed');
          setActiveDemo(false);
          setTimeout(() => {
            setDemoState('idle');
          }, 3000);
        });

        retellWebClientRef.current.on("agent_start_talking", () => {
          console.log("Agent started talking");
        });

        retellWebClientRef.current.on("agent_stop_talking", () => {
          console.log("Agent stopped talking");
        });

        retellWebClientRef.current.on("error", (error) => {
          console.error("Retell error:", error);
          setDemoState('idle');
          setActiveDemo(false);
          toast({
            title: "Call error",
            description: "An error occurred during the call.",
            variant: "destructive"
          });
        });

        retellWebClientRef.current.on("update", (update) => {
          // Handle real-time transcript updates if needed
          console.log("Transcript update:", update);
        });
      }

      // Start the call with the access token
      await retellWebClientRef.current.startCall({
        accessToken: result.access_token,
        sampleRate: 24000,
        captureDeviceId: "default"
      });

      console.log("Call started with ID:", result.call_id);

    } catch (error: any) {
      console.error('Demo error:', error);
      setDemoState('idle');
      setActiveDemo(false);

      toast({
        title: "Demo failed",
        description: error.message || 'Failed to start demo. Please try again later.',
        variant: "destructive"
      });
    }
  };

  const scrollToFeatures = () => {
    document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' });
  };

  // Enhanced scroll animations and navbar behavior
  useEffect(() => {
    const handleScroll = () => {
      const scrollTop = window.scrollY;

      // Check if hero section is out of view for call button animation
      if (heroRef.current) {
        const heroRect = heroRef.current.getBoundingClientRect();
        setCallButtonScrolled(heroRect.bottom < 0);
      }
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -100px 0px' }
    );

    // Observe scroll animation elements
    const scrollElements = document.querySelectorAll('.scroll-fade-in, .scroll-slide-up');
    scrollElements.forEach((el) => observer.observe(el));

    // Add scroll listener
    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial scroll position

    return () => {
      observer.disconnect();
      window.removeEventListener('scroll', handleScroll);
    };
  }, []);

  // Handle website URL processing
  const handleProcessWebsite = async () => {
    if (!websiteUrl.trim()) return;
    
    setIsProcessing(true);
    try {
      const response = await fetch('/api/scrape/website', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ url: websiteUrl })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Website data extracted:', data.data);
        // Store the website data in localStorage for the signup process
        localStorage.setItem('pendingWebsiteData', JSON.stringify({
          url: websiteUrl,
          data: data.data
        }));
        
        // Redirect to signup page with website pre-filled
        window.location.href = `/signup?website=${encodeURIComponent(websiteUrl)}`;
      }
    } catch (error) {
      console.error('Failed to process website:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle Google Maps query changes with debounced suggestions
  const handleGoogleMapsQueryChange = async (value: string, inputElement?: HTMLInputElement) => {
    setGoogleMapsQuery(value);
    setSelectedSuggestionIndex(-1);
    
    if (value.trim().length > 2) {
      try {
        const response = await fetch(`/api/places/autocomplete?input=${encodeURIComponent(value)}`);
        const data = await response.json();
        
        if (data.success && data.suggestions) {
          setSuggestions(data.suggestions);
          
          // Check if we need to show suggestions above or below
          if (inputElement) {
            const rect = inputElement.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            const suggestionsHeight = Math.min(data.suggestions.length * 70, 240); // estimate height
            setShowSuggestionsAbove(spaceBelow < suggestionsHeight + 20);
          }
          
          setShowSuggestions(true);
        }
      } catch (error) {
        console.error('Failed to fetch suggestions:', error);
        setSuggestions([]);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  // Handle suggestion selection
  const handleSuggestionSelect = (suggestion: any) => {
    setGoogleMapsQuery(suggestion.description);
    setSuggestions([]);
    setShowSuggestions(false);
    setSelectedSuggestionIndex(-1);
  };

  // Handle keyboard navigation for suggestions
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!showSuggestions || suggestions.length === 0) return;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => 
        prev < suggestions.length - 1 ? prev + 1 : prev
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedSuggestionIndex(prev => prev > 0 ? prev - 1 : -1);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedSuggestionIndex >= 0) {
        handleSuggestionSelect(suggestions[selectedSuggestionIndex]);
      } else {
        handleProcessGoogleMaps();
      }
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setSelectedSuggestionIndex(-1);
    }
  };

  // Handle Google Maps processing
  const handleProcessGoogleMaps = async () => {
    if (!googleMapsQuery.trim()) return;
    
    setIsProcessing(true);
    setShowSuggestions(false);
    try {
      const response = await fetch('/api/scrape/google-maps', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: googleMapsQuery })
      });
      
      const data = await response.json();
      
      if (data.success) {
        console.log('Google Maps data extracted:', data.data);
        // Store the Google Maps data in localStorage for the signup process
        localStorage.setItem('pendingGoogleMapsData', JSON.stringify({
          query: googleMapsQuery,
          data: data.data
        }));
        
        // Redirect to signup page
        window.location.href = '/signup';
      }
    } catch (error) {
      console.error('Failed to process Google Maps data:', error);
    } finally {
      setIsProcessing(false);
    }
  };


  return (
    <div className="min-h-screen text-white font-body overflow-x-hidden" style={{ backgroundColor: '#0D0D0D' }}>
      <SiteNav />
      {/* Hero Section - Framer Style */}
      <section ref={heroRef} className="relative min-h-screen flex items-center justify-center overflow-hidden py-20 lg:py-24" style={{ backgroundColor: '#0D0D0D' }}>
        {/* Large Gradient Blobs - Framer Style */}
        <div className="absolute inset-0 pointer-events-none">
          {/* Main large blue gradient blob */}
          <div className="absolute -top-40 -left-40 w-[900px] h-[900px] bg-gradient-to-r from-blue-900 via-blue-800 to-blue-950 rounded-full opacity-20 blur-3xl outline-none select-none" style={{ willChange: 'filter' }}></div>
          {/* Secondary gradient blob */}
          <div className="absolute -bottom-40 -right-40 w-[700px] h-[700px] bg-gradient-to-r from-blue-500 via-blue-600 to-blue-700 rounded-full opacity-15 blur-3xl outline-none select-none" style={{ willChange: 'filter' }}></div>
          {/* Small accent blob */}
          <div className="absolute top-1/3 right-1/4 w-[500px] h-[500px] bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full opacity-10 blur-3xl outline-none select-none" style={{ willChange: 'filter' }}></div>
        </div>

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Headline & Subheading */}
            <div className="animate-fade-in-up text-center lg:text-left flex flex-col justify-center lg:order-1 w-full">
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl 2xl:text-7xl font-display font-bold mb-4 sm:mb-6 leading-tight tracking-tight">
                <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent block mb-2">Meet VoiceBot</span>
                <span className="block">Your AI Receptionist</span>
              </h1>

              <p className="text-lg sm:text-xl md:text-xl lg:text-2xl xl:text-2xl 2xl:text-3xl text-gray-400 mb-6 sm:mb-8 lg:mb-12 font-light leading-relaxed">
                Never Miss a Call Again
              </p>

              {/* Website Input - Desktop Only */}
              <div className="hidden lg:flex flex-col gap-3 justify-center lg:justify-start">
                <div className="flex gap-2 items-center">
                  <Input
                    type="url"
                    placeholder="yourwebsite.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleWebsiteRedirect(websiteUrl)}
                    className="bg-transparent border-gray-800 text-white placeholder-gray-500 focus:border-blue-500 rounded-xl h-12 text-base"
                    data-testid="input-hero-website"
                  />
                  <Button
                    onClick={() => handleWebsiteRedirect(websiteUrl)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-5 h-12 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                    data-testid="button-get-started"
                  >
                    <Plus className="h-4 w-4" />
                    Create Voicebot
                  </Button>
                </div>
              </div>
            </div>

            {/* Call Button - Responsive Size - Hides on desktop when scrolled */}
            <div className={`flex flex-col items-center justify-center self-center lg:self-auto lg:order-2 my-6 sm:my-8 lg:my-0 transition-opacity duration-500 ${
              callButtonScrolled ? 'lg:opacity-0 lg:pointer-events-none' : 'lg:opacity-100'
            }`}>
              <a
                href="tel:+12604685943"
                className="w-40 h-40 sm:w-48 sm:h-48 md:w-56 md:h-56 lg:w-60 lg:h-60 xl:w-64 xl:h-64 rounded-full flex items-center justify-center shadow-2xl glow-blue cursor-pointer border-0 transition-all duration-500 ease-in-out focus:outline-none bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 hover:scale-125"
                title="Call our AI receptionist"
                data-testid="hero-demo-call-button"
              >
                <i className="fas fa-phone text-white text-3xl sm:text-4xl md:text-5xl lg:text-5xl xl:text-6xl"></i>
              </a>
              <p className="mt-4 text-sm text-gray-400 text-center">
                <span className="text-blue-400 font-semibold">Tap to call</span> — talk to our live AI demo
              </p>
            </div>

            {/* Website Input - Mobile Only (Below Call Button) */}
            <div className="flex lg:hidden flex-col gap-3 items-stretch justify-center w-full max-w-md mx-auto mt-4">
              <div className="flex gap-2 items-center">
                <Input
                  type="url"
                  placeholder="yourwebsite.com"
                  value={websiteUrl}
                  onChange={(e) => setWebsiteUrl(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleWebsiteRedirect(websiteUrl)}
                  className="bg-transparent border-gray-800 text-white placeholder-gray-500 focus:border-blue-500 rounded-xl h-12 text-base"
                  data-testid="input-hero-website-mobile"
                />
                <Button
                  onClick={() => handleWebsiteRedirect(websiteUrl)}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 h-12 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                  data-testid="button-get-started-mobile"
                >
                  <Plus className="h-4 w-4" />
                  <span className="hidden sm:inline">Create Voicebot</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Problem/Pain Point Section */}
      <section className="py-32 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Header */}
          <div className="text-center mb-20 fade-in-up">
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6">
              The Hidden <span className="bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent">Cost</span> of Missed Calls
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-12">
              Every missed call is a missed opportunity. Here's what it's really costing your business.
            </p>

            {/* Shocking Stats - Hero Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-16">
              <Card className="premium-card rounded-2xl p-8 border-red-500/30">
                <CardContent className="p-0 text-center">
                  <div className="text-6xl font-display font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent mb-3">
                    62%
                  </div>
                  <p className="text-gray-300 text-lg">
                    of calls to small businesses go <span className="text-red-400 font-semibold">unanswered</span>
                  </p>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-8 border-red-500/30">
                <CardContent className="p-0 text-center">
                  <div className="text-6xl font-display font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent mb-3">
                    $126K
                  </div>
                  <p className="text-gray-300 text-lg">
                    average annual revenue <span className="text-red-400 font-semibold">lost</span> from missed calls
                  </p>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-8 border-red-500/30">
                <CardContent className="p-0 text-center">
                  <div className="text-6xl font-display font-bold bg-gradient-to-r from-red-400 to-red-600 bg-clip-text text-transparent mb-3">
                    85%
                  </div>
                  <p className="text-gray-300 text-lg">
                    of customers <span className="text-red-400 font-semibold">won't call back</span> if you miss their call
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* Financial Impact Grid */}
          <div className="mb-20">
            <h3 className="text-3xl font-display font-bold text-center mb-12 text-white">
              The Real Financial Impact
            </h3>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className="text-4xl font-display font-bold text-blue-400 mb-2">$1,000</div>
                  <p className="text-gray-400 text-sm">Average value per missed call</p>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className="text-4xl font-display font-bold text-blue-400 mb-2">27%</div>
                  <p className="text-gray-400 text-sm">Calls missed by home service businesses</p>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className="text-4xl font-display font-bold text-blue-400 mb-2">30%</div>
                  <p className="text-gray-400 text-sm">Potential listings lost by real estate agents</p>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className="text-4xl font-display font-bold text-blue-400 mb-2">$12.6K</div>
                  <p className="text-gray-400 text-sm">Monthly revenue loss for busy businesses</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Core Challenges & HIAW Solution Section */}
      <section className="py-32" style={{ backgroundColor: '#0D0D0D' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Pain Points */}
          <div className="mb-20">
            <h3 className="text-3xl font-display font-bold text-center mb-12 text-white">
              The Biggest Customer Service Challenges
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-moon text-red-400 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">After-Hours Calls</h4>
                      <p className="text-gray-400 text-sm">67% of customers prefer phone calls, but they can't reach you outside business hours</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-users text-red-400 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Staff Overwhelm</h4>
                      <p className="text-gray-400 text-sm">During peak hours, up to 40% of calls go unanswered because your team is busy</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-dollar-sign text-red-400 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Hiring Costs</h4>
                      <p className="text-gray-400 text-sm">Full-time receptionist costs $30,000+/year, plus benefits, training, and sick days</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-clock text-red-400 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Long Wait Times</h4>
                      <p className="text-gray-400 text-sm">75% of callers think it takes too long to reach a live agent</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-user-slash text-red-400 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">Lost Customers</h4>
                      <p className="text-gray-400 text-sm">70% of customers will leave businesses with weak customer service</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0">
                  <div className="flex items-start space-x-4">
                    <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <i className="fas fa-phone-slash text-red-400 text-xl"></i>
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-white mb-2">No Second Chances</h4>
                      <p className="text-gray-400 text-sm">Most customers only call twice before taking their business elsewhere</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>

          {/* How AI Receptionists Solve These Problems */}
          <div className="mb-20">
            <div className="text-center mb-12">
              <h3 className="text-3xl md:text-4xl font-display font-bold mb-4">
                How AI Receptionists <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">Solve</span> These Problems
              </h3>
              <p className="text-xl text-gray-300 max-w-3xl mx-auto">
                See the measurable impact AI receptionists deliver to businesses like yours.
              </p>
            </div>

            {/* Performance Improvements */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className="text-green-400 mb-2">
                    <i className="fas fa-arrow-down text-3xl"></i>
                  </div>
                  <div className="text-3xl font-display font-bold text-white mb-1">82%</div>
                  <p className="text-gray-400 text-sm">Faster resolution (11min → 2min)</p>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className="text-green-400 mb-2">
                    <i className="fas fa-dollar-sign text-3xl"></i>
                  </div>
                  <div className="text-3xl font-display font-bold text-white mb-1">90%</div>
                  <p className="text-gray-400 text-sm">Cost reduction vs. in-house staff</p>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className="text-green-400 mb-2">
                    <i className="fas fa-users text-3xl"></i>
                  </div>
                  <div className="text-3xl font-display font-bold text-white mb-1">100%</div>
                  <p className="text-gray-400 text-sm">Call answer rate, 24/7/365</p>
                </CardContent>
              </Card>

              <Card className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className="text-green-400 mb-2">
                    <i className="fas fa-chart-line text-3xl"></i>
                  </div>
                  <div className="text-3xl font-display font-bold text-white mb-1">$3.50</div>
                  <p className="text-gray-400 text-sm">Average ROI per $1 invested</p>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
      {/* Features Section */}
      <section id="features" className="py-32" style={{ backgroundColor: '#0D0D0D' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Feature 1: Business Focused */}
          <div className="text-center mb-20">
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6">
              Built for <span className="bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent">Your Business</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              VoiceBot understands the unique challenges of service-based businesses. From booking appointments while you're with customers to reducing no-shows.
            </p>
          </div>

          {/* Feature 1: Real-Time Call Management */}
          <div className="mb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Visual Left */}
              <div className="order-2 lg:order-1">
                <Card className="premium-card rounded-2xl p-8 border-pink-500/20">
                  <CardContent className="p-0 space-y-4">
                    <div className="flex items-center justify-between pb-4 border-b border-gray-700">
                      <span className="text-sm text-gray-400">Today's Appointments</span>
                      <span className="bg-green-500/20 text-green-400 px-3 py-1 rounded-full text-xs font-semibold">Live</span>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                            <i className="fas fa-cut text-pink-400"></i>
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">Sarah M. - Balayage</p>
                            <p className="text-gray-400 text-xs">2:00 PM - Booked via AI</p>
                          </div>
                        </div>
                        <span className="text-xs text-green-400">Confirmed</span>
                      </div>
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-purple-500/20 rounded-full flex items-center justify-center">
                            <i className="fas fa-spa text-purple-400"></i>
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">Jennifer L. - Deep Tissue</p>
                            <p className="text-gray-400 text-xs">3:30 PM - After-hours booking</p>
                          </div>
                        </div>
                        <span className="text-xs text-blue-400">New Client</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Text Right */}
              <div className="order-1 lg:order-2">
                <div className="w-16 h-16 bg-gradient-to-br from-pink-400 to-pink-600 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-cut text-white text-2xl"></i>
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                  Never Miss a Booking Again
                </h3>
                <p className="text-xl text-gray-300 mb-6">
                  Stop interrupting services to answer the phone. Your AI receptionist handles booking requests 24/7, even when you're with clients or after hours.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">42% of appointments happen outside business hours</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Your team stays focused on customers, not phones</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Real-time calendar sync prevents double-bookings</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Integrates with Google Calendar, Calendly, and more</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Feature 2: No-Show Reduction */}
          <div className="mb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Text Left */}
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-purple-600 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-calendar-check text-white text-2xl"></i>
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                  Reduce No-Shows by Up to 90%
                </h3>
                <p className="text-xl text-gray-300 mb-6">
                  Automated SMS reminders and AI-powered confirmations dramatically reduce missed appointments and late cancellations.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Automated 24-hour and same-day reminders</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Two-way confirmation via SMS</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Instant waitlist filling for cancellations</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Recovery of $2,500-$5,000/month in lost revenue</span>
                  </li>
                </ul>
              </div>

              {/* Visual Right */}
              <div>
                <Card className="premium-card rounded-2xl p-8 border-purple-500/20">
                  <CardContent className="p-0 space-y-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gradient-to-br from-red-500/10 to-red-600/10 p-4 rounded-xl border border-red-500/20">
                        <p className="text-gray-400 text-xs mb-1">Before VoiceBot</p>
                        <p className="text-3xl font-display font-bold text-red-400">20%</p>
                        <p className="text-gray-500 text-xs mt-1">No-show rate</p>
                      </div>
                      <div className="bg-gradient-to-br from-green-500/10 to-green-600/10 p-4 rounded-xl border border-green-500/20">
                        <p className="text-gray-400 text-xs mb-1">With VoiceBot</p>
                        <p className="text-3xl font-display font-bold text-green-400">5%</p>
                        <p className="text-green-400 text-xs mt-1">75% reduction</p>
                      </div>
                      <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/10 p-4 rounded-xl border border-purple-500/20">
                        <p className="text-gray-400 text-xs mb-1">Revenue Saved</p>
                        <p className="text-3xl font-display font-bold text-white">$31K</p>
                        <p className="text-gray-400 text-xs mt-1">annually</p>
                      </div>
                      <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/10 p-4 rounded-xl border border-blue-500/20">
                        <p className="text-gray-400 text-xs mb-1">Confirmations</p>
                        <p className="text-3xl font-display font-bold text-white">95%</p>
                        <p className="text-gray-400 text-xs mt-1">reply rate</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Feature 3: Upselling & Add-ons */}
          <div className="mb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Visual Left */}
              <div className="order-2 lg:order-1">
                <Card className="premium-card rounded-2xl p-8 border-cyan-500/20">
                  <CardContent className="p-0 space-y-4">
                    <div className="pb-4 border-b border-gray-700">
                      <p className="text-sm text-gray-400 mb-3">AI Upsell Examples</p>
                    </div>
                    <div className="space-y-3">
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <i className="fas fa-robot text-cyan-400 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-white text-sm">"I see you're booking a haircut. Would you like to add a deep conditioning treatment for $25? It pairs perfectly with your service."</p>
                            <p className="text-green-400 text-xs mt-2">30% acceptance rate</p>
                          </div>
                        </div>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg">
                        <div className="flex items-start space-x-3">
                          <div className="w-8 h-8 bg-cyan-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                            <i className="fas fa-robot text-cyan-400 text-sm"></i>
                          </div>
                          <div>
                            <p className="text-white text-sm">"Based on your last visit, you might enjoy our new organic facial. Would you like me to book that instead?"</p>
                            <p className="text-green-400 text-xs mt-2">Personalized suggestions</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Text Right */}
              <div className="order-1 lg:order-2">
                <div className="w-16 h-16 bg-gradient-to-br from-cyan-400 to-cyan-600 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-dollar-sign text-white text-2xl"></i>
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                  Boost Revenue with Smart Upselling
                </h3>
                <p className="text-xl text-gray-300 mb-6">
                  Your AI receptionist suggests add-on services, premium products, and upgrades during every booking call - something busy staff often forget to do.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">AI suggests relevant add-ons based on booked service</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">30% of callers accept upsell offers</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Personalized recommendations from customer history</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Track upsell performance in your dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Feature 4: Intelligent Knowledge Base */}
          <div className="mb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Text Left */}
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-yellow-400 to-yellow-600 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-brain text-white text-2xl"></i>
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                  Knows Your Services Inside Out
                </h3>
                <p className="text-xl text-gray-300 mb-6">
                  Your AI learns everything about your business - services, pricing, team members, and policies. It answers customer questions instantly, from pricing to service recommendations.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Answers service and pricing questions instantly</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Knows each team member's specialties and availability</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Explains cancellation policies and promotions</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Easy updates when you add new services</span>
                  </li>
                </ul>
              </div>

              {/* Visual Right */}
              <div>
                <Card className="premium-card rounded-2xl p-8 border-yellow-500/20">
                  <CardContent className="p-0 space-y-4">
                    <div className="pb-4 border-b border-gray-700">
                      <p className="text-sm text-gray-400 mb-2">Service Knowledge</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="w-10 h-10 bg-pink-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-cut text-pink-400"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">Core Services</p>
                          <p className="text-gray-400 text-xs">Appointments, Consultations, Projects</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-spa text-purple-400"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">Premium Services</p>
                          <p className="text-gray-400 text-xs">Consultations, Treatments, Packages</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3 p-3 bg-gray-800/50 rounded-lg">
                        <div className="w-10 h-10 bg-orange-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                          <i className="fas fa-hand-sparkles text-orange-400"></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-white text-sm font-semibold truncate">Add-On Services</p>
                          <p className="text-gray-400 text-xs">Upgrades, Extras, Special Packages</p>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>

          {/* Feature 5: Customer Memory */}
          <div className="mb-32">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Visual Left */}
              <div className="order-2 lg:order-1">
                <Card className="premium-card rounded-2xl p-8 border-green-500/20">
                  <CardContent className="p-0 space-y-4">
                    <div className="pb-4 border-b border-gray-700">
                      <p className="text-sm text-gray-400 mb-2">Client Profile</p>
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 bg-gray-800/50 rounded-lg">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-pink-500/20 rounded-full flex items-center justify-center">
                            <i className="fas fa-user text-pink-400"></i>
                          </div>
                          <div>
                            <p className="text-white text-sm font-semibold">Amanda Williams</p>
                            <p className="text-gray-400 text-xs">(555) 987-6543</p>
                          </div>
                        </div>
                        <span className="bg-yellow-900/30 border border-yellow-500/50 text-yellow-300 px-2 py-1 rounded-md text-xs font-semibold">VIP</span>
                      </div>
                      <div className="grid grid-cols-2 gap-3 pt-2">
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <p className="text-gray-400 text-xs mb-1">Total Visits</p>
                          <p className="text-white text-lg font-semibold">32</p>
                        </div>
                        <div className="bg-gray-800/50 p-3 rounded-lg">
                          <p className="text-gray-400 text-xs mb-1">Lifetime Value</p>
                          <p className="text-white text-lg font-semibold">$4,200</p>
                        </div>
                      </div>
                      <div className="bg-gray-800/50 p-3 rounded-lg">
                        <p className="text-gray-400 text-xs mb-2">Preferences</p>
                        <p className="text-white text-sm">Prefers Maria for color. Allergic to lavender products. Likes scalp massage with cuts.</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Text Right */}
              <div className="order-1 lg:order-2">
                <div className="w-16 h-16 bg-gradient-to-br from-green-400 to-green-600 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-heart text-white text-2xl"></i>
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                  Personalized Client Experience
                </h3>
                <p className="text-xl text-gray-300 mb-6">
                  Your AI remembers every client's preferences, allergies, favorite team members, and service history. Every call feels personal and builds loyalty.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Greets returning clients by name</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Remembers preferences and allergies</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Tracks VIP clients and lifetime value</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Notes special requests for future visits</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          {/* Feature 6: Integrations */}
          <div className="mb-16">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Text Left */}
              <div>
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-indigo-600 rounded-2xl flex items-center justify-center mb-6">
                  <i className="fas fa-plug text-white text-2xl"></i>
                </div>
                <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-4">
                  Works with Your Existing Tools
                </h3>
                <p className="text-xl text-gray-300 mb-6">
                  Seamlessly integrates with the business management software you already use. No complicated setup or workflow changes required.
                </p>
                <ul className="space-y-3">
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Popular scheduling & CRM platforms</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Google Calendar, Cal.com, Calendly</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">Square POS for seamless payments</span>
                  </li>
                  <li className="flex items-start space-x-3">
                    <i className="fas fa-check text-green-400 mt-1"></i>
                    <span className="text-gray-300">20+ native integrations, 7,000+ via Zapier</span>
                  </li>
                </ul>
              </div>

              {/* Visual Right - Integration Logos */}
              <div>
                <Card className="premium-card rounded-2xl p-8 border-indigo-500/20">
                  <CardContent className="p-0">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-800/50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-purple-500/20 rounded-full flex items-center justify-center mb-2">
                          <i className="fas fa-spa text-purple-400 text-xl"></i>
                        </div>
                        <span className="text-gray-300 text-xs">Boulevard</span>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-pink-500/20 rounded-full flex items-center justify-center mb-2">
                          <i className="fas fa-cut text-pink-400 text-xl"></i>
                        </div>
                        <span className="text-gray-300 text-xs">Meevo</span>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mb-2">
                          <i className="fab fa-google text-red-400 text-xl"></i>
                        </div>
                        <span className="text-gray-300 text-xs">Google Cal</span>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-green-500/20 rounded-full flex items-center justify-center mb-2">
                          <i className="fas fa-credit-card text-green-400 text-xl"></i>
                        </div>
                        <span className="text-gray-300 text-xs">Square</span>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-blue-500/20 rounded-full flex items-center justify-center mb-2">
                          <i className="fas fa-calendar text-blue-400 text-xl"></i>
                        </div>
                        <span className="text-gray-300 text-xs">Cal.com</span>
                      </div>
                      <div className="bg-gray-800/50 p-4 rounded-lg flex flex-col items-center justify-center">
                        <div className="w-12 h-12 bg-orange-500/20 rounded-full flex items-center justify-center mb-2">
                          <i className="fas fa-bolt text-orange-400 text-xl"></i>
                        </div>
                        <span className="text-gray-300 text-xs">Zapier</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </section>
      {/* Social Proof / Case Studies Section */}
      <section id="case-studies" className="py-32 bg-gradient-to-b from-gray-950 to-black">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6">
              Real Businesses, <span className="bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent">Real Results</span>
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              See the measurable impact AI receptionists deliver for service businesses like yours.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Luxury Day Spa Case Study */}
            <Card className="premium-card rounded-2xl p-8 border-purple-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-spa text-purple-400 text-xl"></i>
                  </div>
                  <span className="bg-purple-900/30 border border-purple-500/50 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Service Business
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-3">45% Reduction in No-Shows</h4>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-purple-400"></i>
                    <span className="text-sm">Automated SMS reminders 24 hours before appointments</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-purple-400"></i>
                    <span className="text-sm">Real-time calendar sync prevented double-bookings</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-purple-400"></i>
                    <span className="text-sm">AI handled 200+ booking calls per month after hours</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Hair Salon Chain Case Study */}
            <Card className="premium-card rounded-2xl p-8 border-pink-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-cut text-pink-400 text-xl"></i>
                  </div>
                  <span className="bg-pink-900/30 border border-pink-500/50 text-pink-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Professional Services
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-3">$18,000 Monthly Revenue Increase</h4>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-pink-400"></i>
                    <span className="text-sm">Staff no longer interrupted during client interactions</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-pink-400"></i>
                    <span className="text-sm">AI upsold add-on services in 30% of calls</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-pink-400"></i>
                    <span className="text-sm">Captured 95% of after-hours booking requests</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Nail & Beauty Bar Case Study */}
            <Card className="premium-card rounded-2xl p-8 border-orange-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-hand-sparkles text-orange-400 text-xl"></i>
                  </div>
                  <span className="bg-orange-900/30 border border-orange-500/50 text-orange-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Appointment-Based Business
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-3">18 Hours/Week Staff Time Saved</h4>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-orange-400"></i>
                    <span className="text-sm">AI answered service, pricing, and hours questions instantly</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-orange-400"></i>
                    <span className="text-sm">Integrated with Square for seamless payment processing</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-orange-400"></i>
                    <span className="text-sm">Collected customer preferences for personalized service</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Integrations Section */}
      <section id="integrations" className="py-32 bg-gradient-to-b from-black to-gray-900">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center mb-16 fade-in-up">
            <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-500/50 text-blue-300 px-6 py-3 rounded-full backdrop-blur-sm mb-8">
              <i className="fas fa-plug text-blue-400"></i>
              <span className="font-bold">Powered by Zapier, Make & Native APIs</span>
            </div>
            <h2 className="text-5xl md:text-6xl font-display font-bold mb-6">
              Connects to <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">5,000+</span> Integrations
            </h2>
            <p className="text-xl text-gray-300 max-w-3xl mx-auto">
              VoiceBot works seamlessly with the tools your business already relies on. Connect your calendar, CRM, payment processor, and more — no coding required.
            </p>
          </div>

          {/* Integration Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-16">
            {[
              { name: 'Google Calendar', icon: 'fab fa-google', color: 'text-red-400', bg: 'bg-red-500/10' },
              { name: 'Salesforce', icon: 'fas fa-cloud', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { name: 'HubSpot', icon: 'fas fa-chart-bar', color: 'text-orange-400', bg: 'bg-orange-500/10' },
              { name: 'Square', icon: 'fas fa-credit-card', color: 'text-green-400', bg: 'bg-green-500/10' },
              { name: 'Stripe', icon: 'fas fa-money-bill', color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { name: 'Calendly', icon: 'fas fa-calendar-check', color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
              { name: 'Slack', icon: 'fab fa-slack', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { name: 'Shopify', icon: 'fab fa-shopify', color: 'text-green-400', bg: 'bg-green-500/10' },
              { name: 'Twilio', icon: 'fas fa-phone', color: 'text-red-400', bg: 'bg-red-500/10' },
              { name: 'Zapier', icon: 'fas fa-bolt', color: 'text-orange-400', bg: 'bg-orange-500/10' },
              { name: 'Make', icon: 'fas fa-cogs', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { name: 'Zoho CRM', icon: 'fas fa-briefcase', color: 'text-indigo-400', bg: 'bg-indigo-500/10' },
              { name: 'Mailchimp', icon: 'fas fa-envelope', color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
              { name: 'QuickBooks', icon: 'fas fa-calculator', color: 'text-green-400', bg: 'bg-green-500/10' },
              { name: 'Outlook', icon: 'fab fa-microsoft', color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { name: 'Acuity', icon: 'fas fa-clock', color: 'text-pink-400', bg: 'bg-pink-500/10' },
              { name: 'OpenTable', icon: 'fas fa-utensils', color: 'text-red-400', bg: 'bg-red-500/10' },
              { name: 'Mindbody', icon: 'fas fa-dumbbell', color: 'text-purple-400', bg: 'bg-purple-500/10' },
            ].map((integration) => (
              <Card key={integration.name} className="premium-card rounded-xl p-4 hover:border-blue-500/40 transition-all duration-200 cursor-default">
                <CardContent className="p-0 flex flex-col items-center text-center gap-2">
                  <div className={`w-10 h-10 ${integration.bg} rounded-lg flex items-center justify-center`}>
                    <i className={`${integration.icon} ${integration.color} text-lg`}></i>
                  </div>
                  <span className="text-gray-300 text-xs font-medium leading-tight">{integration.name}</span>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Categories */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-16">
            {[
              { label: 'CRM & Sales', count: '800+', icon: 'fas fa-users', color: 'from-blue-400 to-blue-600' },
              { label: 'Calendars & Scheduling', count: '200+', icon: 'fas fa-calendar', color: 'from-purple-400 to-purple-600' },
              { label: 'Payments & Billing', count: '150+', icon: 'fas fa-credit-card', color: 'from-green-400 to-green-600' },
              { label: 'Marketing & Email', count: '500+', icon: 'fas fa-bullhorn', color: 'from-orange-400 to-orange-600' },
            ].map((cat) => (
              <Card key={cat.label} className="premium-card rounded-2xl p-6">
                <CardContent className="p-0 text-center">
                  <div className={`w-12 h-12 bg-gradient-to-br ${cat.color} rounded-xl flex items-center justify-center mx-auto mb-3`}>
                    <i className={`${cat.icon} text-white text-lg`}></i>
                  </div>
                  <div className={`text-2xl font-display font-bold bg-gradient-to-r ${cat.color} bg-clip-text text-transparent mb-1`}>{cat.count}</div>
                  <p className="text-gray-400 text-sm">{cat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <Card className="premium-card rounded-3xl p-10 max-w-3xl mx-auto border-blue-500/30">
              <CardContent className="p-0 text-center">
                <div className="text-7xl font-display font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-4">5,000+</div>
                <p className="text-xl text-gray-300 mb-2">Apps and integrations available</p>
                <p className="text-gray-500 text-sm mb-8">Through Zapier, Make, and our growing library of native integrations</p>
                <Button
                  onClick={handleSignup}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium transition-colors"
                  data-testid="button-integrations-cta"
                >
                  Start Connecting Today
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Bottom Line & Final CTA Section */}
      <section className="py-32" style={{ backgroundColor: '#0D0D0D' }}>
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="text-center">
            <Card className="premium-card rounded-2xl p-12 max-w-4xl mx-auto border-blue-500/30">
              <CardContent className="p-0">
                <h3 className="text-3xl md:text-4xl font-display font-bold text-white mb-8">
                  Stop losing revenue to missed calls and no-shows
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
                  <div>
                    <div className="text-5xl font-display font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
                      45%
                    </div>
                    <p className="text-gray-300">Reduction in no-shows</p>
                  </div>
                  <div>
                    <div className="text-5xl font-display font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
                      $18K
                    </div>
                    <p className="text-gray-300">Monthly revenue increase</p>
                  </div>
                  <div>
                    <div className="text-5xl font-display font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent mb-2">
                      18hrs
                    </div>
                    <p className="text-gray-300">Weekly time saved</p>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row gap-2 justify-center max-w-lg mx-auto">
                  <Input
                    type="url"
                    placeholder="yourwebsite.com"
                    value={ctaWebsite}
                    onChange={(e) => setCtaWebsite(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleWebsiteRedirect(ctaWebsite)}
                    className="bg-transparent border-gray-800 text-white placeholder-gray-500 focus:border-blue-500 rounded-xl h-12 text-base"
                    data-testid="input-cta-website"
                  />
                  <Button
                    onClick={() => handleWebsiteRedirect(ctaWebsite)}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-6 h-12 rounded-xl font-medium transition-colors whitespace-nowrap flex items-center gap-2"
                    data-testid="button-final-cta"
                  >
                    <Plus className="h-4 w-4" />
                    Create Voicebot
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* Footer */}
      <footer id="contact" className="bg-black py-16 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          {/* Main Footer Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 pb-12">
            {/* Column 1: Logo & Description */}
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <img src={logoImage} alt="VoiceBot Logo" className="h-7 w-7 object-contain filter brightness-0 invert flex-shrink-0" />
                <span className="text-2xl font-display font-bold text-white">VoiceBot</span>
              </div>
              <p className="text-gray-400 text-sm leading-relaxed">
                Create luxury AI voice experiences for businesses with our premium automation platform.
                Elevate your customer service with intelligent conversation technology.
              </p>
            </div>

            {/* Column 2: Product Links */}
            <div>
              <h4 className="font-display font-bold mb-4 text-white text-base">Product</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><button onClick={() => scrollToSection('features')} className="hover:text-white transition-colors duration-200 text-left">Features</button></li>
                <li><button onClick={() => scrollToSection('pricing')} className="hover:text-white transition-colors duration-200 text-left">Pricing</button></li>
              </ul>
            </div>

            {/* Column 3: Support Links */}
            <div>
              <h4 className="font-display font-bold mb-4 text-white text-base">Support</h4>
              <ul className="space-y-3 text-sm text-gray-400">
                <li><Link href="/help" className="hover:text-white transition-colors duration-200">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white transition-colors duration-200">Contact Us</Link></li>
                <li><Link href="/privacy" className="hover:text-white transition-colors duration-200">Privacy Policy</Link></li>
                <li><Link href="/terms" className="hover:text-white transition-colors duration-200">Terms of Service</Link></li>
              </ul>
            </div>
          </div>

          {/* Sources & Research - Collapsible Section (Full Width) */}
          <div className="pt-4 pb-2">
            <button
              onClick={() => setShowSources(!showSources)}
              className="flex items-center gap-3 text-xs font-semibold text-gray-400 hover:text-gray-200 transition-colors duration-200 uppercase tracking-wider focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-black rounded px-4 py-3"
              aria-expanded={showSources}
              aria-controls="sources-content"
            >
              <i className={`fas fa-${showSources ? 'minus' : 'plus'} text-xs`}></i>
              <span>Sources & Research</span>
            </button>

            {showSources && (
              <div
                id="sources-content"
                className="text-xs text-gray-500 space-y-3 mt-4 px-4 animate-fade-in"
              >
                <p className="mb-4 italic text-gray-400">All statistics and case studies are based on recent industry research and published studies:</p>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2">
                  <p>• <span className="font-semibold text-gray-400">Missed call statistics:</span> Numa, "22 Business Phone Statistics" (2024-2025)</p>
                  <p>• <span className="font-semibold text-gray-400">Revenue impact data:</span> Invoca, "How Much Missed Sales Calls Cost Home Services Businesses"</p>
                  <p>• <span className="font-semibold text-gray-400">Customer behavior:</span> Continental Message, "Missed Calls: Hidden Cost & Impact on Your Business"</p>
                  <p>• <span className="font-semibold text-gray-400">Small business data:</span> Alliance Virtual Offices, "Shocking Research Finds Small Businesses Miss Half of Incoming Calls"</p>
                  <p>• <span className="font-semibold text-gray-400">Industry benchmarks:</span> Callin.io, "Missed Phone Calls in 2025"</p>
                  <p>• <span className="font-semibold text-gray-400">Financial impact:</span> Unicom Corp, "The Impact Of Missed Calls For Your Business Explained"</p>
                  <p>• <span className="font-semibold text-gray-400">AI receptionist ROI:</span> Resonateapp, "AI Receptionists 2024-2025: 50+ Statistics"</p>
                  <p>• <span className="font-semibold text-gray-400">Case studies:</span> Dialzara, "Measuring AI Chatbot ROI: Case Studies"</p>
                  <p>• <span className="font-semibold text-gray-400">Cost savings data:</span> EVS7, "AI Answering Service Cost: Pricing Guide for Small Businesses"</p>
                  <p>• <span className="font-semibold text-gray-400">Implementation results:</span> Simbo AI, "Financial Implications of AI Phone Answering Services"</p>
                  <p>• <span className="font-semibold text-gray-400">Medical practice data:</span> Dialzara, "The Ultimate Guide: How AI is Changing Phone Answering Service"</p>
                  <p>• <span className="font-semibold text-gray-400">ROI metrics:</span> IDC-Microsoft Study, "Measuring the ROI of AI: Key Metrics and Strategies" (2023)</p>
                </div>

                <p className="mt-6 pt-4 text-gray-400">
                  <span className="font-semibold">Research Period:</span> Data collected from industry studies published between 2023-2025. All monetary values are in USD.
                </p>
              </div>
            )}
          </div>

          {/* Copyright */}
          <div className="border-t border-gray-800 pt-6 text-center">
            <p className="text-xs text-gray-500">&copy; 2026 VoiceBot. All rights reserved.</p>
          </div>
        </div>
      </footer>
      {/* Sticky Floating Call Button - shows when scrolled */}
      <a
        href="tel:+12604685943"
        className={`fixed bottom-6 right-6 rounded-full flex items-center justify-center shadow-2xl z-50 glow-blue cursor-pointer border-0 transition-all duration-500 ease-in-out focus:outline-none bg-gradient-to-br from-blue-400 to-blue-600 hover:from-blue-500 hover:to-blue-700 hover:scale-125 ${
          callButtonScrolled ? 'w-16 h-16 opacity-100' : 'w-0 h-0 opacity-0'
        }`}
        title="Call our AI receptionist"
        data-testid="sticky-demo-call-button"
      >
        <i className={`fas fa-phone text-white ${callButtonScrolled ? 'text-xl' : 'lg:text-[0px] text-xl'}`}></i>
      </a>
    </div>
  );
}