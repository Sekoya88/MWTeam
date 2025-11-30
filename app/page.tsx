import { redirect } from 'next/navigation'
import { Logo } from '@/components/Logo'

export default async function Home() {
  redirect('/auth/signin')
}
