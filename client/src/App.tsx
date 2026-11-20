import { Switch, Route, useLocation } from "wouter";
import React, { useEffect, Component } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/useAuth";
import PremiumLanding from "@/pages/PremiumLanding";
import Dashboard from "@/pages/Dashboard";
import AgentBuilder from "@/pages/AgentBuilder";
import RestaurantBuilder from "@/pages/RestaurantBuilder";
import Explore from "@/pages/Explore";
import NotFound from "@/pages/not-found";
import CallLogs from "@/pages/CallLogs";
import Auth from "@/pages/Auth";
import SubscriptionPlans from "@/pages/SubscriptionPlans";
import BillingDashboard from "@/pages/BillingDashboard";
import PrivacyPolicy from "@/pages/PrivacyPolicy";
import TermsOfService from "@/pages/TermsOfService";
import ContactUs from "@/pages/ContactUs";
import HelpCenter from "@/pages/HelpCenter";
import ApiDocs from "@/pages/ApiDocs";
import AcceptInvite from "@/pages/AcceptInvite";
import VerifyEmailSent from "@/pages/VerifyEmailSent";
import VerifyEmail from "@/pages/VerifyEmail";
import LoadingDashboard from "@/pages/LoadingDashboard";
import ResultsPage from "@/pages/ResultsPage";
import PricingPage from "@/pages/PricingPage";

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: string;
}

class ErrorBoundary extends Component<{ children: React.ReactNode }, ErrorBoundaryState> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: '' };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error, errorInfo: '' };
  }

  componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('App crashed:', error, info);
    this.setState({ errorInfo: info.componentStack || '' });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D0D0D' }}>
          <div className="text-center max-w-lg px-6">
            <div className="text-red-400 text-5xl mb-4">⚠</div>
            <h1 className="text-white text-xl font-semibold mb-2">Something went wrong</h1>
            <p className="text-gray-400 text-sm mb-6">The dashboard encountered an error. Please refresh the page to try again.</p>
            <button
              onClick={() => window.location.reload()}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            {this.state.error && (
              <details className="mt-6 text-left">
                <summary className="text-gray-500 text-xs cursor-pointer hover:text-gray-300">Show error details</summary>
                <pre className="mt-2 text-red-300 text-xs bg-gray-900 p-3 rounded overflow-auto max-h-48 border border-gray-700">
                  {this.state.error.message}
                  {'\n\n'}
                  {this.state.errorInfo}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

function Router() {
  const { isAuthenticated, isLoading, shouldRedirectToDashboard, hasActiveSubscription } = useAuth();
  const [location, navigate] = useLocation();

  // Check if user just completed payment
  const paymentCompleted = localStorage.getItem('paymentCompleted') === 'true';

  // Auto-redirect authenticated users with active subscriptions to dashboard
  useEffect(() => {
    if (!isLoading && isAuthenticated && shouldRedirectToDashboard && location === '/') {
      console.log('🔄 Auto-redirecting user with active subscription to dashboard...');
      navigate('/dashboard');
    }
  }, [isLoading, isAuthenticated, shouldRedirectToDashboard, location, navigate]);


  return (
    <Switch>
      <Route path="/accept-invite" component={AcceptInvite} />
      <Route path="/login" component={Auth} />
      <Route path="/signup" component={Auth} />
      <Route path="/verify-email-sent" component={VerifyEmailSent} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/loading-dashboard" component={LoadingDashboard} />
      <Route path="/restaurant" component={RestaurantBuilder} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/builder" component={AgentBuilder} />
      <Route path="/explore" component={Explore} />
      <Route path="/calls" component={CallLogs} />
      <Route path="/subscription/plans" component={SubscriptionPlans} />
      <Route path="/billing" component={BillingDashboard} />
      <Route path="/privacy" component={PrivacyPolicy} />
      <Route path="/terms" component={TermsOfService} />
      <Route path="/contact" component={ContactUs} />
      <Route path="/help" component={HelpCenter} />
      <Route path="/api-docs" component={ApiDocs} />
      <Route path="/results" component={ResultsPage} />
      <Route path="/pricing" component={PricingPage} />
      {isLoading ? (
        <Route path="/" component={PremiumLanding} />
      ) : !isAuthenticated && !paymentCompleted ? (
        <Route path="/" component={PremiumLanding} />
      ) : hasActiveSubscription ? (
        <Route path="/" component={Dashboard} />
      ) : (
        <Route path="/" component={PremiumLanding} />
      )}
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <ErrorBoundary>
            <Router />
          </ErrorBoundary>
        </TooltipProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

export default App;
