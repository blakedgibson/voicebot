import { useState } from 'react';
import { Link } from 'wouter';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ApiEndpoint {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  path: string;
  description: string;
  parameters?: Array<{
    name: string;
    type: string;
    required: boolean;
    description: string;
  }>;
  example: string;
  response: string;
}

const endpoints: ApiEndpoint[] = [
  {
    method: 'GET',
    path: '/api/voice/agents',
    description: 'Retrieve all AI voice agents for the authenticated user',
    example: `curl -X GET "https://voicebot.com/api/voice/agents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`,
    response: `{
  "success": true,
  "agents": [
    {
      "id": "agent_123",
      "name": "Mario's Pizzeria Assistant",
      "phoneNumber": "+1234567890",
      "status": "active",
      "createdAt": "2025-01-15T10:30:00Z"
    }
  ]
}`
  },
  {
    method: 'POST',
    path: '/api/voice/agents',
    description: 'Create a new AI voice agent',
    parameters: [
      { name: 'name', type: 'string', required: true, description: 'Name of the AI agent' },
      { name: 'businessInfo', type: 'object', required: true, description: 'Business information for the agent' },
      { name: 'voiceSettings', type: 'object', required: false, description: 'Voice customization settings' }
    ],
    example: `curl -X POST "https://voicebot.com/api/voice/agents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Mario'\''s Pizzeria Assistant",
    "businessInfo": {
      "name": "Mario'\''s Pizzeria",
      "cuisine": "Italian",
      "hours": "11:00 AM - 10:00 PM"
    }
  }'`,
    response: `{
  "success": true,
  "agent": {
    "id": "agent_124",
    "name": "Mario's Pizzeria Assistant",
    "phoneNumber": "+1234567891",
    "status": "active"
  }
}`
  },
  {
    method: 'GET',
    path: '/api/calls/logs',
    description: 'Retrieve call logs for your AI agents',
    parameters: [
      { name: 'agentId', type: 'string', required: false, description: 'Filter by specific agent ID' },
      { name: 'startDate', type: 'string', required: false, description: 'Start date for filtering (ISO 8601)' },
      { name: 'endDate', type: 'string', required: false, description: 'End date for filtering (ISO 8601)' },
      { name: 'limit', type: 'number', required: false, description: 'Number of results to return (max 100)' }
    ],
    example: `curl -X GET "https://voicebot.com/api/calls/logs?limit=10" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,
    response: `{
  "success": true,
  "calls": [
    {
      "id": "call_789",
      "agentId": "agent_123",
      "phoneNumber": "+1987654321",
      "duration": 45,
      "sentiment": "positive",
      "transcript": "Thank you for calling Mario's Pizzeria...",
      "createdAt": "2025-01-15T14:30:00Z"
    }
  ],
  "pagination": {
    "total": 1,
    "hasMore": false
  }
}`
  },
  {
    method: 'PUT',
    path: '/api/voice/agents/{agentId}',
    description: 'Update an existing AI voice agent',
    parameters: [
      { name: 'agentId', type: 'string', required: true, description: 'The ID of the agent to update' },
      { name: 'name', type: 'string', required: false, description: 'Updated name for the agent' },
      { name: 'businessInfo', type: 'object', required: false, description: 'Updated business information' }
    ],
    example: `curl -X PUT "https://voicebot.com/api/voice/agents/agent_123" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "name": "Mario'\''s Updated Assistant",
    "businessInfo": {
      "hours": "11:00 AM - 11:00 PM"
    }
  }'`,
    response: `{
  "success": true,
  "agent": {
    "id": "agent_123",
    "name": "Mario's Updated Assistant",
    "phoneNumber": "+1234567890",
    "status": "active"
  }
}`
  }
];

const sdkExamples = {
  javascript: `// Install: npm install @voicebot/sdk
import VoiceBot from '@voicebot/sdk';

const voicebot = new VoiceBot({ apiKey: 'your_api_key' });

// Create a new agent
const agent = await voicebot.agents.create({
  name: 'My Restaurant Assistant',
  businessInfo: {
    name: 'My Restaurant',
    cuisine: 'American',
    hours: '9:00 AM - 10:00 PM'
  }
});

console.log('Agent created:', agent.id);`,

  python: `# Install: pip install voicebot
from voicebot import VoiceBot

voicebot = VoiceBot(api_key='your_api_key')

# Create a new agent
agent = voicebot.agents.create({
  'name': 'My Restaurant Assistant',
  'business_info': {
    'name': 'My Restaurant',
    'cuisine': 'American',
    'hours': '9:00 AM - 10:00 PM'
  }
})

print(f'Agent created: {agent["id"]}')`,

  curl: `# Get all agents
curl -X GET "https://voicebot.com/api/voice/agents" \\
  -H "Authorization: Bearer YOUR_API_KEY" \\
  -H "Content-Type: application/json"`
};

export default function ApiDocs() {
  const [selectedEndpoint, setSelectedEndpoint] = useState<ApiEndpoint | null>(null);
  const [selectedSDK, setSelectedSDK] = useState<'javascript' | 'python' | 'curl'>('javascript');

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Navigation Bar */}
      <nav className="bg-black border-b border-gray-800 px-6 py-4">
        <div className="max-w-6xl mx-auto flex justify-between items-center">
          <Link href="/" className="flex items-center space-x-2">
            <span className="text-xl font-display font-bold">Voice<span className="text-blue-400">Bot</span></span>
          </Link>
          <Link href="/" className="text-gray-400 hover:text-white transition-colors">
            ← Back to Home
          </Link>
        </div>
      </nav>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-display font-bold mb-4">API Documentation</h1>
          <p className="text-gray-400 text-lg">
            Integrate VoiceBot's AI voice automation into your applications
          </p>
        </div>

        {/* Quick Start */}
        <Card className="bg-gradient-to-r from-blue-900 to-purple-900 border-blue-700 mb-12">
          <CardContent className="p-8">
            <h2 className="text-2xl font-display font-bold mb-4 text-white">Quick Start</h2>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div>
                <h3 className="text-lg font-semibold mb-3 text-white">1. Get Your API Key</h3>
                <p className="text-gray-300 mb-4">
                  Sign in to your VoiceBot dashboard and navigate to the API section to generate your API key.
                </p>
                
                <h3 className="text-lg font-semibold mb-3 text-white">2. Authentication</h3>
                <p className="text-gray-300 mb-4">
                  Include your API key in the Authorization header of all requests:
                </p>
                <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm">
                  <code className="text-green-400">Authorization: Bearer YOUR_API_KEY</code>
                </div>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-3 text-white">3. Base URL</h3>
                <div className="bg-gray-900 p-4 rounded-lg font-mono text-sm mb-4">
                  <code className="text-blue-400">https://voicebot.com/api</code>
                </div>
                
                <h3 className="text-lg font-semibold mb-3 text-white">4. Rate Limits</h3>
                <p className="text-gray-300">
                  • 100 requests per minute for standard plans<br/>
                  • 1000 requests per minute for enterprise plans
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* SDK Examples */}
        <Card className="bg-gray-900 border-gray-800 mb-12">
          <CardContent className="p-8">
            <h2 className="text-2xl font-display font-bold mb-6 text-white">SDK Examples</h2>
            
            <div className="flex space-x-4 mb-6">
              {Object.keys(sdkExamples).map((lang) => (
                <Button
                  key={lang}
                  onClick={() => setSelectedSDK(lang as any)}
                  variant={selectedSDK === lang ? "default" : "outline"}
                  className={selectedSDK === lang ? 'bg-blue-600 text-white' : 'text-gray-300 border-gray-800'}
                  data-testid={`button-sdk-${lang}`}
                >
                  {lang === 'javascript' ? 'JavaScript' : lang === 'python' ? 'Python' : 'cURL'}
                </Button>
              ))}
            </div>

            <div className="bg-gray-800 p-6 rounded-lg overflow-x-auto">
              <pre><code className="text-gray-300">{sdkExamples[selectedSDK]}</code></pre>
            </div>
          </CardContent>
        </Card>

        {/* API Endpoints */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Endpoints List */}
          <div className="lg:col-span-1">
            <h2 className="text-2xl font-display font-bold mb-6 text-white">Endpoints</h2>
            <div className="space-y-3">
              {endpoints.map((endpoint, index) => (
                <Card 
                  key={index}
                  className={`cursor-pointer transition-all ${
                    selectedEndpoint === endpoint 
                      ? 'bg-blue-900 border-blue-600' 
                      : 'bg-gray-900 border-gray-800 hover:border-gray-700'
                  }`}
                  onClick={() => setSelectedEndpoint(endpoint)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center space-x-3">
                      <span className={`px-2 py-1 rounded text-xs font-bold ${
                        endpoint.method === 'GET' ? 'bg-green-600 text-white' :
                        endpoint.method === 'POST' ? 'bg-blue-600 text-white' :
                        endpoint.method === 'PUT' ? 'bg-yellow-600 text-white' :
                        'bg-red-600 text-white'
                      }`}>
                        {endpoint.method}
                      </span>
                      <code className="text-gray-300 text-sm">{endpoint.path}</code>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Endpoint Details */}
          <div className="lg:col-span-2">
            {selectedEndpoint ? (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-8">
                  <div className="flex items-center space-x-3 mb-4">
                    <span className={`px-3 py-1 rounded font-bold ${
                      selectedEndpoint.method === 'GET' ? 'bg-green-600 text-white' :
                      selectedEndpoint.method === 'POST' ? 'bg-blue-600 text-white' :
                      selectedEndpoint.method === 'PUT' ? 'bg-yellow-600 text-white' :
                      'bg-red-600 text-white'
                    }`}>
                      {selectedEndpoint.method}
                    </span>
                    <code className="text-xl text-gray-300">{selectedEndpoint.path}</code>
                  </div>

                  <p className="text-gray-300 mb-6">{selectedEndpoint.description}</p>

                  {selectedEndpoint.parameters && (
                    <div className="mb-6">
                      <h3 className="text-lg font-semibold mb-3 text-white">Parameters</h3>
                      <div className="overflow-x-auto">
                        <table className="w-full">
                          <thead>
                            <tr className="border-b border-gray-700">
                              <th className="text-left py-2 text-gray-300">Name</th>
                              <th className="text-left py-2 text-gray-300">Type</th>
                              <th className="text-left py-2 text-gray-300">Required</th>
                              <th className="text-left py-2 text-gray-300">Description</th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedEndpoint.parameters.map((param, index) => (
                              <tr key={index} className="border-b border-gray-800">
                                <td className="py-2 text-blue-400 font-mono">{param.name}</td>
                                <td className="py-2 text-gray-400">{param.type}</td>
                                <td className="py-2">
                                  <span className={`px-2 py-1 rounded text-xs ${
                                    param.required ? 'bg-red-600 text-white' : 'bg-gray-600 text-gray-300'
                                  }`}>
                                    {param.required ? 'Required' : 'Optional'}
                                  </span>
                                </td>
                                <td className="py-2 text-gray-300">{param.description}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-white">Example Request</h3>
                      <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <pre><code className="text-gray-300 text-sm">{selectedEndpoint.example}</code></pre>
                      </div>
                    </div>

                    <div>
                      <h3 className="text-lg font-semibold mb-3 text-white">Example Response</h3>
                      <div className="bg-gray-800 p-4 rounded-lg overflow-x-auto">
                        <pre><code className="text-gray-300 text-sm">{selectedEndpoint.response}</code></pre>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-gray-900 border-gray-800">
                <CardContent className="p-8 text-center">
                  <i className="fas fa-mouse-pointer text-4xl text-gray-600 mb-4"></i>
                  <h3 className="text-xl font-display font-bold mb-2 text-gray-400">Select an Endpoint</h3>
                  <p className="text-gray-500">Choose an API endpoint from the left to see detailed documentation</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Support Section */}
        <Card className="bg-gradient-to-r from-green-900 to-blue-900 border-green-700 mt-12">
          <CardContent className="p-8 text-center">
            <h3 className="text-2xl font-display font-bold mb-4 text-white">Need Help with Integration?</h3>
            <p className="text-gray-300 mb-6">
              Our developer support team is here to help you integrate VoiceBot into your applications.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/contact">
                <Button className="bg-green-600 hover:bg-green-700 text-white px-8 py-3" data-testid="button-developer-support">
                  <i className="fas fa-code mr-2"></i>
                  Get Developer Support
                </Button>
              </Link>
              <Link href="/help">
                <Button variant="outline" className="border-gray-800 text-gray-300 hover:bg-gray-800 px-8 py-3" data-testid="button-view-examples">
                  <i className="fas fa-book mr-2"></i>
                  View More Examples
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Footer */}
      <footer className="bg-black py-12 border-t border-gray-800">
        <div className="max-w-7xl mx-auto px-6 text-center">
          <div className="flex justify-center items-center space-x-2 mb-4">
            <span className="text-xl font-display font-bold text-white">Voice<span className="text-blue-400">Bot</span></span>
          </div>
          <div className="flex justify-center space-x-6 mb-6 text-sm">
            <Link href="/privacy" className="text-gray-400 hover:text-white transition-colors">Privacy Policy</Link>
            <Link href="/terms" className="text-gray-400 hover:text-white transition-colors">Terms of Service</Link>
            <Link href="/contact" className="text-gray-400 hover:text-white transition-colors">Contact Us</Link>
            <Link href="/help" className="text-gray-400 hover:text-white transition-colors">Help Center</Link>
          </div>
          <div className="border-t border-gray-800 pt-6">
            <p className="text-gray-400">&copy; 2025 VoiceBot. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}