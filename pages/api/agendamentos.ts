import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, DELETE, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') return res.status(200).end()

  // POST /api/agendamentos — cria agendamento (ignora duplicata)
  if (req.method === 'POST') {
    const { cod_cliente, nome_cliente, cod_vendedor, data_visita, hora_visita, observacao } = req.body

    if (!cod_cliente || !nome_cliente || !cod_vendedor || !data_visita) {
      return res.status(400).json({ error: 'Campos obrigatórios: cod_cliente, nome_cliente, cod_vendedor, data_visita' })
    }

    const { data, error } = await supabase
      .from('agendamentos')
      .upsert(
        [{ cod_cliente, nome_cliente, cod_vendedor, data_visita, hora_visita, observacao }],
        { onConflict: 'cod_cliente,data_visita,cod_vendedor', ignoreDuplicates: true }
      )
      .select()

    if (error) return res.status(500).json({ error: error.message })

    // ignoreDuplicates: true — se já existia, data vem vazio
    if (!data || data.length === 0) {
      return res.status(200).json({ skipped: true, message: 'Agendamento já existe para este cliente nesta data.' })
    }

    return res.status(201).json(data[0])
  }

  // GET /api/agendamentos?cod_vendedor=X&mes=2026-06 — lista agendamentos do vendedor no mês
  if (req.method === 'GET') {
    const { cod_vendedor, mes } = req.query

    if (!cod_vendedor) {
      return res.status(400).json({ error: 'cod_vendedor obrigatório' })
    }

    let query = supabase
      .from('agendamentos')
      .select('*')
      .eq('cod_vendedor', cod_vendedor as string)
      .order('data_visita', { ascending: true })
      .order('hora_visita', { ascending: true })

    if (mes) {
      const [ano, m] = (mes as string).split('-')
      const inicio = `${ano}-${m}-01`
      const ultimoDia = new Date(parseInt(ano), parseInt(m), 0).getDate()
      const fim = `${ano}-${m}-${ultimoDia.toString().padStart(2, '0')}`
      query = query.gte('data_visita', inicio).lte('data_visita', fim)
    }

    const { data, error } = await query
    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  // PATCH /api/agendamentos?id=X — atualiza status de um agendamento
  if (req.method === 'PATCH') {
    const { id } = req.query
    const { status, checkin_id } = req.body

    if (!id) return res.status(400).json({ error: 'id obrigatório' })

    const updates: any = {}
    if (status)     updates.status     = status
    if (checkin_id) updates.checkin_id = checkin_id

    const { data, error } = await supabase
      .from('agendamentos')
      .update(updates)
      .eq('id', id as string)
      .select()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data[0])
  }

  // DELETE /api/agendamentos?id=X — remove agendamento
  if (req.method === 'DELETE') {
    const { id } = req.query

    if (!id) return res.status(400).json({ error: 'id obrigatório' })

    const { error } = await supabase
      .from('agendamentos')
      .delete()
      .eq('id', id as string)

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json({ deleted: true })
  }

  return res.status(405).json({ error: 'Método não permitido' })
}