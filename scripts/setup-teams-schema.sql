-- =============================================================================
-- AI Academy 2026 - Mission Control Team Boards Schema
-- =============================================================================
-- Run this file in the Supabase SQL Editor (Dashboard > SQL Editor > New Query).
-- It is safe to re-run: all statements use IF NOT EXISTS / ON CONFLICT guards.
--
-- Tables created:
--   1. team_members    - student-to-team assignment
--   2. role_status     - per-role G/Y/R status cards
--   3. dependencies    - 7x7 dependency map entries
--   4. team_summary    - AI-PM confirmed team summary
--   5. peer_reviews    - cross-team review feedback
--   6. milestones      - gamification milestone tracking
-- =============================================================================


-- ---------------------------------------------------------------------------
-- 1. TEAM MEMBERS
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS team_members (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  TEXT NOT NULL UNIQUE,
  team        TEXT NOT NULL CHECK (team IN ('alpha', 'bravo', 'charlie', 'delta')),
  role        TEXT CHECK (role IN ('FDE', 'AI-SE', 'AI-DS', 'AI-DA', 'AI-PM', 'AI-FE', 'AI-SEC')),
  joined_at   TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE team_members IS 'Maps each student to one of 4 hackathon teams (Alpha/Bravo/Charlie/Delta).';


-- ---------------------------------------------------------------------------
-- 2. ROLE STATUS (one row per team+role, upserted on save)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS role_status (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team        TEXT NOT NULL,
  role        TEXT NOT NULL,
  status      TEXT NOT NULL CHECK (status IN ('green', 'yellow', 'red')),
  has_items   TEXT,
  needs_items TEXT,
  ragas_score NUMERIC(3,2),
  top_blocker TEXT,
  confidence  INTEGER CHECK (confidence BETWEEN 1 AND 5),
  updated_by  TEXT,
  updated_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team, role)
);

COMMENT ON TABLE role_status IS 'Per-role status card filled by team members during Day 20 retro.';


-- ---------------------------------------------------------------------------
-- 3. DEPENDENCIES (7×7 grid entries)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS dependencies (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team        TEXT NOT NULL,
  from_role   TEXT NOT NULL,
  to_role     TEXT NOT NULL,
  description TEXT NOT NULL,
  created_by  TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team, from_role, to_role)
);

COMMENT ON TABLE dependencies IS 'Cross-role dependency map entries: from_role needs something from to_role.';


-- ---------------------------------------------------------------------------
-- 4. TEAM SUMMARY (confirmed by AI-PM)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS team_summary (
  id                UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team              TEXT NOT NULL UNIQUE,
  summary_text      TEXT NOT NULL,
  top_dependencies  JSONB,
  team_confidence   NUMERIC(2,1),
  confirmed_by      TEXT,
  confirmed_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE team_summary IS 'Synthesized team status summary, authored and confirmed by AI-PM role.';


-- ---------------------------------------------------------------------------
-- 5. PEER REVIEWS (cross-team feedback)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS peer_reviews (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_team       TEXT NOT NULL,
  to_team         TEXT NOT NULL,
  reviewer_email  TEXT NOT NULL,
  green_honest    BOOLEAN,
  green_comment   TEXT,
  missing_deps    TEXT,
  monday_priority TEXT,
  created_at      TIMESTAMPTZ DEFAULT NOW()
);

COMMENT ON TABLE peer_reviews IS 'Cross-team peer review: structured feedback from one team about another.';


-- ---------------------------------------------------------------------------
-- 6. MILESTONES (cooperative gamification)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS milestones (
  id            UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  team          TEXT NOT NULL,
  milestone_key TEXT NOT NULL,
  unlocked_at   TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(team, milestone_key)
);

COMMENT ON TABLE milestones IS 'Tracks which mission milestones each team has unlocked (cooperative, no inter-team competition).';


-- ---------------------------------------------------------------------------
-- INDEXES
-- ---------------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_team_members_team   ON team_members (team);
CREATE INDEX IF NOT EXISTS idx_role_status_team     ON role_status (team);
CREATE INDEX IF NOT EXISTS idx_dependencies_team    ON dependencies (team);
CREATE INDEX IF NOT EXISTS idx_peer_reviews_to      ON peer_reviews (to_team);
CREATE INDEX IF NOT EXISTS idx_milestones_team      ON milestones (team);


-- ---------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ---------------------------------------------------------------------------

ALTER TABLE team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_status   ENABLE ROW LEVEL SECURITY;
ALTER TABLE dependencies  ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_summary  ENABLE ROW LEVEL SECURITY;
ALTER TABLE peer_reviews  ENABLE ROW LEVEL SECURITY;
ALTER TABLE milestones    ENABLE ROW LEVEL SECURITY;

-- Simplified RLS: all authenticated users can read + write all rows.
-- This is a single-cohort educational app (200 students, same programme).
-- Service-role key bypasses RLS for admin operations.

DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOR tbl IN SELECT unnest(ARRAY[
    'team_members','role_status','dependencies',
    'team_summary','peer_reviews','milestones'
  ])
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS "auth_select_%s" ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "auth_select_%s" ON %I FOR SELECT TO authenticated USING (true)',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "auth_insert_%s" ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "auth_insert_%s" ON %I FOR INSERT TO authenticated WITH CHECK (true)',
      tbl, tbl
    );

    EXECUTE format('DROP POLICY IF EXISTS "auth_update_%s" ON %I', tbl, tbl);
    EXECUTE format(
      'CREATE POLICY "auth_update_%s" ON %I FOR UPDATE TO authenticated USING (true)',
      tbl, tbl
    );
  END LOOP;
END $$;


-- ---------------------------------------------------------------------------
-- REALTIME (enable live subscriptions for interactive boards)
-- ---------------------------------------------------------------------------

ALTER PUBLICATION supabase_realtime ADD TABLE role_status;
ALTER PUBLICATION supabase_realtime ADD TABLE dependencies;
ALTER PUBLICATION supabase_realtime ADD TABLE milestones;
ALTER PUBLICATION supabase_realtime ADD TABLE team_summary;
