import logging
import random
from django.conf import settings

logger = logging.getLogger(__name__)

class NotificationService:
    """
    Modular Notification Service for Pharmacy Management System.
    Refactored to allow seamless integration with 3rd party APIs (Twilio, MSG91, etc).
    """

    @staticmethod
    def send_invoice(sale, method="auto"):
        """
        Sends an e-invoice link to the customer via WhatsApp or SMS.
        """
        mobile = sale.customer_mobile
        if not mobile or len(str(mobile)) < 10:
            logger.warning(f"Notification skipping: No mobile for invoice {sale.invoice_number}")
            return False

        # 1. Clean and Format Mobile (Add Country Code)
        clean_mobile = str(mobile).strip()
        if len(clean_mobile) == 10:
            clean_mobile = "91" + clean_mobile

        # 2. Build Secure Dynamic Link
        frontend_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000').rstrip('/')
        invoice_url = f"{frontend_url}/public/invoice/{sale.invoice_number}"
        
        # 3. Message Templates
        whatsapp_message = (
            f"Hello {sale.customer_name},\n"
            f"Thank you for visiting our Medical Store! 🙏\n\n"
            f"📄 Invoice: {sale.invoice_number}\n"
            f"💰 Total Amount: ₹{sale.net_amount}\n"
            f"🔗 Download Invoice: {invoice_url}\n\n"
            f"Stay Healthy! ❤️"
        )

        sms_message = (
            f"Hi {sale.customer_name}, your bill {sale.invoice_number} "
            f"for Rs.{sale.net_amount} is ready. View it here: {invoice_url}"
        )

        # --- Provider Stubs (Replace with real API calls like Twilio/MSG91) ---
        def try_whatsapp():
            logger.info(f"Triggering WhatsApp Gateway -> {clean_mobile} | Content: {whatsapp_message[:50]}...")
            # Real Implementation Example:
            # response = requests.post(WHATSAPP_API_URL, json={"to": clean_mobile, "text": whatsapp_message})
            # return response.status_code == 200
            
            # Simulated failure for fallback testing
            if random.random() < 0.05:
                logger.error(f"WhatsApp Gateway Rejected Number: {clean_mobile}")
                return False
            return True
            
        def try_sms():
            logger.info(f"Triggering SMS Gateway -> {clean_mobile} | Content: {sms_message}")
            # Real Implementation Example:
            # response = requests.post(SMS_API_URL, data={"mobile": clean_mobile, "msg": sms_message})
            # return response.status_code == 200
            return True

        # --- Logic Router ---
        if method == "auto":
            success = try_whatsapp()
            if not success:
                logger.info(f"Falling back to SMS for {clean_mobile}")
                return try_sms()
            return True
        elif method == "whatsapp":
            return try_whatsapp()
        elif method == "sms":
            return try_sms()

        return False
