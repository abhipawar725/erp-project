import axios from 'axios';
import { env } from '../config/env';
import { logger } from '../config/logger';
import { sendMail } from './mailer';

// ─── Types ────────────────────────────────────────────────────────────────────
interface OtpSendParams {
  channel: 'email' | 'sms';
  destination: string;
  otp: string;
  employeeId: number;
}

const MSG91_BASE = 'https://control.msg91.com/api/v5/otp';
const MSG91_AUTH = env.msg91?.authKey ?? process.env.MSG91_AUTH_KEY ?? '';
const MSG91_TMPL = env.msg91?.templateId ?? process.env.MSG91_TEMPLATE_ID ?? '';
const MSG91_LENGTH = 6;

// ─── SMS via MSG91 ────────────────────────────────────────────────────────────
async function sendSms(phone: string, otp: string): Promise<void> {
  if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV] SMS skipped for ${phone}. OTP: ${otp}`);
    return;
  }

  let mobile = phone.replace(/^\+/, '').replace(/\s+/g, '');

  if (/^\d{10}$/.test(mobile)) {
    mobile = `91${mobile}`;
  }

  if (!MSG91_AUTH || !MSG91_TMPL) {
    // Dev fallback — print to console if MSG91 not configured
    logger.warn(`[DEV] SMS OTP for ${mobile}: ${otp}`);
    return;
  }

  // MSG91 API v5
  const url = `${MSG91_BASE}?template_id=${MSG91_TMPL}&mobile=${mobile}&otp=${otp}&otp_length=${MSG91_LENGTH}&authkey=${MSG91_AUTH}`;

  const response = await axios.get(url, { timeout: 8000 });

  if (response.data?.type !== 'success') {
    logger.error(`MSG91 error for ${mobile}:`, response.data);
    throw new Error(`SMS delivery failed: ${JSON.stringify(response.data)}`);
  }

  logger.info(`SMS OTP sent to ${mobile.slice(0, -4)}****`);
}

// ─── Email OTP ────────────────────────────────────────────────────────────────
async function sendEmail(
  email: string,
  otp: string,
  employeeId: number,
): Promise<void> {
    if (process.env.NODE_ENV !== 'production') {
    logger.info(`[DEV] Email skipped for ${email}. OTP: ${otp}`);
    return;
  }

  await sendMail({
    to: email,
    subject: 'Your NexHR Login OTP',
    html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
</head>
<body style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#f5f5f5;margin:0;padding:20px">
  <div style="max-width:480px;margin:0 auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:linear-gradient(135deg,#185FA5,#1D9E75);padding:28px 32px;text-align:center">
      <div style="font-size:24px;font-weight:800;color:#fff">NexHR</div>
      <div style="font-size:12px;color:rgba(255,255,255,.7);margin-top:4px">
        Enterprise HR Suite
      </div>
    </div>

    <div style="padding:32px">
      <p style="font-size:16px;font-weight:600;color:#111;margin:0 0 8px">
        Your login code
      </p>

      <p style="font-size:14px;color:#555;margin:0 0 24px;line-height:1.5">
        Use the code below to sign in to your NexHR portal.
        This code expires in <strong>10 minutes</strong>.
      </p>

      <div style="background:#F0F7FF;border:2px solid #185FA5;border-radius:10px;padding:20px;text-align:center;margin:0 0 24px">
        <div style="font-size:36px;font-weight:800;letter-spacing:10px;color:#185FA5;font-family:'Courier New',monospace">
          ${otp}
        </div>
      </div>

      <p style="font-size:13px;color:#888;margin:0;line-height:1.6">
        If you didn't request this code, you can safely ignore this email.<br>
        Never share this code with anyone.
      </p>
    </div>

    <div style="padding:16px 32px;background:#f9f9f9;border-top:1px solid #eee;text-align:center">
      <p style="font-size:11px;color:#aaa;margin:0">
        NexHR Enterprise · This is an automated message
      </p>
    </div>
  </div>
</body>
</html>
    `.trim(),
    text: `Your NexHR login code is: ${otp}

This code expires in 10 minutes.

If you didn't request this code, you can safely ignore this email.`,
  });

  logger.info(
    `Email OTP sent to ${email.replace(/(.{2}).+(@.+)/, '$1***$2')}`,
  );
}
// ─── Main export ──────────────────────────────────────────────────────────────
export const otpService = {
  async send({ channel, destination, otp, employeeId }: OtpSendParams): Promise<void> {
    try {
      if (channel === 'sms') {
        await sendSms(destination, otp);
      } else {
        await sendEmail(destination, otp, employeeId);
      }
    } catch (err) {
      logger.error(`OTP delivery failed [${channel}] for employee ${employeeId}:`, err);
      // In dev, always print to console as fallback
      if (process.env.NODE_ENV !== 'production') {
        console.log(`\n🔑 OTP (delivery failed, fallback): ${otp}\n`);
      }
      // In prod, rethrow — caller should handle gracefully
      if (process.env.NODE_ENV === 'production') throw err;
    }
  },
};
