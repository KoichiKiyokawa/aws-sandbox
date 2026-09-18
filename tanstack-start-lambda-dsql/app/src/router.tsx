import { createServerOnlyFn } from '@tanstack/react-start'
import {
  HeadContent,
  Outlet,
  Scripts,
  createRootRoute,
  createRoute,
  createRouter,
} from '@tanstack/react-router'

const rootRoute = createRootRoute({
  component: () => (
    <html lang="ja">
      <head><HeadContent /></head>
      <body><Outlet /><Scripts /></body>
    </html>
  ),
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: () => <h1>Code route: home</h1>,
})

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
