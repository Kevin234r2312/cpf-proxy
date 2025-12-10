// api/sms.ts
import type { VercelRequest, VercelResponse } from '@vercel/node'
import twilio from 'twilio'

/**
 * Normaliza o telefone:
 * - pega só dígitos
 * - adiciona + no começo
 */
function normalizePhone(raw: unknown): string | null {
  if (!raw) return null

  let phone = Array.isArray(raw) ? raw[0] : String(raw)

  // deixa só números
  phone = phone.replace(/[^\d]/g, '')

  if (!phone) return null

  // garante o +
  if (!phone.startsWith('+')) {
    phone = '+' + phone
  }

  return phone
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS pro Framer conseguir chamar
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')

  if (req.method === 'OPTIONS') {
    res.status(200).end()
    return
  }

  // step = "start" (enviar SMS) ou "check" (validar código)
  const source = req.method === 'POST' ? req.body : req.query
  const step = (source.step as string) || 'start'
  const phone = normalizePhone(source.phone)
  const code = source.code ? String(source.code) : undefined

  if (!phone) {
    res.status(400).json({ success: false, error: 'Parâmetro "phone" é obrigatório' })
    return
  }

  const accountSid = process.env.TWILIO_ACCOUNT_SID
  const authToken = process.env.TWILIO_AUTH_TOKEN
  const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID

  if (!accountSid || !authToken || !verifySid) {
    res.status(500).json({
      success: false,
      error: 'Variáveis de ambiente do Twilio não configuradas no Vercel',
    })
    return
  }

  const client = twilio(accountSid, authToken)

  try {
    if (step === 'start') {
      // Envia o SMS com código
      const verification = await client.verify.v2
        .services(verifySid)
        .verifications.create({
          to: phone,
          channel: 'sms',
        })

      res.status(200).json({
        success: true,
        status: verification.status, // "pending"
      })
      return
    }

    if (step === 'check') {
      if (!code) {
        res.status(400).json({
          success: false,
          error: 'Parâmetro "code" é obrigatório quando step=check',
        })
        return
      }

      const check = await client.verify.v2
        .services(verifySid)
        .verificationChecks.create({
          to: phone,
          code,
        })

      res.status(200).json({
        success: true,
        status: check.status, // "approved" ou "pending"
        valid: check.valid,
      })
      return
    }

    // step inválido
    res.status(400).json({
      success: false,
      error: 'Parâmetro "step" inválido. Use "start" ou "check".',
    })
  } catch (err: any) {
    console.error('Twilio error', err)

    res.status(500).json({
      success: false,
      error: {
        message: err?.message ?? 'Erro interno na função de SMS',
        code: err?.code,
        status: err?.status,
      },
    })
  }
}
