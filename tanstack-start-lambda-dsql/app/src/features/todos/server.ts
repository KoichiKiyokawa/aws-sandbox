import { createServerFn } from '@tanstack/react-start'
import { getDatabase } from '../../db/connection'
import { createTodoRepository } from './repository'
import { createTodoInput, todoId, updateTodoInput } from './validation'

async function repository() {
  return createTodoRepository((await getDatabase()).db)
}

export const listTodos = createServerFn({ method: 'GET' }).handler(async () =>
  (await repository()).list(),
)
export const addTodo = createServerFn({ method: 'POST' })
  .validator(createTodoInput)
  .handler(async ({ data }) => (await repository()).create(data))
export const updateTodo = createServerFn({ method: 'POST' })
  .validator(updateTodoInput)
  .handler(async ({ data }) => (await repository()).update(data))
export const deleteTodo = createServerFn({ method: 'POST' })
  .validator(todoId)
  .handler(async ({ data }) => {
    await (await repository()).remove(data)
    return { success: true }
  })
