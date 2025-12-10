// api/sms-start.ts
export default async function handler(req: any, res: any) {
  try {
    const phone = (req.query.phone as string) || ""

    if (!phone) {
      return res.status(400).json({ success: false, error: "phone obrigatório" })
    }

    const accountSid = process.env.TWILIO_ACCOUNT_SID
    const authToken = process.env.TWILIO_AUTH_TOKEN
    const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID

    if (!accountSid || !authToken || !serviceSid) {
      return res.status(500).json({ success: false, error: "ENV Twilio faltando" })
    }

    const auth = Buffer.from(`${accountSid}:${authToken}`).toString("base64")

    const body = new URLSearchParams()
    body.append("To", phone)           // ex: +5511999999999
    body.append("Channel", "sms")

    const twilioRes = await fetch(
      `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`,
      {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      }
    )

    const data = await twilioRes.json()

    if (!twilioRes.ok) {
      return res
        .status(twilioRes.status)
        .json({ success: false, error: data })
    }

    return res.status(200).json({ success: true, data })
  } catch (err: any) {
    console.error(err)
    return res
      .status(500)
      .json({ success: false, error: err?.message || "Erro interno" })
  }
}
