import { z } from 'zod'

const title = z
  .string()
  .trim()
  .min(1, 'タスク名を入力してください')
  .max(200, '200文字以内で入力してください')
export const todoId = z.uuid()
export const createTodoInput = z.object({ title })
export const updateTodoInput = z
  .object({
    id: todoId,
    title: title.optional(),
    completed: z.boolean().optional(),
  })
  .refine(
    (input) => input.title !== undefined || input.completed !== undefined,
    '変更内容がありません',
  )
