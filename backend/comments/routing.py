from django.urls import re_path

from .consumers import DiscussionConsumer

websocket_urlpatterns = [
    re_path(r'^ws/discussions/(?P<pk>\d+)/$', DiscussionConsumer.as_asgi()),
]
