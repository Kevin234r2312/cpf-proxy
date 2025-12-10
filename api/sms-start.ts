// api/sms-start.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import twilio from 'twilio'

const client = twilio(
  process.env.TWILIO_ACCOUNT_SID as string,
  process.env.TWILIO_AUTH_TOKEN as string
)

const verifyServiceSid = process.env.TWILIO_VERIFY_SERVICE_SID as string

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' })
  }

  try {
    const { phone } = req.query

    if (!phone || typeof phone !== 'string') {
      return res.status(400).json({ success: false, error: 'phone é obrigatório' })
    }

    // 🔧 LIMPAR O NÚMERO
    // tira espaços, parênteses, traços etc
    let to = phone.replace(/[^\d+]/g, '')

    // se não começar com +, coloca (ex.: 5561... -> +5561...)
    if (!to.startsWith('+')) {
      to = `+${to}`
    }

    const verification = await client.verify.v2
      .services(verifyServiceSid)
      .verifications.create({
        to,
        channel: 'sms',
      })

    return res.status(200).json({
      success: true,
      to,
      status: verification.status,
      sid: verification.sid,
    })
  } catch (err: any) {
    console.error('Twilio error:', err)

    return res.status(200).json({
      success: false,
      error: {
        message: err.message || 'Erro ao enviar SMS',
        code: err.code,
        status: err.status,
      },
    })
  }
}
