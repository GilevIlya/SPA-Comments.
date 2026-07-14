from django.db import models

from users.models import User


class Discussion(models.Model):
    id = models.BigAutoField(primary_key=True)
    title = models.CharField(max_length=80)
    description = models.TextField(blank=True, default='', null=True, max_length=255)
    author = models.ForeignKey(
        User, on_delete=models.CASCADE, related_name='discussions'
    )
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.title