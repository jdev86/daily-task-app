import { useState } from 'react'
import { useForm } from '@tanstack/react-form'
import { useMutation } from '@tanstack/react-query'
import { Loader2, Pencil, Trash2, Check, X, AlertCircle, RefreshCw, GripVertical } from 'lucide-react'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Card } from './ui/card'
import { planTasks, GeminiError } from '../services/openai'
import type { Task, ScheduledTask } from '../services/openai'
import { Alert, AlertDescription, AlertTitle } from './ui/alert'
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd'
import type { DropResult, DroppableProvided, DraggableProvided } from '@hello-pangea/dnd'

const MAX_RETRIES = 3

const TaskPlanner = () => {
  const [tasks, setTasks] = useState<Task[]>([])
  const [schedule, setSchedule] = useState<ScheduledTask[]>([])
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)

  const form = useForm({
    defaultValues: {
      task: '',
    },
    onSubmit: async ({ value }) => {
      if (value.task) {
        setTasks([...tasks, { description: value.task }])
        form.reset()
        setError(null)
      }
    },
  })

  const planMutation = useMutation({
    mutationFn: planTasks,
    onSuccess: (data) => {
      setSchedule(data)
      setError(null)
      setRetryCount(0)
    },
    onError: (error) => {
      if (error instanceof GeminiError) {
        setError(error.message)
      } else {
        setError('An unexpected error occurred while planning your tasks')
      }
    },
  })

  const handleRetry = () => {
    if (retryCount < MAX_RETRIES) {
      setRetryCount(prev => prev + 1)
      planMutation.mutate(tasks)
    } else {
      setError('Maximum retry attempts reached. Please try again later.')
    }
  }

  const handleEdit = (index: number) => {
    setEditingIndex(index)
    setEditValue(tasks[index].description)
    setError(null)
  }

  const handleSaveEdit = (index: number) => {
    if (!editValue.trim()) {
      setError('Task description cannot be empty')
      return
    }
    const newTasks = [...tasks]
    newTasks[index] = { description: editValue }
    setTasks(newTasks)
    setEditingIndex(null)
    setEditValue('')
    setError(null)
  }

  const handleRemove = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index))
    if (schedule.length > 0) {
      setSchedule([])
    }
    setError(null)
  }

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return

    const items = Array.from(tasks)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setTasks(items)
    if (schedule.length > 0) {
      setSchedule([])
    }
  }

  return (
    <div className="p-8">
      <div className="max-w-7xl mx-auto">
        <p className="text-orange-400 mb-8">Plan your day with AI-powered scheduling</p>

        {error && (
          <Alert variant="destructive" className="mb-6 bg-red-900/80 border-red-700">
            <AlertCircle className="h-4 w-4 mt-1" />
            <div className="ml-2">
              <AlertTitle className="text-white">Error</AlertTitle>
              <AlertDescription className="flex items-center gap-2 text-white">
                {error}
                {retryCount < MAX_RETRIES && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleRetry}
                    className="ml-2 text-white hover:bg-red-800/50"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Retry
                  </Button>
                )}
              </AlertDescription>
            </div>
          </Alert>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="p-6 bg-[#313131] backdrop-blur border-[#2A2A2A]">
            <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-orange-400 to-purple-500 bg-clip-text text-transparent">
              Your Tasks
            </h2>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                form.handleSubmit()
              }}
              className="flex gap-4 mb-4"
            >
              <form.Field
                name="task"
                children={(field) => (
                  <Input
                    placeholder="Enter a task (e.g., 'Go for a 20 minute run')"
                    value={field.state.value}
                    onChange={(e) => field.handleChange(e.target.value)}
                    className="flex-1 bg-[#2A2A2A] border-[#3A3A3A] text-white placeholder-gray-400 focus:border-orange-400 focus:ring-orange-400"
                  />
                )}
              />
              <Button 
                type="submit"
                className="bg-gradient-to-r from-orange-400 to-purple-500 hover:from-orange-500 hover:to-purple-600 text-white"
              >
                Add Task
              </Button>
            </form>

            <DragDropContext onDragEnd={handleDragEnd}>
              <Droppable droppableId="tasks">
                {(provided: DroppableProvided) => (
                  <div
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                    className="space-y-2"
                  >
                    {tasks.map((task, index) => (
                      <Draggable
                        key={index}
                        draggableId={`task-${index}`}
                        index={index}
                      >
                        {(provided: DraggableProvided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className="flex items-center gap-2 p-3 rounded-lg bg-[#2A2A2A] hover:bg-[#3A3A3A] transition-colors"
                          >
                            <div
                              {...provided.dragHandleProps}
                              className="cursor-grab text-orange-400 hover:text-purple-400"
                            >
                              <GripVertical className="h-4 w-4" />
                            </div>
                            {editingIndex === index ? (
                              <>
                                <Input
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  className="flex-1 bg-[#2A2A2A] border-[#3A3A3A] text-white"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      handleSaveEdit(index)
                                    } else if (e.key === 'Escape') {
                                      setEditingIndex(null)
                                    }
                                  }}
                                />
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleSaveEdit(index)}
                                  className="text-green-400 hover:bg-[#2A2A2A] hover:text-green-300"
                                >
                                  <Check className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => setEditingIndex(null)}
                                  className="text-red-400 hover:bg-[#2A2A2A] hover:text-red-300"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </>
                            ) : (
                              <>
                                <span className="flex-1 text-gray-100">{task.description}</span>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEdit(index)}
                                  className="text-orange-400 hover:text-purple-400 hover:bg-[#2A2A2A]"
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleRemove(index)}
                                  className="text-orange-400 hover:text-red-400 hover:bg-[#2A2A2A]"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>

            {tasks.length > 0 && (
              <Button
                className="mt-6 w-full bg-gradient-to-r from-orange-400 to-purple-500 hover:from-orange-500 hover:to-purple-600 text-white"
                onClick={() => {
                  setRetryCount(0)
                  planMutation.mutate(tasks)
                }}
                disabled={planMutation.isPending}
              >
                {planMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {schedule.length ? 'Replanning your day...' : 'Planning your day...'}
                  </>
                ) : (
                  schedule.length ? 'Replan Tasks' : 'Plan My Day'
                )}
              </Button>
            )}
          </Card>

          {schedule.length > 0 && (
            <Card className="p-6 bg-[#313131] backdrop-blur border-[#2A2A2A]">
              <h2 className="text-2xl font-semibold mb-4 bg-gradient-to-r from-orange-400 to-purple-500 bg-clip-text text-transparent">
                Your Optimized Schedule
              </h2>
              <div className="mb-6 p-4 rounded-lg bg-[#2A2A2A] border border-[#3A3A3A]">
                <h3 className="text-lg font-semibold text-orange-400 mb-2">Schedule Overview</h3>
                <div className="space-y-4 text-gray-300">
                  <p className="leading-relaxed">
                    Your schedule has been carefully optimized to align with your natural energy patterns and the specific requirements of each task. The day begins at{' '}
                    {schedule.map((item, index, array) => (
                      <span key={index}>
                        <span className="font-medium text-white">{item.time}</span>
                        {' '}{item.reason.toLowerCase()}
                        {index === array.length - 2 ? ', and finally ' : index === array.length - 1 ? '.' : ', followed by '}
                      </span>
                    ))}
                  </p>

                  <p className="text-sm text-gray-400 leading-relaxed">
                    This schedule has been created considering your energy levels throughout the day, ensuring that more demanding tasks are placed during your peak performance hours while lighter activities are scheduled for times when your energy naturally dips. The timing of each task has been optimized to create a natural flow between activities, with appropriate breaks built in to maintain productivity and focus.
                  </p>
                </div>
              </div>
              <div className="space-y-4">
                {schedule.map((item, index) => (
                  <div
                    key={index}
                    className="p-4 rounded-lg bg-[#2A2A2A] border border-[#3A3A3A] hover:border-orange-400 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <span className="text-lg font-semibold text-orange-400">{item.time}</span>
                      <span className="flex-1 text-gray-100">{item.task}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}

export default TaskPlanner 