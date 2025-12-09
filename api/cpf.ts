export const config = { runtime: "edge" };

export default async function handler(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const cpf = (searchParams.get("cpf") || "").replace(/\D+/g, "");
    if (cpf.length !== 11) return j({ success:false, error:"CPF inválido" }, 400);

    const base = process.env.CPFHUB_BASE_URL;   // ex: https://api.cpfhub.com
    const token = process.env.CPFHUB_TOKEN;     // seu token do provedor
    if (!base || !token) return j({ success:false, error:"ENV faltando" }, 500);

    // Ajuste o caminho/params conforme seu provedor (GET/POST)
    const url = `${base}/consulta?cpf=${cpf}`;

    const r = await fetch(url, {
      method: "GET",
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" }
    });

    const raw = await r.text();
    let data: any = {};
    try { data = JSON.parse(raw); } catch {}

    if (!r.ok) return j({ success:false, error: data?.message || raw || "Erro no provedor" }, r.status);

    // Normaliza resposta
    const name = data?.data?.name ?? data?.nome ?? "";
    const birthDate = data?.data?.birthDate ?? data?.data_nascimento ?? data?.nascimento ?? "";

    return j({ success:true, data:{ name, birthDate } });
  } catch (e: any) {
    return j({ success:false, error: e?.message || "Falha inesperada" }, 500);
  }
}

function j(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json", "Access-Control-Allow-Origin": "*" }
  });
}
