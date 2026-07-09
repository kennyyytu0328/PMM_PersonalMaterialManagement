/**
 * Base-path-aware fetch for calling PMM API routes from client components.
 * NEXT_PUBLIC_BASE_PATH is inlined at build time (empty at root path,
 * e.g. "/gogoffcc-pmm" for sub-path production builds). Next.js only
 * inlines the full `process.env.NEXT_PUBLIC_BASE_PATH` expression, so it
 * must not be destructured.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? ''

export function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_PATH}${path}`, init)
}
