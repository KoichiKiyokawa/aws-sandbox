import { desc, eq } from 'drizzle-orm'
import type { PgDatabase, PgQueryResultHKT } from 'drizzle-orm/pg-core'
import type { z } from 'zod'
import { todos } from '../../db/schema'
import type { createTodoInput, updateTodoInput } from './validation'

export function createTodoRepository(db: PgDatabase<PgQueryResultHKT>) {
  return {
    list: () => db.select().from(todos).orderBy(desc(todos.createdAt), desc(todos.id)),
    async create(input: z.infer<typeof createTodoInput>) {
      const [todo] = await db
        .insert(todos)
        .values({ id: crypto.randomUUID(), title: input.title })
        .returning()
      return todo
    },
    async update({ id, ...changes }: z.infer<typeof updateTodoInput>) {
      const [todo] = await db.update(todos).set(changes).where(eq(todos.id, id)).returning()
      if (!todo) throw new Error('タスクが見つかりません')
      return todo
    },
    async remove(id: string) {
      const deleted = await db.delete(todos).where(eq(todos.id, id)).returning({ id: todos.id })
      if (!deleted.length) throw new Error('タスクが見つかりません')
    },
  }
}
