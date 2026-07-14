from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync
from captcha.models import CaptchaStore
from django.urls import reverse
from django.core.serializers.json import DjangoJSONEncoder

import json

from rest_framework import generics, permissions, status

from rest_framework.parsers import MultiPartParser, FormParser
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Comment
from .serializers import (
    CommentSerializer,
    CreateCommentSerializer,
)


class CaptchaView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        hashkey = CaptchaStore.generate_key()
        image_url = reverse('captcha-image', kwargs={'key': hashkey})
        
        return Response({
            'token': hashkey,
            'image_url': request.build_absolute_uri(image_url),
        }, status=status.HTTP_200_OK)


class CommentListCreateView(generics.ListCreateAPIView):
    parser_classes = [MultiPartParser, FormParser]

    def get_serializer_class(self):
        return CreateCommentSerializer if self.request.method == 'POST' else CommentSerializer

    def get_permissions(self):
        if self.request.method == 'POST':
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]

    def get_queryset(self):
        queryset = Comment.objects.filter(parent__isnull=True)
        discussion_id = self.request.query_params.get('discussion')
        if discussion_id:
            queryset = queryset.filter(discussion_id=discussion_id)
        return queryset

    def perform_create(self, serializer):
        comment = serializer.save()
        self._broadcast_comment(comment)

    def _broadcast_comment(self, comment):
        channel_layer = get_channel_layer()
        if not channel_layer:
            return

        broadcast_obj = comment
        while broadcast_obj.parent is not None:
            broadcast_obj = broadcast_obj.parent
        out_serializer = CommentSerializer(broadcast_obj, context={'request': self.request})
        
        data = json.loads(json.dumps(out_serializer.data, cls=DjangoJSONEncoder))
        
        async_to_sync(channel_layer.group_send)(
            f'discussion_{comment.discussion_id}',
            {
                'type': 'new_comment', 
                'comment': data
            },
        )


class CommentRepliesView(generics.ListAPIView):
    serializer_class = CommentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_queryset(self):
        parent_id = self.kwargs.get('parent_id')
        return Comment.objects.filter(parent_id=parent_id)


class CommentDetailView(generics.RetrieveUpdateDestroyAPIView):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer

    def get_serializer_context(self):
        context = super().get_serializer_context()
        context['request'] = self.request
        return context

    def get_permissions(self):
        if self.request.method in ('PUT', 'PATCH', 'DELETE'):
            return [permissions.IsAuthenticated()]
        return [permissions.AllowAny()]
