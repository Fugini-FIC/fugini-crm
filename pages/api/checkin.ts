import type { NextApiRequest, NextApiResponse } from 'next'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }

  // POST /api/checkin — registra um check-in
  if (req.method === 'POST') {
    const { cod_cliente, nome_cliente, lat_vendedor, lng_vendedor, status_visita, observacao, cod_vendedor } = req.body

    if (!cod_cliente || !nome_cliente || !lat_vendedor || !lng_vendedor || !status_visita || !cod_vendedor) {
      return res.status(400).json({ error: 'Campos obrigatórios faltando' })
    }

    const { data, error } = await supabase
      .from('checkins')
      .insert([{ cod_cliente, nome_cliente, lat_vendedor, lng_vendedor, status_visita, observacao, cod_vendedor }])
      .select()

    if (error) return res.status(500).json({ error: error.message })
    return res.status(201).json(data[0])
  }

  // GET /api/checkin — lista check-ins (opcional: filtra por cod_vendedor)
  if (req.method === 'GET') {
    const { cod_vendedor } = req.query

    let query = supabase.from('checkins').select('*').order('timestamp', { ascending: false })

    if (cod_vendedor) {
      query = query.eq('cod_vendedor', cod_vendedor as string)
    }

    const { data, error } = await query

    if (error) return res.status(500).json({ error: error.message })
    return res.status(200).json(data)
  }

  return res.status(405).json({ error: 'Método não permitido' })
}