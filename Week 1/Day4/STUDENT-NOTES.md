# Student Notes: System Design & Governance Blueprint

## Workshop Overview

| | |
|---|---|
| **Duration** | 90 minutes |
| **Goal** | Create governance documentation for agentic AI systems |
| **Tools** | ChatGPT Enterprise + Browser |
| **Outcome** | 2-page governance document ready for enterprise deployment |

---

## Why This Matters

**WITHOUT GOVERNANCE:**
- Agent makes unexpected decisions
- No one knows who's responsible
- Can't explain why something happened
- Compliance/audit failures
- "It works on my machine" → production disaster

**WITH GOVERNANCE:**
- Clear boundaries on what agent can/cannot do
- Named owners for every component
- Every decision is explainable and auditable
- Safe failure modes defined
- Enterprise-ready, client-trustworthy

---

## The Big Picture

```
┌─────────────────────────────────────────────────────────────────┐
│                    AGENTIC AI PROJECT                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│   📋 Project Charter    →    🔧 Architecture Doc               │
│   (WHY we build)             (HOW it works)                    │
│                                                                 │
│          ↓                           ↓                          │
│                                                                 │
│   🛡️ Governance Doc     →    📖 Operations Guide               │
│   (RULES & LIMITS)           (HOW to run)                      │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## Tools You Need

| Tool | Purpose |
|------|---------|
| **ChatGPT Enterprise** | Generate documentation, answer questions |
| **Browser** | View workshop materials |
| **Text Editor** | Edit your governance document |

**No coding required!** This is a documentation workshop.

---

## Quick Start Checklist

- [ ] ChatGPT Enterprise open
- [ ] Workshop HTML page open
- [ ] Blank document ready for your governance doc
- [ ] Understood the scenario (Incident Triage Agent)

---

## Phase 1: Homework Validation (5 min)

Copy this prompt into ChatGPT:

```
You are my mentor for database architecture. Yesterday I implemented
vector database capabilities in Supabase.

Your task:
1. Ask me 5 questions about my work (one at a time)
2. After each answer, give me brief feedback
3. At the end, give me an overall rating (1-5 stars)

Questions should cover:
- Did I successfully enable the pgvector extension?
- What embedding dimension did I choose and why (768, 1536, 3072)?
- Did I encounter any errors? How did I solve them?
- Can I explain what the <=> operator does?
- Did I test the search function with actual data?

If I didn't complete it, help me understand the key concepts in 3 minutes.

Start with the first question.
```

---

## Phase 2: Understanding KAF Components

### The 5 KAF Components

| Component | What It Does | Example |
|-----------|--------------|---------|
| **Agentic Ingestion** | Controls data entry points | API validation, input sanitization |
| **Knowledge Integration** | Manages memory & context | Vector DB, conversation history |
| **Agentic Core** | The brain - decisions & orchestration | Classification logic, workflow |
| **Agent Builder** | Development & deployment | CI/CD, versioning, rollback |
| **Responsible AI & Governance** | Policies & compliance | Guardrails, audit logs, ownership |

### How to Map Decisions to KAF

Every design decision must have a "home" in KAF:

```
❌ BAD:  "Agent classifies incidents"
         → Where does this live? Who owns it?

✅ GOOD: "Agent classifies incidents"
         → Agentic Core (decision logic)
         → Responsible AI (accuracy thresholds)
         → Knowledge Integration (uses KB for matching)
```

---

## Phase 3: The 20 Killer Questions

### Critical Questions (MUST Answer)

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

### Quick Self-Check

For each question, you should have:
- [ ] A specific answer (not "best effort" or "as needed")
- [ ] A named person responsible (not "the team")
- [ ] A KAF component mapping

---

## Phase 4: Creating Your Governance Document

### The Scenario

You are designing an **Incident Triage Agent** that:
- Analyzes incoming IT incidents
- Determines severity (P1-P4)
- Recommends or executes remediation
- Integrates with ServiceNow, Datadog, KB

**Mode:** Semi-autonomous
- Auto-execute: P3/P4 with known fixes
- Escalate: P1/P2, unknown issues

### Document Structure (8 Required Sections)

```
┌──────────────────────────────────────────────────────────────┐
│                    GOVERNANCE DOCUMENT                        │
├──────────────────────────────────────────────────────────────┤
│                                                               │
│  1. Agent Role Model                                         │
│     └── Who does what, authority boundaries                  │
│                                                               │
│  2. Behavior & Decision Model                                │
│     └── Auto vs human approval vs prohibited                 │
│                                                               │
│  3. Failure & Degradation Model                              │
│     └── What happens when things break                       │
│                                                               │
│  4. Trust Boundaries & Data Zones                            │
│     └── Authoritative vs advisory data                       │
│                                                               │
│  5. Explainability & Audit Model                             │
│     └── What to log, how to explain decisions                │
│                                                               │
│  6. Change & Evolution Model                                 │
│     └── How to update prompts, policies safely               │
│                                                               │
│  7. Operational Ownership Model                              │
│     └── Named owners, kill switch authority                  │
│                                                               │
│  8. KAF Component Mapping Table                              │
│     └── Every section mapped to KAF                          │
│                                                               │
└──────────────────────────────────────────────────────────────┘
```

---

## The Master Prompt

Copy this into ChatGPT to generate your document:

```
Help me create a 2-page Agentic System Governance Document for an
Incident Triage Agent.

The agent:
- Analyzes incoming IT incidents
- Determines severity (P1-P4) and probable root cause
- Recommends or executes remediation actions
- Integrates with ServiceNow, Datadog, and internal KB
- Operates semi-autonomously (auto-execute low-risk, escalate high-risk)

Document must include these 8 sections:

1. AGENT ROLE MODEL
- List of agent roles and responsibilities
- Authority boundaries per role
- Dependency relationships

2. BEHAVIOR & DECISION MODEL
- What decisions can be made autonomously
- What requires human approval
- What is explicitly prohibited
- Risk tolerance definition

3. FAILURE & DEGRADATION MODEL
- Failure scenarios (LLM, data, integration)
- Degraded operating modes
- Stop conditions

4. TRUST BOUNDARIES & DATA ZONES
- Authoritative vs advisory data sources
- Read/write permissions
- Trust assumptions

5. EXPLAINABILITY & AUDIT MODEL
- What decisions must be explainable
- Required logging and evidence
- Audit trail requirements

6. CHANGE & EVOLUTION MODEL
- What can change (prompts, policies, integrations)
- Approval and testing process
- Rollback strategy

7. OPERATIONAL OWNERSHIP MODEL
- Agent owner, Data owner, Model owner
- Incident response owner
- Kill switch authority

8. KAF COMPONENT MAPPING TABLE
Map each section to: Agentic Ingestion, Knowledge Integration,
Agentic Core, Agent Builder, or Responsible AI & Governance

Format as a professional document. Be specific, not generic.
No placeholder language.
```

---

## Section Templates

### 1. Agent Role Model

```
┌─────────────────────────────────────────────────────────────┐
│ ROLE: Triage Agent                                          │
├─────────────────────────────────────────────────────────────┤
│ Responsibility: Classify incident severity (P1-P4)          │
│ Authority:      Can read incidents, update severity field   │
│ Cannot:         Execute remediation, close tickets          │
│ Reports to:     Decision Agent                              │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ ROLE: Decision Agent                                        │
├─────────────────────────────────────────────────────────────┤
│ Responsibility: Determine appropriate action                │
│ Authority:      Approve P3/P4 auto-remediation              │
│ Cannot:         Approve P1/P2 actions, delete data          │
│ Reports to:     Human Supervisor                            │
└─────────────────────────────────────────────────────────────┘
```

### 2. Behavior & Decision Model

```
DECISION AUTHORITY MATRIX
─────────────────────────────────────────────────────────────
Scenario                          │ Action
─────────────────────────────────────────────────────────────
P4 + KB match > 90%               │ ✅ AUTO-EXECUTE
P3 + KB match > 85%               │ ✅ AUTO-EXECUTE
P3 + confidence < 70%             │ 🔶 HUMAN APPROVAL
P2 (any confidence)               │ 🔶 HUMAN REQUIRED
P1 (any)                          │ 🔶 IMMEDIATE ESCALATION
Unknown root cause                │ ❌ REFUSE + ESCALATE
Security incident                 │ ❌ REFUSE + ALERT
─────────────────────────────────────────────────────────────

PROHIBITED ACTIONS (NEVER)
- Delete any data
- Modify configurations
- Access security systems
- Execute on P1/P2 without approval
```

### 3. Failure & Degradation Model

```
FAILURE SCENARIOS
─────────────────────────────────────────────────────────────
Failure              │ Detection        │ Response
─────────────────────────────────────────────────────────────
LLM timeout          │ API timeout 30s  │ Queue + page on-call
LLM error rate > 5%  │ Monitoring       │ Circuit breaker ON
DB unavailable       │ Health check     │ Read-only mode
KB unavailable       │ Health check     │ Escalate all
Confidence < 60%     │ Output check     │ Human review
Contradictory data   │ Logic check      │ STOP + alert
─────────────────────────────────────────────────────────────

STOP CONDITIONS (Immediate Halt)
- Auth/permission failure
- Data integrity error
- 3+ consecutive LLM errors
- Manual kill switch activated
```

### 4. Trust Boundaries

```
DATA TRUST ZONES
─────────────────────────────────────────────────────────────
✅ AUTHORITATIVE (Source of Truth)
   - ServiceNow CMDB
   - Production monitoring metrics
   - Identity Provider

🔶 ADVISORY (Use with Validation)
   - Datadog alerts
   - Knowledge Base articles
   - Historical incident data

❌ UNTRUSTED (Always Validate)
   - User-provided descriptions
   - External API responses
   - Scraped/crawled data
─────────────────────────────────────────────────────────────

PERMISSIONS
─────────────────────────────────────────────────────────────
System              │ READ  │ WRITE
─────────────────────────────────────────────────────────────
ServiceNow          │  ✅   │  Comments only
CMDB                │  ✅   │  ❌
Datadog             │  ✅   │  ❌
Knowledge Base      │  ✅   │  ❌
Ansible (execution) │  ❌   │  Approved playbooks only
─────────────────────────────────────────────────────────────
```

### 5. Explainability & Audit

```
AUDIT LOG STRUCTURE
─────────────────────────────────────────────────────────────
{
  "decision_id": "uuid",
  "timestamp": "ISO8601",
  "incident_id": "INC001234",
  "input_hash": "sha256",
  "agent_role": "Decision Agent",
  "decision": "auto-execute",
  "confidence": 0.87,
  "rationale": "P3 + KB match 92% + CPU pattern",
  "kb_reference": "KB0012345",
  "action_taken": "restart_service",
  "outcome": "success",
  "human_override": null
}
─────────────────────────────────────────────────────────────

RETENTION: 2 years (compliance requirement)
```

### 6. Change & Evolution

```
CHANGE CONTROL PROCESS
─────────────────────────────────────────────────────────────

  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────┐
  │ Propose  │ →  │  Review  │ →  │  Test    │ →  │  Deploy  │
  │ (PR)     │    │  (Peer)  │    │  (24h)   │    │  (Canary)│
  └──────────┘    └──────────┘    └──────────┘    └──────────┘

CHANGE CATEGORIES
─────────────────────────────────────────────────────────────
High Impact (full process)    │ Prompts, Policies, Models
Medium Impact (review + test) │ Thresholds, Integrations
Low Impact (review only)      │ Logging, Metrics
─────────────────────────────────────────────────────────────

ROLLBACK
- Keep last 3 versions of all prompts
- Auto-rollback trigger: error rate > 10%
- Manual rollback: any L2+ engineer
```

### 7. Operational Ownership

```
OWNERSHIP MATRIX
─────────────────────────────────────────────────────────────
Role                │ Owner              │ Backup
─────────────────────────────────────────────────────────────
Agent Owner         │ Jane Smith         │ Bob Jones
Data Owner          │ Data Platform Team │ Jane Smith
Model Owner         │ AI Team Lead       │ ML Engineer
Incident Response   │ SRE On-Call        │ Platform Lead
─────────────────────────────────────────────────────────────

KILL SWITCH AUTHORITY
Can disable immediately:
- Any SRE L2 or above
- Platform Lead
- On-call Manager
- Security Team (any level)

Method: kubectl scale deployment triage-agent --replicas=0
```

### 8. KAF Mapping Table

```
KAF COMPONENT MAPPING
─────────────────────────────────────────────────────────────
Section                    │ Primary KAF        │ Secondary
─────────────────────────────────────────────────────────────
1. Agent Role Model        │ Agentic Core       │ Responsible AI
2. Behavior & Decision     │ Agentic Core       │ Responsible AI
3. Failure & Degradation   │ Agent Builder      │ Agentic Core
4. Trust Boundaries        │ Agentic Ingestion  │ Knowledge Int.
5. Explainability & Audit  │ Responsible AI     │ Agentic Core
6. Change & Evolution      │ Agent Builder      │ Responsible AI
7. Operational Ownership   │ Responsible AI     │ Agent Builder
─────────────────────────────────────────────────────────────
```

---

## Grading Criteria Quick Reference

| Criterion | Points | Fail Gate |
|-----------|--------|-----------|
| Completeness (all 8 sections) | 20 | Missing section = FAIL |
| Behavioral Clarity | 20 | "Best effort" = -10 |
| Failure Handling | 15 | "Retries" only = -10 |
| KAF Mapping Accuracy | 25 | >20% wrong = FAIL |
| Governance & Ownership | 10 | "Shared" = -5 |
| Enterprise Readiness | 10 | Demo-level = -10 |

**Pass:** 70+ points AND all fail-gates satisfied
**Fail:** <70 points OR any fail-gate triggered

---

## Common Mistakes to Avoid

### ❌ Vague Language

| Bad | Good |
|-----|------|
| "Agent handles incidents" | "Agent classifies P1-P4 based on..." |
| "Uses best effort" | "If confidence < 70%, escalate" |
| "Team is responsible" | "Jane Smith, Platform Lead" |
| "As needed" | "Every 30 minutes or on threshold breach" |

### ❌ Missing Boundaries

| Bad | Good |
|-----|------|
| "Agent can access systems" | "READ: CMDB, Datadog. WRITE: Comments only" |
| "High-risk escalated" | "P1/P2 = always human. P3 confidence <70% = human" |

### ❌ No Failure Planning

| Bad | Good |
|-----|------|
| "System retries on error" | "3 retries, then circuit breaker, page on-call" |
| "Handles gracefully" | "LLM fail → queue incident → alert ops → disable auto" |

---

## Documentation Maturity Levels

```
Level 0 ██░░░░░░░░ "It's in my head"
Level 1 ████░░░░░░ Basic READMEs
Level 2 ██████░░░░ Architecture + Runbook
Level 3 ████████░░ + Governance ← MINIMUM FOR PRODUCTION
Level 4 ██████████ Enterprise ready ← TARGET
```

---

## Quick Reference: Document Set

| Document | Owner | When to Update |
|----------|-------|----------------|
| Project Charter | PM | Project start, major changes |
| Architecture Doc | Architect | Every release |
| Prompt Library | AI Engineer | Every prompt change |
| Test Documentation | QA Lead | Every release |
| Operations Runbook | Ops Lead | After incidents |
| Governance Document | Architect + Compliance | Quarterly |

---

## Key Takeaways

```
┌─────────────────────────────────────────────────────────────────┐
│                                                                 │
│   📝 Document      →   🗺️ Map to KAF   →   🚧 Define          │
│      Everything         Every Decision       Boundaries         │
│                                                                 │
│          ↓                                       ↓              │
│                                                                 │
│   ✅ Ship           ←   👤 Assign       ←   🔴 Plan            │
│      Safely              Owners              Failures           │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

**Final Principle:**
> Kyndryl does not deliver agents that merely work.
> Kyndryl delivers agents that can be **explained**, **governed**,
> **trusted**, and **operated at scale**.

---

## Useful Links

| Resource | URL |
|----------|-----|
| Workshop Page | [provided by mentor] |
| KAF Documentation | [internal link] |
| Governance Templates | [internal link] |
| Example Documents | [internal link] |

---

## Notes Space

Use this area for your own notes during the workshop:

```










```

---

## Peer Review Checklist

When reviewing a colleague's document:

- [ ] All 8 sections present?
- [ ] Specific names, not team names?
- [ ] Clear auto/human/prohibited boundaries?
- [ ] Failure scenarios with specific responses?
- [ ] Trust zones clearly defined?
- [ ] Audit log structure specified?
- [ ] Change control process described?
- [ ] Kill switch authority named?
- [ ] All sections mapped to KAF?
- [ ] No "best effort" or "as needed" language?

---

*AI Academy 2026 • System Design & Governance Blueprint*
