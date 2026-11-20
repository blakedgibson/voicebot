/**
 * Signup Progress Manager
 *
 * Manages the signup flow state and redirects users to their incomplete step
 * when they return to the application during the signup process.
 */

export type SignupStep = 'account-created' | 'business-info' | 'business-confirmed' | 'payment-completed';

export interface SignupProgress {
  userId?: string;
  currentStep: SignupStep;
  completedSteps: SignupStep[];
  stepData?: Record<string, any>;
  isCompleted: boolean;
}

/**
 * Save the current redirect target in localStorage
 * This allows us to redirect users back to where they left off
 */
export function saveRedirectTarget(target: string): void {
  localStorage.setItem('signupRedirectTarget', target);
  console.log(`📍 Saved signup redirect target: ${target}`);
}

/**
 * Get the saved redirect target from localStorage
 */
export function getRedirectTarget(): string | null {
  return localStorage.getItem('signupRedirectTarget');
}

/**
 * Clear the saved redirect target
 */
export function clearRedirectTarget(): void {
  localStorage.removeItem('signupRedirectTarget');
  console.log('🧹 Cleared signup redirect target');
}

/**
 * Get the redirect path based on signup step
 */
export function getRedirectPathForStep(step: SignupStep): string {
  // All signup steps now redirect to dashboard since onboarding pages are removed
  return '/dashboard';
}

/**
 * Fetch the current signup progress from the backend
 */
export async function fetchSignupProgress(): Promise<SignupProgress | null> {
  try {
    const response = await fetch('/api/signup-progress', {
      method: 'GET',
      credentials: 'include',
    });

    if (!response.ok) {
      console.warn('Failed to fetch signup progress:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('✅ Fetched signup progress:', data);
    return data;
  } catch (error) {
    console.error('Error fetching signup progress:', error);
    return null;
  }
}

/**
 * Save signup progress to the backend
 */
export async function saveSignupProgress(
  userId: string,
  currentStep: SignupStep,
  stepData?: Record<string, any>,
  completedSteps?: SignupStep[]
): Promise<SignupProgress | null> {
  try {
    const response = await fetch('/api/signup-progress', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        userId,
        currentStep,
        stepData: stepData || {},
        completedSteps: completedSteps || [currentStep],
        isCompleted: false,
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Failed to save signup progress:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('✅ Saved signup progress:', data);
    return data;
  } catch (error) {
    console.error('Error saving signup progress:', error);
    return null;
  }
}

/**
 * Update signup progress on the backend
 */
export async function updateSignupProgress(
  id: string,
  currentStep: SignupStep,
  stepData?: Record<string, any>,
  completedSteps?: SignupStep[],
  isCompleted?: boolean
): Promise<SignupProgress | null> {
  try {
    const response = await fetch(`/api/signup-progress/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        currentStep,
        stepData: stepData || {},
        completedSteps: completedSteps || [],
        isCompleted: isCompleted || false,
      }),
      credentials: 'include',
    });

    if (!response.ok) {
      console.error('Failed to update signup progress:', response.status);
      return null;
    }

    const data = await response.json();
    console.log('✅ Updated signup progress:', data);
    return data;
  } catch (error) {
    console.error('Error updating signup progress:', error);
    return null;
  }
}

/**
 * Handle signup completion redirect
 * This function checks for incomplete signup progress and redirects appropriately
 */
export async function handleSignupCompletion(delayMs: number = 800): Promise<string | null> {
  try {
    // Add delay to ensure session is established
    await new Promise(resolve => setTimeout(resolve, 500));

    // Check for previously saved redirect target
    const savedTarget = getRedirectTarget();
    if (savedTarget) {
      console.log(`📍 Using saved redirect target: ${savedTarget}`);
      clearRedirectTarget();
      return savedTarget;
    }

    // Fetch signup progress from backend
    const progress = await fetchSignupProgress();

    if (!progress) {
      console.log('No signup progress found, redirecting to dashboard');
      return '/dashboard';
    }

    if (progress.isCompleted) {
      console.log('Signup is completed, redirecting to dashboard');
      return '/dashboard';
    }

    // All signup steps now redirect to dashboard since onboarding pages are removed
    console.log(`📍 Redirecting to dashboard (current step: ${progress.currentStep})`);
    return '/dashboard';
  } catch (error) {
    console.error('Error handling signup completion:', error);
    return '/dashboard';
  }
}
