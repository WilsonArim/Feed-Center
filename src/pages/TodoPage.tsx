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
import { useLocaleText } from '@/i18n/useLocaleText'

export function TodoPage() {
    const { txt } = useLocaleText()
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
    const pageTitle = activeList ? activeList.title : txt('Inbox', 'Inbox')
    const pageSubtitle = activeListId
        ? txt('Executa com foco: escolhe a proxima tarefa de maior impacto.', 'Execute with focus: choose the next highest-impact task.')
        : txt('Captura prioridades e transforma intencao em entrega.', 'Capture priorities and turn intent into delivery.')

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
        <div className="flex w-full h-[100dvh] overflow-hidden bg-transparent">
            <TodoSidebar
                lists={lists}
                activeListId={activeListId}
                onSelect={setActiveListId}
                onCreateList={() => setIsListModalOpen(true)}
                onDeleteList={handleDeleteList}
            />

            <div className="flex-1 flex flex-col min-w-0 pr-6 pb-24 relative">
                {/* Header - Typography First */}
                <div className="px-6 md:px-8 py-5 bg-transparent z-10">
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
                                {txt('Nova Tarefa', 'New Task')}
                            </StardustButton>
                        )}
                    />

                    {activeList?.type === 'project' && (
                        <div className="flex items-center gap-1 mt-4 bg-[var(--color-bg-tertiary)] p-1 rounded-xl w-fit border border-[var(--color-border)]">
                            <button
                                onClick={() => setActiveTab('tasks')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'tasks'
                                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    }`}
                            >
                                <CheckSquare size={14} />
                                {txt('Tarefas', 'Tasks')}
                            </button>
                            <button
                                onClick={() => setActiveTab('finance')}
                                className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-2 transition-all cursor-pointer ${activeTab === 'finance'
                                    ? 'bg-[var(--color-accent)] text-white shadow-sm'
                                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)]'
                                    }`}
                            >
                                <CircleDollarSign size={14} />
                                {txt('Financas', 'Finance')}
                            </button>
                        </div>
                    )}
                </div>

                <div className="px-6 md:px-8 py-4 mt-8">
                    <TodoStatsBar />
                </div>

                <div className="px-6 md:px-8 pt-2 pb-1">
                    <NextActionsStrip
                        title={txt('Ritual recomendado: definir 1 tarefa critica, 1 de manutencao e 1 de crescimento.', 'Recommended ritual: define 1 critical task, 1 maintenance task, and 1 growth task.')}
                        actions={[
                            { label: txt('Criar tarefa', 'Create task'), to: '/todo' },
                            { label: txt('Ligar a financeiro', 'Link to finance'), to: '/financeiro' },
                            { label: txt('Voltar ao dashboard', 'Back to dashboard'), to: '/dashboard' },
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
