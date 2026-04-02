# AI Academy Day 4 — Instructor Preparation
## System Design & Governance Blueprint

**Duration:** 90 minutes live + 90 minutes self-study
**Goal:** Students create governance documentation for agentic AI systems using KAF
**Tools:** ChatGPT Enterprise + Browser
**Outcome:** 2-page governance document ready for enterprise deployment

---

## SESSION OVERVIEW

Day 4 shifts from hands-on coding (Days 1-3) to **system design thinking**. Students apply the Kyndryl Agentic Framework (KAF) to create a governance document for an Incident Triage Agent. This is a documentation workshop — no coding required.

### Key Message
> Kyndryl does not deliver agents that merely work. Kyndryl delivers agents that can be **explained**, **governed**, **trusted**, and **operated at scale**.

---

## PREREQUISITES CHECK

Students should have completed Day 3 (Databases & Memory for AI Agents). Open with a 5-minute homework validation where students use ChatGPT to self-assess their pgvector/Supabase work from Day 3.

---

## KAF COMPONENTS REVIEW

Ensure students can map every design decision to one of the 5 KAF components:

| Component | What It Does | Example |
|-----------|--------------|---------|
| **Agentic Ingestion** | Controls data entry points | API validation, input sanitization |
| **Knowledge Integration** | Manages memory & context | Vector DB, conversation history |
| **Agentic Core** | The brain — decisions & orchestration | Classification logic, workflow |
| **Agent Builder** | Development & deployment | CI/CD, versioning, rollback |
| **Responsible AI & Governance** | Policies & compliance | Guardrails, audit logs, ownership |

### Common Student Mistake
Students often say "Agent classifies incidents" without specifying WHERE in KAF this lives. Push them to be specific: Agentic Core (decision logic) + Responsible AI (accuracy thresholds) + Knowledge Integration (KB matching).

---

## THE 20 KILLER QUESTIONS

These questions form the backbone of the governance document. The 8 critical ones students MUST answer:

| # | Question | If Missing |
|---|----------|------------|
| 1 | What decision authority does the agent have? | Not an agent |
| 2 | What decisions are PROHIBITED? | No governance |
| 3 | Who is accountable for wrong decisions? | No ownership |
| 6 | When must the agent REFUSE to act? | Unsafe |
| 12 | What happens with low-confidence output? | Uncontrolled |
| 15 | Can agent write to production? | Risk of damage |
| 16 | Can agent explain its decisions? | Not auditable |
| 19 | Who can disable the agent immediately? | No kill switch |

### Instructor Tip
Walk through questions 1-3 together as a class before students work independently. These set the foundation for the entire document.

---

## THE SCENARIO

**Incident Triage Agent** that:
- Analyzes incoming IT incidents
- Determines severity (P1-P4) and probable root cause
- Recommends or executes remediation actions
- Integrates with ServiceNow, Datadog, and internal KB
- Operates semi-autonomously (auto-execute P3/P4 with known fixes, escalate P1/P2)

---

## GOVERNANCE DOCUMENT — 8 REQUIRED SECTIONS

### 1. Agent Role Model
Who does what, authority boundaries. Students must define specific roles (Triage Agent, Decision Agent, Human Supervisor) with clear authority and dependency relationships.

### 2. Behavior & Decision Model
Decision authority matrix: what's autonomous, what needs human approval, what's prohibited. Students must define specific confidence thresholds (e.g., P4 + KB match > 90% = auto-execute).

### 3. Failure & Degradation Model
Failure scenarios (LLM timeout, DB unavailable, low confidence) with specific detection methods and responses. Push students beyond "retries" to circuit breakers, degraded modes, and stop conditions.

### 4. Trust Boundaries & Data Zones
Authoritative vs advisory vs untrusted data sources. Read/write permission matrix for each integrated system.

### 5. Explainability & Audit Model
Audit log structure (JSON format), retention policy, what decisions must be explainable. Students must specify concrete fields, not vague "we log everything."

### 6. Change & Evolution Model
Change control process (Propose → Review → Test → Deploy). Categorize changes by impact level. Include rollback strategy.

### 7. Operational Ownership Model
Named owners (not "the team") for: Agent Owner, Data Owner, Model Owner, Incident Response, Kill Switch Authority.

### 8. KAF Component Mapping Table
Every section mapped to primary and secondary KAF components. This validates that students understand KAF deeply.

---

## GRADING CRITERIA

| Criterion | Points | Fail Gate |
|-----------|--------|-----------|
| Completeness (all 8 sections) | 20 | Missing section = FAIL |
| Behavioral Clarity | 20 | "Best effort" = -10 |
| Failure Handling | 15 | "Retries" only = -10 |
| KAF Mapping Accuracy | 25 | >20% wrong = FAIL |
| Governance & Ownership | 10 | "Shared" = -5 |
| Enterprise Readiness | 10 | Demo-level = -10 |

**Pass:** 70+ points AND all fail-gates satisfied

---

## COMMON MISTAKES TO WATCH FOR

| Bad | Good |
|-----|------|
| "Agent handles incidents" | "Agent classifies P1-P4 based on..." |
| "Uses best effort" | "If confidence < 70%, escalate" |
| "Team is responsible" | "Jane Smith, Platform Lead" |
| "As needed" | "Every 30 minutes or on threshold breach" |
| "Agent can access systems" | "READ: CMDB, Datadog. WRITE: Comments only" |
| "System retries on error" | "3 retries, then circuit breaker, page on-call" |

---

## DOCUMENTATION MATURITY LEVELS

```
Level 0 ██░░░░░░░░ "It's in my head"
Level 1 ████░░░░░░ Basic READMEs
Level 2 ██████░░░░ Architecture + Runbook
Level 3 ████████░░ + Governance ← MINIMUM FOR PRODUCTION
Level 4 ██████████ Enterprise ready ← TARGET
```

---

## SESSION FLOW

| Time | Activity | Instructor Action |
|------|----------|-------------------|
| 0-5 min | Homework validation | Monitor ChatGPT self-assessment |
| 5-15 min | KAF components review | Present, take questions |
| 15-25 min | 20 Killer Questions walkthrough | Do Q1-3 together as class |
| 25-35 min | Scenario introduction | Present Incident Triage Agent |
| 35-75 min | Governance document creation | Students work with ChatGPT, circulate and review |
| 75-85 min | Peer review | Students exchange and evaluate using checklist |
| 85-90 min | Wrap-up & key takeaways | Reinforce enterprise-ready mindset |

---

## PEER REVIEW CHECKLIST (for students)

- All 8 sections present?
- Specific names, not team names?
- Clear auto/human/prohibited boundaries?
- Failure scenarios with specific responses?
- Trust zones clearly defined?
- Audit log structure specified?
- Change control process described?
- Kill switch authority named?
- All sections mapped to KAF?
- No "best effort" or "as needed" language?

---

*AI Academy 2026 — Day 4: System Design & Governance Blueprint*
