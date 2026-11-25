ALTER TABLE goals ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

CREATE TABLE IF NOT EXISTS goal_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    version_number INTEGER NOT NULL,
    target NUMERIC(10, 2) NOT NULL CHECK (target > 0),
    end_date DATE NOT NULL,
    effective_date DATE NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_goal_version UNIQUE (goal_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_goal_revisions_goal_id ON goal_revisions(goal_id);
