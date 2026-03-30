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
                path_parts = [p for p in request.path.strip('/').split('/') if p]
                # Extract module name (api/module/...)
                module = 'system'
                if len(path_parts) > 0:
                    if path_parts[0] == 'api' and len(path_parts) > 1:
                        module = path_parts[1]
                    else:
                        module = path_parts[0]
                
                # Pre-fetch response to ensure success before logging
                response = self.get_response(request)
                
                # Log on success (2xx) or redirect (3xx)
                if 200 <= response.status_code < 400:
                    # Capture request body safely
                    payload = {}
                    if request.method in ['POST', 'PUT', 'PATCH']:
                        # Only parse JSON if content type matches and body is not massive
                        content_type = request.META.get('CONTENT_TYPE', '')
                        if 'application/json' in content_type and len(request.body) < 100000:
                            try:
                                payload = json.loads(request.body)
                                # Remove sensitive fields
                                sensitive_keys = ['password', 'token', 'access', 'refresh', 'otp', 'old_password', 'new_password']
                                for key in sensitive_keys:
                                    if key in payload: payload[key] = '[REDACTED]'
                            except Exception:
                                payload = {"status": "unparseable_json"}
                        elif 'multipart' in content_type:
                            payload = {"status": "multipart_data_skipped"}

                    AuditLog.objects.create(
                        user=request.user,
                        action_type=request.method,
                        module_name=module,
                        ip_address=self.get_client_ip(request),
                        user_agent=request.META.get('HTTP_USER_AGENT', ''),
                        new_value={
                            "path": request.path, 
                            "status": response.status_code,
                            "payload": payload
                        }
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
