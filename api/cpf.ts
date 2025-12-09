// /api/cpf.ts
export default async function handler(req: any, res: any) {
  // CORS básico
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type,Authorization");
  if (req.method === "OPTIONS") return res.status(204).end();

  try {
    const BASE = process.env.CPFHUB_BASE_URL;
    const TOKEN = process.env.CPFHUB_TOKEN;

    const cpf = String(req.query.cpf || "").replace(/\D+/g, "");
    if (!cpf || cpf.length !== 11) {
      return res.status(400).json({ success: false, error: "CPF inválido" });
    }
    if (!BASE || !TOKEN) {
      return res.status(500).json({
        success: false,
        error: "ENV ausentes: CPFHUB_BASE_URL/CPFHUB_TOKEN",
      });
    }

    const upstream = await fetch(`${BASE}/cpf/${cpf}`, {
      method: "GET",
      headers: {
        Accept: "application/json",
        Authorization: `Bearer ${TOKEN}`,
      },
    });

    const text = await upstream.text();
    let data: any = text;
    try { data = JSON.parse(text); } catch {}

    if (!upstream.ok) {
      return res
        .status(upstream.status)
        .json({ success: false, error: data?.error || text });
    }

    return res.status(200).json({ success: true, data });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "Erro inesperado" });
  }
}
