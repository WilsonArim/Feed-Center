import { useMemo } from 'react'
import { useTodos } from './useTodos'

export interface Notification {
    id: string
    title: string
    message: string
    type: 'warning' | 'info'
    date: string
}

export function useNotifications() {
    const { data: todos } = useTodos()

    const notifications = useMemo(() => {
        if (!todos) return []

        const now = new Date()
        const threeDaysFromNow = new Date(now)
        threeDaysFromNow.setDate(threeDaysFromNow.getDate() + 3)

        const result: Notification[] = []

        for (const todo of todos) {
            if (todo.status === 'done' || !todo.due_date) continue

            const dueDate = new Date(todo.due_date)
            const isOverdue = dueDate < now
            const isDueSoon = dueDate <= threeDaysFromNow

            if (isOverdue) {
                result.push({
                    id: `overdue-${todo.id}`,
                    title: todo.title,
                    message: `Atrasada — venceu ${dueDate.toLocaleDateString('pt-PT')}`,
                    type: 'warning',
                    date: todo.due_date,
                })
            } else if (isDueSoon) {
                const diffDays = Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
                result.push({
                    id: `due-${todo.id}`,
                    title: todo.title,
                    message: diffDays === 0 ? 'Vence hoje!' : `Vence em ${diffDays} dia${diffDays > 1 ? 's' : ''}`,
                    type: diffDays === 0 ? 'warning' : 'info',
                    date: todo.due_date,
                })
            }
        }

        return result.sort((a, b) => a.date.localeCompare(b.date))
    }, [todos])

    return {
        notifications,
        unreadCount: notifications.length,
        hasNotifications: notifications.length > 0,
    }
}
