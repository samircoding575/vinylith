import { Resend } from "resend";
import { env } from "@/env";
import { db } from "@/server/db";
import { emailLogs } from "@/server/db/schema";

const resend = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;
const FROM = env.EMAIL_FROM ?? "Vinylith <onboarding@resend.dev>";
const APP_URL = env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

type EmailType = "borrow_confirmation" | "due_reminder" | "overdue" | "password_reset";

async function log(opts: {
  userId?: string;
  toEmail: string;
  subject: string;
  type: EmailType;
  success: boolean;
  error?: string;
}) {
  await db.insert(emailLogs).values({
    userId: opts.userId ?? null,
    toEmail: opts.toEmail,
    subject: opts.subject,
    type: opts.type,
    success: opts.success,
    error: opts.error ?? null,
  });
}

async function send(opts: {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  userId?: string;
}) {
  if (!resend) {
    console.log(`[Email MOCK] To: ${opts.to} | Subject: ${opts.subject}`);
    await log({ userId: opts.userId, toEmail: opts.to, subject: opts.subject, type: opts.type, success: true });
    return;
  }
  try {
    await resend.emails.send({ from: FROM, to: opts.to, subject: opts.subject, html: opts.html });
    await log({ userId: opts.userId, toEmail: opts.to, subject: opts.subject, type: opts.type, success: true });
  } catch (err) {
    const error = (err as Error).message;
    console.error("Email send failed:", error);
    await log({ userId: opts.userId, toEmail: opts.to, subject: opts.subject, type: opts.type, success: false, error });
  }
}

// ─── Email templates ───────────────────────────────────────────────────────────

function base(content: string): string {
  return `<!DOCTYPE html><html><body style="font-family:sans-serif;background:#fafafa;padding:32px 0;margin:0">
  <div style="max-width:520px;margin:0 auto;background:#fff;border-radius:16px;border:1px solid #e5e7eb;padding:40px">
    <div style="margin-bottom:24px;display:flex;align-items:center;gap:10px">
      <div style="width:28px;height:28px;border-radius:50%;background:linear-gradient(135deg,#f59e0b,#f43f5e)"></div>
      <span style="font-weight:700;font-size:18px;color:#111">Vinylith</span>
    </div>
    ${content}
    <div style="margin-top:32px;padding-top:24px;border-top:1px solid #f3f4f6;font-size:12px;color:#9ca3af">
      Vinylith · Library of Curiosities
    </div>
  </div>
</body></html>`;
}

export async function sendBorrowConfirmation(opts: {
  to: string;
  userId: string;
  userName: string;
  itemTitle: string;
  dueAt: Date;
}) {
  const due = opts.dueAt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  await send({
    to: opts.to,
    userId: opts.userId,
    type: "borrow_confirmation",
    subject: `You've borrowed "${opts.itemTitle}"`,
    html: base(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#111">Happy reading, ${opts.userName}! 📚</h2>
      <p style="color:#374151">You've successfully checked out <strong>${opts.itemTitle}</strong>.</p>
      <div style="background:#f9fafb;border-radius:10px;padding:16px;margin:20px 0">
        <div style="font-size:13px;color:#6b7280;margin-bottom:4px">Due date</div>
        <div style="font-weight:600;color:#111;font-size:16px">${due}</div>
      </div>
      <p style="color:#6b7280;font-size:14px">Late returns accrue a $0.25/day fee (max $10.00). Return on time to avoid charges.</p>
      <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:8px;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-size:14px;font-weight:600">View my dashboard</a>
    `),
  });
}

export async function sendDueReminder(opts: {
  to: string;
  userId: string;
  userName: string;
  itemTitle: string;
  dueAt: Date;
  daysLeft: number;
}) {
  const due = opts.dueAt.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const urgency = opts.daysLeft === 0 ? "⚠️ Due today" : opts.daysLeft < 0 ? "🚨 Overdue" : `📅 Due in ${opts.daysLeft} day${opts.daysLeft > 1 ? "s" : ""}`;
  await send({
    to: opts.to,
    userId: opts.userId,
    type: opts.daysLeft < 0 ? "overdue" : "due_reminder",
    subject: `${urgency}: "${opts.itemTitle}"`,
    html: base(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#111">${urgency}</h2>
      <p style="color:#374151">This is a reminder that <strong>${opts.itemTitle}</strong> is ${opts.daysLeft < 0 ? "overdue" : `due on ${due}`}.</p>
      ${opts.daysLeft < 0 ? `<div style="background:#fef2f2;border:1px solid #fecaca;border-radius:10px;padding:16px;margin:20px 0;color:#991b1b">
        Late fees of $0.25/day are accruing. Please return the item and settle any outstanding fees.
      </div>` : ""}
      <a href="${APP_URL}/dashboard" style="display:inline-block;margin-top:8px;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-size:14px;font-weight:600">Go to dashboard</a>
    `),
  });
}

export async function sendPasswordReset(opts: {
  to: string;
  userId: string;
  userName: string;
  token: string;
}) {
  const url = `${APP_URL}/reset-password?token=${opts.token}`;
  await send({
    to: opts.to,
    userId: opts.userId,
    type: "password_reset",
    subject: "Reset your Vinylith password",
    html: base(`
      <h2 style="margin:0 0 12px;font-size:22px;color:#111">Reset your password</h2>
      <p style="color:#374151">Hi ${opts.userName}, we received a request to reset your password.</p>
      <p style="color:#374151">Click the button below — this link expires in <strong>1 hour</strong>.</p>
      <a href="${url}" style="display:inline-block;margin-top:12px;background:#111;color:#fff;text-decoration:none;padding:12px 24px;border-radius:50px;font-size:14px;font-weight:600">Reset password</a>
      <p style="margin-top:20px;color:#9ca3af;font-size:13px">If you didn't request this, you can safely ignore this email.</p>
    `),
  });
}
