import { existsSync } from 'fs'
import { resolve } from 'path'

import { config } from 'dotenv'

/** Load first existing .env: cwd, parent (repo root), or paths relative to this file. */
export function loadEnv() {
  const candidates = [
    resolve(process.cwd(), '.env'),
    resolve(process.cwd(), '../.env'),
    resolve(__dirname, '../../.env'),
    resolve(__dirname, '../.env'),
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
