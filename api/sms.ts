// api/sms.ts
import type { VercelRequest, VercelResponse } from "@vercel/node";
import twilio from "twilio";

const accountSid = process.env.TWILIO_ACCOUNT_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const verifySid = process.env.TWILIO_VERIFY_SERVICE_SID;

if (!accountSid || !authToken || !verifySid) {
  console.error("Faltam variáveis de ambiente do Twilio");
}

const client = accountSid && authToken ? twilio(accountSid, authToken) : null;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // 🔹 CORS – ISSO É O QUE TAVA FALTANDO
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    // Pré-flight do navegador
    res.status(200).end();
    return;
  }

  try {
    if (!client || !verifySid) {
      return res
        .status(500)
        .json({ success: false, error: "Twilio não configurado" });
    }

    const step = String(req.query.step || "");
    const rawPhone = String(req.query.phone || "").trim();
    const code = req.query.code ? String(req.query.code) : "";

    if (!rawPhone) {
      return res
        .status(400)
        .json({ success: false, error: "Parâmetro 'phone' é obrigatório" });
    }

    // 🔹 Normaliza telefone para formato E.164 (+55...)
    const digits = rawPhone.replace(/[^\d]/g, "");

    let to: string;
    if (rawPhone.startsWith("+")) {
      // Já veio no formato +55...
      to = rawPhone;
    } else if (digits.startsWith("55")) {
      // Já tem DDI 55, só falta o +
      to = `+${digits}`;
    } else {
      // Sem DDI -> assume Brasil
      to = `+55${digits}`;
    }

    // 1) Enviar SMS
    if (step === "start") {
      const verification = await client.verify.v2
        .services(verifySid)
        .verifications.create({
          to,
          channel: "sms",
        });

      return res.status(200).json({
        success: true,
        type: "start",
        status: verification.status,
        sid: verification.sid,
        to,
      });
    }

    // 2) Checar código
    if (step === "check") {
      if (!code) {
        return res
          .status(400)
          .json({ success: false, error: "Parâmetro 'code' é obrigatório" });
      }

      const check = await client.verify.v2
        .services(verifySid)
        .verificationChecks.create({
          to,
          code,
        });

      return res.status(200).json({
        success: true,
        type: "check",
        status: check.status,
        valid: check.status === "approved",
      });
    }

    return res
      .status(400)
      .json({ success: false, error: "Parâmetro 'step' inválido" });
  } catch (err: any) {
    console.error("Erro Twilio SMS:", err);
    return res.status(500).json({
      success: false,
      error: err?.message || "Erro interno",
      twilioCode: err?.code || null,
    });
  }
}
