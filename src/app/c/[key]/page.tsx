import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { clientForKey, getConfig } from '@/lib/config'
import { listRequests, type Request } from '@/lib/github'
import { demoRequests } from '@/lib/demo'
import { RequestPanel } from './panel'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = { robots: { index: false, follow: false } }

export default async function ClientPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const cfg = getConfig()
  const client = clientForKey(cfg.clients, key)
  if (!client) notFound()

  let requests: Request[] | null = null
  if (cfg.demo) requests = demoRequests()
  else {
    try {
      requests = await listRequests(cfg, client.name)
    } catch (err) {
      console.error(err)
    }
  }

  return (
    <main className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      {cfg.demo && (
        <p className="mb-8 rounded-lg border border-line px-3 py-2 text-sm text-muted">
          Demo with sample requests. What you send here is shown back to you but not saved or sent anywhere.{' '}
          <a href="https://github.com/sumaistudios/clientline" className="underline underline-offset-2 hover:text-foreground">Get Clientline</a>
        </p>
      )}
      <p className="text-sm text-muted">{cfg.freelancer}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Requests</h1>
      <p className="mt-2 text-sm text-muted">Report a bug or ask for a change. You can follow each one here.</p>
      <RequestPanel linkKey={key} requests={requests} />
    </main>
  )
}
