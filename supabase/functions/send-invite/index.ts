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

    const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')
    if (!RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY environment variable is not set')
    }

    const emailHtml = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>You have been invited</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f4f4f5; margin: 0; padding: 0; }
    .container { max-width: 560px; margin: 40px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .header { background: #18181b; padding: 32px; text-align: center; }
    .header h1 { color: #ffffff; margin: 0; font-size: 24px; font-weight: 600; }
    .body { padding: 40px 32px; }
    .body p { color: #3f3f46; font-size: 16px; line-height: 1.6; margin: 0 0 16px; }
    .button { display: inline-block; background: #18181b; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-size: 16px; font-weight: 600; margin: 8px 0 24px; }
    .footer { padding: 24px 32px; border-top: 1px solid #e4e4e7; text-align: center; }
    .footer p { color: #a1a1aa; font-size: 13px; margin: 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>Revenue Precision</h1>
    </div>
    <div class="body">
      <p>Hi there,</p>
      <p><strong>${inviterName}</strong> has invited you to join the <strong>${workspaceName}</strong> workspace on Revenue Precision.</p>
      <p>Click the button below to accept the invitation and get started:</p>
      <a href="${inviteLink}" class="button">Accept Invitation</a>
      <p>Or copy and paste this link into your browser:</p>
      <p style="word-break: break-all; color: #71717a; font-size: 14px;">${inviteLink}</p>
      <p>This invitation link will expire in 7 days. If you did not expect this invitation, you can safely ignore this email.</p>
    </div>
    <div class="footer">
      <p>Revenue Precision &mdash; Task Management for Teams</p>
    </div>
  </div>
</body>
</html>
`

    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'Revenue Precision <invites@revenueprecision.com>',
        to: [email],
        subject: `${inviterName} invited you to join ${workspaceName}`,
        html: emailHtml,
      }),
    })

    const resendData = await resendResponse.json()

    if (!resendResponse.ok) {
      console.error('Resend API error:', resendData)
      throw new Error(`Failed to send email: ${resendData.message || JSON.stringify(resendData)}`)
    }

    return new Response(
      JSON.stringify({ success: true, messageId: resendData.id }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error sending invite email:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to send invite email' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})
