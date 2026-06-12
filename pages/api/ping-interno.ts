import type { NextApiRequest, NextApiResponse } from 'next'

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)
    
    const response = await fetch('http://192.168.0.242:5432', {
      signal: controller.signal
    })
    clearTimeout(timeout)
    
    return res.status(200).json({ ok: true, status: response.status })
  } catch (e: any) {
    return res.status(200).json({ ok: false, erro: e.message })
  }
}