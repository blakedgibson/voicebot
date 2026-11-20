# VoiceBot

VoiceBot is an AI phone receptionist for restaurants, salons, and spas. A business signs up, VoiceBot reads its website to learn the menu, services, and hours, and then gives the business a phone number answered by a voice agent. The agent takes orders and reservations, answers questions, and remembers returning callers. Everything shows up in a dashboard the business manages.

In production it handled more than 10,000 calls a month across paying clients, including a 15-location nail salon chain where it books appointments directly into the salon's booking system.

<!-- Add a dashboard screenshot and a short call recording or GIF here. -->

## What it does

- Onboarding scrapes a business's website and extracts its industry, hours, and menu or service list into a knowledge base for the agent.
- Phone numbers are provisioned through Twilio, including A2P 10DLC SMS registration so agents can text confirmations.
- Voice agents run on Retell AI. During a live call the agent calls back into this server through custom function webhooks to place an order, book a reservation, check business hours, or look up a caller.
- Orders can be pushed to Square, Clover, or Toast.
- Each caller gets a profile with memories from earlier calls, so the agent can greet regulars and recall past orders.
- Stripe handles subscriptions, free trials, and per-minute overage billing.
- Businesses can invite teammates with role-based permissions; sensitive actions are written to an audit log.
- Analytics cover calls, revenue, services, customers, and agent performance.

## Tech stack

| Layer | Tools |
|---|---|
| Frontend | React 18, TypeScript, Vite, TanStack Query, Tailwind CSS, shadcn/ui, Wouter |
| Backend | Node.js, Express, TypeScript |
| Database | PostgreSQL on Neon, Drizzle ORM, Zod validation |
| Voice and telephony | Retell AI, Twilio, ElevenLabs |
| AI | OpenAI and Google Gemini for prompt generation, menu processing, and business data extraction |
| Payments | Stripe |
| Auth | Passport (email/password), Google OAuth |
| Email | Resend |

## How a call works

1. A customer calls the business's VoiceBot number, which Twilio routes to the business's Retell agent.
2. The agent is configured with the business's knowledge base and a conversation flow for its industry.
3. When the caller wants to act (place an order, book a table), Retell calls a function webhook in `server/routes/retellWebhooks.ts`.
4. The server identifies the business from the dialed number, does the work, and returns a result the agent reads back to the caller.
5. The call, transcript, and outcome are logged and appear in the dashboard.

## Project layout

```
client/   React dashboard, onboarding, agent builder, billing pages
server/   Express API, Retell webhooks, Twilio telephony, ~50 domain services
shared/   Drizzle schema (about 50 tables) and shared types
```

## Running locally

Requires Node 20 and a PostgreSQL database.

```bash
npm install
cp .env.example .env   # fill in your keys
npm run db:push        # create the tables
npm run dev            # http://localhost:5000
```

Live phone number purchasing is off by default. Set `ENABLE_LIVE_TWILIO_PROVISIONING=true` only when you mean it.

## How it was built

I built VoiceBot with AI coding agents (Replit Agent and Claude) doing most of the code generation. My work was the product and system design, choosing and integrating the services above, writing the agent prompts and conversation flows, debugging production issues with real customers on the line, and deciding what to build next. One bug I tracked down was dynamic variables not passing from Twilio to Retell, which meant agents didn't know who was calling.

The fast, agent-driven build left some structural debt. `server/routes.ts` is about 27,000 lines and `client/src/pages/Dashboard.tsx` about 13,000. The next refactor is to split routes by domain (auth, billing, telephony, agents) and break the dashboard into feature modules.
