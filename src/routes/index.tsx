import { createFileRoute } from '@tanstack/react-router'
import TaskPlanner from '@/components/TaskPlanner'

export const Route = createFileRoute('/')({
  component: Index,
})

function Index() {
  return <TaskPlanner />
}
