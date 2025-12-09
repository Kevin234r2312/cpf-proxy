import type { VercelRequest, VercelResponse } from "@vercel/node"

const CPFHUB_BASE = "https://api.cpfhub.io/cpf"
const API_KEY = process.env.CPFHUB_KEY || ""

// helper pra deixar só números
const onlyDigits = (v: string) => v.replace(/\D+/g, "")

const safeJson = (text: string) => {
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS pra funcionar no Framer
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization, x-api-key")

  if (req.method === "OPTIONS") {
    res.status(204).end()
    return
  }

  if (req.method !== "GET") {
    res.status(405).json({ success: false, error: "Método não permitido" })
    return
  }

  const rawCpf = (req.query.cpf || "").toString()
  const cpf = onlyDigits(rawCpf)

  if (!cpf || cpf.length !== 11) {
    res.status(400).json({
      success: false,
      error: "CPF inválido. Envie 11 dígitos no parâmetro ?cpf=...",
    })
    return
  }

  if (!API_KEY) {
    res.status(500).json({
      success: false,
      error:
        "Variável de ambiente CPFHUB_KEY não configurada. Vá em Settings > Environment Variables no Vercel e configure.",
    })
    return
  }

  try {
    const url = `${CPFHUB_BASE}/${cpf}`

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "x-api-key": API_KEY,
        Accept: "application/json",
      },
    })

    const text = await response.text()
    const json = safeJson(text) ?? { raw: text }

    // se a CPFHub respondeu erro HTTP, eu só repasso
    if (!response.ok) {
      res.status(response.status).json(
        json || {
          success: false,
          error: `Erro HTTP ${response.status}`,
        },
      )
      return
    }

    // aqui eu só devolvo pra frente o que a CPFHub mandou:
    // { success: true, data: { ... } }
    res.status(200).json(json)
  } catch (err: any) {
    console.error("Erro ao chamar CPFHub:", err)
    res.status(500).json({
      success: false,
      error: err?.message || "Erro ao chamar CPFHub",
    })
  }
}
