from rest_framework import serializers
from .models import User, UserRole, Shop, AuditLog
from django.contrib.auth import authenticate
from rest_framework_simplejwt.tokens import RefreshToken
from .models import LoginOTP
from django.core.mail import send_mail
from django.conf import settings
import random, string
from django.utils import timezone
from datetime import timedelta

class ShopSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shop
        fields = "__all__"

class UserRoleSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserRole
        fields = "__all__"

class UserSerializer(serializers.ModelSerializer):
    custom_role_name = serializers.CharField(source='custom_role.name', read_only=True)
    shop_name = serializers.CharField(source='shop.name', read_only=True)
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'mobile', 'full_name', 'profile_picture', 'role', 'shop', 'shop_name', 'custom_role', 'custom_role_name', 'is_active', 'date_joined', 'last_login', 'failed_login_attempts', 'locked_until']
        extra_kwargs = {'password': {'write_only': True}}

class AuditLogSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    class Meta:
        model = AuditLog
        fields = "__all__"

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'mobile', 'full_name', 'role', 'custom_role', 'password', 'shop', 'is_active', 'profile_picture']

    def validate(self, data):
        # Email uniqueness check
        email = data.get('email')
        if email and User.objects.filter(email__iexact=email).exists():
            raise serializers.ValidationError({"email": "This email is already registered. Please use a unique one."})
            
        # Username uniqueness check
        username = data.get('username')
        if User.objects.filter(username__iexact=username).exists():
            raise serializers.ValidationError({"username": "This username is already taken."})
            
        return data

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            mobile=validated_data.get('mobile'),
            full_name=validated_data.get('full_name', ''),
            role=validated_data['role'],
            custom_role=validated_data.get('custom_role'),
            password=validated_data['password'],
            shop=validated_data.get('shop'),
            is_active=validated_data.get('is_active', True)
        )
        # Profile picture handling if any
        if 'profile_picture' in validated_data:
            user.profile_picture = validated_data['profile_picture']
            user.save()
        return user

class ShopRegisterSerializer(serializers.Serializer):
    # Shop fields
    shop_name = serializers.CharField()
    owner_name = serializers.CharField()
    address = serializers.CharField()
    contact_number = serializers.CharField()
    license_number = serializers.CharField()  # Compulsory
    
    # User fields
    username = serializers.CharField()
    email = serializers.EmailField()
    mobile = serializers.CharField(max_length=15)
    password = serializers.CharField(min_length=6)

    def validate(self, data):
        errors = {}

        # Check username uniqueness
        if User.objects.filter(username=data.get('username')).exists():
            errors['username'] = 'This username is already taken.'

        # Check email uniqueness
        if User.objects.filter(email=data.get('email')).exists():
            errors['email'] = 'An account with this email already exists.'

        # Check mobile uniqueness
        if User.objects.filter(mobile=data.get('mobile')).exists():
            errors['mobile'] = 'This mobile number is already registered.'

        # Check drug license uniqueness
        if Shop.objects.filter(license_number=data.get('license_number')).exists():
            errors['license_number'] = 'A pharmacy with this Drug License Number already exists.'

        if errors:
            raise serializers.ValidationError(errors)

        return data

    def create(self, validated_data):
        # 1. Create Shop (status=pending by default)
        shop = Shop.objects.create(
            name=validated_data['shop_name'],
            owner_name=validated_data['owner_name'],
            address=validated_data['address'],
            contact_number=validated_data['contact_number'],
            license_number=validated_data['license_number']
        )
        
        # 2. Create Admin User for this shop
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            mobile=validated_data['mobile'],
            password=validated_data['password'],
            full_name=validated_data['owner_name'],
            role='admin',
            shop=shop
        )
        return user
    


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField()

    def validate(self, data):
        email    = data.get("email", "").strip().lower()
        password = data.get("password", "")

        user_matches = User.objects.filter(email__iexact=email)
        if not user_matches.exists():
            raise serializers.ValidationError("No account found with this email address.")

        user_obj = None
        for u in user_matches:
            if u.check_password(password):
                user_obj = u
                break
        
        
        
        if not user_obj:
            raise serializers.ValidationError("Incorrect email or password.")

        # Check Account Health
        self._check_lockout(user_obj)
        user = authenticate(username=user_obj.username, password=password)
        if not user:
            self._handle_failed_attempt(user_obj)

        self._check_user_status(user)

        # Success - Trigger 2FA
        user_obj.failed_login_attempts = 0
        user_obj.locked_until = None
        user_obj.save()

        otp = self._generate_secure_otp()
        self._initialize_otp_record(user, otp)
        self._send_security_otp_email(user, otp)

        return {
            "require_otp": True,
            "email": user.email,
            "message": "Security OTP sent to your email."
        }

    def _check_lockout(self, user):
        if user.locked_until and user.locked_until > timezone.now():
            raise serializers.ValidationError("Account locked. Try after 15 mins.")

    def _handle_failed_attempt(self, user):
        user.failed_login_attempts += 1
        if user.failed_login_attempts >= 5:
            user.locked_until = timezone.now() + timedelta(minutes=15)
        user.save()
        raise serializers.ValidationError(f"Incorrect password ({user.failed_login_attempts}/5)")

    def _check_user_status(self, user):
        if not user.is_active:
            raise serializers.ValidationError("Account inactive.")
        if user.shop and user.shop.status != 'approved':
            raise serializers.ValidationError(f"Pharmacy {user.shop.status}. Contact admin.")

    def _generate_secure_otp(self):
        import secrets
        import string
        chars = string.ascii_uppercase + string.digits
        return "".join(secrets.choice(chars) for _ in range(8))

    def _initialize_otp_record(self, user, otp):
        LoginOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        LoginOTP.objects.create(user=user, otp=otp)

    def _send_security_otp_email(self, user, otp):
        subject = "Security OTP - MSMS"
        message = f"Your login code: {otp}"
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)

class VerifyLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()

    def validate(self, data):
        email = data["email"].strip().lower()
        otp = data["otp"]

        user = User.objects.filter(email__iexact=email).first()
        if not user:
            raise serializers.ValidationError("User not found.")

        self._validate_session_limit(user)
        otp_record = self._get_active_otp(user)
        if not otp_record:
            raise serializers.ValidationError("No active OTP found.")
        
        if not otp_record.is_valid():
             raise serializers.ValidationError("OTP expired.")

        self._validate_otp_match(otp_record, otp, user)

        otp_record.is_used = True
        otp_record.save()
        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])
        
        refresh = RefreshToken.for_user(user)
        return self._prepare_response_data(user, refresh)

    def _validate_session_limit(self, user):
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        if OutstandingToken.objects.filter(user=user, expires_at__gt=timezone.now()).count() >= 10:
             raise serializers.ValidationError("Too many active sessions.")

    def _get_active_otp(self, user):
        return LoginOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()

    def _validate_otp_match(self, otp_record, otp, user):
        if otp_record.otp != otp:
            otp_record.failed_attempts += 1
            if otp_record.failed_attempts >= 5:
                otp_record.is_used = True
                user.locked_until = timezone.now() + timedelta(minutes=15)
                user.save()
            otp_record.save()
            raise serializers.ValidationError("Invalid OTP.")

    def _prepare_response_data(self, user, refresh):
        return {
            "user": user.username, "full_name": user.full_name, "email": user.email,
            "role": user.role, "shop_name": user.shop.name if user.shop else "System",
            "access": str(refresh.access_token), "refresh": str(refresh),
            "permissions": self._get_perms(user)
        }

    def _get_perms(self, user):
        # Concise permission logic
        is_admin = user.role == 'admin'
        return {
            "medicine": {"read": True, "create": is_admin, "update": is_admin, "delete": is_admin},
            "sales": {"read": True, "create": True, "update": is_admin, "delete": is_admin},
            "reports": {"read": is_admin, "create": is_admin, "update": is_admin, "delete": is_admin},
        }
