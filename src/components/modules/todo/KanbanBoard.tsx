import { useState, useMemo } from 'react'
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimationSideEffects,
    DragStartEvent,
    DragEndEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { TaskCard } from './TaskCard'
import { KanbanColumn } from './KanbanColumn'
import { useTodos, useBatchUpdateTodos } from '@/hooks/useTodos'
import type { Todo, TodoStatus } from '@/types'

const COLUMNS: { id: TodoStatus; title: string }[] = [
    { id: 'todo', title: 'To Do' },
    { id: 'in_progress', title: 'Em Progresso' },
    { id: 'done', title: 'Concluido' },
]

interface KanbanBoardProps {
    listId: string | null
    onEditTask?: (todo: Todo) => void
}

export function KanbanBoard({ listId, onEditTask }: KanbanBoardProps) {
    const { data: todos = [] } = useTodos(listId)
    const updateBatch = useBatchUpdateTodos()

    const [activeId, setActiveId] = useState<string | null>(null)

    const sensors = useSensors(
        useSensor(PointerSensor, {
            activationConstraint: { distance: 5 },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    const validTodos = useMemo(() => Array.isArray(todos) ? todos : [], [todos])

    const columns = useMemo(() => {
        const cols: Record<TodoStatus, Todo[]> = {
            todo: [],
            in_progress: [],
            done: [],
        }
        validTodos.forEach((t) => {
            if (cols[t.status]) {
                cols[t.status].push(t)
            }
        })
        Object.keys(cols).forEach((key) => {
            cols[key as TodoStatus].sort((a, b) => a.position - b.position)
        })
        return cols
    }, [validTodos])

    const activeTodo = useMemo(
        () => validTodos.find((t) => t.id === activeId),
        [activeId, validTodos]
    )

    function handleDragStart(event: DragStartEvent) {
        setActiveId(event.active.id as string)
    }

    function handleDragEnd(event: DragEndEvent) {
        const { active, over } = event

        if (!over) {
            setActiveId(null)
            return
        }

        const activeId = active.id as string
        const overId = over.id as string

        const activeTask = validTodos.find((t) => t.id === activeId)
        const overTask = validTodos.find((t) => t.id === overId)

        if (!activeTask) {
            setActiveId(null)
            return
        }

        const isOverColumn = COLUMNS.some((c) => c.id === overId)
        if (isOverColumn) {
            const newStatus = overId as TodoStatus
            if (activeTask.status !== newStatus) {
                updateBatch.mutate([
                    { id: activeId, status: newStatus, position: 0 }
                ])
            }
            setActiveId(null)
            return
        }

        if (activeId !== overId && overTask) {
            const activeColumn = activeTask.status
            const overColumn = overTask.status

            if (activeColumn === overColumn) {
                const currentColumnTasks = columns[activeColumn]
                const oldIndex = currentColumnTasks.findIndex(t => t.id === activeId)
                const newIndex = currentColumnTasks.findIndex(t => t.id === overId)

                const newOrder = arrayMove(currentColumnTasks, oldIndex, newIndex)
                const updates = newOrder.map((t, index) => ({
                    id: t.id,
                    position: index,
                }))

                updateBatch.mutate(updates)
            } else {
                updateBatch.mutate([
                    { id: activeId, status: overColumn, position: overTask.position }
                ])
            }
        }

        setActiveId(null)
    }

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: { active: { opacity: '0.5' } },
        }),
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-5 overflow-x-auto pb-4 px-1">
                {COLUMNS.map((col) => (
                    <KanbanColumn
                        key={col.id}
                        id={col.id}
                        title={col.title}
                        todos={columns[col.id]}
                        onEditTask={onEditTask || (() => { })}
                    />
                ))}
            </div>

            <DragOverlay dropAnimation={dropAnimation}>
                {activeTodo ? <TaskCard todo={activeTodo} isOverlay /> : null}
            </DragOverlay>
        </DndContext>
    )
}
