import Link from 'next/link'
import { DEMO_CLIENT, getConfig } from '@/lib/config'

export const dynamic = 'force-dynamic'

export default function Home() {
  let name = 'Clientline'
  let demo = false
  try { ({ freelancer: name, demo } = getConfig()) } catch { /* not set up yet: show the plain name */ }
  return (
    <main className="mx-auto flex min-h-dvh max-w-2xl flex-col justify-center px-4">
      <p className="text-sm text-muted">{name}</p>
      <h1 className="mt-1 text-2xl font-semibold tracking-tight">Client requests</h1>
      {demo ? (
        <p className="mt-2 text-sm text-muted">
          This is a demo with sample data.{' '}
          <Link href={`/c/${DEMO_CLIENT.key}`} className="font-medium text-foreground underline underline-offset-2">See what a client sees</Link>
        </p>
      ) : (
        <p className="mt-2 text-sm text-muted">Clients use their own private link. If you have lost yours, ask {name === 'Clientline' ? 'your developer' : name} for it.</p>
      )}
    </main>
  )
}
