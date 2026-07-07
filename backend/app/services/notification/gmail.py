import smtplib
from email.mime.text import MIMEText
from app.services.notification.base import BaseNotificationService
from app.config import settings
from app.logging import logger

class GmailNotificationService(BaseNotificationService):
    def send_alert(self, recipient: str, subject: str, body: str) -> bool:
        logger.info(f"Preparing caregiver alert to {recipient} - Subject: {subject}")
        
        # Build MIME Message
        msg = MIMEText(body)
        msg["Subject"] = subject
        msg["From"] = settings.SMTP_FROM_EMAIL
        msg["To"] = recipient
        
        # Check for unconfigured email credentials (common in local hackathon test runs)
        if settings.SMTP_USER == "test@gmail.com" or not settings.SMTP_PASSWORD:
            logger.warning(
                f"[MOCK EMAIL ALERT DISPATCH] To: {recipient}\n"
                f"Subject: {subject}\n"
                f"Body: {body}\n"
                "Reason: SMTP credentials not configured. Mocking success."
            )
            return True
            
        try:
            # Connect via SSL
            with smtplib.SMTP_SSL(settings.SMTP_HOST, settings.SMTP_PORT) as server:
                server.login(settings.SMTP_USER, settings.SMTP_PASSWORD)
                server.sendmail(settings.SMTP_FROM_EMAIL, [recipient], msg.as_string())
            logger.info(f"Email successfully delivered to {recipient}.")
            return True
        except Exception as e:
            logger.error(f"Failed to dispatch email alert to {recipient}: {str(e)}", exc_info=True)
            return False

# Export global instance
gmail_notification_service = GmailNotificationService()
