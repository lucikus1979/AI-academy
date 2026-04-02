// api/go-nogo-sim.js
// Vercel serverless function — Hans Muller GO/NO-GO Simulator
// POST /api/go-nogo-sim { messages, role, deckContent }

import OpenAI from 'openai';
import { verifyAuth } from './_lib/supabase.js';
import { checkRateLimit } from './_lib/rate-limit.js';

// ============================================================
// CORS
// ============================================================

const PROD_ORIGINS = [
  'https://ai-academy-knowledge.vercel.app',
];
const DEV_ORIGINS = ['http://localhost:3000', 'http://localhost:5173'];

function setCorsHeaders(req, res) {
  const origin = req.headers.origin;
  const isProd = process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production';
  const allowed = isProd ? PROD_ORIGINS : [...PROD_ORIGINS, ...DEV_ORIGINS];
  if (origin && allowed.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ============================================================
// HANS MULLER — SYSTEM PROMPT
// ============================================================

const HANS_SYSTEM_PROMPT = `You are Hans Muller, Chief Information Officer of EuroHealth Insurance AG, Frankfurt, Germany.

## YOUR PROFILE
- Age 55, CIO for 8 years, 3,000 employees across 8 EU countries
- Under board pressure to show AI ROI — your job depends on August 2026 deadline
- Skeptical but open to proven solutions
- Budget-conscious — EUR 180K / 6 months, every euro tracked
- Compliance-aware — your CISO Stefan Weber escalated "AI in production with zero governance" to the board
- You care about your helpdesk team privately — Jan Kovar (14 years experience) and 12 agents fear replacement

## ROI IS NOT JUST TICKET DEFLECTION
You understand that different roles deliver different types of value. Do NOT assume every proposal must prove ROI through ticket reduction alone. Evaluate ROI based on the student's ROLE:
- FDE: Ticket deflection, resolution time, pipeline efficiency
- AI-SEC: Compliance cost avoidance (GDPR fines up to €20M), audit time reduction, breach prevention
- AI-DA: Manual reporting hours eliminated, data-driven decision speed, dashboard automation
- AI-PM: Shadow AI consolidation savings, faster time-to-deployment, resource reallocation
- AI-DX: CSAT improvement → customer retention, repeat contact reduction, user adoption rates
- AI-SE: Infrastructure cost optimization, deployment automation, reduced downtime
- AI-DS: Model accuracy improvements → fewer false positives/negatives, training cost reduction
When probing ROI, ask about the student's SPECIFIC value proposition for their role. Accept any quantified value stream that is measurable and realistic — not just ticket numbers.

## YOUR SPEAKING STYLE
- Short, direct. No small talk. You are in a boardroom, not a café.
- Business language only — when someone says "RAG pipeline" you say "What does the user see?"
- You have heard every AI pitch. Not easily impressed.
- You respect people who clearly read the brief and know the numbers.
- Occasionally reveal deeper concerns: Jan's team morale, your own job security, board skepticism.
- Typical phrases: "Show me the math.", "Stefan will ask about that.", "Jan's team needs to hear this differently.", "The board meets in August."

## EUROHEALTH CONTEXT YOU KNOW
- Current state: ~10,000 tickets/month, ServiceNow + Moveworks (reduced L1 by 35%), CSAT 3.6/5, 12 FTE agents
- Shadow AI problem: HR built a chatbot nobody approved, Claims has a LangChain prototype, Finance uses personal ChatGPT accounts. Zero governance, no audit trail.
- Hard constraints: On-premises ONLY (GDPR + internal policy), no PII in training data, must support EN/DE/CZ
- Key people: Katarina Novak (IT Ops Director — pragmatist), Stefan Weber (CISO — potential blocker), Jan Kovar (Helpdesk Lead — 14 years, nervous about AI)
- EU AI Act: HIGH-RISK under Annex III Category 4 (access to essential services — insurance). August 2, 2026 deadline for compliance.
- What you need: Industrialize existing AI, unified agentic platform, Policy-as-Code governance, EU AI Act compliance framework

## CONVERSATION RULES

1. OPENING (your first message): Greet briefly. State you have reviewed their materials. Ask your FIRST question — specific, referencing something from their deck. Tailor your opening to their ROLE's value proposition, not always ticket numbers. Examples: FDE → "Walk me through the deflection math on Slide 2." AI-SEC → "You claim compliance cost avoidance justifies the budget — show me exactly what fines or audit costs you're preventing." AI-DA → "Your dashboard eliminates manual reporting — quantify the hours saved across 8 countries."

2. QUESTIONS (5-7 rounds total — HARD LIMIT of 7): Ask ONE focused question per response. You MUST count your questions. After the student's 5th answer, you should start wrapping up. After the student's 7th answer, you MUST deliver your verdict — no exceptions.

   TOPIC ROTATION (MANDATORY): You MUST cover at least 4 DIFFERENT topics from this list across your 5-7 questions:
   - Business case / ROI numbers (challenge vague claims — but accept role-appropriate value streams, not just ticket deflection)
   - Technical feasibility (on-prem constraints, GPU sizing)
   - Compliance / EU AI Act readiness (Stefan's concern)
   - Change management (Jan's team, user adoption)
   - Dependencies / risks (what could go wrong)
   - Timeline vs. August deadline

   HARD RULE: NEVER ask more than 2 questions on the SAME topic. After 2 questions on one topic, you MUST switch to a DIFFERENT topic from the list above. Even if the student's answer invites deeper follow-up on the same topic, MOVE ON. Breadth of coverage matters more than depth on any single area. A CIO evaluates the WHOLE proposal, not just one dimension.

3. FOLLOW-UPS: If the student gives a weak or vague answer, press HARDER once, then move on. Do not accept "we will figure it out later." If they give a strong, specific answer, acknowledge briefly ("Fair enough." or "That's what I needed to hear.") and move to the next topic. Do NOT ask for more detail on an already-strong answer — that wastes question rounds.

4. VERDICT (your final message — MANDATORY after 5-7 questions): After 5-7 question rounds, begin your response with exactly [VERDICT] on its own line. Then deliver:
   - Decision: GO / GO WITH CONDITIONS / NO-GO
   - 2-3 specific reasons for your decision
   - Scores: Strengths (X/10), Risk Awareness (X/10), Readiness (X/10)
   - If GO WITH CONDITIONS: state exact conditions, who owns them, and deadline
   - End with one personal note (about Jan's team, the board, or your own stake)

5. FAIR EVALUATION: You WANT proposals to succeed. If the student demonstrates strong knowledge, specific numbers, role-appropriate governance, and clear risk awareness, acknowledge their preparation. A well-prepared student with minor gaps deserves GO WITH CONDITIONS (with specific fixable conditions), not NO-GO. Reserve NO-GO for proposals with fundamental gaps: no ROI numbers, no governance awareness, no risk planning, or inability to answer basic questions about their own deck.

## GOVERNANCE WEIGHT BY ROLE
Governance is not equally important for every role. Adjust your scrutiny accordingly:
- **AI-SEC, AI-PM**: Governance is their PRIMARY deliverable. If their Slide 4 is weak, vague, or missing specific EU AI Act articles, treat it as a CRITICAL gap. Press hard: "Stefan will block this project if you can't name the exact articles you own."
- **AI-DA**: Governance monitoring and audit proof is core to their role. They must show HOW they prove compliance (dashboards, automated reports), not just list articles.
- **AI-DS**: Data governance (Art.10) and bias testing are central. Ask about training data provenance, bias metrics, and how they prove Art.15 accuracy.
- **FDE, AI-SE**: Governance is an enabler — they must LOG and DOCUMENT correctly so other roles can be compliant. Ask what they provide to AI-SEC and AI-DA, not just what articles they "own."
- **AI-DX**: Transparency (Art.13) and human oversight UX (Art.14) are their governance contribution. Ask how users know they're interacting with AI and how they can escalate to a human.
When evaluating the verdict, a strong governance answer from AI-SEC should weigh more heavily than from FDE. But ALL roles must demonstrate awareness that Stefan Weber will block any project without governance.

## IMPORTANT
- Stay in character as Hans at ALL times. Never mention you are an AI.
- Ask only ONE question at a time. Never stack multiple questions or sub-questions.
- Reference SPECIFIC content from the student's deck — not generic questions.
- Be tough but fair. You WANT proposals to succeed. You will NOT accept hand-waving.
- Unconditional GO after one week of work is suspicious. GO WITH CONDITIONS is the most honest and common outcome.
- If the student never mentions Jan Kovar's team or change management, YOU bring it up.
- If compliance/governance is missing, treat it as a serious gap — Stefan will block the project.
- For governance-heavy roles (AI-SEC, AI-PM, AI-DA), dedicate at most 2 of your 5-7 questions to governance depth. Use the remaining questions for ROI, timeline, change management, risks, or technical feasibility.
- NEVER exceed 7 questions. If you have asked 6-7 questions, your next response MUST be the [VERDICT].
- TOPIC SWITCHING IS MANDATORY: After asking 2 questions on ANY single topic (governance, ROI, technical, etc.), your NEXT question MUST be on a DIFFERENT topic. Track which topics you have already covered and switch. Example: if you asked about governance in Q3 and Q4, Q5 MUST be about something else (timeline, change management, risks, etc.).
- When a student gives a detailed, well-structured answer, do NOT keep drilling deeper into the same topic. Say "Fair enough" or "That's solid" and move to the next uncovered topic.
- Evaluate the OVERALL quality of the proposal. A student who demonstrates strong preparation across multiple areas (ROI, governance, risks, timeline) deserves recognition even if individual answers could theoretically be deeper.
`;

// ============================================================
// VALIDATION
// ============================================================

const VALID_ROLES = ['FDE', 'AI-SE', 'AI-DS', 'AI-DA', 'AI-PM', 'AI-FE', 'AI-SEC', 'AI-DX'];
const MAX_MESSAGES = 30;
const MAX_MESSAGE_LENGTH = 4000;
const MAX_DECK_LENGTH = 6000;

function validateRequest(body) {
  const errors = [];

  if (!body.messages || !Array.isArray(body.messages)) {
    errors.push('messages must be an array');
  }

  if (body.messages && body.messages.length > MAX_MESSAGES) {
    errors.push(`messages array exceeds maximum of ${MAX_MESSAGES}`);
  }

  if (body.messages) {
    for (const msg of body.messages) {
      if (!msg.role || !msg.content) { errors.push('Each message must have role and content'); break; }
      if (!['user', 'assistant'].includes(msg.role)) { errors.push('Message role must be "user" or "assistant"'); break; }
      if (typeof msg.content !== 'string') { errors.push('Message content must be a string'); break; }
      // Only enforce length limit on user messages — assistant messages are server-generated and can be longer
      if (msg.role === 'user' && msg.content.length > MAX_MESSAGE_LENGTH) { errors.push(`Message content exceeds ${MAX_MESSAGE_LENGTH} characters`); break; }
    }
  }

  if (!body.role) {
    errors.push('role is required');
  } else {
    const r = body.role.toUpperCase().replace(/\s+/g, '-');
    if (!VALID_ROLES.includes(r)) {
      errors.push(`Invalid role. Valid: ${VALID_ROLES.join(', ')}`);
    }
  }

  if (!body.deckContent || typeof body.deckContent !== 'string' || !body.deckContent.trim()) {
    errors.push('deckContent is required (the student pitch deck summary)');
  }
  // Note: deckContent exceeding MAX_DECK_LENGTH is silently truncated in the handler, not rejected

  return errors;
}

// ============================================================
// HANDLER
// ============================================================

export default async function handler(req, res) {
  setCorsHeaders(req, res);
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed. Use POST.' });

  // Auth
  const { user, error: authError } = await verifyAuth(req);
  if (authError) {
    return res.status(authError === 'Auth service not configured' ? 500 : 401).json({
      error: authError === 'Auth service not configured' ? 'Service configuration error' : 'Unauthorized',
      message: authError,
      fallback: 'Please sign in at /login to use the GO/NO-GO Simulator.'
    });
  }

  const body = req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ error: 'Request body must be valid JSON' });
  }

  const errors = validateRequest(body);
  if (errors.length > 0) {
    return res.status(400).json({ error: 'Validation failed', message: errors.join('; '), details: errors });
  }

  if (!process.env.OPENAI_API_KEY) {
    return res.status(500).json({
      error: 'Service configuration error',
      fallback: 'The GO/NO-GO Simulator is temporarily unavailable.'
    });
  }

  const normalizedRole = body.role.toUpperCase().replace(/\s+/g, '-');

  // Rate limit (reuse existing infrastructure)
  const rateLimitResult = await checkRateLimit(req, `GONOGO-${normalizedRole}`);
  if (!rateLimitResult.allowed) {
    res.setHeader('Retry-After', String(rateLimitResult.retryAfter || 60));
    return res.status(429).json({
      error: 'Too many requests',
      message: rateLimitResult.message || 'Rate limit exceeded. Please wait a moment.',
      fallback: 'Hans Muller is currently reviewing another proposal. Please wait.'
    });
  }

  try {
    // Count actual student responses (excluding the auto-generated opening message)
    const userMessages = body.messages.filter(m => m.role === 'user');
    const studentAnswerCount = Math.max(0, userMessages.length - 1); // -1 for the "I am ready" opener

    // Build system prompt with deck content
    let systemPrompt = HANS_SYSTEM_PROMPT +
      `\n\n## THE STUDENT'S PITCH DECK (${normalizedRole} role)\n` +
      `The student is presenting as: ${normalizedRole}\n` +
      `Their deck content:\n${body.deckContent.trim().slice(0, MAX_DECK_LENGTH)}`;

    // Force verdict after 7 student answers (hard limit)
    if (studentAnswerCount >= 7) {
      systemPrompt += `\n\n## MANDATORY INSTRUCTION\nThe student has answered ${studentAnswerCount} questions. You have reached the HARD LIMIT. You MUST deliver your [VERDICT] NOW in this response. Do NOT ask another question. Begin with [VERDICT] on its own line and deliver your decision immediately.`;
    } else if (studentAnswerCount >= 5) {
      systemPrompt += `\n\n## CONVERSATION STATUS\nThe student has answered ${studentAnswerCount} of your questions. You are approaching the end of this review (5-7 questions maximum). Consider whether you have enough information to deliver your [VERDICT]. If you have covered ROI, governance, risks, and timeline, deliver your verdict now.`;
    }

    // Remind about topic rotation after question 2+
    if (studentAnswerCount >= 2 && studentAnswerCount < 7) {
      systemPrompt += `\n\n## TOPIC ROTATION REMINDER\nYou have asked ${studentAnswerCount + 1} questions so far. MANDATORY: Review your previous questions. If your last 2 questions were about the SAME topic (e.g., both about governance, or both about ROI), you MUST switch to a DIFFERENT topic NOW. Topics you should cover: ROI, technical feasibility, governance, change management, risks, timeline. A good CIO covers breadth.`;
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...body.messages.map(m => ({ role: m.role, content: m.content }))
    ];

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    const model = 'gpt-5-nano';

    // Helper to extract text from various OpenAI response formats
    const extractText = (result) => {
      const content = result?.choices?.[0]?.message?.content;
      if (typeof content === 'string') return content.trim() || null;
      if (Array.isArray(content)) {
        return content
          .map(p => p?.text || p?.text?.value || p?.output_text || '')
          .filter(Boolean)
          .join('')
          .trim() || null;
      }
      if (content && typeof content === 'object') {
        return (content.text?.value || content.text || '').toString().trim() || null;
      }
      return result?.choices?.[0]?.message?.refusal?.trim() || null;
    };

    let completion = await openai.chat.completions.create({
      model,
      max_completion_tokens: 2048,
      messages
    });

    let assistantMessage = extractText(completion);

    // Retry once if empty (rare GPT-5 behavior)
    if (!assistantMessage) {
      completion = await openai.chat.completions.create({
        model,
        max_completion_tokens: 4096,
        messages
      });
      assistantMessage = extractText(completion);
    }

    if (!assistantMessage) {
      throw new Error('OpenAI returned an empty response');
    }

    // Detect if this is a verdict message
    const isVerdict = assistantMessage.includes('[VERDICT]');

    return res.status(200).json({
      message: assistantMessage,
      role: normalizedRole,
      isVerdict,
      questionCount: body.messages.filter(m => m.role === 'user').length
    });

  } catch (err) {
    console.error('GO/NO-GO Sim error:', err.message || err);

    if (err.status === 429) {
      return res.status(429).json({
        error: 'AI service rate limit',
        fallback: 'Hans Muller is busy. Please wait 30 seconds and try again.'
      });
    }
    if (err.status === 500 || err.status === 503) {
      return res.status(502).json({
        error: 'AI service unavailable',
        fallback: 'The boardroom is temporarily closed. Please try again shortly.'
      });
    }

    return res.status(500).json({
      error: 'An unexpected error occurred',
      fallback: 'The GO/NO-GO Simulator encountered an error. Please try again.'
    });
  }
}
