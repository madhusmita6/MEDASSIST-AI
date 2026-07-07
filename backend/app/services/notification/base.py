from abc import ABC, abstractmethod

class BaseNotificationService(ABC):
    """Abstract interface class for delivering caregiver alerts."""
    
    @abstractmethod
    def send_alert(self, recipient: str, subject: str, body: str) -> bool:
        """
        Deliver alert to recipient.
        - recipient: target email or phone number
        - subject: alert title
        - body: detailed alert context
        """
        pass
