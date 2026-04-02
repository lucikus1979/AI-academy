# Tools & Access Guide

## Overview

| Tool | Purpose | Access Method |
|------|---------|---------------|
| ChatGPT Enterprise | AI Tutor, learning | Kyndryl SSO |
| Google Visual Studio Code | Development IDE | Google account |
| Azure Portal | Cloud infrastructure | Kyndryl Azure |
| Azure DevOps | Git repos, CI/CD | Kyndryl SSO |
| AI Academy Dashboard | Submissions, progress | Direct link |
| SharePoint/OneDrive | Materials | Kyndryl M365 |
| Microsoft Teams | Communication | Kyndryl M365 |

---

## 1. ChatGPT Enterprise (AI Tutor)

### Access
1. Go to [chat.openai.com](https://chat.openai.com)
2. Click "Continue with SSO"
3. Enter your Kyndryl email
4. Authenticate via Kyndryl SSO

### Finding AI Academy Tutor
1. In ChatGPT, click "Explore GPTs" in sidebar
2. Search for "Kyndryl AI Academy"
3. Select **"AI Academy - AI Tutor"**
4. Pin it to your sidebar for quick access

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Can't log in | Clear browser cache, try incognito |
| Don't see GPTs | Make sure you're on Enterprise, not free |
| Tutor not responding | Refresh page, try new conversation |

---

## 2. Google Visual Studio Code (IDE)

### Access
1. Go to [idx.google.com](https://idx.google.com)
2. Sign in with your Google account
3. Request access to Kyndryl workspace (if prompted)

### Setup for AI Academy
1. Clone the starter template:
   ```
   Workspaces → Import → AI Academy Starter
   ```
2. Verify Gemini API is configured:
   ```
   Settings → AI → Gemini API Key
   ```

### Key Features
- Agentic coding with Gemini 3 Pro built-in
- Browser control for testing
- Artifact generation
- VS Code-familiar interface

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Workspace won't load | Check internet, try different browser |
| Gemini not responding | Verify API key in settings |
| Can't push to git | Check Azure DevOps connection |

---

## 3. Azure Portal

### Access
1. Go to [portal.azure.com](https://portal.azure.com)
2. Sign in with Kyndryl credentials
3. Select subscription: **AI-Academy-2026**

### Your Resources
- Resource group: `rg-ai-academy-shared` (read-only)
- Team resource group: `rg-team-[your-team]` (Week 4+)

### Key Services
| Service | Purpose | Location |
|---------|---------|----------|
| Azure AI Search | RAG labs | Shared RG |
| Cosmos DB | Document storage | Shared RG |
| Container Apps | Deployment | Team RG |
| Key Vault | Secrets | Shared RG |

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Can't see subscription | Contact IT for access |
| Permission denied | Check you're in correct RG |
| Deployment failed | Check budget limits |

---

## 4. Azure DevOps

### Access
1. Go to [dev.azure.com/kyndryl](https://dev.azure.com/kyndryl)
2. Sign in with Kyndryl SSO
3. Navigate to project: **AI-Academy-2026**

### Repository Structure
```
AI-Academy-2026/
├── individual/
│   └── [your-username]/     ← Your personal repo
└── teams/
    └── team-[name]/         ← Team repo (Week 4+)
```

### Git Basics
```bash
# Clone your repo
git clone https://dev.azure.com/kyndryl/AI-Academy-2026/_git/individual/[username]

# Daily workflow
git add .
git commit -m "Day 1: Agent assignment"
git push
```

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Authentication failed | Use PAT or credential manager |
| Can't push | Check branch permissions |
| Merge conflicts | Pull first, resolve locally |

---

## 5. AI Academy Dashboard

### Access
- **URL:** [ai-academy-dashboard.vercel.app](https://ai-academy-dashboard.vercel.app)
- **Login:** Your Kyndryl email
- **Password:** Provided separately

### Features
| Feature | Purpose |
|---------|---------|
| Submit Work | Upload daily assignments |
| Progress | Track your completion |
| Leaderboard | See cohort progress |
| Resources | Quick links to materials |

### Submitting Assignments
1. Click "Submit Work"
2. Select Day and Assignment type
3. Paste link to your deliverable (Google Doc, GitHub, etc.)
4. Add self-rating (1-5)
5. Click Submit

### Troubleshooting
| Issue | Solution |
|-------|----------|
| Can't log in | Check email spelling, reset password |
| Submission failed | Try different browser, check file link |
| Progress not updating | Refresh page, wait 5 minutes |

---

## 6. SharePoint / OneDrive

### Access
- Already have access via Kyndryl M365
- Direct link: [AI Academy 2026 SharePoint](https://kyndryl.sharepoint.com)

### Navigation
```
AI Academy 2026/
├── START-HERE.md          ← Start here
├── QUICK-LINKS.md         ← Bookmark this
├── 00-Program/            ← Schedule, rules
├── 01-Week-1-Foundations/ ← Current week content
├── 06-Reference/          ← KAF docs, guides
├── 07-Submissions/        ← Upload here
└── 08-Community/          ← Contacts
```

---

## 7. Microsoft Teams

### Channels
| Channel | Purpose |
|---------|---------|
| **#ai-academy-general** | Announcements |
| **#ai-academy-help** | Technical support |
| **#ai-academy-[role]** | Role-specific discussion |
| **#ai-academy-social** | Informal chat |

### Notifications
- Enable notifications for #ai-academy-general
- Turn on mentions for your role channel

---

## API Keys & Credentials

### What You'll Need
| API | Where to Get | When Needed |
|-----|--------------|-------------|
| Gemini API | Google Partner credits (pre-configured) | Labs, Day 1+ |
| Azure OpenAI | Shared key in Key Vault | Week 4+ |
| OpenAI API | Not needed (using Enterprise) | — |

### Accessing Shared Secrets
```bash
# From Azure CLI
az keyvault secret show --vault-name kv-ai-academy --name gemini-api-key
```

**⚠️ Never commit API keys to git!**

---

## Troubleshooting Checklist

Before asking for help, try:

- [ ] Refresh the page
- [ ] Clear browser cache
- [ ] Try incognito/private mode
- [ ] Try different browser (Chrome recommended)
- [ ] Check internet connection
- [ ] Verify you're using Kyndryl credentials

### Still Stuck?

1. Post in Teams **#ai-academy-help**
2. Include:
   - What tool
   - What you tried
   - Screenshot of error
3. Tag `@AI Academy Support`

---

## Quick Reference Card

```
╔═══════════════════════════════════════════════════════════════╗
║                    AI ACADEMY - QUICK ACCESS                  ║
╠═══════════════════════════════════════════════════════════════╣
║  AI Tutor      → chat.openai.com (Kyndryl SSO)               ║
║  Dashboard     → ai-academy-dashboard.vercel.app              ║
║  IDE           → idx.google.com                               ║
║  Azure         → portal.azure.com                             ║
║  DevOps        → dev.azure.com/kyndryl                        ║
║  Materials     → SharePoint AI Academy 2026                   ║
║  Help          → Teams #ai-academy-help                       ║
╚═══════════════════════════════════════════════════════════════╝
```

---

*Last Updated: February 1, 2026*
