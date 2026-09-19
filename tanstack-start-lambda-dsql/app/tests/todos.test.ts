import { readFile } from 'node:fs/promises'
import { PGlite } from '@electric-sql/pglite'
import { drizzle } from 'drizzle-orm/pglite'
import { afterAll, beforeAll, expect, test } from 'vitest'
import { createTodoRepository } from '../src/features/todos/repository'
import { createTodoInput, updateTodoInput } from '../src/features/todos/validation'

const client = new PGlite()
const repository = createTodoRepository(drizzle(client))
beforeAll(async () => {
  const migration = await readFile(new URL('../drizzle/0000_todos.sql', import.meta.url), 'utf8')
  await client.exec(migration)
})
afterAll(() => client.close())

test('creates, edits, completes, reopens and deletes persisted tasks', async () => {
  const created = await repository.create(createTodoInput.parse({ title: '  買い物  ' }))
  expect(created.title).toBe('買い物')
  expect(created.completed).toBe(false)
  expect(await repository.list()).toEqual([created])
  const edited = await repository.update({ id: created.id, title: '牛乳を買う' })
  expect(edited.title).toBe('牛乳を買う')
  expect((await repository.update({ id: created.id, completed: true })).completed).toBe(true)
  expect((await repository.update({ id: created.id, completed: false })).completed).toBe(false)
  await repository.remove(created.id)
  expect(await repository.list()).toEqual([])
})

test('rejects blank, oversized and malformed updates', () => {
  for (const title of ['', '   ', 'a'.repeat(201)]) {
    expect(createTodoInput.safeParse({ title }).success).toBe(false)
  }
  expect(updateTodoInput.safeParse({ id: 'invalid', completed: true }).success).toBe(false)
  expect(updateTodoInput.safeParse({ id: crypto.randomUUID() }).success).toBe(false)
})

test('reports missing tasks rather than silently succeeding', async () => {
  const id = crypto.randomUUID()
  await expect(repository.update({ id, title: '存在しない' })).rejects.toThrow('見つかりません')
  await expect(repository.remove(id)).rejects.toThrow('見つかりません')
})
