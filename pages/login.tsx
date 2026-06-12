// pages/login.tsx
import { useState } from 'react'
import Head from 'next/head'
import { useRouter } from 'next/router'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)
  const [logs, setLogs]       = useState<string[]>([])

  function log(msg: string) {
    console.log('[LOGIN]', msg)
    setLogs(prev => [...prev, `${new Date().toISOString().split('T')[1].split('.')[0]} — ${msg}`])
  }

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLogs([])
    setLoading(true)

    log('1. Iniciando login...')
    log(`2. Email: ${email}`)
    log(`3. Supabase URL: ${process.env.NEXT_PUBLIC_SUPABASE_URL}`)
    log(`4. Anon key presente: ${!!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`)

    try {
      log('5. Chamando supabase.auth.signInWithPassword...')
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password: senha,
      })

      log(`6. Resposta recebida. Error: ${JSON.stringify(error)}`)
      log(`7. User: ${JSON.stringify(data?.user?.email)}`)
      log(`8. Session presente: ${!!data?.session}`)

      if (error) {
        log(`9. ERRO: ${error.message}`)
        setErro(`Erro: ${error.message}`)
        setLoading(false)
        return
      }

      log('10. Login OK. Redirecionando para /painel...')
      await router.push('/painel')

    } catch (err: any) {
      log(`EXCEÇÃO: ${err?.message || String(err)}`)
      setErro(`Exceção: ${err?.message}`)
      setLoading(false)
    }
  }

  return (
    <>
      <Head><title>Login — Fugini CRM</title></Head>
      <div style={{
        minHeight: '100vh', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', background: '#f5f5f5',
        fontFamily: "'Segoe UI', sans-serif",
      }}>
        <div style={{
          background: 'white', borderRadius: 12, padding: '40px 32px',
          width: '100%', maxWidth: 380,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
        }}>
          <div style={{
            background: '#D2001B', color: 'white', textAlign: 'center',
            padding: '12px', borderRadius: 8, fontSize: 18, fontWeight: 700,
            marginBottom: 28, letterSpacing: 1,
          }}>
            FUGINI · CRM
          </div>

          <form onSubmit={entrar}>
            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              Usuário
            </label>
            <input
              type="text"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="seu.usuario@fugini.internal"
              required
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: 8, fontSize: 14, marginBottom: 14,
                fontFamily: "'Segoe UI', sans-serif", boxSizing: 'border-box' as const,
              }}
            />

            <label style={{ fontSize: 13, color: '#555', display: 'block', marginBottom: 4 }}>
              Senha
            </label>
            <input
              type="password"
              value={senha}
              onChange={e => setSenha(e.target.value)}
              placeholder="••••••••"
              required
              style={{
                width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                borderRadius: 8, fontSize: 14, marginBottom: 20,
                fontFamily: "'Segoe UI', sans-serif", boxSizing: 'border-box' as const,
              }}
            />

            {erro && (
              <div style={{
                background: '#fdecea', color: '#c0392b', borderRadius: 8,
                padding: '10px 12px', fontSize: 13, marginBottom: 14, textAlign: 'center',
              }}>
                {erro}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%', padding: 14,
                background: loading ? '#aaa' : '#D2001B',
                color: 'white', border: 'none', borderRadius: 8,
                fontSize: 16, fontWeight: 600,
                cursor: loading ? 'not-allowed' : 'pointer',
              }}
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
        </div>

        {/* Painel de logs visível na tela */}
        {logs.length > 0 && (
          <div style={{
            marginTop: 20, background: '#1a1a2e', color: '#0f0', borderRadius: 8,
            padding: 16, width: '100%', maxWidth: 480, fontFamily: 'monospace',
            fontSize: 12, whiteSpace: 'pre-wrap',
          }}>
            {logs.map((l, i) => <div key={i}>{l}</div>)}
          </div>
        )}
      </div>
    </>
  )
}