'use client'

import { useActionState, useEffect, useRef } from 'react'
import { submitRequest, type FormState } from './actions'

const field = 'w-full rounded-lg border border-line bg-background px-3 py-2 text-sm outline-none focus:border-foreground/40'

export function RequestForm({ linkKey }: { linkKey: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitRequest.bind(null, linkKey), {})
  const formRef = useRef<HTMLFormElement>(null)
  useEffect(() => { if (state.ok) formRef.current?.reset() }, [state])

  return (
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
  )
}
