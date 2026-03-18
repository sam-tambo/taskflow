import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface InvitePayload {
  email: string
  inviteLink: string
  workspaceName: string
  inviterName: string
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { email, inviteLink, workspaceName, inviterName }: InvitePayload = await req.json()

    if (!email || !inviteLink || !workspaceName || !inviterName) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: email, inviteLink, workspaceName, inviterName' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const fromAddress = Deno.env.get('RESEND_FROM_EMAIL') ?? 'TaskFlow <onboarding@resend.dev>'

    const html = buildEmailHtml({ email, inviteLink, workspaceName, inviterName })
    const text = buildEmailText({ inviteLink, workspaceName, inviterName })

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: fromAddress,
        to: [email],
        subject: `${inviterName} invited you to join ${workspaceName} on TaskFlow`,
        html,
        text,
      }),
    })

    const result = await response.json()

    if (!response.ok) {
      console.error('Resend API error:', result)
      return new Response(
        JSON.stringify({ error: result.message ?? 'Failed to send email' }),
        { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({ success: true, id: result.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    console.error('Edge function error:', message)
    return new Response(
      JSON.stringify({ error: message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

function buildEmailHtml({
  inviteLink,
  workspaceName,
  inviterName,
}: Omit<InvitePayload, 'email'>): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You're invited to ${workspaceName}</title>
</head>
<body style="margin:0;padding:0;background:#F8FAFC;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F8FAFC;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="520" cellpadding="0" cellspacing="0" style="max-width:520px;width:100%;">
          <tr>
            <td align="center" style="padding-bottom:32px;">
              <table cellpadding="0" cellspacing="0">
                <tr>
                  <td style="background:#F97316;border-radius:14px;padding:14px 18px;">
                    <span style="color:#fff;font-size:20px;font-weight:700;letter-spacing:-0.5px;">TaskFlow</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#fff;border-radius:20px;border:1px solid #E2E8F0;overflow:hidden;">
              <tr>
                <td style="background:linear-gradient(135deg,#F97316,#FB923C);height:6px;display:block;"></td>
              </tr>
              <tr>
                <td style="padding:40px 40px 32px;">
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
                    <tr>
                      <td style="background:#FFF7ED;border-radius:14px;padding:14px;display:inline-block;">
                        <span style="font-size:28px;line-height:1;">&#128203;</span>
                      </td>
                    </tr>
                  </table>
                  <h1 style="margin:0 0 8px;font-size:24px;font-weight:700;color:#0F172A;line-height:1.3;">
                    You're invited to join<br>${workspaceName}
                  </h1>
                  <p style="margin:0 0 32px;font-size:16px;color:#64748B;line-height:1.6;">
                    <strong style="color:#374151;">${inviterName}</strong> has invited you to collaborate
                    on <strong style="color:#374151;">${workspaceName}</strong> in TaskFlow.
                  </p>
                  <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
                    <tr>
                      <td style="background:#F97316;border-radius:12px;">
                        <a href="${inviteLink}" style="display:block;padding:16px 36px;color:#fff;font-size:16px;font-weight:600;text-decoration:none;letter-spacing:-0.2px;white-space:nowrap;">
                          Accept invitation &#8594;
                        </a>
                      </td>
                    </tr>
                  </table>
                  <hr style="border:none;border-top:1px solid #F1F5F9;margin:0 0 24px;">
                  <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#374151;text-transform:uppercase;letter-spacing:0.5px;">
                    What is TaskFlow?
                  </p>
                  <p style="margin:0 0 24px;font-size:14px;color:#64748B;line-height:1.6;">
                    TaskFlow is a modern task management platform — organize projects in List,
                    Board, Timeline, or Calendar view. Collaborate with your team in real time.
                  </p>
                  <div style="background:#F8FAFC;border-radius:10px;padding:16px;border:1px solid #E2E8F0;">
                    <p style="margin:0 0 6px;font-size:12px;color:#94A3B8;">
                      Button not working? Copy and paste this link:
                    </p>
                    <p style="margin:0;font-size:12px;color:#F97316;word-break:break-all;font-family:monospace;">
                      ${inviteLink}
                    </p>
                  </div>
                </td>
              </tr>
              <tr>
                <td style="background:#F8FAFC;padding:20px 40px;border-top:1px solid #F1F5F9;">
                  <p style="margin:0;font-size:12px;color:#94A3B8;line-height:1.5;">
                    This invitation expires in 7 days. If you weren't expecting this email,
                    you can safely ignore it.
                  </p>
                </td>
              </tr>
            </td>
          </tr>
          <tr>
            <td align="center" style="padding-top:24px;">
              <p style="margin:0;font-size:12px;color:#94A3B8;">Sent by TaskFlow</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim()
}

function buildEmailText({
  inviteLink,
  workspaceName,
  inviterName,
}: Omit<InvitePayload, 'email'>): string {
  return `
You're invited to join ${workspaceName} on TaskFlow

${inviterName} has invited you to collaborate on ${workspaceName}.

Accept your invitation here:
${inviteLink}

This invitation expires in 7 days.

---
If you weren't expecting this, you can safely ignore this email.
  `.trim()
}
