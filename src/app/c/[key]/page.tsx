import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { clientForKey, getConfig } from '@/lib/config'
import { listRequests, type Status } from '@/lib/github'
import { RequestForm } from './request-form'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { index: false, follow: false } }

const STATUS_STYLE: Record<Status, string> = {
  Received: 'bg-line text-foreground',
  'In progress': 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200',
  Done: 'bg-emerald-100 text-emerald-900 dark:bg-emerald-400/15 dark:text-emerald-200',
  Closed: 'bg-line text-muted',
}

function when(iso: string): string {
  return new Date(iso).toLocaleDateString('en', { month: 'short', day: 'numeric', year: 'numeric' })
}

export default async function ClientPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const cfg = getConfig()
  const client = clientForKey(cfg.clients, key)
  if (!client) notFound()

  let requests: Awaited<ReturnType<typeof listRequests>> | null = null
  try {
    requests = await listRequests(cfg, client.name)
  } catch (err) {
    console.error(err)
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <p className="text-sm text-muted">{cfg.freelancer}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Requests</h1>
      <p className="mt-2 text-sm text-muted">Report a bug or ask for a change. You can follow each one here.</p>

      <section className="mt-8 rounded-xl border border-line p-5">
        <RequestForm linkKey={key} />
      </section>

      <section className="mt-10">
        <h2 className="text-sm font-medium text-muted">Your requests</h2>
        {requests === null ? (
          <p className="mt-3 text-sm text-bad">Your requests could not be loaded just now. Refresh to try again.</p>
        ) : requests.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Nothing yet.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line border-y border-line">
            {requests.map(r => (
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
    </main>
  )
}
