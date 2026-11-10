// GitHub Issues is Clientline's only storage: each request is an issue
// labelled client:<name>, and its status is read back from the issue.

import type { Config } from './config'

export type Status = 'Received' | 'In progress' | 'Done' | 'Closed'

export interface Request {
  number: number
  title: string
  status: Status
  createdAt: string
  updatedAt: string
}

export const IN_PROGRESS_LABEL = 'in-progress'

interface GhIssue {
  number: number
  title: string
  state: 'open' | 'closed'
  state_reason?: string | null
  labels: (string | { name?: string })[]
  created_at: string
  updated_at: string
  body?: string | null
  pull_request?: unknown
}

async function gh(cfg: Config, path: string, init: RequestInit = {}): Promise<Response> {
  const res = await fetch(`https://api.github.com/repos/${cfg.repo}${path}`, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${cfg.token}`,
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.body ? { 'Content-Type': 'application/json' } : {}),
    },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`GitHub ${init.method ?? 'GET'} ${path} failed: ${res.status}`)
  return res
}

export function statusOf(issue: Pick<GhIssue, 'state' | 'state_reason' | 'labels'>): Status {
  if (issue.state === 'closed') return !issue.state_reason || issue.state_reason === 'completed' ? 'Done' : 'Closed'
  const names = issue.labels.map(l => (typeof l === 'string' ? l : l.name ?? ''))
  return names.includes(IN_PROGRESS_LABEL) ? 'In progress' : 'Received'
}

export function clientLabel(name: string): string {
  return `client:${name}`
}

export async function listRequests(cfg: Config, client: string): Promise<Request[]> {
  const q = new URLSearchParams({ labels: clientLabel(client), state: 'all', sort: 'created', direction: 'desc', per_page: '50' })
  const issues = (await (await gh(cfg, `/issues?${q}`)).json()) as GhIssue[]
  return issues
    .filter(i => !i.pull_request)
    .map(i => ({ number: i.number, title: i.title, status: statusOf(i), createdAt: i.created_at, updatedAt: i.updated_at }))
}

export interface NewRequest {
  title: string
  description: string
  pageUrl?: string
  screenshotUrl?: string
}

const DAY_MS = 24 * 60 * 60 * 1000

/** Requests this client sent through Clientline since `since`. Issues you
 *  labelled for them yourself (say, from Keanu) do not count: only ones whose
 *  body Clientline wrote. */
export function countSentSince(issues: Pick<GhIssue, 'body' | 'created_at' | 'pull_request'>[], client: string, since: Date): number {
  const mark = sentByLine(client)
  return issues.filter(i => !i.pull_request && Date.parse(i.created_at) >= since.getTime() && (i.body ?? '').startsWith(mark)).length
}

/** How many requests this client sent in the last 24 hours. GitHub's `since`
 *  filters on last update, which every new issue passes; creation is checked
 *  here. */
export async function sentInLastDay(cfg: Config, client: string, now = new Date()): Promise<number> {
  const since = new Date(now.getTime() - DAY_MS)
  const q = new URLSearchParams({ labels: clientLabel(client), state: 'all', since: since.toISOString(), per_page: '100' })
  const issues = (await (await gh(cfg, `/issues?${q}`)).json()) as GhIssue[]
  return countSentSince(issues, client, since)
}

function sentByLine(client: string): string {
  return `Requested by **${client}** through Clientline.`
}

/** The client's words go inside a fence so they cannot @mention people or
 *  inject markdown into the tracker; the two links are checked to be http(s). */
export function issueBody(client: string, r: NewRequest): string {
  const fence = '~~~~'
  const text = r.description.replace(/~{4,}/g, '~~~')
  const lines = [sentByLine(client), '']
  if (r.pageUrl) lines.push(`Page: ${r.pageUrl}`)
  if (r.screenshotUrl) lines.push(`Screenshot: ${r.screenshotUrl}`)
  if (r.pageUrl || r.screenshotUrl) lines.push('')
  lines.push(fence + 'text', text, fence)
  return lines.join('\n')
}

export async function createRequest(cfg: Config, client: string, r: NewRequest): Promise<Request> {
  const res = await gh(cfg, '/issues', {
    method: 'POST',
    body: JSON.stringify({ title: r.title, body: issueBody(client, r), labels: [clientLabel(client), ...cfg.extraLabels] }),
  })
  const i = (await res.json()) as GhIssue
  return { number: i.number, title: i.title, status: statusOf(i), createdAt: i.created_at, updatedAt: i.updated_at }
}
