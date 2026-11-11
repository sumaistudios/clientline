// Demo mode (DEMO=1): a client page with sample requests, so anyone can try
// Clientline before connecting a repo. Nothing is read from or written to
// GitHub, and a request sent here is shown back but not kept.

import type { NewRequest, Request, Status } from './github'

const DAY = 86_400_000

function sample(number: number, title: string, status: Status, sentDaysAgo: number, updatedDaysAgo: number, now: number): Request {
  return {
    number,
    title,
    status,
    createdAt: new Date(now - sentDaysAgo * DAY).toISOString(),
    updatedAt: new Date(now - updatedDaysAgo * DAY).toISOString(),
  }
}

/** Sample requests, dated relative to now so the page never looks stale. */
export function demoRequests(now: number = Date.now()): Request[] {
  return [
    sample(48, 'Add the new office address to the footer', 'Received', 0.2, 0.2, now),
    sample(47, 'Checkout button does nothing on mobile Safari', 'In progress', 2, 1, now),
    sample(45, 'Contact form emails land in spam', 'Done', 6, 4, now),
    sample(44, 'Swap the hero photo for the spring one', 'Done', 9, 8, now),
    sample(41, 'Dark mode for the whole site', 'Closed', 15, 12, now),
  ]
}

/** A pretend earlier visit, so the demo shows what a returning client sees:
 *  #48 is new, #47 started and #45 was finished since. */
export const DEMO_PREVIOUS_VISIT: Record<number, Status> = { 47: 'Received', 45: 'In progress', 44: 'Done', 41: 'Closed' }

let next = 49

/** A sent request as it would come back from GitHub, without filing it. */
export function demoCreate(r: NewRequest, now: number = Date.now()): Request {
  const iso = new Date(now).toISOString()
  return { number: next++, title: r.title, status: 'Received', createdAt: iso, updatedAt: iso }
}
