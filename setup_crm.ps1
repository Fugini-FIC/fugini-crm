# setup_crm.ps1
# Roda na raiz do projeto fugini-checkin-api
# Uso: cd C:\Users\accrisci\Desktop\Artur\Projetos\fugini-checkin-api
#      .\setup_crm.ps1

$base = "C:\Users\accrisci\Desktop\Artur\Projetos\fugini-checkin-api"

# Cria pasta lib se não existir
New-Item -ItemType Directory -Force -Path "$base\lib" | Out-Null

# ── lib/supabase.ts ────────────────────────────────────────────────────────────
@'
import { createClient } from '@supabase/supabase-js'

const supabaseUrl  = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnon)
'@ | Set-Content "$base\lib\supabase.ts" -Encoding UTF8
Write-Host "[OK] lib/supabase.ts"

# ── middleware.ts ──────────────────────────────────────────────────────────────
@'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'

export async function middleware(request: NextRequest) {
  const response = NextResponse.next()

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return request.cookies.getAll() },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const { pathname } = request.nextUrl

  if (pathname === '/login') {
    if (user) return NextResponse.redirect(new URL('/painel', request.url))
    return response
  }

  if (pathname.startsWith('/api')) return response

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
}
'@ | Set-Content "$base\middleware.ts" -Encoding UTF8
Write-Host "[OK] middleware.ts"

# ── pages/index.tsx ────────────────────────────────────────────────────────────
@'
import { useEffect } from 'react'
import { useRouter } from 'next/router'

export default function Home() {
  const router = useRouter()
  useEffect(() => { router.replace('/painel') }, [router])
  return null
}
'@ | Set-Content "$base\pages\index.tsx" -Encoding UTF8
Write-Host "[OK] pages/index.tsx"

# ── pages/login.tsx ────────────────────────────────────────────────────────────
@'
import { useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

export default function Login() {
  const router = useRouter()
  const [email, setEmail]     = useState('')
  const [senha, setSenha]     = useState('')
  const [erro, setErro]       = useState('')
  const [loading, setLoading] = useState(false)

  async function entrar(e: React.FormEvent) {
    e.preventDefault()
    setErro('')
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password: senha })
    if (error) {
      setErro('Usuário ou senha incorretos.')
      setLoading(false)
      return
    }
    router.push('/painel')
  }

  return (
    <>
      <Head><title>Login — Fugini CRM</title></Head>
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center',
        justifyContent: 'center', background: '#f5f5f5',
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
              }}>{erro}</div>
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
      </div>
    </>
  )
}
'@ | Set-Content "$base\pages\login.tsx" -Encoding UTF8
Write-Host "[OK] pages/login.tsx"

# ── pages/painel.tsx ───────────────────────────────────────────────────────────
@'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

const MAPA_URLS: Record<string, { url: string; senha: string }> = {
  SC01:   { url: 'https://fugini-fic.github.io/fugini-mapa-sc/vendedor_sc.html', senha: 'fugini@sc1' },
  MASTER: { url: 'https://fugini-fic.github.io/fugini-mapa-sc/master_sc.html',  senha: 'fugini@master_sc' },
}

interface Vendedor { cod_vendedor: string; nome: string; role: string }

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

  const btnStyle: React.CSSProperties = {
    display: 'flex', alignItems: 'center', gap: 14, padding: 16,
    textDecoration: 'none', color: '#222', borderBottom: '1px solid #f0f0f0',
  }
  const iconStyle: React.CSSProperties = {
    width: 40, height: 40, borderRadius: 10, background: '#D2001B',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: 20, flexShrink: 0,
  }

  return (
    <>
      <Head><title>Painel — Fugini CRM</title></Head>
      <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#f5f5f5', minHeight: '100vh' }}>
        <div style={{
          background: '#1a1a2e', color: 'white', padding: '0 20px',
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
            FUGINI<span style={{ color: '#D2001B' }}>.</span>CRM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#ccc' }}>👤 {vendedor?.nome}</span>
            <button onClick={sair} style={{
              fontSize: 12, color: '#aaa', background: 'none',
              border: '1px solid #444', borderRadius: 4, padding: '3px 10px', cursor: 'pointer',
            }}>Sair</button>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '32px 16px' }}>
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
              color: '#888', textTransform: 'uppercase' as const, letterSpacing: 0.5,
            }}>Ferramentas</div>
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
            <a href="https://fugini-fic.github.io/fugini-mapa-sc/checkin.html" style={{ ...btnStyle, borderBottom: 'none' }}>
              <div style={iconStyle}>📍</div>
              <div>
                <strong style={{ display: 'block', fontSize: 15, fontWeight: 600 }}>Check-in de Visita</strong>
                <span style={{ fontSize: 12, color: '#888' }}>Registrar visita a cliente</span>
              </div>
            </a>
          </div>
          <div style={{ fontSize: 11, color: '#bbb' }}>Fugini Alimentos · uso interno</div>
        </div>
      </div>
    </>
  )
}
'@ | Set-Content "$base\pages\painel.tsx" -Encoding UTF8
Write-Host "[OK] pages/painel.tsx"

# ── pages/agenda.tsx ───────────────────────────────────────────────────────────
@'
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

const API = 'https://fugini-crm.vercel.app/api'
const MESES = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
               'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
const DIAS_SEMANA = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']
const STATUS_ICON: Record<string, string> = {
  pendente: '🕐', realizada: '✅', ausente: '❌', reagendada: '🔁'
}

interface Agendamento {
  id: string; cod_cliente: string; nome_cliente: string
  data_visita: string; hora_visita?: string; observacao?: string; status: string
}
interface Vendedor { cod_vendedor: string; nome: string; role: string }

export default function Agenda() {
  const router = useRouter()
  const [vendedor, setVendedor]         = useState<Vendedor | null>(null)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [diaSel, setDiaSel]             = useState(new Date().toISOString().split('T')[0])
  const [mesAtual, setMesAtual]         = useState(new Date())
  const [modalAberto, setModalAberto]   = useState(false)
  const [loadingAuth, setLoadingAuth]   = useState(true)
  const [mCod, setMCod] = useState('')
  const [mNome, setMNome] = useState('')
  const [mData, setMData] = useState('')
  const [mHora, setMHora] = useState('')
  const [mObs, setMObs] = useState('')

  useEffect(() => {
    async function init() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.replace('/login'); return }
      const { data } = await supabase
        .from('vendedores').select('cod_vendedor, nome, role')
        .eq('email', user.email).single()
      if (data) { setVendedor(data); localStorage.setItem('cod_vendedor', data.cod_vendedor) }
      setLoadingAuth(false)
    }
    init()
  }, [router])

  const carregarMes = useCallback(async () => {
    if (!vendedor) return
    const mes = `${mesAtual.getFullYear()}-${String(mesAtual.getMonth()+1).padStart(2,'0')}`
    const res = await fetch(`${API}/agendamentos?cod_vendedor=${vendedor.cod_vendedor}&mes=${mes}`)
    const data = await res.json()
    setAgendamentos(Array.isArray(data) ? data : [])
  }, [vendedor, mesAtual])

  useEffect(() => { carregarMes() }, [carregarMes])

  async function sair() {
    await supabase.auth.signOut()
    localStorage.removeItem('cod_vendedor')
    router.replace('/login')
  }

  function mudarMes(delta: number) {
    setMesAtual(m => { const n = new Date(m); n.setMonth(n.getMonth()+delta); return n })
  }

  async function salvarAgendamento() {
    if (!mCod || !mNome || !mData || !vendedor) { alert('Preencha Cód. Cliente, Nome e Data.'); return }
    const res = await fetch(`${API}/agendamentos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cod_cliente: mCod, nome_cliente: mNome,
        cod_vendedor: vendedor.cod_vendedor, data_visita: mData,
        hora_visita: mHora || null, observacao: mObs || null }),
    })
    if (res.ok || res.status === 200) {
      setModalAberto(false); setMCod(''); setMNome(''); setMHora(''); setMObs('')
      await carregarMes()
    } else { alert('Erro ao salvar. Tente novamente.') }
  }

  if (loadingAuth) return (
    <div style={{ minHeight:'100vh', display:'flex', alignItems:'center',
      justifyContent:'center', fontFamily:"'Segoe UI', sans-serif", color:'#888' }}>
      Carregando...
    </div>
  )

  const ano = mesAtual.getFullYear(); const mes = mesAtual.getMonth()
  const hoje = new Date().toISOString().split('T')[0]
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const ultimoDia   = new Date(ano, mes+1, 0).getDate()
  const visitasDia  = agendamentos.filter(a => a.data_visita === diaSel)
  const [,mesS, diaS] = diaSel.split('-')
  const nomeMes = MESES[parseInt(mesS)-1].charAt(0) + MESES[parseInt(mesS)-1].slice(1).toLowerCase()

  return (
    <>
      <Head><title>Agenda — Fugini CRM</title></Head>
      <div style={{ fontFamily:"'Segoe UI', sans-serif", background:'#f5f5f5', minHeight:'100vh' }}>
        <div style={{ background:'#1a1a2e', color:'white', padding:'0 16px',
          height:52, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ fontSize:16, fontWeight:700, letterSpacing:1 }}>
            FUGINI<span style={{ color:'#D2001B' }}>.</span>CRM
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:12, color:'#ccc' }}>👤 {vendedor?.nome}</span>
            <button onClick={sair} style={{ fontSize:11, color:'#aaa', background:'none',
              border:'1px solid #444', borderRadius:4, padding:'3px 8px', cursor:'pointer' }}>Sair</button>
          </div>
        </div>
        <div style={{ background:'#1a1a2e', display:'flex', borderTop:'1px solid #333' }}>
          <a href="/painel" style={{ flex:1, textAlign:'center', padding:10, fontSize:13,
            color:'#aaa', textDecoration:'none', borderBottom:'2px solid transparent' }}>🗺️ Mapa</a>
          <span style={{ flex:1, textAlign:'center', padding:10, fontSize:13,
            color:'white', borderBottom:'2px solid #D2001B', cursor:'default' }}>📅 Agenda</span>
        </div>

        <div style={{ padding:16, maxWidth:480, margin:'0 auto' }}>
          <div style={{ display:'flex', gap:16, marginBottom:16 }}>
            {[
              { label:'Visitas', val:agendamentos.length, color:'#222' },
              { label:'Concluídas', val:agendamentos.filter(a=>a.status==='realizada').length, color:'#27ae60' },
              { label:'Pendentes', val:agendamentos.filter(a=>a.status==='pendente').length, color:'#e67e22' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize:11, color:'#888', textTransform:'uppercase' as const }}>{s.label}</div>
                <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          <div style={{ background:'white', borderRadius:12, padding:16, marginBottom:16,
            boxShadow:'0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <button onClick={() => mudarMes(-1)} style={{ background:'none', border:'none',
                fontSize:18, cursor:'pointer', color:'#555', padding:'4px 8px' }}>‹</button>
              <div style={{ fontSize:13, fontWeight:700, color:'#333', letterSpacing:1 }}>
                {MESES[mes]} {ano}
              </div>
              <button onClick={() => mudarMes(1)} style={{ background:'none', border:'none',
                fontSize:18, cursor:'pointer', color:'#555', padding:'4px 8px' }}>›</button>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:2 }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ textAlign:'center', fontSize:10, fontWeight:600,
                  color:'#aaa', padding:'4px 0', textTransform:'uppercase' as const }}>{d}</div>
              ))}
              {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: ultimoDia }).map((_, i) => {
                const d = i+1
                const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const visitas = agendamentos.filter(a => a.data_visita === dataStr)
                const isHoje = dataStr === hoje; const isSel = dataStr === diaSel && dataStr !== hoje
                return (
                  <div key={d} onClick={() => setDiaSel(dataStr)} style={{
                    textAlign:'center', padding:'6px 2px 4px', borderRadius:8, cursor:'pointer',
                    minHeight:44, display:'flex', flexDirection:'column', alignItems:'center',
                    background: isHoje ? '#D2001B' : isSel ? '#fdecea' : 'transparent',
                    color: isHoje ? 'white' : '#222',
                  }}>
                    <span style={{ fontSize:13, fontWeight:500 }}>{d}</span>
                    {visitas.length > 0 && (
                      <div style={{ display:'flex', gap:2, marginTop:2, flexWrap:'wrap', justifyContent:'center' }}>
                        {visitas.slice(0,3).map((v,vi) => (
                          <span key={vi} style={{ width:6, height:6, borderRadius:'50%',
                            background: v.status==='realizada'?'#27ae60':v.status==='ausente'?'#e74c3c':
                              v.status==='reagendada'?'#3498db':'#e67e22' }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div style={{ fontSize:16, fontWeight:700, color:'#222' }}>{parseInt(diaS)} de {nomeMes}</div>
            <div style={{ fontSize:12, color:'#888' }}>
              {visitasDia.length > 0 ? `${visitasDia.length} visita${visitasDia.length>1?'s':''}` : ''}
            </div>
          </div>

          <button onClick={() => { setMData(diaSel); setModalAberto(true) }} style={{
            display:'flex', alignItems:'center', justifyContent:'center', gap:6,
            background:'#D2001B', color:'white', border:'none', borderRadius:8,
            padding:'8px 14px', fontSize:13, fontWeight:600, cursor:'pointer',
            width:'100%', marginBottom:12,
          }}>+ Nova Visita</button>

          {visitasDia.length === 0 ? (
            <div style={{ textAlign:'center', color:'#bbb', fontSize:13, padding:'32px 0' }}>
              Nenhuma visita neste dia
            </div>
          ) : visitasDia.map(v => {
            const hora = v.hora_visita ? v.hora_visita.substring(0,5) : ''
            const icon = STATUS_ICON[v.status] || '🕐'
            const nomeEnc = encodeURIComponent(v.nome_cliente)
            const bgStatus = v.status==='realizada'?'#eafaf1':v.status==='ausente'?'#fdecea':
              v.status==='reagendada'?'#ebf5fb':'#fef3e8'
            const corStatus = v.status==='realizada'?'#27ae60':v.status==='ausente'?'#e74c3c':
              v.status==='reagendada'?'#3498db':'#e67e22'
            return (
              <div key={v.id} style={{ background:'white', borderRadius:12, padding:'14px 16px',
                marginBottom:10, boxShadow:'0 1px 6px rgba(0,0,0,0.07)', display:'flex', gap:12 }}>
                <div style={{ width:36, height:36, borderRadius:'50%', fontSize:16,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:bgStatus, flexShrink:0, marginTop:2 }}>{icon}</div>
                <div style={{ flex:1 }}>
                  <div style={{ fontSize:15, fontWeight:600, color:'#222', marginBottom:3 }}>{v.nome_cliente}</div>
                  <div style={{ fontSize:12, color:'#888', marginBottom:6 }}>
                    {hora ? `🕐 ${hora} · ` : ''}Cód: {v.cod_cliente}
                    {v.observacao ? <><br />{v.observacao}</> : ''}
                  </div>
                  <span style={{ display:'inline-block', fontSize:11, fontWeight:600,
                    padding:'2px 8px', borderRadius:20, background:bgStatus, color:corStatus }}>
                    {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                  </span>
                  {v.status === 'pendente' && (
                    <div style={{ marginTop:8 }}>
                      <a href={`https://fugini-fic.github.io/fugini-mapa-sc/checkin.html?cod_cliente=${v.cod_cliente}&nome_cliente=${nomeEnc}&agendamento_id=${v.id}`}
                        style={{ background:'#D2001B', color:'white', border:'none', borderRadius:6,
                          padding:'6px 12px', fontSize:12, fontWeight:600, cursor:'pointer',
                          textDecoration:'none', display:'inline-block' }}>
                        📍 Check-in
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {modalAberto && (
          <div onClick={e => { if (e.target===e.currentTarget) setModalAberto(false) }}
            style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', zIndex:100,
              display:'flex', alignItems:'flex-end', justifyContent:'center' }}>
            <div style={{ background:'white', borderRadius:'16px 16px 0 0',
              padding:'24px 20px', width:'100%', maxWidth:480 }}>
              <h3 style={{ fontSize:16, fontWeight:700, marginBottom:16 }}>Nova Visita</h3>
              {[
                { label:'Cód. Cliente', val:mCod, set:setMCod, ph:'Ex: 00001', type:'text' },
                { label:'Nome Cliente', val:mNome, set:setMNome, ph:'Ex: Mercado Silva Ltda', type:'text' },
                { label:'Data', val:mData, set:setMData, ph:'', type:'date' },
                { label:'Hora (opcional)', val:mHora, set:setMHora, ph:'', type:'time' },
                { label:'Observação (opcional)', val:mObs, set:setMObs, ph:'Ex: Levar tabela de preços', type:'text' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize:13, color:'#555', display:'block', marginTop:12, marginBottom:4 }}>{f.label}</label>
                  <input type={f.type} value={f.val} placeholder={f.ph}
                    onChange={e => f.set(e.target.value)}
                    style={{ width:'100%', padding:'10px 12px', border:'1px solid #ddd',
                      borderRadius:8, fontSize:14, fontFamily:"'Segoe UI', sans-serif",
                      boxSizing:'border-box' as const }} />
                </div>
              ))}
              <div style={{ display:'flex', gap:10, marginTop:20 }}>
                <button onClick={() => setModalAberto(false)} style={{ flex:1, padding:12,
                  background:'#f5f5f5', color:'#555', border:'none', borderRadius:8,
                  fontSize:14, cursor:'pointer' }}>Cancelar</button>
                <button onClick={salvarAgendamento} style={{ flex:2, padding:12,
                  background:'#D2001B', color:'white', border:'none', borderRadius:8,
                  fontSize:14, fontWeight:600, cursor:'pointer' }}>Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
'@ | Set-Content "$base\pages\agenda.tsx" -Encoding UTF8
Write-Host "[OK] pages/agenda.tsx"

# ── .env.local ─────────────────────────────────────────────────────────────────
$envPath = "$base\.env.local"
if (-not (Test-Path $envPath)) {
  @'
NEXT_PUBLIC_SUPABASE_URL=https://pyiybinbsnouxdtnfcpe.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=COLOQUE_SUA_ANON_KEY_AQUI
'@ | Set-Content $envPath -Encoding UTF8
  Write-Host "[OK] .env.local criado — preencha a ANON_KEY"
} else {
  Write-Host "[SKIP] .env.local ja existe — adicione NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_ANON_KEY se nao tiver"
}

Write-Host ""
Write-Host "Pronto! Agora:"
Write-Host "1. Preencha a NEXT_PUBLIC_SUPABASE_ANON_KEY no .env.local"
Write-Host "2. npm run dev"
Write-Host "3. Acesse http://localhost:3000"
