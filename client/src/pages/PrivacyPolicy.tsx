import { useEffect } from 'react';
import { Link } from 'wouter';
import { setPageMeta } from '@/lib/pageMeta';
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";
import SiteNav from '@/components/SiteNav';

export default function PrivacyPolicy() {
  useEffect(() => {
    setPageMeta({
      title: 'Privacy Policy | VoiceBot',
      description: 'Read VoiceBot\'s privacy policy to learn how we collect, use, and protect your personal data.',
      canonical: 'https://voicebot.one/privacy',
    });
  }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Privacy Policy</h1>
          <p className="text-gray-500 text-sm">Last updated: January 1, 2025</p>
        </div>

        <div className="space-y-2">
          {/* Section 1 */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">1. Information We Collect</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              VoiceBot collects information you provide directly to us, such as when you create an account, configure your AI receptionist, or contact us for support.
            </p>
            <ul className="space-y-2">
              {[
                "Account information (name, email, business details)",
                "Business configuration data (restaurant details, menu information, operating hours)",
                "Call recordings and transcripts for service improvement",
                "Usage data and analytics to optimize performance"
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <i className="fas fa-check text-blue-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 2 */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">2. How We Use Your Information</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">We use the information we collect to:</p>
            <ul className="space-y-2">
              {[
                "Provide and maintain our AI voice receptionist services",
                "Process payments and manage your subscription",
                "Improve our AI models and service quality",
                "Send you important service updates and notifications",
                "Provide customer support and respond to inquiries"
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <i className="fas fa-check text-blue-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 3 — Google */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">3. Google User Data and Limited Use</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              VoiceBot's use of information received from Google APIs adheres to the{' '}
              <a href="https://developers.google.com/terms/api-services-user-data-policy" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 underline">
                Google API Services User Data Policy
              </a>, including the Limited Use requirements.
            </p>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">
              When you sign in with Google, we only access your basic profile information (name, email address, and profile picture) for:
            </p>
            <ul className="space-y-2 mb-4">
              {[
                "Authentication: To create and verify your VoiceBot account",
                "Account Management: To provide you access to your dashboard and settings",
                "Communication: To send you service-related notifications about your account"
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <i className="fas fa-check text-blue-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-gray-400 text-sm font-medium mb-2">We do NOT:</p>
            <ul className="space-y-2 mb-3">
              {[
                "Use Google user data for serving advertisements",
                "Transfer Google user data to third parties for advertising purposes",
                "Use Google user data for purposes unrelated to providing VoiceBot's core functionality",
                "Allow humans to read your Google data unless required for security or legal compliance"
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <i className="fas fa-times text-red-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  {item}
                </li>
              ))}
            </ul>
            <p className="text-gray-500 text-sm">Google user data is used solely to provide and improve VoiceBot's AI receptionist services.</p>
          </div>

          {/* Section 4 */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">4. Information Sharing</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">We do not sell, trade, or transfer your personal information to third parties except:</p>
            <ul className="space-y-2">
              {[
                "With your explicit consent",
                "To trusted service providers who assist in operating our service (e.g., cloud hosting, payment processing)",
                "When required by law or to protect our rights",
                "In connection with a business transfer or acquisition"
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <i className="fas fa-check text-blue-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 5 */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">5. Data Security</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              We implement appropriate technical and organizational security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction. All data is encrypted in transit and at rest.
            </p>
          </div>

          {/* Section 6 */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">6. Call Recording and AI Training</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">By using our service, you acknowledge that:</p>
            <ul className="space-y-2">
              {[
                "Calls to your AI receptionist may be recorded for quality assurance",
                "Call data may be used to improve AI performance (this does NOT include any Google user data)",
                "You are responsible for complying with local recording consent laws"
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <i className="fas fa-check text-blue-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 7 */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">7. Your Rights</h2>
            <p className="text-gray-400 text-sm leading-relaxed mb-3">You have the right to:</p>
            <ul className="space-y-2">
              {[
                "Access and update your personal information",
                "Delete your account and associated data",
                "Export your data in a portable format",
                "Opt out of certain communications"
              ].map(item => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                  <i className="fas fa-check text-blue-500 mt-0.5 flex-shrink-0 text-xs"></i>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          {/* Section 8 */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">8. Contact Us</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              If you have any questions about this Privacy Policy, please contact us at{' '}
              <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors underline">
                our contact page
              </Link>
              {' '}or email us at privacy@voicebot.com.
            </p>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-10 mt-8">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <img src={logoImage} alt="VoiceBot Logo" className="h-5 w-5 object-contain filter brightness-0 invert flex-shrink-0" />
            <span className="text-lg font-display font-bold text-white">VoiceBot</span>
          </div>
          <div className="flex justify-center flex-wrap gap-6 mb-5 text-sm">
            <Link href="/privacy" className="text-gray-600 hover:text-gray-300 transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-600 hover:text-gray-300 transition-colors">Terms of Service</Link>
            <Link href="/contact" className="text-gray-600 hover:text-gray-300 transition-colors">Contact Us</Link>
            <Link href="/help" className="text-gray-600 hover:text-gray-300 transition-colors">Help Center</Link>
          </div>
          <div className="border-t border-white/[0.06] pt-5">
            <p className="text-gray-600 text-xs">&copy; 2026 VoiceBot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
