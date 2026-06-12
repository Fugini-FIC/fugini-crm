// pages/agenda.tsx
import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/router'
import Head from 'next/head'
import { supabase } from '@/lib/supabase'

const API = 'https://fugini-checkin-api.vercel.app/api'
const MESES = ['JANEIRO','FEVEREIRO','MARÇO','ABRIL','MAIO','JUNHO',
               'JULHO','AGOSTO','SETEMBRO','OUTUBRO','NOVEMBRO','DEZEMBRO']
const DIAS_SEMANA = ['DOM','SEG','TER','QUA','QUI','SEX','SÁB']
const STATUS_ICON: Record<string, string> = {
  pendente: '🕐', realizada: '✅', ausente: '❌', reagendada: '🔁'
}

interface Agendamento {
  id: string
  cod_cliente: string
  nome_cliente: string
  data_visita: string
  hora_visita?: string
  observacao?: string
  status: string
}

interface Vendedor {
  cod_vendedor: string
  nome: string
  role: string
}

export default function Agenda() {
  const router = useRouter()
  const [vendedor, setVendedor]         = useState<Vendedor | null>(null)
  const [agendamentos, setAgendamentos] = useState<Agendamento[]>([])
  const [diaSel, setDiaSel]             = useState(new Date().toISOString().split('T')[0])
  const [mesAtual, setMesAtual]         = useState(new Date())
  const [modalAberto, setModalAberto]   = useState(false)
  const [loadingAuth, setLoadingAuth]   = useState(true)

  // Form modal
  const [mCod, setMCod]   = useState('')
  const [mNome, setMNome] = useState('')
  const [mData, setMData] = useState('')
  const [mHora, setMHora] = useState('')
  const [mObs, setMObs]   = useState('')

  useEffect(() => {
    async function init() {
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
    setMesAtual(m => {
      const novo = new Date(m)
      novo.setMonth(novo.getMonth() + delta)
      return novo
    })
  }

  async function salvarAgendamento() {
    if (!mCod || !mNome || !mData || !vendedor) {
      alert('Preencha Cód. Cliente, Nome e Data.')
      return
    }
    const res = await fetch(`${API}/agendamentos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        cod_cliente: mCod, nome_cliente: mNome,
        cod_vendedor: vendedor.cod_vendedor,
        data_visita: mData, hora_visita: mHora || null,
        observacao: mObs || null,
      }),
    })
    if (res.ok || res.status === 200) {
      setModalAberto(false)
      setMCod(''); setMNome(''); setMHora(''); setMObs('')
      await carregarMes()
    } else {
      alert('Erro ao salvar. Tente novamente.')
    }
  }

  if (loadingAuth) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontFamily: "'Segoe UI', sans-serif", color: '#888' }}>
      Carregando...
    </div>
  )

  const ano = mesAtual.getFullYear()
  const mes = mesAtual.getMonth()
  const hoje = new Date().toISOString().split('T')[0]
  const primeiroDia = new Date(ano, mes, 1).getDay()
  const ultimoDia   = new Date(ano, mes+1, 0).getDate()

  const visitasDia  = agendamentos.filter(a => a.data_visita === diaSel)
  const [anoS, mesS, diaS] = diaSel.split('-')
  const nomeMes = MESES[parseInt(mesS)-1].charAt(0) + MESES[parseInt(mesS)-1].slice(1).toLowerCase()

  const statTotal     = agendamentos.length
  const statConc      = agendamentos.filter(a => a.status === 'realizada').length
  const statPend      = agendamentos.filter(a => a.status === 'pendente').length

  return (
    <>
      <Head><title>Agenda — Fugini CRM</title></Head>
      <div style={{ fontFamily: "'Segoe UI', sans-serif", background: '#f5f5f5', minHeight: '100vh' }}>

        {/* Header */}
        <div style={{
          background: '#1a1a2e', color: 'white', padding: '0 16px',
          height: 52, display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ fontSize: 16, fontWeight: 700, letterSpacing: 1 }}>
            FUGINI<span style={{ color: '#D2001B' }}>.</span>CRM
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 12, color: '#ccc' }}>👤 {vendedor?.nome}</span>
            <button onClick={sair} style={{
              fontSize: 11, color: '#aaa', background: 'none',
              border: '1px solid #444', borderRadius: 4, padding: '3px 8px', cursor: 'pointer',
            }}>Sair</button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ background: '#1a1a2e', display: 'flex', borderTop: '1px solid #333' }}>
          <a href="/painel" style={tabStyle(false)}>🗺️ Mapa</a>
          <span style={tabStyle(true)}>📅 Agenda</span>
        </div>

        <div style={{ padding: 16, maxWidth: 480, margin: '0 auto' }}>

          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, marginBottom: 16 }}>
            {[
              { label: 'Visitas', val: statTotal, color: '#222' },
              { label: 'Concluídas', val: statConc, color: '#27ae60' },
              { label: 'Pendentes', val: statPend, color: '#e67e22' },
            ].map(s => (
              <div key={s.label}>
                <div style={{ fontSize: 11, color: '#888', textTransform: 'uppercase' }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 700, color: s.color }}>{s.val}</div>
              </div>
            ))}
          </div>

          {/* Calendário */}
          <div style={{ background: 'white', borderRadius: 12, padding: 16, marginBottom: 16,
            boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
              <button onClick={() => mudarMes(-1)} style={calBtnStyle}>‹</button>
              <div style={{ fontSize: 13, fontWeight: 700, color: '#333', letterSpacing: 1 }}>
                {MESES[mes]} {ano}
              </div>
              <button onClick={() => mudarMes(1)} style={calBtnStyle}>›</button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 2 }}>
              {DIAS_SEMANA.map(d => (
                <div key={d} style={{ textAlign: 'center', fontSize: 10, fontWeight: 600,
                  color: '#aaa', padding: '4px 0', textTransform: 'uppercase' }}>{d}</div>
              ))}
              {Array.from({ length: primeiroDia }).map((_, i) => <div key={`e${i}`} />)}
              {Array.from({ length: ultimoDia }).map((_, i) => {
                const d = i + 1
                const dataStr = `${ano}-${String(mes+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`
                const visitas = agendamentos.filter(a => a.data_visita === dataStr)
                const isHoje  = dataStr === hoje
                const isSel   = dataStr === diaSel && dataStr !== hoje
                return (
                  <div key={d} onClick={() => setDiaSel(dataStr)} style={{
                    textAlign: 'center', padding: '6px 2px 4px', borderRadius: 8,
                    cursor: 'pointer', minHeight: 44, display: 'flex', flexDirection: 'column',
                    alignItems: 'center',
                    background: isHoje ? '#D2001B' : isSel ? '#fdecea' : 'transparent',
                    color: isHoje ? 'white' : '#222',
                  }}>
                    <span style={{ fontSize: 13, fontWeight: 500 }}>{d}</span>
                    {visitas.length > 0 && (
                      <div style={{ display: 'flex', gap: 2, marginTop: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
                        {visitas.slice(0,3).map((v, vi) => (
                          <span key={vi} style={{
                            width: 6, height: 6, borderRadius: '50%',
                            background: v.status === 'realizada' ? '#27ae60'
                              : v.status === 'ausente' ? '#e74c3c'
                              : v.status === 'reagendada' ? '#3498db' : '#e67e22',
                          }} />
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Lista do dia */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#222' }}>
              {parseInt(diaS)} de {nomeMes}
            </div>
            <div style={{ fontSize: 12, color: '#888' }}>
              {visitasDia.length > 0 ? `${visitasDia.length} visita${visitasDia.length > 1 ? 's' : ''}` : ''}
            </div>
          </div>

          <button onClick={() => { setMData(diaSel); setModalAberto(true) }} style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
            background: '#D2001B', color: 'white', border: 'none', borderRadius: 8,
            padding: '8px 14px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            width: '100%', marginBottom: 12,
          }}>
            + Nova Visita
          </button>

          {visitasDia.length === 0 ? (
            <div style={{ textAlign: 'center', color: '#bbb', fontSize: 13, padding: '32px 0' }}>
              Nenhuma visita neste dia
            </div>
          ) : visitasDia.map(v => {
            const hora = v.hora_visita ? v.hora_visita.substring(0,5) : ''
            const icon = STATUS_ICON[v.status] || '🕐'
            const nomeEnc = encodeURIComponent(v.nome_cliente)
            return (
              <div key={v.id} style={{
                background: 'white', borderRadius: 12, padding: '14px 16px',
                marginBottom: 10, boxShadow: '0 1px 6px rgba(0,0,0,0.07)',
                display: 'flex', gap: 12,
              }}>
                <div style={{
                  width: 36, height: 36, borderRadius: '50%', fontSize: 16,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  background: v.status === 'realizada' ? '#eafaf1'
                    : v.status === 'ausente' ? '#fdecea'
                    : v.status === 'reagendada' ? '#ebf5fb' : '#fef3e8',
                  flexShrink: 0, marginTop: 2,
                }}>{icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#222', marginBottom: 3 }}>
                    {v.nome_cliente}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 6 }}>
                    {hora ? `🕐 ${hora} · ` : ''}Cód: {v.cod_cliente}
                    {v.observacao ? <><br />{v.observacao}</> : ''}
                  </div>
                  <span style={{
                    display: 'inline-block', fontSize: 11, fontWeight: 600,
                    padding: '2px 8px', borderRadius: 20,
                    background: v.status === 'realizada' ? '#eafaf1'
                      : v.status === 'ausente' ? '#fdecea'
                      : v.status === 'reagendada' ? '#ebf5fb' : '#fef3e8',
                    color: v.status === 'realizada' ? '#27ae60'
                      : v.status === 'ausente' ? '#e74c3c'
                      : v.status === 'reagendada' ? '#3498db' : '#e67e22',
                  }}>
                    {v.status.charAt(0).toUpperCase() + v.status.slice(1)}
                  </span>
                  {v.status === 'pendente' && (
                    <div style={{ marginTop: 8 }}>
                      <a href={`https://fugini-fic.github.io/fugini-mapa-sc/checkin.html?cod_cliente=${v.cod_cliente}&nome_cliente=${nomeEnc}&agendamento_id=${v.id}`}
                        style={{
                          background: '#D2001B', color: 'white', border: 'none',
                          borderRadius: 6, padding: '6px 12px', fontSize: 12,
                          fontWeight: 600, cursor: 'pointer', textDecoration: 'none',
                          display: 'inline-block',
                        }}>
                        📍 Check-in
                      </a>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>

        {/* Modal */}
        {modalAberto && (
          <div onClick={e => { if (e.target === e.currentTarget) setModalAberto(false) }}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
              zIndex: 100, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
            }}>
            <div style={{
              background: 'white', borderRadius: '16px 16px 0 0',
              padding: '24px 20px', width: '100%', maxWidth: 480,
            }}>
              <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 16 }}>Nova Visita</h3>
              {[
                { label: 'Cód. Cliente', val: mCod, set: setMCod, ph: 'Ex: 00001', type: 'text' },
                { label: 'Nome Cliente', val: mNome, set: setMNome, ph: 'Ex: Mercado Silva Ltda', type: 'text' },
                { label: 'Data', val: mData, set: setMData, ph: '', type: 'date' },
                { label: 'Hora (opcional)', val: mHora, set: setMHora, ph: '', type: 'time' },
                { label: 'Observação (opcional)', val: mObs, set: setMObs, ph: 'Ex: Levar tabela de preços', type: 'text' },
              ].map(f => (
                <div key={f.label}>
                  <label style={{ fontSize: 13, color: '#555', display: 'block', marginTop: 12, marginBottom: 4 }}>
                    {f.label}
                  </label>
                  <input type={f.type} value={f.val} placeholder={f.ph}
                    onChange={e => f.set(e.target.value)}
                    style={{ width: '100%', padding: '10px 12px', border: '1px solid #ddd',
                      borderRadius: 8, fontSize: 14, fontFamily: "'Segoe UI', sans-serif",
                      boxSizing: 'border-box' }} />
                </div>
              ))}
              <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
                <button onClick={() => setModalAberto(false)} style={{
                  flex: 1, padding: 12, background: '#f5f5f5', color: '#555',
                  border: 'none', borderRadius: 8, fontSize: 14, cursor: 'pointer',
                }}>Cancelar</button>
                <button onClick={salvarAgendamento} style={{
                  flex: 2, padding: 12, background: '#D2001B', color: 'white',
                  border: 'none', borderRadius: 8, fontSize: 14, fontWeight: 600, cursor: 'pointer',
                }}>Salvar</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  )
}

const tabStyle = (active: boolean): React.CSSProperties => ({
  flex: 1, textAlign: 'center', padding: 10, fontSize: 13,
  color: active ? 'white' : '#aaa', textDecoration: 'none',
  borderBottom: active ? '2px solid #D2001B' : '2px solid transparent',
  cursor: 'pointer',
})

const calBtnStyle: React.CSSProperties = {
  background: 'none', border: 'none', fontSize: 18,
  cursor: 'pointer', color: '#555', padding: '4px 8px',
}
