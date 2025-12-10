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
  try {
    if (!client || !verifySid) {
      return res
        .status(500)
        .json({ success: false, error: "Twilio não configurado" });
    }

    const step = String(req.query.step || "");
    const phone = String(req.query.phone || "");
    const code = req.query.code ? String(req.query.code) : "";

    if (!phone) {
      return res
        .status(400)
        .json({ success: false, error: "Parâmetro 'phone' é obrigatório" });
    }

    // Garante +55... e só dígitos
    const sanitized = phone.replace(/[^\d]/g, "");
    const to = sanitized.startsWith("+" ) ? sanitized : `+${sanitized}`;

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
