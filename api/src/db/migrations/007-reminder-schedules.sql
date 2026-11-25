CREATE TABLE IF NOT EXISTS reminder_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_id UUID NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
    local_time TIME NOT NULL,
    days_of_week SMALLINT[] NOT NULL,
    enabled BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT reminder_schedules_days_nonempty CHECK (cardinality(days_of_week) BETWEEN 1 AND 7),
    CONSTRAINT reminder_schedules_days_range CHECK (days_of_week <@ ARRAY[1,2,3,4,5,6,7]::SMALLINT[])
);

CREATE INDEX IF NOT EXISTS reminder_schedules_goal_id_idx ON reminder_schedules(goal_id);
