// pages/painel.tsx
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

const MAPA_URLS: Record<string, { url: string; senha: string }> = {
  SC01:   { url: 'https://fugini-fic.github.io/fugini-mapa-sc/vendedor_sc.html', senha: 'fugini@sc1' },
  MASTER: { url: 'https://fugini-fic.github.io/fugini-mapa-sc/master_sc.html',  senha: 'fugini@master_sc' },
}

interface Vendedor {
  cod_vendedor: string
  nome: string
  role: string
}

export default function Painel() {
  const router = useRouter()
  const [vendedor, setVendedor] = useState<Vendedor | null>(null)
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    async function carregar() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }

      const { data } = await supabase
        .from('vendedores')
        .select('cod_vendedor, nome, role')
        .eq('email', user.email)
        .single()

      if (data) {
        setVendedor(data)
        // Salva cod_vendedor no localStorage para agenda e checkin usarem
        localStorage.setItem('cod_vendedor', data.cod_vendedor)
      }
      setLoading(false)
    }
    carregar()
  }, [router])

  async function sair() {
    await supabase.auth.signOut()
    localStorage.removeItem('cod_vendedor')
    router.replace('/login')
  }

  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", color: '#888' }}>
      Carregando...
    </div>
  )

  const mapaConfig = vendedor ? (MAPA_URLS[vendedor.cod_vendedor] || MAPA_URLS['MASTER']) : null
  const mapaUrl    = mapaConfig ? `${mapaConfig.url}#${mapaConfig.senha}` : '#'

  return (
    <>
      <Head><title>Painel — Fugini CRM</title></Head>
      <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#f5f5f5', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{
          background: '#1a1a2e', color: 'white', padding: '0 20px',
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
            FUGINI<span style={{ color: '#D2001B' }}>.</span>CRM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#ccc' }}>
              👤 {vendedor?.nome || 'Usuário'}
            </span>
            <button onClick={sair} style={{
              fontSize: 12, color: '#aaa', background: 'none',
              border: '1px solid #444', borderRadius: 4,
              padding: '3px 10px', cursor: 'pointer',
            }}>
              Sair
            </button>
          </div>
        </div>

        {/* Conteúdo */}
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center',
          padding: '32px 16px',
        }}>
          <div style={{
            background: '#D2001B', color: 'white', width: '100%', maxWidth: 380,
            borderRadius: 12, padding: 20, textAlign: 'center', marginBottom: 24,
          }}>
            <div style={{ fontSize: 20, fontWeight: 700, letterSpacing: 1 }}>FUGINI ALIMENTOS</div>
            <div style={{ fontSize: 13, opacity: 0.85, marginTop: 4 }}>
              Olá, {vendedor?.nome}! Bem-vindo ao CRM.
            </div>
          </div>

          <div style={{
            background: 'white', borderRadius: 12, width: '100%', maxWidth: 380,
            boxShadow: '0 2px 12px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 16,
          }}>
            <div style={{
              background: '#fafafa', borderBottom: '1px solid #eee',
              padding: '12px 16px', fontSize: 12, fontWeight: 600,
              color: '#888', textTransform: 'uppercase', letterSpacing: 0.5,
            }}>
              Ferramentas
            </div>

            <a href={mapaUrl} style={btnStyle}>
              <div style={iconStyle}>🗺️</div>
              <div>
                <strong style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Mapa de Clientes</strong>
                <span style={{ fontSize: 12, color: '#888' }}>Visualizar clientes na região</span>
              </div>
            </a>

            <a href="/agenda" style={btnStyle}>
              <div style={iconStyle}>📅</div>
              <div>
                <strong style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Agenda</strong>
                <span style={{ fontSize: 12, color: '#888' }}>Visitas planejadas e realizadas</span>
              </div>
            </a>

            <a href="https://fugini-fic.github.io/fugini-mapa-sc/checkin.html" style={btnStyle}>
              <div style={iconStyle}>📍</div>
              <div>
                <strong style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Check-in de Visita</strong>
                <span style={{ fontSize: 12, color: '#888' }}>Registrar visita a cliente</span>
              </div>
            </a>
          </div>

          <div style={{ fontSize: 11, color: '#bbb', textAlign: 'center' }}>
            Fugini Alimentos · uso interno
          </div>
        </div>
      </div>
    </>
  )
}

const btnStyle: React.CSSProperties = {
  display: 'flex', alignItems: 'center', gap: 14, padding: 16,
  textDecoration: 'none', color: '#222', borderBottom: '1px solid #f0f0f0',
  transition: 'background 0.15s',
}

const iconStyle: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 10, background: '#D2001B',
  display: 'flex', alignItems: 'center', justifyContent: 'center',
  fontSize: 20, flexShrink: 0,
}
