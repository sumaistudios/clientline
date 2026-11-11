'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import type { Request, Status } from '@/lib/github'
import { submitRequest, type FormState } from './actions'

const field = 'w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40'

const STATUSES: Status[] = ['Received', 'In progress', 'Done', 'Closed']

const STATUS_STYLE: Record<Status, string> = {
  Received: 'bg-line text-foreground',
  'In progress': 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
  Done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200',
  Closed: 'bg-line text-muted',
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** Each request's status as of the last visit, kept in this browser only. */
type Seen = Record<number, Status>

function readSeen(storageKey: string): Seen | null {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? (JSON.parse(raw) as Seen) : null
  } catch {
    return null
  }
}

function writeSeen(storageKey: string, list: Request[]) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(Object.fromEntries(list.map(r => [r.number, r.status]))))
  } catch { /* private window or storage blocked: nothing is highlighted next time */ }
}

type Change = { kind: 'new' } | { kind: 'moved'; from: Status }

/** What changed since `seen`: requests not there before, and ones whose
 *  status moved. Nothing on a first visit, when there is nothing to compare. */
function changesSince(seen: Seen | null, list: Request[]): Map<number, Change> {
  const out = new Map<number, Change>()
  if (!seen) return out
  for (const r of list) {
    const before = seen[r.number]
    if (!before) out.set(r.number, { kind: 'new' })
    else if (before !== r.status) out.set(r.number, { kind: 'moved', from: before })
  }
  return out
}

function summary(changes: Map<number, Change>, list: Request[]): string | null {
  if (changes.size === 0) return null
  const parts: string[] = []
  const fresh = [...changes.values()].filter(c => c.kind === 'new').length
  if (fresh) parts.push(`${fresh} new`)
  for (const s of STATUSES) {
    const n = list.filter(r => changes.get(r.number)?.kind === 'moved' && r.status === s).length
    if (n) parts.push(`${n} now ${s.toLowerCase()}`)
  }
  return `Since your last visit: ${parts.join(', ')}.`
}

/** Counts, the list and the request form. `requests` is null when GitHub
 *  could not be reached. `previousVisit`, when given, replaces this browser's
 *  last visit and nothing is stored (the demo uses it to show what changes
 *  look like on every load). */
export function RequestPanel({ linkKey, requests, previousVisit }: { linkKey: string; requests: Request[] | null; previousVisit?: Seen }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitRequest.bind(null, linkKey), {})
  const [justSent, setJustSent] = useState<Request[]>([])
  const [formOpen, setFormOpen] = useState(false)
  const [filter, setFilter] = useState<Status | null>(null)
  const [changes, setChanges] = useState<Map<number, Change>>(new Map())
  const formRef = useRef<HTMLFormElement>(null)
  const storageKey = `clientline:seen:${linkKey}`

  const known = new Set((requests ?? []).map(r => r.number))
  const list = [...justSent.filter(r => !known.has(r.number)), ...(requests ?? [])]

  // Compare with the last visit once, then record this one. The highlights
  // stay for this page view.
  useEffect(() => {
    if (!requests) return
    if (previousVisit) return setChanges(changesSince(previousVisit, requests))
    setChanges(changesSince(readSeen(storageKey), requests))
    writeSeen(storageKey, requests)
  }, [requests, storageKey, previousVisit])

  useEffect(() => {
    if (!state.ok) return
    formRef.current?.reset()
    setFormOpen(false)
    setFilter(null)
    const sent = state.sent
    if (!sent) return
    setJustSent(prev => {
      const next = [sent, ...prev.filter(r => r.number !== sent.number)]
      // What you just sent is not news on your next visit.
      writeSeen(storageKey, [...next.filter(r => !known.has(r.number)), ...(requests ?? [])])
      return next
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state])

  const counts = Object.fromEntries(STATUSES.map(s => [s, list.filter(r => r.status === s).length])) as Record<Status, number>
  const shown = filter ? list.filter(r => r.status === filter) : list
  const note = summary(changes, list)

  return (
    <>
      {requests !== null && (
        <section className="mt-8 grid grid-cols-2 gap-2 sm:grid-cols-4" aria-label="Requests by status">
          {STATUSES.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setFilter(f => (f === s ? null : s))}
              aria-pressed={filter === s}
              className={`rounded-xl border px-4 py-3 text-left transition-colors ${filter === s ? 'border-foreground/60' : 'border-line hover:border-foreground/30'}`}
            >
              <span className="block text-2xl font-semibold tabular-nums">{counts[s]}</span>
              <span className="text-xs text-muted">{s}</span>
            </button>
          ))}
        </section>
      )}

      {note && <p className="mt-4 rounded-lg bg-line/60 px-3 py-2 text-sm">{note}</p>}

      {formOpen ? (
        <section className="mt-6 rounded-xl border border-line p-5">
          <form ref={formRef} action={action} className="space-y-4">
            <label className="block space-y-1">
              <span className="text-sm font-medium">What do you need?</span>
              <input name="title" required autoFocus maxLength={120} placeholder="The contact form doesn't send" className={field} />
            </label>
            <label className="block space-y-1">
              <span className="text-sm font-medium">Details</span>
              <textarea name="description" required maxLength={5000} rows={5} placeholder="What you did, what you expected, what happened instead." className={field} />
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block space-y-1">
                <span className="text-sm font-medium">Page it happens on <span className="text-muted">(optional)</span></span>
                <input name="pageUrl" type="url" placeholder="https://" className={field} />
              </label>
              <label className="block space-y-1">
                <span className="text-sm font-medium">Screenshot link <span className="text-muted">(optional)</span></span>
                <input name="screenshotUrl" type="url" placeholder="https://" className={field} />
              </label>
            </div>
            <input name="website" tabIndex={-1} autoComplete="off" aria-hidden="true" className="hidden" />
            <div className="flex flex-wrap items-center gap-3">
              <button disabled={pending} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">
                {pending ? 'Sending…' : 'Send request'}
              </button>
              <button type="button" onClick={() => setFormOpen(false)} className="px-2 py-2 text-sm text-muted hover:text-foreground">
                Cancel
              </button>
              {state.error && <p aria-live="polite" className="text-sm text-bad">{state.error}</p>}
            </div>
          </form>
        </section>
      ) : (
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button type="button" onClick={() => setFormOpen(true)} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background">
            New request
          </button>
          {state.ok && <p aria-live="polite" className="text-sm text-ok">Sent. It&rsquo;s at the top of the list.</p>}
        </div>
      )}

      <section className="mt-10">
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="text-sm font-medium text-muted">{filter ? `${filter} requests` : 'Your requests'}</h2>
          {filter && (
            <button type="button" onClick={() => setFilter(null)} className="text-xs text-muted underline underline-offset-2 hover:text-foreground">
              Show all
            </button>
          )}
        </div>
        {requests === null && <p className="mt-3 text-sm text-bad">Your requests could not be loaded just now. Refresh to try again.</p>}
        {requests !== null && shown.length === 0 && <p className="mt-3 text-sm text-muted">{filter ? 'None right now.' : 'Nothing yet.'}</p>}
        {shown.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {shown.map(r => {
              const change = changes.get(r.number)
              return (
                <li key={r.number} className="flex items-start justify-between gap-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium break-words">
                      {change && <span className="mr-2 inline-block size-2 rounded-full bg-sky-500 align-middle" aria-hidden="true" />}
                      {r.title}
                    </p>
                    <p className="mt-0.5 text-xs text-muted">
                      Sent {when(r.createdAt)}{r.status === 'Done' || r.status === 'Closed' ? ` · ${r.status.toLowerCase()} ${when(r.updatedAt)}` : ''}
                      {change?.kind === 'new' && <span className="text-sky-600 dark:text-sky-400"> · New</span>}
                      {change?.kind === 'moved' && <span className="text-sky-600 dark:text-sky-400"> · was {change.from}</span>}
                    </p>
                  </div>
                  <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </>
  )
}
