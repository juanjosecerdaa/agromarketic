import nodemailer from "nodemailer";

function getEmailConfig() {
  const host = process.env.BREVO_SMTP_HOST;
  const port = Number(process.env.BREVO_SMTP_PORT);
  const user = process.env.BREVO_SMTP_USER;
  const password = process.env.BREVO_SMTP_PASSWORD;
  const from = process.env.EMAIL_FROM;

  if (!host || !Number.isInteger(port) || !user || !password || !from) {
    throw new Error("EMAIL_NOT_CONFIGURED");
  }

  return { host, port, user, password, from };
}

export async function sendPasswordResetEmail(
  recipient: string,
  resetUrl: string,
) {
  const config = getEmailConfig();
  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: {
      user: config.user,
      pass: config.password,
    },
  });

  await transporter.sendMail({
    from: config.from,
    to: recipient,
    subject: "Restablece tu contraseña de AgroMarketNIC",
    text: [
      "AgroMarketNIC",
      "",
      "Recibimos una solicitud para restablecer tu contraseña.",
      `Restablece tu contraseña aquí: ${resetUrl}`,
      "",
      "Este enlace expira en 30 minutos.",
      "Si no solicitaste este cambio, puedes ignorar este correo.",
    ].join("\n"),
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#19352b">
        <h1>AgroMarketNIC</h1>
        <p>Recibimos una solicitud para restablecer tu contraseña.</p>
        <p><a href="${resetUrl}">Restablecer contraseña</a></p>
        <p>Este enlace expira en 30 minutos.</p>
        <p>Si no solicitaste este cambio, puedes ignorar este correo.</p>
      </div>
    `,
  });
}
