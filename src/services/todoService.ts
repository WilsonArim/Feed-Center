import { supabase } from '@/lib/supabase'
import type { Todo, TodoList, CreateTodoInput, CreateListInput } from '@/types'

export const todoService = {
    async getLists(userId: string): Promise<TodoList[]> {
        const { data, error } = await supabase
            .from('todo_lists')
            .select('*')
            .eq('user_id', userId)
            .order('position', { ascending: true })
            .order('created_at', { ascending: true })

        if (error) throw error
        return (data ?? []) as TodoList[]
    },

    async createList(userId: string, input: CreateListInput): Promise<TodoList> {
        const { data, error } = await supabase
            .from('todo_lists')
            .insert({
                user_id: userId,
                ...input,
            })
            .select()
            .single()

        if (error) throw error
        return data as TodoList
    },

    async deleteList(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('todo_lists')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error
    },

    async getTodos(userId: string, listId: string | null = null): Promise<Todo[]> {
        let query = supabase
            .from('todos')
            .select('*')
            .eq('user_id', userId)

        if (listId) {
            query = query.eq('list_id', listId)
        } else {
            // Inbox (list_id is null)
            query = query.is('list_id', null)
        }

        const { data, error } = await query
            .order('position', { ascending: true })
            .order('created_at', { ascending: false })

        if (error) throw error
        return (data ?? []) as Todo[]
    },

    async createTodo(userId: string, input: CreateTodoInput): Promise<Todo> {
        const { data, error } = await supabase
            .from('todos')
            .insert({
                user_id: userId,
                ...input,
            })
            .select()
            .single()

        if (error) throw error
        return data as Todo
    },

    async updateTodo(id: string, userId: string, input: Partial<CreateTodoInput>): Promise<Todo> {
        const { data, error } = await supabase
            .from('todos')
            .update(input)
            .eq('id', id)
            .eq('user_id', userId)
            .select()
            .single()

        if (error) throw error
        return data as Todo
    },

    async deleteTodo(id: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('todos')
            .delete()
            .eq('id', id)
            .eq('user_id', userId)

        if (error) throw error
    },

    async updateBatch(userId: string, updates: { id: string; position?: number; status?: string }[]): Promise<void> {
        const promises = updates.map(u =>
            supabase
                .from('todos')
                .update(u)
                .eq('id', u.id)
                .eq('user_id', userId)
        )

        await Promise.all(promises)
    },
}
