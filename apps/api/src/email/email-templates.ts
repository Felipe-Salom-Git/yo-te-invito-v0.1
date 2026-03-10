const APP_URL = process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000';

export function renderWelcomeEmail(firstName: string, contactEmail?: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Bienvenido</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h1 style="color:#111">Bienvenido a Yo Te Invito</h1>
  <p>Hola ${firstName},</p>
  <p>Tu cuenta fue creada correctamente.</p>
  <p><a href="${APP_URL}/home" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;text-decoration:none;border-radius:8px">Ver eventos</a></p>
  ${contactEmail ? `<p style="margin-top:32px;font-size:12px;color:#666">¿Preguntas? Contactanos: ${contactEmail}</p>` : ''}
</body>
</html>`;
  const text = `Hola ${firstName},\n\nTu cuenta fue creada correctamente.\nVer eventos: ${APP_URL}/home`;
  return { html, text };
}

export function renderOrderConfirmationEmail(
  firstName: string,
  orderId: string,
  eventTitle: string
): { html: string; text: string } {
  const ticketsUrl = `${APP_URL}/me/tickets`;
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Compra confirmada</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h1 style="color:#111">Tu compra fue confirmada</h1>
  <p>Hola ${firstName},</p>
  <p>Tu compra para <strong>${eventTitle}</strong> fue confirmada.</p>
  <p>Orden: ${orderId}</p>
  <p><a href="${ticketsUrl}" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;text-decoration:none;border-radius:8px">Ver mis tickets</a></p>
</body>
</html>`;
  const text = `Hola ${firstName},\n\nTu compra para ${eventTitle} fue confirmada. Orden: ${orderId}\nVer tickets: ${ticketsUrl}`;
  return { html, text };
}

export function renderVerificationEmail(firstName: string, verifyUrl: string): { html: string; text: string } {
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Verifica tu email</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h1 style="color:#111">Verifica tu email</h1>
  <p>Hola ${firstName},</p>
  <p>Para activar tu cuenta, hace click en el siguiente enlace:</p>
  <p><a href="${verifyUrl}" style="display:inline-block;background:#0ea5e9;color:white;padding:12px 24px;text-decoration:none;border-radius:8px">Verificar email</a></p>
  <p style="font-size:12px;color:#666">El enlace expira en 24 horas.</p>
</body>
</html>`;
  const text = `Hola ${firstName},\n\nVerifica tu email: ${verifyUrl}\n\nEl enlace expira en 24 horas.`;
  return { html, text };
}

export function renderPayoutReceivedConfirmation(
  producerName: string,
  amountCents: number,
  eventTitle: string
): { html: string; text: string } {
  const amount = (amountCents / 100).toFixed(2);
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Solicitud recibida</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h1 style="color:#111">Recibimos tu solicitud de retiro</h1>
  <p>Hola ${producerName},</p>
  <p>Recibimos tu solicitud de retiro por <strong>$${amount}</strong> del evento <strong>${eventTitle}</strong>.</p>
  <p>Te avisaremos cuando sea procesada.</p>
</body>
</html>`;
  const text = `Hola ${producerName},\n\nRecibimos tu solicitud de retiro por $${amount} del evento ${eventTitle}.`;
  return { html, text };
}

export function renderPayoutRequestEmail(
  producerName: string,
  amountCents: number,
  eventTitle: string
): { html: string; text: string } {
  const amount = (amountCents / 100).toFixed(2);
  const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>Solicitud de retiro</title></head>
<body style="font-family:sans-serif;max-width:600px;margin:0 auto;padding:20px;color:#333">
  <h1 style="color:#111">Nueva solicitud de retiro</h1>
  <p><strong>${producerName}</strong> solicitó un retiro.</p>
  <ul>
    <li>Evento: ${eventTitle}</li>
    <li>Monto: $${amount}</li>
  </ul>
</body>
</html>`;
  const text = `${producerName} solicitó un retiro de $${amount} por ${eventTitle}`;
  return { html, text };
}
