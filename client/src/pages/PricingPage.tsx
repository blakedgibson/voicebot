import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import SiteNav from "@/components/SiteNav";

export default function PricingPage() {
  const handleSignup = () => {
    window.location.href = '/signup';
  };

  const plans = [
    {
      name: "Small",
      price: "$99",
      period: "per month",
      description: "For small businesses with low call volume",
      features: ["250 phone minutes per month", "$0.50 per additional minute"],
      popular: false,
      isCustom: false,
    },
    {
      name: "Medium",
      price: "$299",
      period: "per month",
      description: "For growing businesses with moderate call volume",
      features: ["800 phone minutes per month", "$0.45 per additional minute"],
      popular: false,
      isCustom: false,
    },
    {
      name: "Large",
      price: "$499",
      period: "per month",
      description: "For busy businesses with high call volume",
      features: ["1,800 phone minutes per month", "$0.40 per additional minute"],
      popular: true,
      isCustom: false,
    },
    {
      name: "Custom",
      price: "Custom",
      period: "pricing",
      description: "For high-volume businesses with unique needs",
      features: ["Custom phone minutes", "Dedicated account manager"],
      popular: false,
      isCustom: true,
    },
  ];

  return (
    <div className="min-h-screen text-white font-body" style={{ backgroundColor: '#0D0D0D' }}>
      <SiteNav />

      {/* Hero */}
      <section className="pt-32 pb-12 px-6 lg:px-8 text-center">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl md:text-6xl font-display font-bold mb-6">
            Simple, Scalable <span className="bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">Pricing</span>
          </h1>
          <p className="text-xl text-gray-300 max-w-3xl mx-auto mb-8">
            Choose the plan that fits your business's call volume.
          </p>
          <div className="inline-flex items-center gap-2 bg-blue-900/30 border border-blue-500/50 text-blue-300 px-6 py-3 rounded-full backdrop-blur-sm">
            <i className="fas fa-gift text-blue-400"></i>
            <span className="font-bold">Start with 100 free phone minutes — No credit card required</span>
            <i className="fas fa-gift text-blue-400"></i>
          </div>
        </div>
      </section>

      {/* Every Plan Includes */}
      <section className="py-12 px-6 lg:px-8">
        <div className="max-w-5xl mx-auto">
          <Card className="premium-card rounded-3xl p-8">
            <CardContent className="p-0">
              <h3 className="text-2xl font-display font-bold text-white mb-6 text-center">Every plan includes:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                {[
                  'Unlimited Team Members & Voicebots',
                  'Google Calendar, Calendly & Popular CRM Integration',
                  'Scalable Concurrent Calls (No Busy Signals!)',
                  'Multi-location Support',
                  'Automated SMS Reminders & Confirmations',
                  'One-on-one Setup & Integration Support',
                ].map((feature) => (
                  <div key={feature} className="flex items-center text-gray-300">
                    <i className="fas fa-check text-green-400 mr-3 flex-shrink-0"></i>
                    <span>{feature}</span>
                  </div>
                ))}
              </div>
              <p className="text-gray-400 text-center text-sm">
                We provide all the tools you need to automate your business; the only difference is the monthly call minutes you use.
              </p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Pricing Cards */}
      <section className="py-12 px-6 lg:px-8 pb-24">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {plans.map((plan, index) => (
              <Card
                key={index}
                className={`premium-card rounded-3xl p-8 relative ${plan.popular ? 'border-blue-500 ring-2 ring-blue-400/50' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-0 -right-0 bg-blue-600 text-white px-4 py-1.5 rounded-bl-lg rounded-tr-3xl font-bold text-xs shadow-lg">
                    BEST VALUE
                  </div>
                )}
                <CardContent className="p-0 text-center flex flex-col h-full">
                  <div className="flex-grow">
                    <h3 className="text-2xl font-display font-bold mb-2 text-white">{plan.name}</h3>
                    <p className="text-gray-400 text-sm mb-3">{plan.description}</p>

                    <div className="mb-4">
                      <div className="inline-flex items-center gap-1 bg-blue-800/30 border border-blue-500/40 text-blue-300 px-3 py-1 rounded-full text-xs font-semibold">
                        <i className="fas fa-gift text-xs"></i>
                        100 Free Phone Minutes
                      </div>
                    </div>

                    <div className="mb-6">
                      <span className="text-4xl font-display font-bold bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
                        {plan.price}
                      </span>
                      <span className="text-gray-400 ml-2">/ {plan.period}</span>
                      <p className="text-xs text-gray-500 mt-1">after free minutes</p>
                    </div>

                    <ul className="space-y-3 mb-8 text-left">
                      {plan.features.map((feature, i) => (
                        <li key={i} className="flex items-center text-gray-300">
                          <i className="fas fa-check text-green-400 mr-3"></i>
                          {feature}
                        </li>
                      ))}
                    </ul>
                  </div>

                  {plan.isCustom ? (
                    <Button
                      onClick={() => window.open('https://calendly.com/blake4gibson/30min', '_blank')}
                      className="w-full py-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/50 mt-auto"
                    >
                      Contact Us
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSignup}
                      className="w-full py-4 rounded-xl font-semibold bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-blue-500/50 mt-auto"
                    >
                      Start for Free
                    </Button>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black py-8 border-t border-gray-800 text-center">
        <p className="text-gray-500 text-sm">&copy; 2026 VoiceBot. All rights reserved.</p>
      </footer>
    </div>
  );
}
