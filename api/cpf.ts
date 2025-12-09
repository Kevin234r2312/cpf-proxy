import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  try {
    const cpf = String(req.query.cpf || "").replace(/\D+/g, "");
    if (cpf.length !== 11) {
      return res.status(400).json({ success: false, error: "CPF inválido" });
    }

    const base = process.env.CPFHUB_BASE_URL;
    const token = process.env.CPFHUB_TOKEN;
    if (!base || !token) {
      return res.status(500).json({ success: false, error: "Variáveis de ambiente ausentes" });
    }

    const url = `${base}/consulta?cpf=${cpf}`; // ajuste ao endpoint do seu provedor
    const r = await fetch(url, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    });

    const raw = await r.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch {}

    if (!r.ok) {
      return res.status(r.status).json({
        success: false,
        error: data?.message || raw || "Erro no provedor",
      });
    }

    // normalize
    const name = data?.data?.name ?? data?.nome ?? "";
    const birthDate =
      data?.data?.birthDate ?? data?.data_nascimento ?? data?.nascimento ?? "";

    res.setHeader("Access-Control-Allow-Origin", "*");
    return res.status(200).json({ success: true, data: { name, birthDate } });
  } catch (e: any) {
    return res.status(500).json({ success: false, error: e?.message || "Falha inesperada" });
  }
}
