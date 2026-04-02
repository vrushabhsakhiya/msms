from rest_framework.decorators import api_view, permission_classes, authentication_classes, throttle_classes
from rest_framework.throttling import AnonRateThrottle
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.core.mail import send_mail
from django.conf import settings
from rest_framework_simplejwt.tokens import RefreshToken
import secrets
import string
import logging

from .serializers import RegisterSerializer, LoginSerializer, UserSerializer, UserRoleSerializer, ShopRegisterSerializer, AuditLogSerializer
from .models import User, UserRole, Shop, LoginOTP, ResetOTP, SystemSettings, AuditLog
from .permissions import IsAdminUser

logger = logging.getLogger(__name__)

# --- Helper Functions ---
def generate_secure_otp(length=8):
    """Generates a cryptographically secure complex OTP"""
    import secrets
    import string
    chars = string.ascii_uppercase + string.digits
    return "".join(secrets.choice(chars) for _ in range(length))


# --- Shop & Auth Views ---
@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
@throttle_classes([AnonRateThrottle])
def register_shop(request):
    serializer = ShopRegisterSerializer(data=request.data)
    if serializer.is_valid():
        serializer.save()
        return Response({"message": "Shop and Admin user created successfully!"}, status=201)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def register_user(request):
    shop = request.user.shop
    current_count = User.objects.filter(shop=shop).count()
    if current_count >= shop.staff_limit:
        return Response({"error": f"You have reached your maximum staff limit ({shop.staff_limit}). Contact Super Admin."}, status=403)

    data = request.data.copy()
    data['shop'] = shop.id

    serializer = RegisterSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()

        # Send welcome email
        try:
            login_url = getattr(settings, 'FRONTEND_URL', 'http://localhost:3000')
            raw_password = request.data.get('password', '')
            shop_name = request.user.shop.name

            subject = f"Welcome to {shop_name} — Your Login Credentials"
            message = (
                f"Hello {user.username},\n\n"
                f"Your staff account has been created for {shop_name}.\n\n"
                f"  🔗 Login Page : {login_url}\n"
                f"  👤 Username   : {user.username}\n"
                f"  🔑 Password   : {raw_password}\n\n"
                f"Please login and change your password immediately.\n\n"
                f"Regards,\n{shop_name} Admin"
            )
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        except Exception as e:
            logger.error(f"Failed to send welcome email to {user.email}: {e}")

        return Response({"message": f"Staff account created. Credentials sent to {user.email}."}, status=201)
    return Response(serializer.errors, status=400)


class AuthAttemptThrottle(AnonRateThrottle):
    scope = 'auth_attempt'

@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
@throttle_classes([AuthAttemptThrottle])
def login_user(request):
    serializer = LoginSerializer(data=request.data)
    if serializer.is_valid():
        return Response(serializer.validated_data, status=200)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
def verify_login_otp(request):
    from .serializers import VerifyLoginSerializer
    serializer = VerifyLoginSerializer(data=request.data, context={'request': request})
    if serializer.is_valid():
        return Response(serializer.validated_data, status=200)
    return Response(serializer.errors, status=400)


@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
@throttle_classes([AuthAttemptThrottle])
def resend_login_otp(request):
    email = request.data.get("email")
    if not email:
        return Response({"error": "Email is required."}, status=400)
    
    user = User.objects.filter(email__iexact=email).order_by('-last_login').first()
    if not user:
        # Prevent Account Enumeration Reconnaissance
        return Response({"message": "If that account exists, a fresh OTP has been sent."})

    LoginOTP.objects.filter(user=user, is_used=False).update(is_used=True)
    LoginOTP.objects.create(user=user, otp=complex_otp)
    logger.info(f"Resent 2FA OTP for {user.email}")

    subject = "Replacement Login OTP - MSMS Medical Store"
    message = (
        f"Hello {user.full_name or user.username},\n\n"
        f"Your New Security Code: {complex_otp}\n\n"
        f"This code will expire in exactly 3 minutes.\n"
    )
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
    except Exception as e:
        logger.error(f"Email failure on OTP resend: {e}")
        
    return Response({"message": "If that account exists, a fresh OTP has been sent."})


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_users(request):
    users = User.objects.filter(shop=request.user.shop).order_by('-date_joined')
    serializer = UserSerializer(users, many=True)
    return Response({"users": serializer.data, "staff_limit": request.user.shop.staff_limit})


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def delete_user(request, id):
    try:
        user = User.objects.get(id=id, shop=request.user.shop) # VULNERABILITY PATCHED: Added shop boundary
        if user.is_superuser:
            return Response({"error": "Cannot delete superuser"}, status=403)
        user.delete()
        return Response({"message": "User deleted"}, status=204)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


@api_view(['PUT'])
@permission_classes([IsAuthenticated, IsAdminUser])
def update_user(request, id):
    try:
        user = User.objects.get(id=id, shop=request.user.shop)
        
        email = request.data.get('email')
        if email and email != user.email and User.objects.filter(email=email).exists():
            return Response({'error': 'Email already exists.'}, status=400)
                
        mobile = request.data.get('mobile')
        if mobile and mobile != user.mobile and User.objects.filter(mobile=mobile).exists():
            return Response({'error': 'Mobile already exists.'}, status=400)

        serializer = UserSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            user = serializer.save()
            
            if 'custom_role' in request.data and not request.data['custom_role']:
                user.custom_role = None
            if 'password' in request.data and request.data['password']:
                user.set_password(request.data['password'])
            if 'is_active' in request.data:
                user.is_active = str(request.data['is_active']).lower() == 'true'

            user.save()
            return Response(UserSerializer(user).data)
        return Response(serializer.errors, status=400)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


# --- Dynamic Role Views ---
@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated, IsAdminUser])
def manage_roles(request):
    if request.method == 'GET':
        roles = UserRole.objects.filter(shop=request.user.shop)
        serializer = UserRoleSerializer(roles, many=True)
        return Response(serializer.data)
    
    if request.method == 'POST':
        data = request.data.copy()
        data['shop'] = request.user.shop.id
        serializer = UserRoleSerializer(data=data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data, status=201)
        return Response(serializer.errors, status=400)


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated, IsAdminUser])
def role_detail(request, id):
    try:
        # VULNERABILITY PATCHED (IDOR): Forced request.user.shop isolation
        role = UserRole.objects.get(id=id, shop=request.user.shop) 
    except UserRole.DoesNotExist:
        return Response({"error": "Role not found"}, status=404)
        
    if request.method == 'PUT':
        serializer = UserRoleSerializer(role, data=request.data)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=400)
        
    if request.method == 'DELETE':
        role.delete()
        return Response(status=204)


# --- Authentication Enhancements ---
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def logout_user(request):
    try:
        refresh_token = request.data.get("refresh")
        token = RefreshToken(refresh_token)
        token.blacklist()
        return Response({"message": "Successfully logged out"}, status=200)
    except Exception as e:
        logger.warning(f"Logout Failure: {e}")
        return Response({"error": "Invalid token"}, status=400)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    user = request.user
    old_password = request.data.get("old_password")
    new_password = request.data.get("new_password")
    
    if not user.check_password(old_password):
        return Response({"error": "Wrong old password"}, status=400)
    
    user.set_password(new_password)
    user.save()
    return Response({"message": "Password changed successfully"}, status=200)


@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
@throttle_classes([AuthAttemptThrottle])
def forgot_password(request):
    email = request.data.get("email")
    try:
        user_matches = list(User.objects.filter(email=email))
        if not user_matches: raise User.DoesNotExist
        user = user_matches[0]
        
        # Secure Cryptographic OTP Generation (No random.randint!)
        sys_rand = secrets.SystemRandom()
        otp = str(sys_rand.randint(100000, 999999))
        
        ResetOTP.objects.filter(user=user, is_used=False).update(is_used=True) 
        ResetOTP.objects.create(user=user, otp=otp)
        
        subject = "Password Reset OTP - MSMS"
        message = f"Your OTP for password reset is: {otp}\n\nThis OTP is valid for 10 minutes."
        
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        return Response({"message": "If that account exists, an OTP has been sent."}, status=200)
        
    except User.DoesNotExist:
        # Vulnerability Patched: Stop Account Enumeration by always returning generic success
        return Response({"message": "If that account exists, an OTP has been sent."}, status=200)
    except Exception as e:
        logger.error(f"Password reset failed: {e}")
        return Response({"error": "An internal error occurred. Try again later."}, status=500)


@api_view(['POST'])
@permission_classes([])
@authentication_classes([])
def reset_password(request):
    email = request.data.get("email")
    otp = request.data.get("otp")
    new_password = request.data.get("new_password")
    
    try:
        user_matches = list(User.objects.filter(email=email))
        if not user_matches: raise User.DoesNotExist
        user = user_matches[0]
        for u in user_matches:
            rec = ResetOTP.objects.filter(user=u, otp=otp, is_used=False).order_by('-created_at').first()
            if rec:
                user = u
                break

        otp_record = ResetOTP.objects.filter(user=user, otp=otp, is_used=False).order_by('-created_at').first()
        
        if not otp_record:
            return Response({"error": "Invalid or expired OTP"}, status=400)

        if not otp_record.is_valid():
             raise serializers.ValidationError("OTP expired.")

        if otp_record.otp.upper() == otp.strip().upper():
            user.set_password(new_password)
            user.save()
            otp_record.is_used = True
            otp_record.save()
            return Response({"message": "Password reset successful"}, status=200)
        else:
            otp_record.failed_attempts += 1
            if otp_record.failed_attempts >= 5:
                 otp_record.is_used = True
            otp_record.save()
            return Response({"error": "Invalid OTP"}, status=400)
    except User.DoesNotExist:
        return Response({"error": "User not found"}, status=404)


@api_view(['GET'])
@permission_classes([])
@authentication_classes([])
def get_branding(request):
    branding = SystemSettings.load()
    logo_url = request.build_absolute_uri(branding.logo.url) if branding.logo else None
    return Response({"product_name": branding.product_name, "logo": logo_url})

@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdminUser])
def get_audit_logs(request):
    """Retrieve the last 200 audit logs for the current shop"""
    logs = AuditLog.objects.filter(user__shop=request.user.shop).order_by('-created_at')[:200]
    serializer = AuditLogSerializer(logs, many=True)
    return Response(serializer.data)
