import { useRef, useState } from 'react'
import { useRouter } from '@tanstack/react-router'
import {
  Check,
  CheckCheck,
  CircleCheck,
  Leaf,
  ListTodo,
  LoaderCircle,
  Pencil,
  Plus,
  Search,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import type { Todo } from '../../db/schema'
import { cn } from '../../lib/utils'
import { addTodo, deleteTodo, updateTodo } from './server'

type Filter = 'all' | 'active' | 'completed'
const filters = [
  { value: 'all', label: 'すべて' },
  { value: 'active', label: '未完了' },
  { value: 'completed', label: '完了' },
] as const

export function TodoApp({ todos }: { todos: Todo[] }) {
  const router = useRouter()
  const [title, setTitle] = useState('')
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [busy, setBusy] = useState(false)
  const busyRef = useRef(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [editing, setEditing] = useState<Todo | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const [deleting, setDeleting] = useState<Todo | null>(null)
  const completed = todos.filter((todo) => todo.completed).length
  const remaining = todos.length - completed
  const visible = todos.filter(
    (todo) =>
      (filter === 'all' || todo.completed === (filter === 'completed')) &&
      todo.title.toLocaleLowerCase().includes(search.trim().toLocaleLowerCase()),
  )

  async function mutate(action: () => Promise<unknown>, onSuccess: () => void, message: string) {
    if (busyRef.current) return
    busyRef.current = true
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await action()
      onSuccess()
      await router.invalidate()
      setNotice(message)
    } catch {
      setError('保存できませんでした。通信状態を確認して、もう一度お試しください。')
    } finally {
      busyRef.current = false
      setBusy(false)
    }
  }

  return (
    <div className="min-h-svh">
      <header className="border-b bg-card">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-5 py-5 sm:px-8">
          <a
            href="/"
            className="flex items-center gap-3 font-semibold tracking-tight"
            aria-label="ひとつずつ ホーム"
          >
            <span className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
              <CheckCheck className="size-5" />
            </span>
            ひとつずつ
            <span className="hidden text-xs font-normal text-muted-foreground sm:inline">
              {' '}
              / マイタスク
            </span>
          </a>
          <Badge variant="secondary">
            <Leaf className="size-3" />
            自分のペースで
          </Badge>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8 sm:py-16">
        <div className="mb-10 flex flex-col justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <p className="mb-3 text-xs font-semibold tracking-widest text-primary">
              A LITTLE EVERY DAY
            </p>
            <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
              今日を、ひとつずつ。
            </h1>
            <p className="mt-4 text-sm leading-7 text-muted-foreground">
              やることを書き出して、頭の中に余白を。
              <br className="sm:hidden" />
              小さな一歩から始めましょう。
            </p>
          </div>
          <div className="flex items-baseline gap-2 text-muted-foreground">
            <span className="text-4xl font-light tabular-nums text-primary">{remaining}</span>
            <span className="text-sm">件のタスクが待っています</span>
          </div>
        </div>
        <div className="grid gap-7 md:grid-cols-3">
          <section className="min-w-0 space-y-6 md:col-span-2" aria-label="タスク管理">
            <form
              className="flex flex-col gap-3 rounded-2xl border bg-card p-4 shadow-xs sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault()
                if (!title.trim() || busy) return
                void mutate(
                  () => addTodo({ data: { title } }),
                  () => setTitle(''),
                  'タスクを追加しました',
                )
              }}
            >
              <Input
                aria-label="新しいタスク"
                placeholder="次にやることは？"
                value={title}
                maxLength={200}
                disabled={busy}
                onChange={(event) => setTitle(event.target.value)}
              />
              <Button type="submit" disabled={busy || !title.trim()} aria-label="タスクを追加">
                <Plus />
                追加する
              </Button>
            </form>
            {error && (
              <p
                role="alert"
                className="rounded-xl border border-destructive/30 bg-card px-4 py-3 text-sm text-destructive"
              >
                {error}
              </p>
            )}
            <output className="sr-only">{busy ? '保存中です' : notice}</output>
            <div className="overflow-hidden rounded-2xl border bg-card shadow-xs">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
                <fieldset className="flex gap-1" aria-label="タスクの状態">
                  {filters.map((item) => (
                    <Button
                      key={item.value}
                      variant={filter === item.value ? 'secondary' : 'ghost'}
                      size="sm"
                      aria-pressed={filter === item.value}
                      onClick={() => setFilter(item.value)}
                    >
                      {item.label}
                    </Button>
                  ))}
                </fieldset>
                <span className="text-xs tabular-nums text-muted-foreground">
                  {visible.length} 件
                </span>
              </div>
              <div className="flex items-center gap-3 border-b px-4 py-3">
                <Search className="size-4 shrink-0 text-muted-foreground" />
                <Input
                  aria-label="タスクを検索"
                  placeholder="タスクを検索…"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                />
              </div>
              <ul className="divide-y" aria-label="タスク一覧" aria-busy={busy}>
                {visible.map((todo) => (
                  <li
                    key={todo.id}
                    className="flex items-center gap-3 px-4 py-5 transition-colors hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={todo.completed}
                      disabled={busy}
                      aria-label={`${todo.title}を${todo.completed ? '未完了に戻す' : '完了にする'}`}
                      onCheckedChange={(checked) => {
                        void mutate(
                          () => updateTodo({ data: { id: todo.id, completed: checked === true } }),
                          () => {},
                          checked ? '完了にしました' : '未完了に戻しました',
                        )
                      }}
                    />
                    <span
                      className={cn(
                        'min-w-0 flex-1 wrap-anywhere text-sm leading-6',
                        todo.completed && 'text-muted-foreground line-through',
                      )}
                    >
                      {todo.title}
                    </span>
                    <div className="flex shrink-0 gap-1">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        aria-label={`${todo.title}を編集`}
                        onClick={() => {
                          setEditing(todo)
                          setEditTitle(todo.title)
                          setError('')
                        }}
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        disabled={busy}
                        aria-label={`${todo.title}を削除`}
                        onClick={() => {
                          setDeleting(todo)
                          setError('')
                        }}
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
              {visible.length === 0 && (
                <div className="px-6 py-16 text-center">
                  <div className="mx-auto mb-5 flex size-14 items-center justify-center rounded-2xl bg-secondary text-primary">
                    <ListTodo className="size-6" />
                  </div>
                  <h2 className="text-sm font-medium">
                    {todos.length === 0 ? 'まだタスクがありません' : '条件に合うタスクはありません'}
                  </h2>
                  <p className="mt-2 text-xs leading-6 text-muted-foreground">
                    {todos.length === 0
                      ? '気になっていることを、ひとつ書いてみましょう。'
                      : '検索ワードや表示する状態を変えてみてください。'}
                  </p>
                </div>
              )}
              <div className="flex items-center gap-2 border-t bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
                <Check className="size-3" />
                {completed} 件完了 · {remaining} 件未完了
              </div>
            </div>
          </section>
          <aside className="space-y-5">
            <section className="rounded-2xl border bg-card p-6">
              <div className="mb-6 flex items-center gap-2 text-sm font-medium">
                <CircleCheck className="size-4 text-primary" />
                進み具合
              </div>
              <div className="mb-4 flex items-end justify-between">
                <span className="text-4xl font-light tabular-nums">
                  {completed}
                  <span className="ml-2 text-lg text-muted-foreground">/ {todos.length}</span>
                </span>
                <span className="text-xs text-muted-foreground">タスク完了</span>
              </div>
              <progress
                className="h-2 w-full overflow-hidden rounded-full accent-primary"
                value={completed}
                max={todos.length || 1}
                aria-label="タスクの完了率"
              />
              <p className="mt-4 text-xs leading-6 text-muted-foreground">
                {todos.length > 0 && remaining === 0
                  ? 'すべて完了です。おつかれさまでした！'
                  : 'ひとつ終わるたび、気持ちも少し軽く。'}
              </p>
            </section>
            <div className="rounded-2xl bg-accent/60 p-6">
              <Leaf className="mb-4 size-5 text-primary" />
              <p className="text-sm font-medium leading-7">全部できなくても、大丈夫。</p>
              <p className="mt-2 text-xs leading-6 text-muted-foreground">
                今できることを、ひとつだけ。
                <br />
                あなたのペースで進めましょう。
              </p>
            </div>
          </aside>
        </div>
        <footer className="mt-12 text-center text-xs tracking-wider text-muted-foreground">
          ひとつずつ、前へ。
        </footer>
      </main>
      <Dialog
        open={editing !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setEditing(null)
            setError('')
          }
        }}
      >
        <DialogContent>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              if (editing && editTitle.trim())
                void mutate(
                  () => updateTodo({ data: { id: editing.id, title: editTitle } }),
                  () => setEditing(null),
                  '変更を保存しました',
                )
            }}
          >
            <DialogHeader>
              <DialogTitle>タスクを編集</DialogTitle>
              <DialogDescription>やることを200文字以内で入力してください。</DialogDescription>
            </DialogHeader>
            <div className="my-6">
              <label htmlFor="edit-title" className="mb-2 block text-sm font-medium">
                タスク名
              </label>
              <Input
                id="edit-title"
                value={editTitle}
                maxLength={200}
                disabled={busy}
                onChange={(event) => setEditTitle(event.target.value)}
              />
            </div>
            {error && (
              <p role="alert" className="mb-4 text-sm text-destructive">
                {error}
              </p>
            )}
            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={busy}
                onClick={() => setEditing(null)}
              >
                キャンセル
              </Button>
              <Button type="submit" disabled={busy || !editTitle.trim()}>
                {busy && <LoaderCircle className="size-4 animate-spin" />}変更を保存
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
      <Dialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !busy) {
            setDeleting(null)
            setError('')
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>タスクを削除しますか？</DialogTitle>
            <DialogDescription>
              「{deleting?.title}」を削除します。この操作は取り消せません。
            </DialogDescription>
          </DialogHeader>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogFooter>
            <Button variant="outline" disabled={busy} onClick={() => setDeleting(null)}>
              キャンセル
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => {
                if (deleting)
                  void mutate(
                    () => deleteTodo({ data: deleting.id }),
                    () => setDeleting(null),
                    'タスクを削除しました',
                  )
              }}
            >
              削除する
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
