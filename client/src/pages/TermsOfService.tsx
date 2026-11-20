import { useEffect } from 'react';
import { Link } from 'wouter';
import { setPageMeta } from '@/lib/pageMeta';
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";
import SiteNav from '@/components/SiteNav';

const sections = [
  {
    title: "1. Acceptance of Terms",
    content: "By accessing and using VoiceBot's AI voice receptionist service, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service."
  },
  {
    title: "2. Service Description",
    intro: "VoiceBot provides AI-powered voice receptionist services for restaurants and businesses, including:",
    items: [
      "Automated phone call handling and customer service",
      "Reservation management and order taking",
      "Business information and FAQ responses",
      "Call analytics and performance reporting"
    ]
  },
  {
    title: "3. User Accounts and Responsibilities",
    intro: "You are responsible for:",
    items: [
      "Maintaining the confidentiality of your account credentials",
      "All activities that occur under your account",
      "Providing accurate business information and keeping it updated",
      "Complying with all applicable laws regarding call recording and privacy",
      "Ensuring proper consent for call recording as required by law"
    ]
  },
  {
    title: "4. Payment Terms",
    intro: "Subscription fees are billed monthly in advance. Usage charges for phone minutes exceeding your plan limits are billed monthly in arrears.",
    items: [
      "All payments are processed through secure third-party payment processors",
      "You may cancel your subscription at any time",
      "Refunds are provided according to our refund policy",
      "We reserve the right to modify pricing with 30 days notice"
    ]
  },
  {
    title: "5. Service Availability and Limitations",
    intro: "While we strive for maximum uptime, we cannot guarantee 100% service availability.",
    items: [
      "Service may be interrupted for maintenance or updates",
      "AI responses are generated automatically and may not always be perfect",
      "You should have backup procedures for critical business operations",
      "We are not liable for missed calls during service interruptions"
    ]
  },
  {
    title: "6. Data and Privacy",
    intro: "Your use of our service is also governed by our Privacy Policy. By using our service:",
    items: [
      "You grant us permission to process call data to provide the service",
      "You acknowledge that calls may be recorded and analyzed",
      "You agree to comply with applicable privacy and consent laws",
      "You retain ownership of your business data"
    ]
  },
  {
    title: "7. Prohibited Use",
    intro: "You may not use our service to:",
    items: [
      "Violate any laws or regulations",
      "Harass, abuse, or harm others",
      "Distribute spam, malware, or malicious content",
      "Impersonate others or provide false information",
      "Interfere with or disrupt our service"
    ]
  },
  {
    title: "8. Limitation of Liability",
    content: "VoiceBot shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, or other intangible losses, resulting from your use of the service."
  },
  {
    title: "9. Termination",
    content: "We may terminate or suspend your account immediately, without prior notice or liability, for any reason whatsoever, including without limitation if you breach the Terms."
  },
  {
    title: "10. Changes to Terms",
    content: "We reserve the right to modify or replace these Terms at any time. If a revision is material, we will try to provide at least 30 days notice prior to any new terms taking effect."
  }
];

export default function TermsOfService() {
  useEffect(() => {
    setPageMeta({
      title: 'Terms of Service | VoiceBot',
      description: 'Read VoiceBot\'s terms of service governing use of our AI voice receptionist platform.',
      canonical: 'https://voicebot.one/terms',
    });
  }, []);
  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      {/* Content */}
      <div className="max-w-4xl mx-auto px-6 pt-32 pb-12">
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Terms of Service</h1>
          <p className="text-gray-500 text-sm">Last updated: January 1, 2025</p>
        </div>

        <div className="space-y-2">
          {sections.map((section) => (
            <div key={section.title} className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
              <h2 className="text-base font-semibold text-white mb-3">{section.title}</h2>
              {section.content && <p className="text-gray-400 text-sm leading-relaxed">{section.content}</p>}
              {section.intro && <p className="text-gray-400 text-sm leading-relaxed mb-3">{section.intro}</p>}
              {section.items && (
                <ul className="space-y-2">
                  {section.items.map((item) => (
                    <li key={item} className="flex items-start gap-2.5 text-sm text-gray-400">
                      <i className="fas fa-check text-blue-500 mt-0.5 flex-shrink-0 text-xs"></i>
                      {item}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}

          {/* Contact section */}
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h2 className="text-base font-semibold text-white mb-3">11. Contact Information</h2>
            <p className="text-gray-400 text-sm leading-relaxed">
              If you have any questions about these Terms, please contact us at{' '}
              <Link href="/contact" className="text-blue-400 hover:text-blue-300 transition-colors underline">
                our contact page
              </Link>
              {' '}or email us at legal@voicebot.com.
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
