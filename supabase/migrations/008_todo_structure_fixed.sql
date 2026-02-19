-- FIXED Idempotent Migration: Todo Structure (Lists & Projects)

-- 1. Create todo_lists table if it doesn't exist
CREATE TABLE IF NOT EXISTS todo_lists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users NOT NULL,
    title TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'list' CHECK (type IN ('list', 'project')),
    color TEXT DEFAULT '#888888',
    icon TEXT,
    position INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE todo_lists ENABLE ROW LEVEL SECURITY;

-- 2. Safely recreate policies (Drop first to avoid "policy already exists" error)
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view their own lists" ON todo_lists;
    DROP POLICY IF EXISTS "Users can create their own lists" ON todo_lists;
    DROP POLICY IF EXISTS "Users can update their own lists" ON todo_lists;
    DROP POLICY IF EXISTS "Users can delete their own lists" ON todo_lists;
END $$;

CREATE POLICY "Users can view their own lists" ON todo_lists FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create their own lists" ON todo_lists FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own lists" ON todo_lists FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own lists" ON todo_lists FOR DELETE USING (auth.uid() = user_id);

-- 3. Add list_id to todos safely (Check if column exists first)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'todos' AND column_name = 'list_id') THEN
        ALTER TABLE todos ADD COLUMN list_id UUID REFERENCES todo_lists(id) ON DELETE SET NULL;
    END IF;
END $$;

-- 4. Create indexes safely
CREATE INDEX IF NOT EXISTS idx_todos_list_id ON todos(list_id);
CREATE INDEX IF NOT EXISTS idx_todo_lists_user_id ON todo_lists(user_id);
