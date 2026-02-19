import { useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { todoService } from '@/services/todoService'
import type { CreateTodoInput, UpdateTodoInput, CreateListInput } from '@/types'
import { useAuth } from '@/components/core/AuthProvider'

const TODOS_KEY = ['todos'] as const
const LISTS_KEY = ['todo_lists'] as const

export function useTodos(listId: string | null = null) {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // Realtime Subscription
    useEffect(() => {
        if (!user) return

        const channel = supabase
            .channel('todo-changes')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'todos',
                    filter: `user_id=eq.${user.id}`,
                },
                () => {
                    queryClient.invalidateQueries({ queryKey: TODOS_KEY })
                }
            )
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [user, queryClient])

    return useQuery({
        queryKey: [...TODOS_KEY, user?.id, listId],
        queryFn: () => todoService.getTodos(user!.id, listId),
        enabled: !!user,
    })
}

export function useTodoLists() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    // Realtime Subscription for Lists
    useEffect(() => {
        if (!user) return
        const channel = supabase
            .channel('list-changes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'todo_lists', filter: `user_id=eq.${user.id}` }, () => {
                queryClient.invalidateQueries({ queryKey: LISTS_KEY })
            })
            .subscribe()
        return () => { supabase.removeChannel(channel) }
    }, [user, queryClient])

    return useQuery({
        queryKey: [...LISTS_KEY, user?.id],
        queryFn: () => todoService.getLists(user!.id),
        enabled: !!user,
    })
}

export function useCreateTodoList() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (input: CreateListInput) => todoService.createList(user!.id, input),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY })
    })
}

export function useDeleteTodoList() {
    const { user } = useAuth()
    const queryClient = useQueryClient()
    return useMutation({
        mutationFn: (id: string) => todoService.deleteList(id, user!.id),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: LISTS_KEY })
    })
}

export function useCreateTodo() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (input: CreateTodoInput) => todoService.createTodo(user!.id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TODOS_KEY })
        },
    })
}

export function useUpdateTodo() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: ({ id, ...input }: UpdateTodoInput & { id: string }) =>
            todoService.updateTodo(id, user!.id, input),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TODOS_KEY })
        },
    })
}

export function useDeleteTodo() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (id: string) => todoService.deleteTodo(id, user!.id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TODOS_KEY })
        },
    })
}

export function useBatchUpdateTodos() {
    const { user } = useAuth()
    const queryClient = useQueryClient()

    return useMutation({
        mutationFn: (updates: { id: string; position?: number; status?: string }[]) =>
            todoService.updateBatch(user!.id, updates),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: TODOS_KEY })
        },
    })
}
