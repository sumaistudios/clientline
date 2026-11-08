import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { clientForKey, getConfig } from '@/lib/config'
import { listRequests, type Request } from '@/lib/github'
import { RequestPanel } from './panel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ClientPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const cfg = getConfig()
  const client = clientForKey(cfg.clients, key)
  if (!client) notFound()

  let requests: Request[] | null = null
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
      <RequestPanel linkKey={key} requests={requests} />
    </main>
  )
}
