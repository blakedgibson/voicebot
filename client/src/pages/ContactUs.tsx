import { useState, useEffect } from 'react';
import { Link } from 'wouter';
import { setPageMeta } from '@/lib/pageMeta';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import logoImage from "@assets/logo Background Removed-2_1757304575816.png";
import SiteNav from '@/components/SiteNav';

export default function ContactUs() {
  const { toast } = useToast();

  useEffect(() => {
    setPageMeta({
      title: 'Contact Us | VoiceBot',
      description: 'Get in touch with the VoiceBot team. We\'re here to help with questions about our AI receptionist platform.',
      canonical: 'https://voicebot.one/contact',
    });
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    phone: '',
    subject: 'general',
    message: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const response = await fetch('/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (response.ok) {
        toast({ title: "Message sent successfully!", description: "We'll get back to you within 24 hours." });
        setFormData({ name: '', email: '', company: '', phone: '', subject: 'general', message: '' });
      } else {
        throw new Error('Failed to send message');
      }
    } catch {
      toast({ title: "Error sending message", description: "Please try again or email us directly at voicebot.one@gmail.com", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const inputClass = "bg-[#1a1a1a] border-white/[0.08] text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg h-10";
  const labelClass = "block text-sm font-medium text-gray-400 mb-1.5";

  return (
    <div className="min-h-screen bg-black text-white">
      <SiteNav />

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 pt-32 pb-12">
        {/* Header */}
        <div className="mb-10">
          <h1 className="text-3xl font-display font-bold text-white mb-2">Contact Us</h1>
          <p className="text-gray-500">Get in touch with our team. We're here to help you succeed.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
          {/* Left column */}
          <div className="lg:col-span-2 space-y-4">
            {/* Contact info */}
            <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
              <h3 className="text-base font-semibold text-white mb-5">Get in Touch</h3>
              <div className="space-y-5">
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-envelope text-blue-400 text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm mb-0.5">Email Support</h4>
                    <p className="text-gray-400 text-sm">bgibson@voicebot.one</p>
                    <p className="text-gray-600 text-xs mt-0.5">Typically respond within 24 hours</p>
                  </div>
                </div>
                <div className="flex items-start space-x-3">
                  <div className="w-9 h-9 bg-blue-600/20 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                    <i className="fas fa-clock text-blue-400 text-sm"></i>
                  </div>
                  <div>
                    <h4 className="font-medium text-white text-sm mb-0.5">Emergency Support</h4>
                    <p className="text-gray-400 text-sm">Critical issues only</p>
                    <p className="text-gray-600 text-xs mt-0.5">24/7 for enterprise customers</p>
                  </div>
                </div>
              </div>
            </div>

            {/* FAQ */}
            <div className="rounded-xl border border-white/[0.08] bg-[#111] p-6">
              <h3 className="text-base font-semibold text-white mb-5">Common Questions</h3>
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-white text-sm mb-1">How quickly can I get started?</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">Most businesses are up and running within 24–48 hours of signup.</p>
                </div>
                <div className="border-t border-white/[0.06] pt-4">
                  <h4 className="font-medium text-white text-sm mb-1">Do you offer custom integrations?</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">Yes! We provide POS and reservation system integrations for an additional fee.</p>
                </div>
                <div className="border-t border-white/[0.06] pt-4">
                  <h4 className="font-medium text-white text-sm mb-1">What if I need to cancel?</h4>
                  <p className="text-gray-500 text-xs leading-relaxed">You can cancel anytime from your dashboard. No long-term contracts required.</p>
                </div>
              </div>
              <Link href="/help" className="inline-flex items-center mt-5 text-blue-400 hover:text-blue-300 transition-colors text-sm">
                View all FAQs <i className="fas fa-arrow-right ml-2 text-xs"></i>
              </Link>
            </div>
          </div>

          {/* Right column — Form */}
          <div className="lg:col-span-3 rounded-xl border border-white/[0.08] bg-[#111] p-6">
            <h3 className="text-base font-semibold text-white mb-5">Send us a Message</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="name" className={labelClass}>Full Name *</label>
                  <Input id="name" name="name" type="text" required value={formData.name} onChange={handleInputChange} className={inputClass} data-testid="input-contact-name" />
                </div>
                <div>
                  <label htmlFor="email" className={labelClass}>Email Address *</label>
                  <Input id="email" name="email" type="email" required value={formData.email} onChange={handleInputChange} className={inputClass} data-testid="input-contact-email" />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="company" className={labelClass}>Business Name</label>
                  <Input id="company" name="company" type="text" value={formData.company} onChange={handleInputChange} className={inputClass} data-testid="input-contact-company" />
                </div>
                <div>
                  <label htmlFor="phone" className={labelClass}>Phone Number</label>
                  <Input id="phone" name="phone" type="tel" value={formData.phone} onChange={handleInputChange} className={inputClass} data-testid="input-contact-phone" />
                </div>
              </div>
              <div>
                <label htmlFor="subject" className={labelClass}>Subject *</label>
                <Select value={formData.subject} onValueChange={(value) => setFormData({ ...formData, subject: value })} required>
                  <SelectTrigger className="bg-[#1a1a1a] border-white/[0.08] text-gray-200 rounded-lg h-10 focus:border-blue-500 focus:ring-1 focus:ring-blue-500" data-testid="select-contact-subject">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1a1a1a] border-white/[0.08] text-white">
                    <SelectItem value="general">General Inquiry</SelectItem>
                    <SelectItem value="sales">Sales & Pricing</SelectItem>
                    <SelectItem value="support">Technical Support</SelectItem>
                    <SelectItem value="billing">Billing & Account</SelectItem>
                    <SelectItem value="partnership">Partnership Opportunities</SelectItem>
                    <SelectItem value="integration">Integration Request</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label htmlFor="message" className={labelClass}>Message *</label>
                <Textarea
                  id="message" name="message" required rows={5}
                  value={formData.message} onChange={handleInputChange}
                  placeholder="Tell us how we can help you..."
                  className="bg-[#1a1a1a] border-white/[0.08] text-gray-200 placeholder-gray-600 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded-lg resize-none"
                  data-testid="textarea-contact-message"
                />
              </div>
              <Button
                type="submit" disabled={isSubmitting}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors disabled:opacity-50"
                data-testid="button-contact-submit"
              >
                {isSubmitting ? <><i className="fas fa-spinner fa-spin mr-2"></i>Sending...</> : 'Send Message'}
              </Button>
            </form>
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
