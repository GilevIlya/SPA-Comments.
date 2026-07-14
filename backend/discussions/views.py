from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import (
    AllowAny,
    IsAuthenticated,
)
from rest_framework import status
from django.db.models import Count
from django.shortcuts import get_object_or_404

from .models import Discussion
from .serializers import (
    DiscussionListSerializer,
    DiscussionDetailSerializer,
    CreateDiscussionSerializer,
)


class DiscussionListView(APIView):
    permission_classes = [AllowAny]

    def get(self, request):
        discussions = Discussion.objects.all()

        sort = request.query_params.get(
            'sort',
            '-created_at'
        )

        if sort == '-comment_count':
            discussions = (
                discussions
                .annotate(
                    comment_count=Count('comments')
                )
                .order_by('-comment_count')
            )

        else:
            discussions = discussions.order_by(
                '-created_at'
            )

        serializer = DiscussionListSerializer(
            discussions,
            many=True
        )

        return Response(serializer.data)
    

class DiscussionDetailView(APIView):
    permission_classes = [AllowAny]

    def get(self, request, pk):
        discussion = get_object_or_404(
            Discussion,
            pk=pk,
        )

        serializer = DiscussionDetailSerializer(
            discussion
        )

        return Response(serializer.data)


class DiscussionCreateView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = CreateDiscussionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        discussion = serializer.save(author=request.user)

        out_serializer = DiscussionDetailSerializer(discussion)

        return Response(
            out_serializer.data,
            status=status.HTTP_201_CREATED,
        )    