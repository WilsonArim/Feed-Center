-- Migration: Link Financial Entries to Projects (Todo Lists of type 'project')

-- 1. Add project_id column to financial_entries
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_entries' AND column_name = 'project_id') THEN
        ALTER TABLE financial_entries ADD COLUMN project_id UUID REFERENCES todo_lists(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 2. Create index for faster lookups by project
CREATE INDEX IF NOT EXISTS idx_financial_entries_project ON financial_entries(project_id);

-- 3. Update RLS (Policies usually cover "user_id", so adding a column doesn't break them, 
--    but we verify if we need specific rules for projects. 
--    Current policies are based on user_id, which is fine as projects belong to users).
