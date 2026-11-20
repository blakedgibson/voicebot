import express from 'express';
import fetch from 'node-fetch';

const app = express();

// Middleware to parse form data (Twilio sends form-encoded data)
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// Voice webhook endpoint - proxy to Python Flask app
app.post('/voice', async (req, res) => {
  try {
    console.log('Incoming Twilio webhook:', req.body);
    
    // Forward the request to Python Flask app on port 5001
    const response = await fetch('http://localhost:5001/voice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(req.body).toString()
    });
    
    if (response.ok) {
      const twimlResponse = await response.text();
      console.log('Python Flask response:', twimlResponse);
      
      // Return TwiML response to Twilio
      res.set('Content-Type', 'text/xml');
      res.send(twimlResponse);
    } else {
      console.error('Python Flask app error:', response.status, response.statusText);
      
      // Fallback TwiML response
      const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Hello! Thank you for calling. Our AI assistant is currently unavailable, but your call is important to us. Please try calling back in a moment.</Say>
    <Hangup/>
</Response>`;
      
      res.set('Content-Type', 'text/xml');
      res.send(fallbackTwiml);
    }
  } catch (error) {
    console.error('Voice webhook error:', error);
    
    // Fallback TwiML response
    const fallbackTwiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="Polly.Joanna">Hello! Thank you for calling. We're experiencing technical difficulties. Please try calling back shortly.</Say>
    <Hangup/>
</Response>`;
    
    res.set('Content-Type', 'text/xml');
    res.send(fallbackTwiml);
  }
});

// Health check endpoint
app.get('/voice/health', async (req, res) => {
  try {
    // Check if Python Flask app is running
    const response = await fetch('http://localhost:5001/health');
    if (response.ok) {
      const data = await response.json();
      res.json({
        status: 'healthy',
        proxy: 'Node.js proxy active',
        backend: data
      });
    } else {
      res.status(503).json({
        status: 'unhealthy',
        proxy: 'Node.js proxy active',
        backend: 'Python Flask app not responding'
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'unhealthy',
      proxy: 'Node.js proxy active',
      backend: 'Cannot connect to Python Flask app'
    });
  }
});

export default app;