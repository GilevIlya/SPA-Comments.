from django.urls import path

from .views import (
    CaptchaView,
    CommentListCreateView,
    CommentRepliesView,
    CommentDetailView,
)

urlpatterns = [
    path('captcha/', CaptchaView.as_view(), name='captcha'),
    path('', CommentListCreateView.as_view(), name='comment_list'),
    path('<int:pk>/', CommentDetailView.as_view(), name='comment_detail'),
    path('<int:parent_id>/replies/', CommentRepliesView.as_view(), name='comment_replies'),
]
