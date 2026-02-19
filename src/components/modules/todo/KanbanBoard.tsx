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
    { id: 'in_progress', title: 'In Progress' },
    { id: 'done', title: 'Done' },
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
            activationConstraint: {
                distance: 5, // Prevent accidental drags
            },
        }),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    )

    // Memoized validation to avoid crashes
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
        // Sort by position within each column
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

        // Dropped over a column (empty area)
        const isOverColumn = COLUMNS.some((c) => c.id === overId)
        if (isOverColumn) {
            const newStatus = overId as TodoStatus
            if (activeTask.status !== newStatus) {
                // Moved to empty column
                updateBatch.mutate([
                    { id: activeId, status: newStatus, position: 0 } // Or max pos
                ])
            }
            setActiveId(null)
            return
        }

        // Dropped over another task
        if (activeId !== overId && overTask) {
            const activeColumn = activeTask.status
            const overColumn = overTask.status

            if (activeColumn === overColumn) {
                // Reorder within same column
                const currentColumnTasks = columns[activeColumn]
                const oldIndex = currentColumnTasks.findIndex(t => t.id === activeId)
                const newIndex = currentColumnTasks.findIndex(t => t.id === overId)

                // Calculate interactions
                // For simplicity, we can just update the dragged item's position to swap?
                // Or re-index the whole array segment.
                // SOTA way: re-index locally then push batch.

                const newOrder = arrayMove(currentColumnTasks, oldIndex, newIndex)
                const updates = newOrder.map((t, index) => ({
                    id: t.id,
                    position: index,
                }))

                // Optimistic UI handled by dnd-kit visually, but we push updates
                updateBatch.mutate(updates)
            } else {
                // Moved to different column over a task
                // Update status AND position
                // We'd ideally want to insert at specific index, but simpler to just append or insert at 'over' pos

                // For now, let's just update status to moving column
                updateBatch.mutate([
                    { id: activeId, status: overColumn, position: overTask.position }
                    // Note: We should shift others down, but for MVP simpler logic is acceptable
                ])
            }
        }

        setActiveId(null)
    }

    const dropAnimation = {
        sideEffects: defaultDropAnimationSideEffects({
            styles: {
                active: {
                    opacity: '0.5',
                },
            },
        }),
    }

    return (
        <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
        >
            <div className="flex h-full gap-6 overflow-x-auto pb-4">
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
