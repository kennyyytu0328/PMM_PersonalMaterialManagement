'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { isLocale, localeCookieName, type Locale } from '@/i18n/config'

export async function setLocale(locale: Locale) {
  if (!isLocale(locale)) {
    throw new Error('Invalid locale')
  }

  const cookieStore = await cookies()
  cookieStore.set(localeCookieName, locale, {
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
    sameSite: 'lax',
  })

  revalidatePath('/', 'layout')
}
