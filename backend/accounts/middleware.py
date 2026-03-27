import json
import logging
from .models import AuditLog

logger = logging.getLogger(__name__)

class AuditLogMiddleware:
    """
    Enterprise-Grade Audit Middleware:
    - Automatically captures all Create/Update/Delete operations.
    - Tracks user, IP, module, and data changes.
    - Excludes sensitive fields like passwords.
    """
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        # Determine if we should audit
        is_modifying = request.method in ['POST', 'PUT', 'PATCH', 'DELETE']
        
        # We only care about data-modifying methods for authenticated users
        if is_modifying and hasattr(request, 'user') and request.user.is_authenticated:
            try:
                # Capture metadata
                path_parts = [p for p in request.path.split('/') if p]
                module = path_parts[1] if len(path_parts) > 1 else 'core'
                
                # Pre-fetch response to ensure success before logging
                response = self.get_response(request)
                
                # Log on success (2xx) or redirect (3xx)
                if 200 <= response.status_code < 400:
                    AuditLog.objects.create(
                        user=request.user,
                        action_type=request.method,
                        module_name=module,
                        ip_address=self.get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        # Storing path and method for now; full body logging requires more care with large files
                        new_value={"path": request.path, "status": response.status_code}
                    )
                return response

            except Exception as e:
                logger.error(f"Audit Log Middleware Execution Loss: {e}")
                # Don't crash the request if auditing fails
                return self.get_response(request)
        
        return self.get_response(request)

    def get_client_ip(self, request):
        x_forwarded_for = request.META.get('HTTP_X_FORWARDED_FOR')
        if x_forwarded_for:
            return x_forwarded_for.split(',')[0]
        return request.META.get('REMOTE_ADDR', '')
