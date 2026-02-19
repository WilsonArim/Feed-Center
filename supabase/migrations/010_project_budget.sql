-- Migration: Add Budget to Todo Lists (Projects)

-- 1. Add budget column to todo_lists
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todo_lists' AND column_name = 'budget') THEN
        ALTER TABLE todo_lists ADD COLUMN budget NUMERIC(12, 2) DEFAULT 0;
    END IF;
END $$;
