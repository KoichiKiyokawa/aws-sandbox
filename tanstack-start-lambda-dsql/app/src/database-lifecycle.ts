import { definePlugin } from 'nitro'
import { closeDatabase } from './db/connection'

export default definePlugin((app) => {
  app.hooks.hook('close', closeDatabase)
})
