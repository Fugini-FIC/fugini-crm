// pages/index.tsx — redireciona para /painel (middleware cuida do auth)
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  useEffect(() => { router.replace('/painel') }, [router])
  return null
}
