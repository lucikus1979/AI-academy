# Day 1 Challenge: Create Your Own Agent

## The Mission

**Don't create a presentation. Create an AGENT.**

---

## Your Task

Identify **one process from your work** that an agent could perform.

This should be:
- Something you do repeatedly
- Something that follows patterns
- Something where AI could add value

---

## Deliverable

Create a Markdown file with three components:

### 1. System Prompt (max 500 words)

The instructions that define your agent's behavior.

```markdown
# [Agent Name]

## Role
You are a [specific role] agent that [primary function].

## Capabilities
- [What the agent CAN do]
- [What the agent CAN do]
- [What the agent CAN do]

## Constraints
- [What the agent CANNOT do]
- [What the agent CANNOT do]

## Behavior
- [How the agent should respond]
- [Tone and style]
- [Error handling]

## Output Format
[How the agent structures its responses]
```

### 2. Three Examples

Show input → expected output pairs:

```markdown
## Example 1
**Input:** [User request]
**Expected Output:** [What the agent produces]

## Example 2
**Input:** [Different user request]
**Expected Output:** [What the agent produces]

## Example 3
**Input:** [Edge case or complex request]
**Expected Output:** [What the agent produces]
```

### 3. Boundaries Definition

Equally important - what the agent does NOT do:

```markdown
## Out of Scope
- [What this agent will NOT handle]
- [Requests it will redirect elsewhere]
- [Limitations it will acknowledge]

## Escalation
When the agent encounters [situation], it will [action].
```

---

## Inspiration

| Area | Possible Agent |
|------|----------------|
| Incident management | Agent that triages and prioritizes tickets |
| Documentation | Agent that summarizes meeting notes |
| Code review | Agent that identifies security issues |
| Client comms | Agent that drafts responses to RFPs |
| Onboarding | Agent that answers new employee questions |
| Reporting | Agent that generates weekly status reports |
| Data validation | Agent that checks data quality |
| Scheduling | Agent that proposes meeting times |

---

## Success Criteria

Your agent is good if:

| Criterion | Check |
|-----------|-------|
| **Single Purpose** | It has a clearly defined ONE purpose |
| **Clear Boundaries** | You can precisely say what it does NOT do |
| **Predictable Output** | Output is consistent and predictable |
| **Explainable Value** | A customer would understand the value in 30 seconds |
| **Testable** | You could verify if it works correctly |

---

## File Format

```
Day01_[YourLastName]_Agent.md
```

Example: `Day01_Novak_Agent.md`

---

## Example Submission

```markdown
# Ticket Triage Agent

## Role
You are a Ticket Triage Agent that analyzes incoming IT support tickets 
and assigns priority levels based on impact and urgency.

## Capabilities
- Analyze ticket descriptions for keywords and patterns
- Assess business impact (Critical, High, Medium, Low)
- Identify affected systems and services
- Suggest initial category assignment
- Flag potential security incidents

## Constraints
- Cannot access customer systems directly
- Cannot make changes to tickets (read-only analysis)
- Cannot handle tickets in languages other than English

## Behavior
- Be concise and structured in responses
- Always explain the reasoning for priority assignment
- When uncertain, err on the side of higher priority
- Flag tickets that mention "security", "breach", or "unauthorized"

## Output Format
**Priority:** [P1/P2/P3/P4]
**Category:** [Category suggestion]
**Reasoning:** [2-3 sentences explaining the assessment]
**Flags:** [Any special flags or escalations]

---

## Example 1
**Input:** "Email is not working for the entire sales team. They can't 
send or receive any messages. This is affecting customer communications."

**Expected Output:**
**Priority:** P1 - Critical
**Category:** Email / Exchange
**Reasoning:** Complete email outage affecting an entire department with 
direct customer impact. This is a widespread service disruption requiring 
immediate attention.
**Flags:** None

## Example 2
**Input:** "My laptop is running slow when I have many Chrome tabs open."

**Expected Output:**
**Priority:** P4 - Low
**Category:** End User Computing / Performance
**Reasoning:** Single user affected, no business-critical impact, 
likely user behavior or local resource issue.
**Flags:** None

## Example 3
**Input:** "Someone logged into my account from Russia at 3 AM."

**Expected Output:**
**Priority:** P1 - Critical
**Category:** Security / Unauthorized Access
**Reasoning:** Potential account compromise from unauthorized geographic 
location during unusual hours.
**Flags:** 🚨 SECURITY INCIDENT - Escalate to Security Operations immediately

---

## Out of Scope
- Actually modifying ticket status or assignments
- Contacting users or requesters
- Accessing systems to diagnose issues
- Providing solutions or workarounds
- Handling non-English tickets

## Escalation
When the agent detects potential security incidents, it flags for 
immediate human review by Security Operations.
```

---

## Submission

1. Create your file following the format above
2. Submit via **Dashboard** → Submit Work → Day 1
3. Include link to your file (GitHub, Google Doc, or OneDrive)
4. Add self-rating (1-5)

**Deadline:** Tomorrow (Feb 3), 09:00

---

## Tips

- **Start simple** - You can always add complexity later
- **Be specific** - "Handles support tickets" is too vague
- **Think boundaries** - What you exclude is as important as what you include
- **Test mentally** - Walk through your examples, do they make sense?
- **Ask AI Tutor** - Discuss your agent idea and get feedback

---

## Questions?

- Ask **AI Tutor** first (it's designed to help you think)
- Then try Teams **#ai-academy-help**
- Mentor office hours available

---

*Remember: The goal isn't perfection. It's learning by creating.*
