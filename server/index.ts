import express, { type Request, Response, NextFunction } from "express";
import { config } from "dotenv";
import { registerRoutes } from "./routes";
import { setupVite, serveStatic, log } from "./vite";
import voiceProxy from "./voice-proxy";
import { setupTelephonyRoutes } from "./telephony";
import { startBillingBackgroundJobs } from "./services/billingBackgroundService";
import { resolveBaseUrl } from "./utils/baseUrlResolver";

// Server build v1.1 - Knowledge base integration
// Load environment variables from .env file
config();
console.log('✅ Environment variables loaded');

const app = express();
console.log('✅ Express app created');

// Capture raw body for webhook signature verification before JSON parsing
app.use(express.json({
  verify: (req: any, res, buf, encoding) => {
    // Store raw body for Retell AI webhook signature verification
    if (req.url.includes('/api/retell/')) {
      req.rawBody = buf.toString(encoding || 'utf8');
    }
  }
}));
app.use(express.urlencoded({ extended: false }));

app.use((req, res, next) => {
  const start = Date.now();
  const path = req.path;
  let capturedJsonResponse: Record<string, any> | undefined = undefined;

  const originalResJson = res.json;
  res.json = function (bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (path.startsWith("/api")) {
      let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }

      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "…";
      }

      log(logLine);
    }
  });

  next();
});

async function syncRetellWebhookUrls(): Promise<void> {
  const retellApiKey = process.env.RETELL_API_KEY;
  if (!retellApiKey) return;

  try {
    const targetWebhookUrl = `${resolveBaseUrl()}/api/webhooks/retell`;
    console.log(`🔄 Syncing Retell agent webhook URLs → ${targetWebhookUrl}`);

    // Fetch all agents from Retell AI
    const agentsRes = await fetch('https://api.retellai.com/list-agents', {
      headers: { 'Authorization': `Bearer ${retellApiKey}` }
    });

    if (!agentsRes.ok) {
      console.warn(`⚠️ Could not list Retell agents for webhook sync: ${agentsRes.status}`);
      return;
    }

    const agents: any[] = await agentsRes.json();
    let updated = 0;
    let skipped = 0;

    for (const agent of agents) {
      const agentId = agent.agent_id;
      if (!agentId) continue;

      // Only update if webhook_url is missing or points to a different server
      const currentUrl: string = agent.webhook_url || '';
      if (currentUrl === targetWebhookUrl) {
        skipped++;
        continue;
      }

      try {
        const patchRes = await fetch(`https://api.retellai.com/update-agent/${agentId}`, {
          method: 'PATCH',
          headers: {
            'Authorization': `Bearer ${retellApiKey}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ webhook_url: targetWebhookUrl })
        });

        if (patchRes.ok) {
          updated++;
          console.log(`✅ Updated webhook_url for agent ${agentId} (was: ${currentUrl || 'unset'})`);
        } else {
          const errText = await patchRes.text();
          console.warn(`⚠️ Failed to update webhook for agent ${agentId}: ${errText}`);
        }
      } catch (agentErr) {
        console.warn(`⚠️ Error updating webhook for agent ${agentId}:`, agentErr);
      }
    }

    console.log(`✅ Retell webhook sync complete: ${updated} updated, ${skipped} already correct`);
  } catch (syncErr) {
    console.warn('⚠️ Retell webhook URL sync failed (non-fatal):', syncErr);
  }
}

(async () => {
  console.log('🚀 Starting server initialization...');

  // ─── SEO routes registered first — before voiceProxy or any other middleware ─
  // This prevents any catch-all or middleware from intercepting these critical URLs.
  app.get('/sitemap.xml', (_req, res) => {
    const base = 'https://voicebot.one';
    const today = new Date().toISOString().split('T')[0];
    const pages = [
      { loc: '/',        changefreq: 'weekly',  priority: '1.0' },
      { loc: '/signup',  changefreq: 'monthly', priority: '0.9' },
      { loc: '/login',   changefreq: 'monthly', priority: '0.7' },
      { loc: '/help',    changefreq: 'weekly',  priority: '0.8' },
      { loc: '/contact', changefreq: 'monthly', priority: '0.7' },
      { loc: '/privacy', changefreq: 'yearly',  priority: '0.4' },
      { loc: '/terms',   changefreq: 'yearly',  priority: '0.4' },
    ];
    const urlEntries = pages
      .map(p => [
        '  <url>',
        `    <loc>${base}${p.loc}</loc>`,
        `    <lastmod>${today}</lastmod>`,
        `    <changefreq>${p.changefreq}</changefreq>`,
        `    <priority>${p.priority}</priority>`,
        '  </url>',
      ].join('\n'))
      .join('\n');
    const xml = [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      urlEntries,
      '</urlset>',
    ].join('\n');
    res.set({
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600',
      'X-Content-Type-Options': 'nosniff',
    });
    res.send(xml);
  });

  app.get('/robots.txt', (_req, res) => {
    const content = [
      'User-agent: *',
      'Allow: /',
      'Disallow: /dashboard',
      'Disallow: /builder',
      'Disallow: /explore',
      'Disallow: /calls',
      'Disallow: /billing',
      'Disallow: /subscription/',
      'Disallow: /restaurant',
      'Disallow: /loading-dashboard',
      'Disallow: /verify-email',
      'Disallow: /verify-email-sent',
      'Disallow: /accept-invite',
      'Disallow: /api/',
      '',
      'Sitemap: https://voicebot.one/sitemap.xml',
    ].join('\n');
    res.set({
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    });
    res.send(content);
  });
  // ─────────────────────────────────────────────────────────────────────────────

  // Setup telephony routes (AI voice receptionist) - BEFORE voice proxy to ensure correct route precedence
  console.log('📞 Setting up telephony routes...');
  setupTelephonyRoutes(app);
  console.log('✅ Telephony routes setup complete');

  // Add voice proxy routes
  console.log('🔊 Adding voice proxy routes...');
  app.use(voiceProxy);
  console.log('✅ Voice proxy routes added');

  console.log('📋 Registering main routes...');
  const server = await registerRoutes(app);
  console.log('✅ Main routes registered');
  

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    // Only send response if headers haven't been sent already
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
    
    // Log the error instead of throwing it
    console.error('Express error handler:', err);
  });

  // importantly only setup vite in development and after
  // setting up all the other routes so the catch-all route
  // doesn't interfere with the other routes
  console.log('🎨 Setting up frontend...');
  if (app.get("env") === "development") {
    console.log('🔧 Development mode - setting up Vite...');
    await setupVite(app, server);
    console.log('✅ Vite setup complete');
  } else {
    console.log('📦 Production mode - serving static files...');
    serveStatic(app);
    console.log('✅ Static files configured');
  }

  // ALWAYS serve the app on the port specified in the environment variable PORT
  // Other ports are firewalled. Default to 5000 if not specified.
  // this serves both the API and the client.
  // It is the only port that is not firewalled.
  const port = parseInt(process.env.PORT || '5000', 10);
  let portRetryCount = 0;
  const MAX_PORT_RETRIES = 3;

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      if (portRetryCount >= MAX_PORT_RETRIES) {
        console.error(`❌ Port ${port} is in use after ${MAX_PORT_RETRIES} attempts. Please check for other running processes.`);
        console.error('Run: lsof -i :5000 or ps aux | grep node to find conflicting processes');
        process.exit(1);
      }

      portRetryCount++;
      console.log(`⚠️ Port ${port} is in use (attempt ${portRetryCount}/${MAX_PORT_RETRIES}), attempting to free it...`);
      import('child_process').then(({ execSync }) => {
        try {
          // Try multiple kill methods — fuser may not exist in all environments
          try { execSync(`fuser -k ${port}/tcp 2>/dev/null`); } catch {}
          try { execSync(`pkill -f "tsx server" 2>/dev/null`); } catch {}
          console.log(`✅ Attempted to kill processes on port ${port}`);
        } catch {}
        setTimeout(() => {
          console.log(`🔄 Retrying server.listen on port ${port}...`);
          server.listen({ port, host: "0.0.0.0", reusePort: true });
        }, 3000);
      });
    } else {
      console.error('Server error:', err);
      process.exit(1);
    }
  });

  server.listen({
    port,
    host: "0.0.0.0",
    reusePort: true,
  }, () => {
    log(`serving on port ${port}`);

    // Start billing background jobs (grace period enforcement, renewal reminders, card expiry checks)
    startBillingBackgroundJobs();

    // Sync Retell agent webhook URLs to this server's public URL.
    // This is critical in production: if an agent was created/updated from the dev
    // environment, its webhook_url points to the dev server — meaning call_ended and
    // call_analyzed events never reach production. Running this sync on every startup
    // ensures all post-call webhooks land on the correct server.
    setTimeout(syncRetellWebhookUrls, 5000); // 5s delay to let the server fully boot
  });

  // Graceful shutdown — release the port immediately on SIGTERM/SIGINT
  // so the next process can bind without hitting EADDRINUSE
  const shutdown = () => {
    server.close(() => process.exit(0));
    // Close magic browser service if running
    import('./services/magicBrowserService').then(m => m.magicBrowserService.shutdown()).catch(() => {});
    // Force exit after 5 s if connections are still open
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
})();
