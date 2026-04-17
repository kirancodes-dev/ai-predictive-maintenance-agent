"""
Notification Service — sends email and Slack alerts for predictive maintenance events.

Integrates with the automation loop to deliver notifications at milestone thresholds
and on technician assignment events.
"""

import asyncio
import logging
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from typing import Dict, Any, List, Optional

import httpx

from app.config import settings

logger = logging.getLogger("notifications")


# ── Email ────────────────────────────────────────────────────────────────────

def _build_email_html(subject: str, body_lines: List[str]) -> str:
    rows = "".join(f"<tr><td style='padding:4px 8px'>{l}</td></tr>" for l in body_lines)
    return f"""
    <html>
    <body style="font-family:Arial,sans-serif;color:#333">
      <h2 style="color:#d32f2f">{subject}</h2>
      <table style="border-collapse:collapse">{rows}</table>
      <hr>
      <p style="font-size:12px;color:#999">Predictive Maintenance System — automated alert</p>
    </body>
    </html>
    """


async def send_email(subject: str, body_lines: List[str], recipients: Optional[List[str]] = None) -> bool:
    """Send an HTML email via SMTP. Runs blocking I/O in a thread."""
    if not settings.NOTIFICATION_EMAIL_ENABLED:
        return False

    to_addrs = recipients or settings.email_recipients_list
    if not to_addrs:
        logger.warning("Email notification enabled but no recipients configured")
        return False

    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL or settings.SMTP_USER
        msg["To"] = ", ".join(to_addrs)

        html = _build_email_html(subject, body_lines)
        msg.attach(MIMEText(html, "html"))

        def _send():
            with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
                server.starttls()
                if settings.SMTP_USER and settings.SMTP_PASSWORD:
                    server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(msg["From"], to_addrs, msg.as_string())

        await asyncio.get_event_loop().run_in_executor(None, _send)
        logger.info("Email sent: %s → %s", subject, to_addrs)
        return True
    except Exception as exc:
        logger.error("Failed to send email: %s", exc, exc_info=True)
        return False


# ── Slack ────────────────────────────────────────────────────────────────────

async def send_slack(text: str, blocks: Optional[List[Dict]] = None) -> bool:
    """Post a message to Slack via incoming webhook."""
    if not settings.NOTIFICATION_SLACK_ENABLED:
        return False

    webhook_url = settings.SLACK_WEBHOOK_URL
    if not webhook_url:
        logger.warning("Slack notification enabled but no webhook URL configured")
        return False

    payload: Dict[str, Any] = {"text": text}
    if blocks:
        payload["blocks"] = blocks

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.post(webhook_url, json=payload)
            resp.raise_for_status()
        logger.info("Slack message sent: %s", text[:80])
        return True
    except Exception as exc:
        logger.error("Failed to send Slack message: %s", exc, exc_info=True)
        return False


# ── High-level notification helpers (called from automation.py) ─────────────

async def notify_pre_failure_alert(payload: Dict[str, Any]) -> None:
    """Send email + Slack for a pre-failure milestone alert."""
    machine = payload.get("machineName", "Unknown")
    hours = payload.get("estimatedHoursRemaining", 0)
    failure_type = payload.get("failureType", "Unknown")
    urgency = payload.get("urgency", "unknown")
    recommendation = payload.get("recommendation", "")
    technician = payload.get("assignedTechnician", "Not assigned")

    if hours <= 1:
        time_label = f"{int(hours * 60)} minutes"
    elif hours <= 24:
        time_label = f"{hours:.0f} hours"
    else:
        time_label = f"{hours / 24:.1f} days"

    subject = f"⚠️ Pre-Failure Alert: {machine} — {time_label} remaining"

    body_lines = [
        f"<b>Machine:</b> {machine}",
        f"<b>Failure Type:</b> {failure_type}",
        f"<b>Urgency:</b> {urgency.upper()}",
        f"<b>Time Remaining:</b> {time_label}",
        f"<b>Assigned Technician:</b> {technician}",
        f"<b>Recommendation:</b> {recommendation}",
    ]

    slack_text = (
        f"⚠️ *Pre-Failure Alert*: {machine}\n"
        f"• Failure: {failure_type} | Urgency: {urgency.upper()}\n"
        f"• Time remaining: {time_label}\n"
        f"• Technician: {technician}\n"
        f"• Recommendation: {recommendation}"
    )

    await asyncio.gather(
        send_email(subject, body_lines),
        send_slack(slack_text),
        return_exceptions=True,
    )


async def notify_technician_assigned(payload: Dict[str, Any]) -> None:
    """Send email + Slack when a technician is auto-assigned."""
    machine = payload.get("machineName", "Unknown")
    tech_name = payload.get("technicianName", "Unknown")
    tech_email = payload.get("technicianEmail", "")
    work_order = payload.get("workOrderId", "N/A")

    subject = f"🔧 Technician Assigned: {tech_name} → {machine}"

    body_lines = [
        f"<b>Machine:</b> {machine}",
        f"<b>Technician:</b> {tech_name}",
        f"<b>Email:</b> {tech_email}",
        f"<b>Work Order:</b> {work_order}",
    ]

    slack_text = (
        f"🔧 *Technician Assigned*: {tech_name} → {machine}\n"
        f"• Work Order: {work_order}\n"
        f"• Contact: {tech_email}"
    )

    # Send to both channels + directly to the technician
    recipients = settings.email_recipients_list.copy()
    if tech_email and tech_email not in recipients:
        recipients.append(tech_email)

    await asyncio.gather(
        send_email(subject, body_lines, recipients=recipients),
        send_slack(slack_text),
        return_exceptions=True,
    )
