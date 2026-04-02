# AI Academy Mentor Agent System

Embeddable AI mentor chat widgets — always-available, role-specific AI mentors for 200 students across 7 specialized roles during Kyndryl AI Academy 2026 (Weeks 4-6).

## Educational Philosophy: AI-Native Delivery

**We don't teach people to DO things. We teach people to JUDGE, DECIDE, and GUARANTEE QUALITY of things AI does.**

In February 2026, AI can independently build software, write architectures, generate threat models, and create business cases. The human skill that matters is not building — it's verifying, governing, and selling the result. Every agent interaction subtly trains students to think: *"I orchestrate AI doing the work and I guarantee the quality. That's what makes me worth EUR 1200/day as a Kyndryl consultant."*

The academy follows a **Skill Hierarchy**: (1) Instruct AI, (2) Evaluate AI output, (3) Design human+AI workflows, (4) Design entire AI-native delivery models. The ultimate test (Day 23): *"Why should I pay Kyndryl when I can use ChatGPT myself?"*

## Architecture

```
 Student's browser
 +------------------------------------------------------+
 |  Lesson HTML page (Day 11-25 or Cert Prep)           |
 |  +------------------------------------------------+  |
 |  |  <main> lesson content </main>                 |  |
 |  +------------------------------------------------+  |
 |                                                      |
 |  mentor-widget.js (self-contained IIFE)              |
 |  +--------------+                                    |
 |  | [FAB button]-+---> Opens chat panel               |
 |  |              |    +---------------------+         |
 |  |              |    | Header: role + R + x |         |
 |  | sessionStorage<-->| Messages area       |         |
 |  |              |    | Quick action buttons |         |
 |  |              |    | Text input + Send    |         |
 |  |              |    +--------+------------+         |
 |  +--------------+             |                      |
 +-------------------------------+----------------------+
                                 | POST /api/chat
                                 | { messages, role, dayNumber,
                                 |   lessonContext, messageCount }
                                 v
 Serverless API
 +-----------------------------------------------------+
 |  api/chat.js (serverless function, 30s max)          |
 |  +--------------------------------------------------+|
 |  | 1. CORS (dynamic origin)                         ||
 |  | 2. Validate: role, dayNumber, messages            ||
 |  | 3. Rate limit (30 req/role/min)                   ||
 |  | 4. assembleSystemPrompt(role, day)                ||
 |  |    +--------------------------------------------+||
 |  |    | SHARED_CONTEXT                             |||
 |  |    |   AI-Native Delivery philosophy            |||
 |  |    |   KAF + AI Innovation Lab + EU AI Act      |||
 |  |    |   EuroHealth case study                    |||
 |  |    |   Enterprise AI economics                  |||
 |  |    |   Behavioral rules                         |||
 |  |    | + ROLE_PROMPTS[role]                        |||
 |  |    |   Personality + judgment skills             |||
 |  |    |   AI-native delivery behavior               |||
 |  |    |   "Why pay Kyndryl?" answer                 |||
 |  |    | + DAY_CONTEXT[day]                          |||
 |  |    |   judgmentQuestion + per-role judgmentTask   |||
 |  |    |   deliverable + peerReview + certTip        |||
 |  |    |   yesterdayRecap + tomorrowPreview           |||
 |  |    |   "Start My Day" response template          |||
 |  |    +--------------------------------------------+||
 |  | 5. Inject: lesson page context + session context  ||
 |  | 6. Call OpenAI API                                ||
 |  | 7. Return JSON { message, role, usage }           ||
 |  +--------------------------------------------------+|
 +-----------------------------------------------------+
                         |
                         v
               OpenAI API (gpt-5-nano)
```

### Key Design Decisions

- **No build step.** Widget is vanilla JS (single IIFE). Embed with one `<script>` tag.
- **No database.** Session state lives in `sessionStorage` (clears on tab close = fresh start each day).
- **No Azure.** Corporate governance blocks public IPs. Serverless hosting handles 200 users.
- **Socratic method.** Agents never give direct answers. They challenge, question, guide.
- **AI-Native Delivery.** From Day 16, agents redirect manual work to "instruct AI, then verify output."
- **7 distinct personalities.** Each role has a signature question, judgment skills, and unique coaching style.

## Quick Start

### 1. Clone and install

```bash
git clone <repo-url>
cd AI-Academy-Knowledge
npm install
```

### 2. Set environment variables

Create a `.env.local` file:

```env
OPENAI_API_KEY=sk-...your-key...
OPENAI_MODEL=gpt-5-nano           # optional, this is the default
```

### 3. Run locally

```bash
npm run dev
```

Open `http://localhost:3000/Week 4/Day13/ai-academy-day13.html` — the widget FAB appears in the bottom-right.

## Environment Variables

| Variable | Required | Default | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | **Yes** | — | OpenAI API key with chat completions access |
| `OPENAI_MODEL` | No | `gpt-5-nano` | Model to use. Cheapest and fastest GPT-5 variant |

Set these in `.env.local` for local development or in your hosting provider's environment settings for production.

## Adding the Widget to a Page

Add one `<script>` tag before `</body>`:

```html
<script src="/js/mentor-widget.js"
        data-role="FDE"
        data-lesson="Day 16 - First Lines of Code"
        data-day="16">
</script>
```

### Data Attributes

| Attribute | Required | Values | Description |
|---|---|---|---|
| `data-role` | Yes | `FDE`, `AI-SE`, `AI-DS`, `AI-DA`, `AI-PM`, `AI-FE`, `AI-SEC` | Which mentor agent to load |
| `data-day` | Yes | `11`-`25` | Academy day number (controls deliverables, scaffolding level) |
| `data-lesson` | No | Any string | Displayed in welcome message ("Today we're working on: ...") |

### Currently Integrated Pages

- **15 lesson pages**: Day 11 through Day 25 (`Week 4/`, `Week 5/`, `Week 6/`)
- **8 certification prep pages**: `Certifications/cert-*.html`

## System Prompt Structure (v2)

The prompt assembly lives in `api/system-prompts.js`. It has four layers:

### 1. SHARED_CONTEXT (~1,800 tokens, all agents)

Five sections shared by every role:

| Section | Content |
|---|---|
| AI-Native Delivery Philosophy | Skill hierarchy L1-L4, behavioral rules, day-phase exceptions |
| Kyndryl Framework Knowledge | KAF 5 layers, AI Innovation Lab 6 phases, EU AI Act |
| EuroHealth Case Study | 200K complaints/year, 50 agents, 3 languages, EUR 150K, 8 weeks |
| Enterprise AI Economics | Pricing models, ROI framework, pilot structure, hidden costs |
| Behavioral Rules | Socratic method, client scenarios, peer review, escalation |

### 2. ROLE_PROMPTS (700-950 tokens each, per role)

Seven role personalities with:
- **Identity and personality** (e.g., FDE = pragmatic, client-obsessed)
- **Signature question** (e.g., FDE always asks "What will the customer say?")
- **KAF layer expertise** (which layers this role owns)
- **Judgment Skills** — what this role EVALUATES, not what it builds
- **AI-Native Delivery Behavior** — redirect phrases for manual work
- **Cross-role integration** (who to collaborate with)
- **Day 23 Answer** — role-specific "Why pay Kyndryl?"

### 3. DAY_CONTEXT (per day, per role)

15 day entries (Days 11-25), each containing:

```javascript
DAY_CONTEXT[16] = {
  title: 'First Lines of Code',
  theme: 'Build — AI-Native Delivery Begins',
  weekPhase: 'Week 5: Build WITH AI + Verify',
  plenaryContext: 'Lecturer opens: "Last week was planning..."',
  judgmentQuestion: 'Give AI the brief. Review output in 30 min. Find 5 issues.',
  aiNativeMode: true,  // Days 16-25
  roles: {
    FDE: {
      deliverable: 'Working RAG skeleton generated by AI, verified by you',
      judgmentTask: 'AI generated a RAG pipeline. Find 5 production risks.',
      peerReview: 'AI-SEC reviews your prototype for security gaps',
      certTip: 'AZ-AI: RAG pipeline maps to "Implement AI models"'
    },
    // ... all 7 roles
  },
  yesterdayRecap: 'Go/No-Go presentation + peer feedback',
  tomorrowPreview: 'Data Quality — measuring what matters',
  commonIssues: ['Hardcoded API keys...', 'No logging...'],
  progressionNote: 'Push: "Get something running — AI builds, you verify."'
};
```

### 4. PROGRESSION model

Scaffolding decreases automatically over the 3 weeks:

| Phase | Days | Scaffolding | Challenge | Independence |
|---|---|---|---|---|
| Early | 11-14 | HIGH (guide, examples) | MODERATE | LOW |
| Middle | 15-19 | MEDIUM (point direction) | HIGH | MEDIUM |
| Late | 20-25 | LOW (questions only) | MAXIMUM | HIGH |

### Assembly

```javascript
assembleSystemPrompt('FDE', 16)
// Returns: SHARED_CONTEXT + ROLE_PROMPTS['FDE'] + formatted DAY_CONTEXT[16]
// Includes: judgmentQuestion, judgmentTask, tomorrowPreview, "Start My Day" template
// ~3,000-4,000 tokens average
```

### "Start My Day" Feature

The most-used feature. When a student types "Start my day", the agent produces a personalized morning briefing with: yesterday recap, today's judgment question, deliverable, peer review pairing, cert tip, and a specific first step. The first-step guidance varies by week phase:

- **Days 11-14:** "Open the client brief and list your top 5 discovery questions."
- **Days 16-20:** "Describe the brief for your AI coding agent. What exactly do you want it to build?"
- **Days 21-25:** "Check your team's shared artifacts. What's the weakest link?"

## Widget Features

- **Session storage** — conversations persist within a browser tab (clears on close)
- **Role switching** — click the avatar to switch between 7 roles
- **Quick actions** — role-specific action buttons (Start my day, Review my code, etc.)
- **Build-week check** — on Days 16-20, after 5+ messages the widget asks (in Slovak): "Are you building manually? Have you tried giving this to an AI agent and reviewing the output?"
- **Escalation prompt** — after 10+ messages, suggests escalating to a human mentor (in Slovak)
- **Markdown rendering** — code blocks, bold, italic, lists, headers in assistant messages
- **Dark/light theme** — auto-detects page theme via `data-theme` attribute
- **Mobile responsive** — full-screen on screens < 500px

## Cost Estimation

### OpenAI API

| Parameter | Value |
|---|---|
| Model | gpt-5-nano |
| System prompt | ~3,000-4,000 tokens |
| Avg conversation context | ~2,000 tokens |
| Avg response | ~500 tokens |
| **Cost per request** | **~$0.0004-0.001** |

| Scenario | Students | Msgs/day | Days | Total Requests | Estimated Cost |
|---|---|---|---|---|---|
| Light usage | 200 | 10 | 15 | 30,000 | $12-30 |
| Medium usage | 200 | 20 | 15 | 60,000 | $24-60 |
| Heavy usage | 200 | 40 | 15 | 120,000 | $48-120 |

| **Total estimated cost (hosting + API)** | **$20-150** for the entire 3-week run |
|---|---|

## How to Measure Success

### Quantitative
- Messages per student per day (target: 10-20)
- Escalation rate to human mentors (target: <15%)
- Topic distribution per role (should match day deliverables)
- Time-to-first-deliverable in hackathon (target: <2 hours with AI-native approach)

### Qualitative
- Can graduates answer "Why pay Kyndryl?" convincingly? (Day 23 test)
- Do students use AI-native workflow by Week 5? (build-week check trigger rate)
- Quality of hackathon presentations (scored on verification quality, not code volume)

### Business
- Hackathon scoring: Speed of AI-Native Delivery (25%) + Quality of Verification (25%) + Production Readiness (25%) + Client Presentation (25%)
- Graduate readiness for client-facing consulting roles

## Troubleshooting

### Widget does not appear

1. Check the `<script>` tag is before `</body>`, not in `<head>`
2. Verify `src="/js/mentor-widget.js"` path is correct (served from root)
3. Check browser console for JS errors
4. Ensure `data-role` is one of: `FDE`, `AI-SE`, `AI-DS`, `AI-DA`, `AI-PM`, `AI-FE`, `AI-SEC`

### CORS errors in browser console

1. Check origin matches `ALLOWED_ORIGINS` in `api/chat.js`
2. For local development, `http://localhost:3000` and `http://localhost:5173` are allowed
4. Verify no static CORS headers are set in server config (they conflict with dynamic handling)

### "Service configuration error" response

The `OPENAI_API_KEY` environment variable is not set. Add it to `.env.local` or your hosting provider's environment settings.

### "Rate limit exceeded" response

30 requests per role per minute. This is per serverless instance (in-memory). If genuinely hitting limits with 200 students, increase `RATE_MAX_REQUESTS` in `api/chat.js`.

### AI responses are generic / not day-specific

1. Verify `data-day` attribute on the `<script>` tag matches the actual day (11-25)
2. Check that the page sends `dayNumber` in the API request (visible in Network tab)
3. Test the prompt directly: `GET /api/system-prompts?role=FDE&day=16`

## File Structure

```
AI-Academy-Knowledge/
+-- api/
|   +-- chat.js                Serverless function -- OpenAI proxy
|   +-- system-prompts.js      Prompt composition engine (v2)
+-- public/
|   +-- mentor-widget.js       Self-contained chat widget
+-- package.json               Dependencies (openai)
+-- README.md                  This file
|
+-- Week 4/Day11-15/*.html     Lesson pages (widget embedded)
+-- Week 5/Day16-20/*.html     Lesson pages (widget embedded)
+-- Week 6/Day21-25/*.html     Lesson pages (widget embedded)
+-- Certifications/cert-*.html Cert prep pages (widget embedded)
|
+-- Background materials/      Knowledge base (not deployed)
    +-- 09-AI-Tutors/          Original tutor system prompts
    +-- 06-Reference/          KAF, glossary, prompt library
    +-- 05-Hackathon/          EuroLogistics brief, scoring rubric
```

## API Reference

### POST /api/chat

Send a message to the mentor agent.

**Request:**

```json
{
  "messages": [
    { "role": "user", "content": "How should I structure my RAG pipeline?" }
  ],
  "role": "FDE",
  "dayNumber": 16,
  "lessonContext": "Optional: text from the lesson page (auto-extracted by widget)",
  "messageCount": 1,
  "isNewConversation": true,
  "sessionId": "uuid",
  "pageUrl": "/Week 5/Day16/ai-academy-day16.html"
}
```

**Response (200):**

```json
{
  "message": "Great question! Before I guide you...",
  "role": "FDE",
  "roleName": "Forward Deployed Engineer",
  "usage": {
    "promptTokens": 4521,
    "completionTokens": 312,
    "totalTokens": 4833
  }
}
```

**Error responses:** 400 (validation), 401 (unauthorized), 405 (wrong method), 429 (rate limit), 500 (server error), 502 (OpenAI down), 504 (timeout).

### GET /api/system-prompts?role=FDE&day=16

Preview the assembled system prompt (for debugging).

## Future Enhancements Roadmap

### Phase 2: Persistent Intelligence

| Enhancement | Description |
|---|---|
| **Persistent memory** | Cross-session progress tracking per student. Enable "Last session you were working on X — how did that go?" |
| **Analytics dashboard** | Aggregate query data for curriculum optimization: common questions, struggling students, topic distribution |
| **Teams integration** | Proactive morning messages to role-specific Teams channels |
| **Cross-role agent communication** | FDE agent can reference what AI-SEC agent would say about a security concern |

### Phase 3: Adaptive Mentoring

| Enhancement | Description |
|---|---|
| **Student performance scoring** | Engagement quality tracking, per-student readiness scores for Review Board |
| **Mentor escalation triggers** | Automatic alerts when sentiment detects frustration or student is stuck |
| **Team awareness (post Day 18)** | Agents aware of team composition, can reference specific teammates |
| **Presentation coach mode** | Special mode for Days 23-24: review slides, time scripts, simulate CIO questions |
| **Post-academy continuous mentor** | Deployed graduates get ongoing access for their first client engagements |

---

Built for Kyndryl AI Academy 2026. Serving 200 students, 7 roles, 15 days, 105 unique agent configurations.
