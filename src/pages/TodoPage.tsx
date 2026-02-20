import { useState, useEffect } from 'react'
import { Plus, CheckSquare, CircleDollarSign } from 'lucide-react'
import { KanbanBoard } from '@/components/modules/todo/KanbanBoard'
import { AddTodoModal } from '@/components/modules/todo/AddTodoModal'
import { CreateListModal } from '@/components/modules/todo/CreateListModal'
import { TodoSidebar } from '@/components/modules/todo/TodoSidebar'
import { StardustButton } from '@/components/ui/StardustButton'
import {
    useCreateTodo,
    useUpdateTodo,
    useTodoLists,
    useCreateTodoList,
    useDeleteTodoList
} from '@/hooks/useTodos'
import type { CreateTodoInput, UpdateTodoInput, Todo, CreateListInput } from '@/types'
import { ProjectFinanceView } from '@/components/modules/project/ProjectFinanceView'
import { TodoStatsBar } from '@/components/modules/todo/TodoStatsBar'
import { NextActionsStrip, PageHeader } from '@/components/core/PagePrimitives'

export function TodoPage() {
    const [activeListId, setActiveListId] = useState<string | null>(null)
    const [isListModalOpen, setIsListModalOpen] = useState(false)
    const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)
    const [editingTodo, setEditingTodo] = useState<Todo | null>(null)
    const [activeTab, setActiveTab] = useState<'tasks' | 'finance'>('tasks')

    const { data: lists = [] } = useTodoLists()
    const createTodo = useCreateTodo()
    const updateTodo = useUpdateTodo()
    const createList = useCreateTodoList()
    const deleteList = useDeleteTodoList()

    useEffect(() => {
        setActiveTab('tasks')
    }, [activeListId])

    const activeList = activeListId ? lists.find(l => l.id === activeListId) : null
    const pageTitle = activeList ? activeList.title : 'Inbox'
    const pageSubtitle = activeListId
        ? 'Executa com foco: escolhe a proxima tarefa de maior impacto.'
        : 'Captura prioridades e transforma intencao em entrega.'

    const handleCreateList = async (data: CreateListInput) => {
        await createList.mutateAsync(data)
        setIsListModalOpen(false)
    }

    const handleDeleteList = async (id: string) => {
        await deleteList.mutateAsync(id)
        if (activeListId === id) {
            setActiveListId(null)
        }
    }

    const handleCreateTask = async (data: CreateTodoInput) => {
        await createTodo.mutateAsync({
            ...data,
            list_id: activeListId ?? undefined
        })
        setIsTaskModalOpen(false)
    }

    const handleUpdateTask = async (data: UpdateTodoInput) => {
        await updateTodo.mutateAsync(data)
        setIsTaskModalOpen(false)
        setEditingTodo(null)
    }

    return (
        <div className="flex h-full">
            <TodoSidebar
                lists={lists}
                activeListId={activeListId}
                onSelect={setActiveListId}
                onCreateList={() => setIsListModalOpen(true)}
                onDeleteList={handleDeleteList}
            />

            <div className="flex-1 flex flex-col min-w-0 bg-[var(--color-bg-primary)]">
                {/* Header */}
                <div className="px-6 md:px-8 py-5 border-b border-[var(--border-subtle)] bg-[var(--bg-deep)]/50 backdrop-blur-sm z-10">
                    <PageHeader
                        icon={<CheckSquare size={18} />}
                        title={pageTitle}
                        subtitle={pageSubtitle}
                        actions={(
                            <StardustButton
                                onClick={() => {
                                    setEditingTodo(null)
                                    setIsTaskModalOpen(true)
                                }}
                                icon={<Plus size={16} />}
                            >
                                Nova Tarefa
                            </StardustButton>
                        )}
                    />

                    {activeList?.type === 'project' && (
                        <div className="flex items-center gap-1 mt-4 bg-[var(--color-bg-tertiary)] p-1 rounded-xl w-fit border border-[var(--color-border)]">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                                    activeTab === 'tasks'
                                        ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                <CheckSquare size={14} />
                                Tarefas
                            </button>
                            <button
                                onClick={() => setActiveTab('finance')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${
                                    activeTab === 'finance'
                                        ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                        : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                }`}
                            >
                                <CircleDollarSign size={14} />
                                Financas
                            </button>
                        </div>
                    )}
                </div>

                {/* Stats Bar */}
                <div className="px-6 md:px-8 py-4 border-b border-[var(--color-border)]">
                    <TodoStatsBar />
                </div>

                <div className="px-6 md:px-8 pt-5 pb-1">
                    <NextActionsStrip
                        title="Ritual recomendado: definir 1 tarefa critica, 1 de manutencao e 1 de crescimento."
                        actions={[
                            { label: 'Criar tarefa', to: '/todo' },
                            { label: 'Ligar a financeiro', to: '/financeiro' },
                            { label: 'Voltar ao dashboard', to: '/' },
                        ]}
                    />
                </div>

                {/* Main View Area */}
                <div className="flex-1 min-h-0 overflow-auto p-6">
                    {activeTab === 'tasks' ? (
                        <KanbanBoard
                            listId={activeListId}
                            onEditTask={(todo) => {
                                setEditingTodo(todo)
                                setIsTaskModalOpen(true)
                            }}
                        />
                    ) : (
                        activeList && (
                            <ProjectFinanceView
                                projectId={activeList.id}
                                budget={activeList.budget ?? 0}
                            />
                        )
                    )}
                </div>
            </div>

            {/* Modals */}
            <AddTodoModal
                isOpen={isTaskModalOpen}
                onClose={() => {
                    setIsTaskModalOpen(false)
                    setEditingTodo(null)
                }}
                onSubmit={(data) => {
                    if ('id' in data) {
                        handleUpdateTask(data as UpdateTodoInput)
                    } else {
                        handleCreateTask(data as CreateTodoInput)
                    }
                }}
                isLoading={createTodo.isPending || updateTodo.isPending}
                editingTodo={editingTodo}
            />

            <CreateListModal
                isOpen={isListModalOpen}
                onClose={() => setIsListModalOpen(false)}
                onSubmit={handleCreateList}
                isLoading={createList.isPending}
            />
        </div>
    )
}
