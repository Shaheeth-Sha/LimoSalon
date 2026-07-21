const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  // Fixed: Gmail's SMTP server resolves to both an IPv4 and IPv6
  // address. On Render (and several other cloud hosts), outbound
  // IPv6 routing is broken/unreachable, so Node's socket connection
  // attempt over IPv6 just hangs until it times out (ETIMEDOUT,
  // ESOCKET) — even though the credentials and everything else is
  // completely correct. Forcing IPv4 (family: 4) skips the broken
  // IPv6 path entirely and connects over the working IPv4 route.
  family: 4,
});

const sendEmail = async ({ to, subject, html }) => {
  try {
    await transporter.sendMail({
      from: `LimoSalon <${process.env.EMAIL_USER}>`,
      to,
      subject,
      html,
    });

    console.log(`Email sent successfully to ${to}`);
  } catch (error) {
    console.error("Email sending failed:", error);
    throw error;
  }
};

module.exports = sendEmail;