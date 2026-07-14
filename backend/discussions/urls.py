from django.urls import path

from .views import DiscussionCreateView, DiscussionListView, DiscussionDetailView

urlpatterns = [
    path('', DiscussionListView.as_view(), name='discussion_list'),
    path('<int:pk>/', DiscussionDetailView.as_view(), name='discussion_detail'),
    path('create/', DiscussionCreateView.as_view(), name='discussion_create'),
]