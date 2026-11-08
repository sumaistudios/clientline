'use client'

import { useActionState, useEffect, useRef, useState } from 'react'
import type { Request, Status } from '@/lib/github'
import { submitRequest, type FormState } from './actions'

const field = 'w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40'

const STATUS_STYLE: Record<Status, string> = {
  Received: 'bg-line text-foreground',
  'In progress': 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
  Done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200',
  Closed: 'bg-line text-muted',
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

/** The form and the client's list. `requests` is null when GitHub could not
 *  be reached. */
export function RequestPanel({ linkKey, requests }: { linkKey: string; requests: Request[] | null }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitRequest.bind(null, linkKey), {})
  const [justSent, setJustSent] = useState<Request[]>([])
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => {
    if (!state.ok) return
    formRef.current?.reset()
    const sent = state.sent
    if (sent) setJustSent(prev => [sent, ...prev.filter(r => r.number !== sent.number)])
  }, [state])

  const known = new Set((requests ?? []).map(r => r.number))
  const list = [...justSent.filter(r => !known.has(r.number)), ...(requests ?? [])]

  return (
    <>
      <section className="mt-8 rounded-xl border border-line p-5">
        <form ref={formRef} action={action} className="space-y-4">
          <label className="block space-y-1">
            <span className="text-sm font-medium">What do you need?</span>
            <input name="title" required maxLength={120} placeholder="The contact form doesn't send" className={field} />
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
          <div className="flex items-center gap-3">
            <button disabled={pending} className="rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50">
              {pending ? 'Sending…' : 'Send request'}
            </button>
            <p aria-live="polite" className="text-sm">
              {state.ok && <span className="text-ok">Sent. It&rsquo;s on the list below.</span>}
              {state.error && <span className="text-bad">{state.error}</span>}
            </p>
          </div>
        </form>
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Your requests</h2>
        {requests === null && <p className="mt-3 text-sm text-bad">Your requests could not be loaded just now. Refresh to try again.</p>}
        {requests !== null && list.length === 0 && <p className="mt-3 text-sm text-muted">Nothing yet.</p>}
        {list.length > 0 && (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {list.map(r => (
              <li key={r.number} className="flex items-start justify-between gap-4 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium break-words">{r.title}</p>
                  <p className="mt-0.5 text-xs text-muted">
                    Sent {when(r.createdAt)}{r.status === 'Done' || r.status === 'Closed' ? ` · ${r.status.toLowerCase()} ${when(r.updatedAt)}` : ''}
                  </p>
                </div>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[r.status]}`}>{r.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  )
}
