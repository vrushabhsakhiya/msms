from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView, TokenVerifyView
from .views import (
    register_user, register_shop, login_user, verify_login_otp, resend_login_otp, 
    get_users, delete_user, update_user, manage_roles, role_detail, 
    logout_user, change_password, forgot_password, reset_password, get_branding
)

urlpatterns = [
    path('branding/', get_branding),
    path('register/', register_user),
    path('register-shop/', register_shop),
    path('login/', login_user),
    path('verify-login-otp/', verify_login_otp),
    path('resend-login-otp/', resend_login_otp),
    path('logout/', logout_user),
    path('change-password/', change_password),
    path('forgot-password/', forgot_password),
    path('reset-password/', reset_password),
    path('users/', get_users),
    path('users/<int:id>/delete/', delete_user),
    path('users/<int:id>/update/', update_user),
    path('roles/', manage_roles),
    path('roles/<int:id>/', role_detail),
    
    # JWT Tokens (Silent Refresh Support)
    path('token/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('token/verify/', TokenVerifyView.as_view(), name='token_verify'),
]
