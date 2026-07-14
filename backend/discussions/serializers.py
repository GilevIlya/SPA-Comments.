from rest_framework import serializers

from .models import Discussion


class DiscussionListSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(
        source='author.username',
        read_only=True
    )
    comment_count = serializers.SerializerMethodField()

    class Meta:
        model = Discussion
        fields = ['id', 'title', 'description', 'author',
                  'author_name', 'comment_count', 'created_at']
        read_only_fields = [
            'id',
            'author',
            'created_at',
        ]

    def get_comment_count(self, obj):
        return obj.comments.count()


class DiscussionDetailSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(
        source='author.username',
        read_only=True
    )

    class Meta:
        model = Discussion
        fields = ['id', 'title', 'description', 'author',
                  'author_name', 'created_at']
        read_only_fields = [
            'id',
            'author',
            'created_at',
        ]


class CreateDiscussionSerializer(serializers.ModelSerializer):
    class Meta:
        model = Discussion
        fields = [
            'title',
            'description',
        ]

    def validate_title(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError(
                'Title is required.'
            )

        if len(value) > 80:
            raise serializers.ValidationError(
                'Title cannot exceed 80 characters.'
            )

        return value