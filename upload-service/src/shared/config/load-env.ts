import { existsSync } from 'fs'
import { resolve } from 'path'

import { config } from 'dotenv'

/** Load first existing .env: cwd, parent (repo root). */
export function loadEnv(): string | null {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
  ]

  for (const path of candidates) {
    if (existsSync(path)) {
      config({ path })
      return path
    }
  }

  config()
  return null
}
