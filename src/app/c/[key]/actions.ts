'use server'

import { revalidatePath } from 'next/cache'
import { clientForKey, getConfig } from '@/lib/config'
import { createRequest, sentInLastDay, type Request } from '@/lib/github'
import { demoCreate } from '@/lib/demo'

export interface FormState {
  ok?: boolean
  error?: string
  // GitHub's label filter can take a few seconds to include a new issue, so
  // the page shows what was just sent until the list catches up.
  sent?: Request
}

function httpUrl(v: FormDataEntryValue | null): string | undefined | null {
  const s = String(v ?? '').trim()
  if (!s) return undefined
  try {
    const u = new URL(s)
    return u.protocol === 'http:' || u.protocol === 'https:' ? u.toString() : null
  } catch {
    return null
  }
}

export async function submitRequest(key: string, _prev: FormState, form: FormData): Promise<FormState> {
  if (String(form.get('website') ?? '')) return { ok: true } // honeypot: bots fill every field

  const cfg = getConfig()
  const client = clientForKey(cfg.clients, key)
  if (!client) return { error: 'This link is not valid any more. Ask for a new one.' }

  const title = String(form.get('title') ?? '').trim().replace(/\s+/g, ' ')
  const description = String(form.get('description') ?? '').trim()
  const pageUrl = httpUrl(form.get('pageUrl'))
  const screenshotUrl = httpUrl(form.get('screenshotUrl'))
  if (!title || title.length > 120) return { error: 'Give it a short title (up to 120 characters).' }
  if (!description || description.length > 5000) return { error: 'Describe what you need (up to 5,000 characters).' }
  if (pageUrl === null || screenshotUrl === null) return { error: 'Links must start with http:// or https://.' }

  if (cfg.demo) return { ok: true, sent: demoCreate({ title, description, pageUrl, screenshotUrl }) }

  let sent: Request
  try {
    // A cap per client, counted on GitHub, so a leaked link can file only so
    // much. Two requests sent at the same moment can both pass; that is fine.
    if (cfg.dailyLimit > 0 && await sentInLastDay(cfg, client.name) >= cfg.dailyLimit) {
      return { error: `This page takes up to ${cfg.dailyLimit} requests a day, and that many have been sent. Please try again tomorrow, or contact ${cfg.freelancer} directly if it is urgent.` }
    }
    sent = await createRequest(cfg, client.name, { title, description, pageUrl, screenshotUrl })
  } catch (err) {
    console.error(err)
    return { error: 'Your request could not be sent. Please try again in a minute.' }
  }
  revalidatePath(`/c/${key}`)
  return { ok: true, sent }
}
