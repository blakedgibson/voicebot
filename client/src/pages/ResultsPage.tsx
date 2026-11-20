import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SiteNav from "@/components/SiteNav";

export default function ResultsPage() {
  return (
    <div className="min-h-screen text-white font-body" style={{ backgroundColor: '#0D0D0D' }}>
      <SiteNav />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6">
            Real Businesses, <span className="bg-gradient-to-r from-pink-400 to-purple-600 bg-clip-text text-transparent">Real Results</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto">
            See the measurable impact AI receptionists deliver for service businesses like yours.
          </p>
        </div>
      </section>

      {/* Key Metrics */}
      <section className="py-16 px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-20">
            {[
              { value: '45%', label: 'Average reduction in no-shows', color: 'from-blue-400 to-blue-600' },
              { value: '$18K', label: 'Average monthly revenue increase', color: 'from-green-400 to-green-600' },
              { value: '18hrs', label: 'Average weekly time saved', color: 'from-purple-400 to-purple-600' },
              { value: '100%', label: 'Call answer rate, 24/7/365', color: 'from-pink-400 to-pink-600' },
            ].map((stat) => (
              <Card key={stat.label} className="premium-card rounded-2xl p-8">
                <CardContent className="p-0 text-center">
                  <div className={`text-5xl font-display font-bold bg-gradient-to-r ${stat.color} bg-clip-text text-transparent mb-3`}>
                    {stat.value}
                  </div>
                  <p className="text-gray-400 text-sm">{stat.label}</p>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Case Studies */}
          <h2 className="text-3xl font-display font-bold text-white text-center mb-12">Customer Case Studies</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-20">
            <Card className="premium-card rounded-2xl p-8 border-purple-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-spa text-purple-400 text-xl"></i>
                  </div>
                  <span className="bg-purple-900/30 border border-purple-500/50 text-purple-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Day Spa
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-2">45% Reduction in No-Shows</h4>
                <p className="text-gray-400 text-sm mb-4">Luxury Day Spa — Atlanta, GA</p>
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

            <Card className="premium-card rounded-2xl p-8 border-pink-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-cut text-pink-400 text-xl"></i>
                  </div>
                  <span className="bg-pink-900/30 border border-pink-500/50 text-pink-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Hair Salon Chain
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-2">$18,000 Monthly Revenue Increase</h4>
                <p className="text-gray-400 text-sm mb-4">4-location salon group — Chicago, IL</p>
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

            <Card className="premium-card rounded-2xl p-8 border-orange-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-orange-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-hand-sparkles text-orange-400 text-xl"></i>
                  </div>
                  <span className="bg-orange-900/30 border border-orange-500/50 text-orange-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Beauty Bar
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-2">18 Hours/Week Staff Time Saved</h4>
                <p className="text-gray-400 text-sm mb-4">Nail & Beauty Bar — Miami, FL</p>
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

            <Card className="premium-card rounded-2xl p-8 border-green-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-stethoscope text-green-400 text-xl"></i>
                  </div>
                  <span className="bg-green-900/30 border border-green-500/50 text-green-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Medical Practice
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-2">90% Reduction in Missed Calls</h4>
                <p className="text-gray-400 text-sm mb-4">Family Health Clinic — Austin, TX</p>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-green-400"></i>
                    <span className="text-sm">Patients reach a live AI receptionist every time</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-green-400"></i>
                    <span className="text-sm">Appointment scheduling fully automated after hours</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-green-400"></i>
                    <span className="text-sm">Staff freed from phone duties, focused on patient care</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card rounded-2xl p-8 border-cyan-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-cyan-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-home text-cyan-400 text-xl"></i>
                  </div>
                  <span className="bg-cyan-900/30 border border-cyan-500/50 text-cyan-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Real Estate
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-2">3x More Qualified Leads</h4>
                <p className="text-gray-400 text-sm mb-4">Realty Group — Denver, CO</p>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-cyan-400"></i>
                    <span className="text-sm">AI qualifies leads and schedules showings 24/7</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-cyan-400"></i>
                    <span className="text-sm">Never misses an inquiry call from potential buyers</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-cyan-400"></i>
                    <span className="text-sm">Follow-up reminders sent automatically</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="premium-card rounded-2xl p-8 border-yellow-500/30">
              <CardContent className="p-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="w-12 h-12 bg-yellow-500/20 rounded-lg flex items-center justify-center">
                    <i className="fas fa-tools text-yellow-400 text-xl"></i>
                  </div>
                  <span className="bg-yellow-900/30 border border-yellow-500/50 text-yellow-300 px-3 py-1 rounded-full text-xs font-semibold">
                    Home Services
                  </span>
                </div>
                <h4 className="text-2xl font-display font-bold text-white mb-2">$9,000/Month in New Jobs</h4>
                <p className="text-gray-400 text-sm mb-4">Plumbing & HVAC Company — Phoenix, AZ</p>
                <div className="space-y-2 text-gray-300">
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-yellow-400"></i>
                    <span className="text-sm">All emergency calls answered, even at 2 AM</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-yellow-400"></i>
                    <span className="text-sm">AI triages urgency and dispatches the right tech</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <i className="fas fa-check text-yellow-400"></i>
                    <span className="text-sm">Job scheduling synced directly to technician calendars</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Performance improvements */}
          <div className="mb-20">
            <h2 className="text-3xl font-display font-bold text-white text-center mb-12">
              How AI Receptionists <span className="bg-gradient-to-r from-green-400 to-green-600 bg-clip-text text-transparent">Perform</span>
            </h2>
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
              {[
                { icon: 'fas fa-arrow-down', value: '82%', label: 'Faster resolution (11min → 2min)', color: 'text-green-400' },
                { icon: 'fas fa-dollar-sign', value: '90%', label: 'Cost reduction vs. in-house staff', color: 'text-green-400' },
                { icon: 'fas fa-users', value: '100%', label: 'Call answer rate, 24/7/365', color: 'text-green-400' },
                { icon: 'fas fa-chart-line', value: '$3.50', label: 'Average ROI per $1 invested', color: 'text-green-400' },
              ].map((stat) => (
                <Card key={stat.label} className="premium-card rounded-2xl p-6">
                  <CardContent className="p-0 text-center">
                    <div className={`${stat.color} mb-2`}>
                      <i className={`${stat.icon} text-3xl`}></i>
                    </div>
                    <div className="text-3xl font-display font-bold text-white mb-1">{stat.value}</div>
                    <p className="text-gray-400 text-sm">{stat.label}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 lg:px-8">
        <div className="max-w-3xl mx-auto text-center">
          <Card className="premium-card rounded-3xl p-12 border-blue-500/30">
            <CardContent className="p-0">
              <h2 className="text-3xl font-display font-bold text-white mb-4">
                Ready to see results like these?
              </h2>
              <p className="text-gray-400 mb-8">Start with 100 free phone minutes — no credit card required.</p>
              <Button
                onClick={() => window.location.href = '/signup'}
                className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-xl font-medium text-lg"
              >
                Start for Free
              </Button>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-8 border-t border-gray-800 text-center">
        <p className="text-gray-500 text-sm">&copy; 2026 VoiceBot. All rights reserved.</p>
      </footer>
    </div>
  );
}
