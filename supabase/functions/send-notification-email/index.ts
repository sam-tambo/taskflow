import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

serve(async (req) => {
  try {
    const { to, subject, taskTitle, actorName, actionText, taskUrl } = await req.json()

    const resendApiKey = Deno.env.get('RESEND_API_KEY')
    if (!resendApiKey) {
      return new Response(JSON.stringify({ error: 'RESEND_API_KEY not set' }), { status: 500 })
    }

    const html = `
      <!DOCTYPE html>
      <html>
      <body style="font-family: Inter, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #4B7C6F; padding: 20px; border-radius: 12px 12px 0 0;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Revenue Precision</h1>
        </div>
        <div style="background: white; padding: 32px; border: 1px solid #E5E7EB; border-radius: 0 0 12px 12px;">
          <p style="color: #374151; font-size: 16px; margin-top: 0;">
            <strong>${actorName}</strong> ${actionText}
          </p>
          <div style="background: #F9FAFB; border-left: 4px solid #4B7C6F; padding: 16px; border-radius: 4px; margin: 20px 0;">
            <p style="margin: 0; font-weight: 600; color: #111827;">${taskTitle}</p>
          </div>
          <a href="${taskUrl}"
             style="display: inline-block; background: #4B7C6F; color: white; padding: 12px 24px;
                    border-radius: 8px; text-decoration: none; font-weight: 600;">
            View task
          </a>
          <p style="color: #9CA3AF; font-size: 12px; margin-top: 32px;">
            You're receiving this because you have email notifications enabled in Revenue Precision.
          </p>
        </div>
      </body>
      </html>
    `

    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${resendApiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: 'Revenue Precision <notifications@revenueprecision.app>',
        to: [to],
        subject,
        html
      })
    })

    const data = await response.json()
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
      status: response.ok ? 200 : 500
    })
  } catch (error) {
    return new Response(JSON.stringify({ error: (error as Error).message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    })
  }
})
