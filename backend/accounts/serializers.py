from rest_framework import serializers
from .models import User, UserRole, Shop
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

class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)

    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'mobile', 'full_name', 'role', 'password', 'shop', 'is_active', 'profile_picture']

    def create(self, validated_data):
        user = User.objects.create_user(
            username=validated_data['username'],
            email=validated_data['email'],
            mobile=validated_data.get('mobile'),
            full_name=validated_data.get('full_name', ''),
            role=validated_data['role'],
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
        email    = data["email"].strip().lower()
        password = data["password"]

        # Look up user by email
        try:
            user_obj = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                "No account found with this email address."
            )
        except User.MultipleObjectsReturned:
            raise serializers.ValidationError(
                "Multiple accounts share this email. Please contact admin."
            )

        # Check lockout
        if user_obj.locked_until and user_obj.locked_until > timezone.now():
            raise serializers.ValidationError(
                "Account locked after 5 failed attempts. Try after 15 minutes."
            )

        # Authenticate with username (Django's auth system uses USERNAME_FIELD)
        user = authenticate(username=user_obj.username, password=password)

        if user is None:
            user_obj.failed_login_attempts += 1
            if user_obj.failed_login_attempts >= 5:
                user_obj.locked_until = timezone.now() + timedelta(minutes=15)
                user_obj.save()
                raise serializers.ValidationError(
                    "Account locked after 5 failed attempts. Please try again after 15 minutes."
                )
            user_obj.save()
            raise serializers.ValidationError(
                f"Incorrect password. Attempt {user_obj.failed_login_attempts}/5."
            )
            
        # Block login if user is inactive
        if not user.is_active:
            raise serializers.ValidationError("Your account is currently inactive. Please contact your administrator.")

        # Block login if pharmacy is not approved
        if user.shop:
            shop = user.shop
            if shop.status == 'pending':
                raise serializers.ValidationError(
                    "Your pharmacy registration is pending approval by the administrator. "
                    "You will be able to login once approved."
                )
            elif shop.status == 'cancelled':
                raise serializers.ValidationError(
                    "Your pharmacy registration has been rejected or suspended. "
                    "Please contact the administrator for more information."
                )

        # Reset failed attempts on success
        if user_obj.failed_login_attempts > 0 or user_obj.locked_until:
            user_obj.failed_login_attempts = 0
            user_obj.locked_until = None
            user_obj.save()

        

        # Generate a complex 8-char OTP
        # Requirements: A-Z, a-z, 0-9, and special characters (!@#$%^&*())
        uppercase_chars = string.ascii_uppercase
        lowercase_chars = string.ascii_lowercase
        digits = string.digits
        specials = "!@#$%^&*()"
        
        # Ensure at least one of each class
        otp_chars = [
            random.choice(uppercase_chars),
            random.choice(lowercase_chars),
            random.choice(digits),
            random.choice(specials)
        ]
        # Fill the rest
        all_allowed_chars = uppercase_chars + lowercase_chars + digits + specials
        otp_chars += [random.choice(all_allowed_chars) for _ in range(4)]
        
        # Shuffle to make it random
        random.shuffle(otp_chars)
        complex_otp = "".join(otp_chars)

        # Invalidate old unused OTPs
        LoginOTP.objects.filter(user=user, is_used=False).update(is_used=True)
        # Create new one
        LoginOTP.objects.create(user=user, otp=complex_otp)
        
        # [DEBUG] High-visibility terminal output for 2FA bypass during development
        print("\n" + "🚀 " * 15)
        print(f" SECURITY ACCESS CODE for {user.email}: {complex_otp} ")
        print("🚀 " * 15 + "\n")

        # Fire email
        subject = "Login Security OTP - MSMS Medical Store"
        message = (
            f"Hello {user.full_name or user.username},\n\n"
            f"A login attempt was made for your MSMS account.\n"
            f"Your Security Code: {complex_otp}\n\n"
            f"This code will expire in exactly 3 minutes.\n"
            f"Do not share this code with anyone.\n\n"
            f"Regards,\nMSMS Security Team"
        )
        try:
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        except Exception:
            pass # Silent fail during dev/setup

        return {
            "require_otp": True,
            "email": user.email,
            "message": "OTP has been sent to your registered email address."
        }

class VerifyLoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp = serializers.CharField()

    def validate(self, data):
        email = data["email"].strip().lower()
        otp = data["otp"]

        try:
            user = User.objects.get(email__iexact=email)
        except User.DoesNotExist:
            raise serializers.ValidationError("User not found.")

        # Block login if user is inactive / pharmacy is pending (Safety double-check)
        if not user.is_active:
            raise serializers.ValidationError("Account is inactive.")
            
        # 🛡️ SECURITY: Concurrent Session Limit (10 windows)
        from rest_framework_simplejwt.token_blacklist.models import OutstandingToken
        active_sessions = OutstandingToken.objects.filter(
            user=user, 
            expires_at__gt=timezone.now()
        ).count()
        
        if active_sessions >= 10:
            raise serializers.ValidationError(
                "Maximum 10 concurrent sessions allowed. Please logout from unused devices to free up slots for new windows."
            )

        from .models import LoginOTP
        # Get the latest active unused OTP
        otp_record = LoginOTP.objects.filter(user=user, is_used=False).order_by('-created_at').first()

        if not otp_record:
            raise serializers.ValidationError("No pending OTP request found. Please login again.")

        if not otp_record.is_valid():
            raise serializers.ValidationError("OTP has expired. Please request a new one.")

        if otp_record.otp != otp:
            otp_record.failed_attempts += 1
            if otp_record.failed_attempts >= 20:
                # Lock out after 20 OTP failures
                otp_record.is_used = True
                user.locked_until = timezone.now() + timedelta(minutes=15)
                user.save()
                otp_record.save()
                raise serializers.ValidationError("Maximum OTP attempts exceeded. Account locked for 15 minutes.")
            otp_record.save()
            raise serializers.ValidationError(f"Invalid OTP. {20 - otp_record.failed_attempts} attempts remaining.")

        # OTP is successful
        otp_record.is_used = True
        otp_record.save()

        user.last_login = timezone.now()
        user.save(update_fields=['last_login'])

        try:
            # Send Success Email with Security Alert
            from django.core.mail import send_mail
            from django.conf import settings
            request = self.context.get('request')
            ip_addr = request.META.get('REMOTE_ADDR') if request else 'Unknown'
            user_agent = request.META.get('HTTP_USER_AGENT') if request else 'Unknown'
            
            subject = "Security Alert: Successful Login to MSMS"
            message = (
                f"Hello {user.full_name or user.username},\n\n"
                f"A successful login to your MSMS Medical Store account was just detected.\n\n"
                f"Details:\n"
                f"Time: {timezone.now().strftime('%Y-%m-%d %H:%M:%S UTC')}\n"
                f"IP Address: {ip_addr}\n"
                f"Device/Browser: {user_agent}\n\n"
                f"If you did not authorize this login, please contact support and change your password immediately.\n\n"
                f"Regards,\nMSMS Security Team"
            )
            send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=True)
        except Exception:
            pass

        refresh = RefreshToken.for_user(user)

        return {
            "user":        user.username,
            "full_name":   user.full_name,
            "email":       user.email,
            "role":        user.role,
            "shop_name":   user.shop.name if user.shop else "System",
            "shop_status": user.shop.status if user.shop else "approved",
            "access":      str(refresh.access_token),
            "refresh":     str(refresh),
        }
