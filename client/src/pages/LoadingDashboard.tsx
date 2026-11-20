import { useEffect, useState } from 'react';

export default function LoadingDashboard() {
  const [progressMessage, setProgressMessage] = useState('Analyzing your business information...');
  const [isFailed, setIsFailed] = useState(false);

  // Progress steps matching SubscriptionProvisioningService workflow
  const progressSteps = [
    'Analyzing your business information...',
    'Generating your AI receptionist...',
    'Configuring industry-specific functions...',
    'Provisioning your phone number...',
    'Finalizing setup...',
    'Complete! Redirecting to dashboard...'
  ];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const userId = params.get('userId');

    if (!userId) {
      console.error('No userId provided');
      window.location.href = '/login';
      return;
    }

    // Re-trigger provisioning in case it hasn't started yet
    const signupEmail = localStorage.getItem('signupEmail');
    if (signupEmail) {
      fetch('/api/auth/start-provisioning', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: signupEmail })
      }).catch(() => {/* best-effort */});
    }

    let pollCount = 0;
    const MAX_POLLS = 90; // 3 minutes maximum (90 × 2s)

    const redirect = (agentId?: string, gapAnalysis?: any) => {
      if (agentId) localStorage.setItem('selectedAgentId', agentId);
      // If the extraction found missing required fields, queue the MVO modal on the dashboard
      if (gapAnalysis && gapAnalysis.missingFields?.length > 0) {
        sessionStorage.setItem('mvoSetupRequired', JSON.stringify({
          agentId,
          industry: gapAnalysis.industry,
          confidenceScore: gapAnalysis.confidenceScore,
          missingFields: gapAnalysis.missingFields,
          foundFields: gapAnalysis.foundFields ?? [],
          prefillData: gapAnalysis.prefillData ?? {},
        }));
      }
      window.location.href = '/dashboard';
    };

    const pollInterval = setInterval(async () => {
      // Always increment FIRST so timeout fires even if fetch throws
      pollCount++;

      if (pollCount >= MAX_POLLS) {
        clearInterval(pollInterval);
        console.warn('Provisioning timed out after 3 minutes, redirecting to dashboard');
        redirect();
        return;
      }

      // Update progress message (caps at "Finalizing setup..." until done)
      const stepIndex = Math.min(Math.floor(pollCount / 3), progressSteps.length - 2);
      setProgressMessage(progressSteps[stepIndex]);

      try {
        const response = await fetch(`/api/provisioning/status/${userId}`, {
          credentials: 'include'
        });
        const result = await response.json();

        if (result.success) {
          if (result.data.status === 'completed') {
            setProgressMessage(progressSteps[progressSteps.length - 1]);
            clearInterval(pollInterval);
            setTimeout(() => redirect(result.data.agentId, result.data.gapAnalysis), 1500);
            return;
          }

          if (result.data.status === 'failed') {
            clearInterval(pollInterval);
            setIsFailed(true);
            setProgressMessage('Setup encountered an issue. Redirecting to dashboard...');
            setTimeout(() => redirect(), 3000);
            return;
          }
        }
      } catch (error) {
        console.error('Error checking provisioning status:', error);
        // pollCount already incremented, timeout will still fire
      }
    }, 2000);

    // Initial immediate check — catches the case where provisioning already finished
    fetch(`/api/provisioning/status/${userId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(result => {
        if (result.success && result.data.status === 'completed') {
          setProgressMessage(progressSteps[progressSteps.length - 1]);
          clearInterval(pollInterval);
          setTimeout(() => redirect(result.data.agentId, result.data.gapAnalysis), 1500);
        }
      })
      .catch(() => {/* poll interval will handle it */});

    return () => clearInterval(pollInterval);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0D0D0D' }}>
      <div className="text-center">
        {isFailed ? (
          <div className="w-8 h-8 flex items-center justify-center mx-auto mb-4 text-yellow-400 text-2xl">⚠</div>
        ) : (
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        )}
        <p className={isFailed ? 'text-yellow-400' : 'text-gray-300'}>{progressMessage}</p>
      </div>
    </div>
  );
}
