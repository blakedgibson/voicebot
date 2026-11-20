import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { setPageMeta } from '@/lib/pageMeta';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

const faqs: FAQItem[] = [
  { id: '1', question: 'How quickly can I get my AI receptionist set up?', answer: 'Most restaurants are up and running within 24-48 hours of completing our onboarding process. This includes phone number provisioning, AI training on your business information, and testing.', category: 'getting-started' },
  { id: '2', question: 'What happens if I exceed my monthly phone minutes?', answer: "You'll be charged $0.50 per minute for any usage beyond your plan limit. You can monitor your usage in real-time from your dashboard and upgrade your plan at any time.", category: 'billing' },
  { id: '3', question: 'Can the AI handle complex orders and special requests?', answer: 'Yes! Our AI is trained to handle menu items, customizations, dietary restrictions, and special requests. It can also transfer calls to human staff when needed for complex situations.', category: 'features' },
  { id: '4', question: 'How does the AI learn about my restaurant?', answer: 'During onboarding, you provide your menu, business hours, policies, and FAQs. Our AI creates a knowledge base specific to your restaurant and continuously improves through interactions.', category: 'features' },
  { id: '5', question: 'What if a customer wants to speak to a human?', answer: 'The AI can seamlessly transfer calls to your staff when requested or when it encounters situations beyond its capabilities. You maintain full control over when transfers occur.', category: 'features' },
  { id: '6', question: 'Do I need any special equipment or phone system changes?', answer: 'No special equipment required! We provide a dedicated phone number that forwards to our AI system. You can keep your existing phone setup alongside our service.', category: 'technical' },
  { id: '7', question: 'Is my customer data secure and private?', answer: 'Yes. All data is encrypted in transit and at rest. We comply with industry privacy standards and never share customer information with third parties without consent.', category: 'privacy' },
  { id: '8', question: "Can I customize the AI's voice and personality?", answer: "Absolutely! You can choose from different voice options and customize the AI's tone, greeting style, and personality to match your restaurant's brand.", category: 'customization' },
  { id: '9', question: 'What payment methods do you accept?', answer: 'We accept all major credit cards (Visa, MasterCard, American Express, Discover) and process payments securely through Stripe.', category: 'billing' },
  { id: '10', question: 'Can I cancel my subscription at any time?', answer: 'Yes, you can cancel your subscription at any time from your dashboard. There are no long-term contracts or cancellation fees.', category: 'billing' },
  { id: '11', question: 'Does the AI work during busy hours and holidays?', answer: 'Yes! The AI works 24/7 and can handle multiple calls simultaneously, making it especially valuable during peak hours, holidays, and staff shortages.', category: 'features' },
  { id: '12', question: 'How accurate is the AI at taking orders?', answer: 'Our AI has a 95%+ accuracy rate for standard orders. It confirms details with customers and provides order summaries to ensure accuracy before completion.', category: 'features' }
];

const categories = [
  { id: 'all', name: 'All Topics', icon: 'fas fa-list' },
  { id: 'getting-started', name: 'Getting Started', icon: 'fas fa-rocket' },
  { id: 'features', name: 'Features', icon: 'fas fa-star' },
  { id: 'billing', name: 'Billing & Plans', icon: 'fas fa-credit-card' },
  { id: 'technical', name: 'Technical', icon: 'fas fa-cogs' },
  { id: 'privacy', name: 'Privacy & Security', icon: 'fas fa-shield-alt' },
  { id: 'customization', name: 'Customization', icon: 'fas fa-palette' }
];

export default function HelpCenter() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);

  useEffect(() => {
    setPageMeta({
      title: 'Help Center | VoiceBot',
      description: 'Find answers to common questions about VoiceBot\'s AI receptionist platform — setup, billing, features, and more.',
      canonical: 'https://voicebot.one/help',
    });
  }, []);

  const filteredFAQs = faqs.filter(faq => {
    const matchesSearch = faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 bg-black border-b border-white/[0.08]">
        <div className="max-w-6xl mx-auto px-6 flex justify-between items-center h-14">
          <Link href="/" className="flex items-center space-x-2">
            <img src={logoImage} alt="VoiceBot Logo" className="h-5 w-5 object-contain filter brightness-0 invert flex-shrink-0" />
            <span className="text-lg font-display font-bold text-white">VoiceBot</span>
          </Link>
          <Link href="/" className="text-gray-500 hover:text-white text-sm transition-colors duration-200">
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Help Center</h1>
          <p className="text-gray-500">Find answers to common questions about VoiceBot AI voice automation</p>
        </div>

        {/* Search */}
        <div className="relative mb-8 max-w-xl">
          <i className="fas fa-search absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-600 text-sm z-10"></i>
          <Input
            type="text"
            placeholder="Search for help topics..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#111] border-white/[0.08] text-gray-200 placeholder-gray-600 pl-10 rounded-lg h-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            data-testid="input-help-search"
          />
        </div>

        {/* Quick Links */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
          <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5 flex items-center gap-4 hover:border-blue-500/30 transition-colors cursor-pointer">
            <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
              <i className="fas fa-rocket text-blue-400 text-sm"></i>
            </div>
            <div>
              <h3 className="font-semibold text-white text-sm">Quick Start Guide</h3>
              <p className="text-gray-500 text-xs mt-0.5">Get your AI receptionist up and running in minutes</p>
            </div>
          </div>
          <Link href="/contact">
            <div className="rounded-xl border border-white/[0.08] bg-[#111] p-5 flex items-center gap-4 hover:border-blue-500/30 transition-colors cursor-pointer">
              <div className="w-10 h-10 bg-blue-600/20 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <i className="fas fa-headset text-blue-400 text-sm"></i>
              </div>
              <div>
                <h3 className="font-semibold text-white text-sm">Contact Support</h3>
                <p className="text-gray-500 text-xs mt-0.5">Get help from our expert support team</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Category Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          {categories.map(category => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 border ${
                selectedCategory === category.id
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-transparent text-gray-400 border-white/[0.08] hover:border-white/20 hover:text-white'
              }`}
              data-testid={`button-category-${category.id}`}
            >
              <i className={`${category.icon} text-xs`}></i>
              {category.name}
            </button>
          ))}
        </div>

        {/* FAQ List */}
        <div className="space-y-1.5">
          {filteredFAQs.length === 0 ? (
            <div className="rounded-xl border border-white/[0.08] bg-[#111] p-10 text-center">
              <i className="fas fa-search text-3xl text-gray-700 mb-3 block"></i>
              <h3 className="text-base font-semibold text-gray-400 mb-1">No results found</h3>
              <p className="text-gray-600 text-sm">Try adjusting your search or browse different categories</p>
            </div>
          ) : (
            filteredFAQs.map(faq => (
              <div key={faq.id} className="rounded-xl border border-white/[0.08] bg-[#111] overflow-hidden hover:border-white/[0.15] transition-colors">
                <button
                  onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                  className="w-full text-left px-5 py-4 flex justify-between items-center gap-4"
                  data-testid={`button-faq-${faq.id}`}
                >
                  <h3 className="text-sm font-medium text-white">{faq.question}</h3>
                  <i className={`fas fa-chevron-${expandedFAQ === faq.id ? 'up' : 'down'} text-gray-600 flex-shrink-0 text-xs`}></i>
                </button>
                {expandedFAQ === faq.id && (
                  <div className="px-5 pb-4 text-gray-400 text-sm leading-relaxed border-t border-white/[0.06] pt-4">
                    {faq.answer}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Still need help */}
        <div className="mt-10 rounded-xl border border-white/[0.08] bg-[#111] p-8 text-center">
          <h3 className="text-lg font-display font-bold text-white mb-2">Still need help?</h3>
          <p className="text-gray-500 text-sm mb-6 max-w-md mx-auto">
            Our support team is ready to assist you with any questions or technical issues.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/contact">
              <Button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg text-sm font-medium" data-testid="button-contact-support">
                <i className="fas fa-envelope mr-2"></i>Contact Support
              </Button>
            </Link>
            <Button
              variant="outline"
              className="border-white/[0.08] text-gray-400 hover:bg-white/[0.05] hover:text-white px-6 py-2 rounded-lg text-sm"
              data-testid="button-schedule-call"
              onClick={() => window.open('https://calendly.com/blake4gibson/30min', '_blank')}
            >
              <i className="fas fa-calendar mr-2"></i>Schedule a Call
            </Button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-10 mt-8">
        <div className="max-w-6xl mx-auto px-6 text-center">
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
