import { Button } from '@/components/ui/button'
import stylesUrl from './styles.css?url'
import { TodoApp } from './features/todos/todo-app'
import { listTodos } from './features/todos/server'
import { createServerOnlyFn } from '@tanstack/react-start'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  createRoute,
  createRouter,
  useRouter,
} from '@tanstack/react-router'

const rootRoute = createRootRoute({
  head: () => ({
    meta: [
      { charSet: 'utf-8' },
      { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      { title: 'ひとつずつ | マイタスク' },
    ],
    links: [{ rel: 'stylesheet', href: stylesUrl }],
  }),
  component: () => (
    <html lang="ja">
      <head>
        <HeadContent />
      </head>
      <body>
        <Outlet />
        <Scripts />
      </body>
    </html>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  loader: () => listTodos(),
  component: () => <TodoApp todos={indexRoute.useLoaderData()} />,
  pendingComponent: () => (
    <output className="block p-8 text-muted-foreground">タスクを読み込んでいます…</output>
  ),
  errorComponent: TodoLoadError,
})

function TodoLoadError() {
  const router = useRouter()
  return (
    <main className="mx-auto max-w-xl p-8">
      <h1 className="mb-4 text-xl font-semibold">タスクを読み込めませんでした</h1>
      <p className="mb-6 text-muted-foreground">時間をおいて再度お試しください。</p>
      <Button
        onClick={() => {
          void router.invalidate()
        }}
      >
        再試行
      </Button>
    </main>
  )
}

const helloRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'hello/$name',
  loader: ({ params }) => ({ message: `Server hello, ${params.name}` }),
  component: () => <h1>{helloRoute.useLoaderData().message}</h1>,
})

const ping = createServerOnlyFn(() => Response.json({ pong: true }))

const apiRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: 'api/ping',
  server: {
    handlers: {
      GET: () => ping(),
    },
  },
})

const routeTree = rootRoute.addChildren([indexRoute, helloRoute, apiRoute])

export function getRouter() {
  return createRouter({ routeTree })
}

declare module '@tanstack/react-router' {
  interface Register {
    router: ReturnType<typeof getRouter>
  }
}
