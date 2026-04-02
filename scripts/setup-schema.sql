-- =============================================================================
-- AI Academy 2026 - Assessment Module Schema
-- =============================================================================
-- Run this file in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).
-- It is safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT guards.
--
-- Tables created:
--   1. assessments       - one row per weekly assessment definition
--   2. student_scores    - individual student grading records
--
-- Also sets up:
--   - Row Level Security (RLS) policies
--   - Performance indexes
--   - Seed data for Week 1 and Week 2
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. ASSESSMENTS - weekly assessment definitions
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS assessments (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  week_number     INT  NOT NULL CHECK (week_number BETWEEN 1 AND 5),
  title           TEXT NOT NULL,
  max_score       INT  DEFAULT 100,
  bonus_points    INT  DEFAULT 0,
  pass_threshold  INT  DEFAULT 70,
  status          TEXT DEFAULT 'draft'
                       CHECK (status IN ('draft', 'active', 'finalized')),
  rubric          JSONB NOT NULL,
  created_at      TIMESTAMPTZ DEFAULT now(),

  UNIQUE (week_number)
);

COMMENT ON TABLE  assessments IS 'Weekly assessment definitions with rubrics for the AI Academy 2026 programme.';
COMMENT ON COLUMN assessments.rubric IS 'JSON array of {category, max_points, description} objects defining the grading rubric.';
COMMENT ON COLUMN assessments.status IS 'Lifecycle: draft -> active (students can be graded) -> finalized (scores locked).';


-- ---------------------------------------------------------------------------
-- 2. STUDENT_SCORES - per-student grading records
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS student_scores (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id    UUID NOT NULL REFERENCES assessments(id) ON DELETE CASCADE,
  student_email    TEXT NOT NULL,
  student_name     TEXT,
  role_track       TEXT,
  category_scores  JSONB,
  total_score      INT,
  bonus            INT  DEFAULT 0,
  passed           BOOLEAN,
  feedback_text    TEXT,
  raw_answers      JSONB,
  status           TEXT DEFAULT 'pending'
                        CHECK (status IN ('pending', 'ai_draft', 'reviewed', 'finalized')),
  graded_by        TEXT DEFAULT 'manual'
                        CHECK (graded_by IN ('ai', 'manual', 'ai+review')),
  graded_at        TIMESTAMPTZ,
  created_at       TIMESTAMPTZ DEFAULT now(),

  UNIQUE (assessment_id, student_email)
);

COMMENT ON TABLE  student_scores IS 'Individual student assessment scores, supporting AI-assisted and manual grading workflows.';
COMMENT ON COLUMN student_scores.category_scores IS 'JSON object mapping rubric categories to awarded points, e.g. {"Pattern Selection": 22, "Governance": 20}.';
COMMENT ON COLUMN student_scores.status IS 'Grading lifecycle: pending -> ai_draft (AI scored) -> reviewed (lector verified) -> finalized (visible to student).';
COMMENT ON COLUMN student_scores.graded_by IS 'Who produced the score: ai = fully automated, manual = lector only, ai+review = AI draft reviewed by lector.';
COMMENT ON COLUMN student_scores.raw_answers IS 'Optional: original student submission data for audit trail.';


-- ---------------------------------------------------------------------------
-- 3. INDEXES for common query patterns
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_student_scores_email
  ON student_scores (student_email);

CREATE INDEX IF NOT EXISTS idx_student_scores_assessment
  ON student_scores (assessment_id);

CREATE INDEX IF NOT EXISTS idx_student_scores_status
  ON student_scores (status);


-- ---------------------------------------------------------------------------
-- 4. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------------

-- Enable RLS on both tables
ALTER TABLE assessments    ENABLE ROW LEVEL SECURITY;
ALTER TABLE student_scores ENABLE ROW LEVEL SECURITY;

-- 4a. assessments: any authenticated user can read assessment definitions
DROP POLICY IF EXISTS "Authenticated users can read assessments" ON assessments;
CREATE POLICY "Authenticated users can read assessments"
  ON assessments
  FOR SELECT
  TO authenticated
  USING (true);

-- 4b. student_scores: students can only see their own finalized scores
--     (email from auth.jwt() must match student_email, and score must be finalized)
DROP POLICY IF EXISTS "Students can read own finalized scores" ON student_scores;
CREATE POLICY "Students can read own finalized scores"
  ON student_scores
  FOR SELECT
  TO authenticated
  USING (
    student_email = (auth.jwt() ->> 'email')
    AND status = 'finalized'
  );

-- 4c. Service-role bypass: Supabase service_role key bypasses RLS by default,
--     so lector API endpoints using the service key have full access.
--     No additional policy is needed for admin/lector write operations.


-- ---------------------------------------------------------------------------
-- 5. SEED DATA - Week 1 and Week 2 assessment definitions
-- ---------------------------------------------------------------------------

-- Week 1: AI Strategy & Enterprise Architecture (100 pts + 5 bonus)
INSERT INTO assessments (week_number, title, max_score, bonus_points, pass_threshold, status, rubric)
VALUES (
  1,
  'Week 1 - AI Strategy & Enterprise Architecture',
  100,
  5,
  70,
  'draft',
  '[
    {
      "category": "Pattern Selection",
      "max_points": 25,
      "description": "Correct identification and justification of AI integration patterns for the given enterprise scenario."
    },
    {
      "category": "Governance",
      "max_points": 25,
      "description": "Quality of proposed governance framework including roles, review cadence, and escalation paths."
    },
    {
      "category": "Architecture",
      "max_points": 20,
      "description": "Technical architecture design covering data flow, model serving, and integration with existing systems."
    },
    {
      "category": "Security",
      "max_points": 15,
      "description": "Security considerations including data privacy, model access controls, and threat mitigation."
    },
    {
      "category": "Prototype",
      "max_points": 15,
      "description": "Working prototype or detailed prototype plan demonstrating the proposed solution."
    }
  ]'::jsonb
)
ON CONFLICT (week_number) DO UPDATE SET
  title          = EXCLUDED.title,
  max_score      = EXCLUDED.max_score,
  bonus_points   = EXCLUDED.bonus_points,
  pass_threshold = EXCLUDED.pass_threshold,
  rubric         = EXCLUDED.rubric;

-- Week 2: AI Governance, Compliance & Security (100 pts, no bonus)
INSERT INTO assessments (week_number, title, max_score, bonus_points, pass_threshold, status, rubric)
VALUES (
  2,
  'Week 2 - AI Governance, Compliance & Security',
  100,
  0,
  70,
  'draft',
  '[
    {
      "category": "KAF Mapping",
      "max_points": 12,
      "description": "Accurate mapping of scenario components to Kyndryl AI Factory layers and services."
    },
    {
      "category": "Policy-as-Code",
      "max_points": 10,
      "description": "Quality of policy-as-code implementation covering model deployment guardrails."
    },
    {
      "category": "Bounded Agent vs Chatbot",
      "max_points": 8,
      "description": "Clear differentiation between bounded AI agents and simple chatbots with correct use-case alignment."
    },
    {
      "category": "EU AI Act Classification",
      "max_points": 10,
      "description": "Correct risk-tier classification of given AI systems under the EU AI Act framework."
    },
    {
      "category": "Risk Justification",
      "max_points": 8,
      "description": "Thorough justification of risk ratings with supporting evidence and regulatory references."
    },
    {
      "category": "Compliance Obligations",
      "max_points": 10,
      "description": "Identification of applicable compliance obligations and proposed implementation measures."
    },
    {
      "category": "AI Literacy Plan",
      "max_points": 10,
      "description": "Structured AI literacy training plan covering stakeholder groups, content, and delivery timeline."
    },
    {
      "category": "OWASP Top 10 Threats",
      "max_points": 12,
      "description": "Identification and mitigation strategies for relevant OWASP Top 10 for LLM threats."
    },
    {
      "category": "HealthCare Audit Exercise",
      "max_points": 10,
      "description": "Completeness and accuracy of the healthcare AI system audit exercise."
    },
    {
      "category": "Golden Dataset",
      "max_points": 10,
      "description": "Quality of golden dataset design including test cases, edge cases, and evaluation criteria."
    }
  ]'::jsonb
)
ON CONFLICT (week_number) DO UPDATE SET
  title          = EXCLUDED.title,
  max_score      = EXCLUDED.max_score,
  bonus_points   = EXCLUDED.bonus_points,
  pass_threshold = EXCLUDED.pass_threshold,
  rubric         = EXCLUDED.rubric;


-- ---------------------------------------------------------------------------
-- Verification: run after execution to confirm everything is in place
-- ---------------------------------------------------------------------------
-- SELECT * FROM assessments ORDER BY week_number;
-- SELECT count(*) FROM information_schema.tables WHERE table_name IN ('assessments', 'student_scores');
