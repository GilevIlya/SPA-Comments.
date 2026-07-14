import os
from PIL import Image
from io import BytesIO
from django.db import models
from django.core.files.base import ContentFile

from users.models import User
from discussions.models import Discussion


def comment_file_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else ''
    name = f'comment_{instance.id}_{instance.author_id}'
    return f'comments/{name}.{ext}' if ext else f'comments/{name}'


class Comment(models.Model):
    id = models.BigAutoField(primary_key=True)
    discussion = models.ForeignKey(
        Discussion, on_delete=models.CASCADE, related_name='comments'
    )
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='comments'
    )
    text = models.TextField()
    parent = models.ForeignKey(
        'self',
        null=True,
        blank=True,
        on_delete=models.CASCADE,
        related_name='replies',
    )
    file = models.FileField(
        upload_to=comment_file_path,
        null=True, blank=True,
        max_length=500,
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'Comment #{self.id}'

    class Meta:
        ordering = ['-created_at']