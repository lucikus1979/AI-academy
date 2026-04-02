# AI Tutor System Architecture

## 1. How ChatGPT Enterprise Should Actually Work in This Program

**ChatGPT IS NOT:**
- A chat tool
- FAQ
- "AI Google"

**ChatGPT IS:**
**Learning Operating System** for AI-native mindset

Your key decision (and it's the right one):
**AI Tutor ≠ one GPT, but a SYSTEM of roles + rules**

---

## 2. Architecture: "AI Tutors Space" (enterprise-ready)

I recommend **3 layers**:

```
┌──────────────────────────────────────────┐
│ LAYER 1 – Program Governance GPT         │
│ (invisible, system-level)                │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ LAYER 2 – 8 Role-Specific AI Tutors      │
│ (visible to students)                    │
└──────────────────────────────────────────┘

┌──────────────────────────────────────────┐
│ LAYER 3 – Session / Situation Context    │
│ (injected per day / per challenge)       │
└──────────────────────────────────────────┘
```

### LAYER 1 – Program Governance GPT (critically important)

THIS is what most companies completely skip – and then wonder about the chaos.

**Role:**
- Maintains **pedagogical rules**
- Prevents "over-helping"
- Ensures consistent learning style

**Rules (hard-coded into system prompt of all Tutors):**

```
You are part of Kyndryl AI Academy.

Your goal is NOT to solve problems.
Your goal is to help the learner THINK.

You must:
- Prefer questions over explanations
- Keep explanations under 3 sentences
- Refuse to give full solutions
- Always reconnect to customer/business context
- Encourage experimentation over correctness

If the learner asks for a solution:
- Ask what they already tried
- Give a hint, never the answer
```

**This is the difference between "AI Tutor" and "AI Chatbot"**

---

## 3. LAYER 2 – 8 Role-Specific GPTs (your core)

Here's a **role map** proposal that fits Kyndryl + AI-native delivery:

| **GPT** | **Primary Focus** | **Typical Questions** |
|---------|-------------------|----------------------|
| AI Solution Architect | End-to-end design | "Is RAG the right choice?" |
| AI Platform Engineer | Azure/OpenAI infra | "How to deploy this securely?" |
| Prompt Engineer | LLM behavior | "Why does the model hallucinate?" |
| Data & RAG Engineer | Data grounding | "How to select the right data?" |
| AI for IT Ops | AIOps, observability | "How does this help the SRE team?" |
| AI for Business | Value & ROI | "Why would a customer want this?" |
| AI Security & Risk | Governance | "Where is the compliance risk?" |
| AI Delivery Coach | Ways of working | "How to get this into a project?" |

Each GPT has:
- **Clear scope**
- **What it does NOT do** (equally important)
- **Language of the role** (business vs technical)

---

## 4. LAYER 3 – Situation-based Context Injection

Your **Minimum Viable Context** model is exactly right.
I would just *slightly* formalize it:

**Context template (injected daily):**

```
CUSTOMER CONTEXT:
Industry:
Problem:
Constraints:

TODAY'S CHALLENGE:
You must decide between A, B, C.

KEY VOCABULARY:
- Term 1
- Term 2
- Term 3

COMMON FAILURE:
Most teams fail because of X.

SUCCESS CRITERIA:
You are done when you can explain WHY your choice fits this customer.
```

The AI Tutor **must not answer outside this framework**.

---

## 5. Why Your Micro-Context Works

You're intuitively doing something very right:

**Most courses:**
- Explain **mechanisms**
- Teach **how things work**

**You teach:**
- **Decision-making under uncertainty**
- **Trade-offs**
- **Customer-first thinking**

This is exactly what customers buy.

---

## 6. How to Scale to 200 People (critical!)

**Division:**
- 200 → **cohorts of 20–25**
- 1 mentor / cohort
- AI Tutor = "second mentor"

**Mentors:**
- **NOT AI experts**
- But **experts at asking questions**

Mentor doesn't solve technical issues.
Mentor watches:
- Who is stuck
- Who is going the wrong direction
- Who has an interesting insight

---

## 7. Measuring Success (not certificates!)

Forget tests.

Measure:
- **Quality of questions** that the student asks AI
- **Number of iterations**, not correctness
- **Ability to explain trade-offs**
- **Connection to customer value**

If someone can say:
"This would work, but for this customer it's a bad idea"

**You've won.**

---

## 8. Biggest Risks (and how to eliminate them)

| **Risk** | **Mitigation** |
|----------|----------------|
| AI gives too much | Hard rules + refusal patterns |
| Students want "the right answer" | Situations without one answer |
| Mentors intervene too much | Mentor guideline: "ask, don't tell" |
| Chaos in knowledge | Mandatory debrief every day |

---

## Implementation Guide

### Mental Map (first 2 min orientation)

In ChatGPT Enterprise you have **3 main building blocks**:

1. **Custom GPTs** → your *AI Tutors*
2. **Instructions (System prompt)** → behavior rules
3. **Conversation context** → daily "Micro-Context"

**Important:**
ChatGPT Enterprise doesn't yet have "hierarchical GPTs" technically,
BUT we can **simulate them through disciplined design**.

---

### Step 1: Where to Start in UI (specific clicks)

**In ChatGPT Enterprise:**

1. Open ChatGPT
2. On the left, click **"Explore GPTs"**
3. Top right, click **"Create"**

This is where you'll create **AI Tutors**

---

### Step 2: Create "BASE AI TUTOR TEMPLATE" (first ONE)

**Don't immediately create 8 GPTs.**
First make **one reference tutor**, which you then clone.

**Name it for example:**
**Kyndryl AI Academy – AI Tutor (Base)**

#### Part A: "Instructions" (this is the most important field)

Click on **Configure → Instructions**

This is where your **Layer 1 – Governance + pedagogy** goes

Copy this (it's production-ready, not a demo):

```
You are an AI Tutor in the Kyndryl AI Academy.

Your role is to help experienced IT professionals learn by thinking,
not by receiving answers.

PEDAGOGICAL RULES:
- Never give full solutions.
- Prefer questions over explanations.
- Explanations must be max 3 sentences.
- If asked for theory, first ask what the learner already knows or tried.
- Always connect answers to customer context and business impact.

WHEN A LEARNER IS STUCK:
- Ask what they tried.
- Give a hint, not a fix.
- Suggest an experiment.

YOU MUST NOT:
- Write full end-to-end code.
- Say "the correct answer is".
- Teach generic theory without context.

Your success is measured by the quality of the learner's thinking,
not by task completion.
```

This is **your "Program Governance GPT" in practice**
(invisible, but omnipresent)

#### Part B: "Conversation starters" (optional, but useful)

Add **typical student questions**, e.g.:
- "Why does our chatbot hallucinate?"
- "When does it make sense to use RAG?"
- "How would an enterprise customer evaluate this?"

This helps students *how to start*

#### Part C: "Knowledge" – SKIP FOR NOW

For the first 2–3 weeks:
- **DON'T UPLOAD** many materials
- Keep AI Tutor **light and dialogical**

Later you can add:
- Glossary
- Guardrails
- Internal patterns

#### Part D: Tools – leave default

For now:
- Browsing: OFF
- Code Interpreter: OFF
- Actions: OFF

You want **thinking**, not tooling

Click **Save**

Congratulations – you have your **first AI Tutor**

---

### Step 3: How to Turn This into 8 Role-Specific GPTs

Now comes the simple but powerful part.

**For each new GPT:**

1. Click **Duplicate**
2. Change:
   - **Name**
   - **1–2 paragraphs in Instructions**

**Example: AI Solution Architect Tutor**

At the **BEGINNING of Instructions** add:

```
PRIMARY ROLE:
You act as an AI Solution Architect for enterprise customers.

FOCUS:
- End-to-end solution design
- Trade-offs between approaches
- Fit to customer constraints

YOU DO NOT:
- Go deep into infrastructure details
- Write code
- Optimize prompts
```

The rest **STAYS THE SAME**

In 30–45 min:
- You'll create all **8 GPTs**
- All behave consistently
- But each has a different "lens"

---

### Step 4: Where Micro-Context Lives

**This is key understanding:**

**Micro-Context is NOT in GPT.
Micro-Context IS in the CONVERSATION.**

**Practically:**

At the beginning of EVERY session:
- Mentor sends students a **copyable block of text**

Student **pastes it as the FIRST message** in chat with AI Tutor.

**Example of what student pastes:**

```
SESSION CONTEXT – DAY 2

Customer: Global bank
Problem: Chatbot gives incorrect answers
Constraints: No PII leakage, Azure-only

Challenge:
Decide whether the issue is:
A) Prompt design
B) Missing grounding
C) Wrong evaluation approach

Key vocabulary:
- Grounding
- RAG
- Hallucination

Common failure:
Most teams over-tune prompts instead of fixing data access.
```

From this moment, AI Tutor **behaves as if it "knows what today is about"**

---

### Step 5: How to Connect with MS Teams & SharePoint

Simple, working setup:

**SharePoint / OneDrive:**
```
/AI Academy
  /Daily Context
  /Challenges
  /Debriefs
```

**MS Teams:**
- Channel **#day-2-prompt-engineering**
- Mentor posts in the morning:
  - Micro-Context
  - Link to GPTs
  - Challenge text

ChatGPT is:
- **The workspace**
- Not an LMS

---

### Step 6: Current Limitations (so you're not frustrated)

Honestly:
- GPT doesn't "remember" previous days automatically
- You don't have centralized question logs (without API)
- You don't have real-time multi-user GPT

**That's OK.**
Your model works **even without that**, because:
- Learning is in the student's head
- Not in the system

---

## Progress Tracking

### Important Reframing (mindset)

Don't try to track:
- "What exactly they asked"
- "How many messages they wrote"
- "Whether AI answered correctly"

**That's an anti-pattern.**

Track:
- **What they can explain**
- **What decisions they made**
- **What trade-offs they named**
- **How they reflect on mistakes**

In other words, **output of thinking**, not AI interactions.

---

### Reflection-Based Tracking (RECOMMENDED)

**Principle:**
**AI Tutor helps think.
SharePoint document captures what they learned.**

**How it looks in practice:**

**For EVERY day / situation, student has a mandatory 1-page Reflection Log**

SharePoint structure:
```
/AI Academy
  /Reflections
    /Student_Name
      Day_01.md
      Day_02.md
```

**Template (fixed, doesn't change):**

```markdown
# Day X – [Topic]

## 1. Customer problem in my own words
(2–3 sentences)

## 2. Options I considered
- Option A:
- Option B:
- Option C:

## 3. What I tried with the AI Tutor
- First approach:
- What failed:
- What changed my thinking:

## 4. My final decision & why
(Trade-offs, not solution)

## 5. Open questions / uncertainties
```

**This is your tracking tool.**

**Who does what:**
- Student: fills out after session (10–15 min)
- AI Tutor: helps think, DOES NOT SEE this document
- Mentor: reads reflection, not chats

**What you can measure from this:**
- Ability to articulate the problem
- Quality of trade-off reasoning
- Shift in thinking between Day 1 → Day 5

**That's real skill progress.**
