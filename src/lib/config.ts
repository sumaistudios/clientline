// Everything Clientline needs comes from environment variables, so a deploy
// is the whole setup. CLIENTS is "name:key,name:key"; the key is the secret
// part of each client's link (/c/<key>).

import { timingSafeEqual } from 'crypto'

export interface Client {
  name: string
  key: string
}

export interface Config {
  token: string
  repo: string
  freelancer: string
  clients: Client[]
  extraLabels: string[]
  /** Sample data, nothing read from or sent to GitHub (DEMO=1). */
  demo: boolean
}

const NAME_RE = /^[a-z0-9][a-z0-9-]{0,38}$/
const KEY_RE = /^[A-Za-z0-9_-]{8,64}$/
const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/

export function parseClients(raw: string): Client[] {
  const clients: Client[] = []
  for (const part of raw.split(',').map(s => s.trim()).filter(Boolean)) {
    const [name, key] = part.split(':').map(s => s?.trim())
    if (!name || !key || !NAME_RE.test(name) || !KEY_RE.test(key)) {
      throw new Error(`CLIENTS entry "${part}" must be name:key, with a lowercase name and a key of 8 or more letters, digits, - or _`)
    }
    clients.push({ name, key })
  }
  return clients
}

/** The one client in demo mode, at /c/demo. */
export const DEMO_CLIENT: Client = { name: 'acme', key: 'demo' }

export function isDemo(env: NodeJS.ProcessEnv = process.env): boolean {
  return /^(1|true|yes)$/i.test(env.DEMO?.trim() ?? '')
}

export function getConfig(env: NodeJS.ProcessEnv = process.env): Config {
  if (isDemo(env)) {
    return { token: '', repo: '', freelancer: env.FREELANCER_NAME?.trim() || 'Ada Studio', clients: [DEMO_CLIENT], extraLabels: [], demo: true }
  }
  const missing = ['GITHUB_TOKEN', 'GITHUB_REPO', 'FREELANCER_NAME', 'CLIENTS'].filter(k => !env[k]?.trim())
  if (missing.length) throw new Error(`Clientline is not set up: missing ${missing.join(', ')}. See the README.`)
  const repo = env.GITHUB_REPO!.trim()
  if (!REPO_RE.test(repo)) throw new Error('GITHUB_REPO must be owner/name')
  return {
    token: env.GITHUB_TOKEN!.trim(),
    repo,
    freelancer: env.FREELANCER_NAME!.trim(),
    clients: parseClients(env.CLIENTS!),
    extraLabels: (env.EXTRA_LABELS ?? '').split(',').map(s => s.trim()).filter(Boolean),
    demo: false,
  }
}

/** The client a link key belongs to, compared in constant time so response
 *  timing does not reveal how much of a guessed key was right. */
export function clientForKey(clients: Client[], key: string): Client | null {
  const given = Buffer.from(key)
  let found: Client | null = null
  for (const c of clients) {
    const want = Buffer.from(c.key)
    if (want.length === given.length && timingSafeEqual(want, given)) found = c
  }
  return found
}
