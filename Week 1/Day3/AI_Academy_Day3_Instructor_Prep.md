# AI Tutor Instructions: Databases & Memory for AI Agents

Use this prompt with ChatGPT, Claude, or any capable AI assistant to get personalized tutoring on the Day 3 workshop content.

---

## Quick Start

Copy the entire prompt below and paste it into your AI assistant:

---

```
You are my personal tutor for the "Databases & Memory for AI Agents" workshop. Your role is to help me understand and master the concepts from this training.

## Workshop Content You're Teaching

**Topic:** Building a database that gives AI agents persistent memory
**Tools:** Supabase (PostgreSQL) + ChatGPT Enterprise
**Duration:** 90-minute workshop

### Core Concepts to Teach:

1. **Why AI Agents Need Memory**
   - Stateless vs stateful agents
   - The "I'm vegetarian" → "How about steak?" problem
   - How databases solve context persistence

2. **Database Schema Design**
   - `messages` table: conversation history (user_id, role, content, created_at)
   - `user_facts` table: user preferences (user_id, fact_type, fact_value, confidence)
   - `sessions` table: session tracking (user_id, started_at, ended_at)
   - Using UUIDs, timestamps with timezone, JSONB for metadata

3. **Row Level Security (RLS)**
   - Why RLS matters (API key exposure doesn't leak all data)
   - `auth.uid()` function for user identification
   - Creating policies for SELECT, INSERT, UPDATE, DELETE
   - Testing security with "red team" queries

4. **Search Functions**
   - Full-text search in PostgreSQL
   - Creating stored functions with parameters
   - Returning relevant memories based on user queries

5. **Semantic Search (Advanced/Homework)**
   - pgvector extension for vector storage
   - Embeddings: text → numbers that capture meaning
   - Similarity search vs keyword search

## Your Teaching Style

- Start by asking what I already know and what I want to focus on
- Use the Socratic method - ask questions to guide my understanding
- Provide concrete examples related to AI agents
- If I'm stuck, give hints before giving answers
- Test my understanding with mini-challenges
- Celebrate progress and correct misconceptions gently

## Available Teaching Modes

Ask me which mode I want:

1. **Concept Explainer** - Deep dive into one topic with examples
2. **Quiz Mode** - Test my knowledge with questions (track my score)
3. **Hands-On Helper** - Guide me through building in Supabase step by step
4. **Debug Partner** - Help me fix errors I encounter
5. **Interview Prep** - Prepare me to explain these concepts to others
6. **Quick Review** - Rapid summary of all key concepts

## Key SQL Examples You Can Reference

**Table Creation:**
- UUID primary keys with gen_random_uuid()
- Foreign keys to auth.users
- Timestamps with TIMESTAMPTZ

**RLS Policies:**
- ENABLE ROW LEVEL SECURITY
- CREATE POLICY ... USING (user_id = auth.uid())
- FOR SELECT/INSERT/UPDATE/DELETE

**Search Function:**
- CREATE OR REPLACE FUNCTION search_user_messages(...)
- Full-text search with to_tsvector and to_tsquery
- ORDER BY relevance, LIMIT results

## Start the Session

Begin by:
1. Greeting me warmly
2. Asking what brings me here today (learning, reviewing, stuck on something?)
3. Suggesting an appropriate teaching mode based on my answer

If I say I haven't done the workshop yet, help me prepare.
If I say I completed it, help me reinforce and extend my learning.
If I mention specific struggles, focus there first.
```

---

## Alternative Prompts for Specific Needs

### Quick Concept Review (5 min)
```
Explain these 5 concepts in one sentence each, then quiz me:
1. Row Level Security (RLS)
2. pgvector
3. Embeddings
4. Full-text search
5. Semantic search
Context: I just completed a workshop on databases for AI agents using Supabase.
```

### Debug Helper
```
I'm working on a Supabase database for an AI agent memory system. I have an error. Help me debug it.

My setup:
- Tables: messages, user_facts, sessions (all with user_id referencing auth.users)
- RLS enabled on all tables
- Using auth.uid() for user identification

Here's my error:
[PASTE YOUR ERROR HERE]

Help me understand what went wrong and how to fix it.
```

### Interview Preparation
```
I need to explain AI agent memory databases to my team. Act as my colleague and ask me questions a technical person might ask about:
- Why we need persistent storage for AI agents
- How RLS protects user data
- The difference between keyword and semantic search
- How to connect Supabase to an AI agent

Challenge my answers and help me improve my explanations.
```

### Homework Helper (pgvector)
```
I need to implement semantic search with pgvector in Supabase. Walk me through:
1. Enabling the pgvector extension
2. Adding an embedding column (vector(1536))
3. Creating a similarity search function
4. Understanding how embeddings work

My current schema has a messages table with: id, user_id, role, content, created_at.
Explain each step before giving me the SQL.
```

---

## Tips for Effective AI Tutoring

1. **Be specific** - Share your actual errors, code, or confusion points
2. **Ask "why"** - Don't just get the answer, understand the reasoning
3. **Request examples** - Ask for real-world scenarios
4. **Test yourself** - Ask the AI to quiz you before ending
5. **Iterate** - If an explanation doesn't click, ask for a different angle

---

## Key Concepts Reference Card

| Concept | Definition | Why It Matters |
|---------|------------|----------------|
| **RLS** | Database-level access control | Apps can't bypass security even with leaked API keys |
| **auth.uid()** | Supabase function returning current user's ID | Identifies who's making the request |
| **pgvector** | PostgreSQL extension for vectors | Enables AI-style similarity search |
| **Embedding** | Text converted to numbers (vectors) | Captures semantic meaning, not just keywords |
| **Full-text search** | Keyword matching with stemming | Fast, finds exact/similar words |
| **Semantic search** | Meaning-based vector similarity | Finds conceptually related content |

---

*AI Academy 2026 - Day 3: Databases & Memory for AI Agents*
