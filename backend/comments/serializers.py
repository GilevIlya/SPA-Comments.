from io import BytesIO
from PIL import Image

from bleach.sanitizer import Cleaner
import xml.parsers.expat
from rest_framework import serializers
from captcha.models import CaptchaStore 

from rest_framework import serializers
from django.core.files.base import ContentFile

from .models import Comment


ALLOWED_TAGS = ['a', 'code', 'i', 'strong']
ALLOWED_ATTRIBUTES = {
    'a': ['href', 'title']
}

def validate_and_clean_xhtml(text: str) -> str:
    if not text.strip():
        return ""
    
    parser = xml.parsers.expat.ParserCreate()
    
    def start_element(name, attrs):
        if name != 'root' and name not in ALLOWED_TAGS:
            raise ValueError(f"Usage of HTML tag <{name}> is forbidden.")

    parser.StartElementHandler = start_element

    xhtml_wrapper = f"<root>{text}</root>"
    try:
        parser.Parse(xhtml_wrapper, True)
    except xml.parsers.expat.ExpatError as e:
        error_msg = str(e)
        if "mismatched tag" in error_msg:
            raise ValueError("Tag nesting is violated or there is an unclosed tag.")
        elif "unclosed token" in error_msg:
            raise ValueError("One of the HTML tags was not closed.")
        else:
            raise ValueError("Text does not conform to the valid XHTML standard.")

    cleaner = Cleaner(
        tags=list(ALLOWED_TAGS),
        attributes=ALLOWED_ATTRIBUTES,
        strip=True
    )
    return cleaner.clean(text)


class CommentValidationMixin:
    def validate_text(self, value):
        if not value or not value.strip():
            raise serializers.ValidationError('Comment text is required.')

        if len(value) > 5000:
            raise serializers.ValidationError('Comment text cannot exceed 5000 characters.')

        try:
            return validate_and_clean_xhtml(value)
        except ValueError as err:
            raise serializers.ValidationError(str(err))

    def validate_file(self, value):
        if value:
            ext = value.name.rsplit('.', 1)[-1].lower() if '.' in value.name else ''
            allowed_images = {'jpg', 'jpeg', 'png', 'gif'}
            allowed_files = {'txt'}

            if ext in allowed_images:
                img = Image.open(value)
                img_format = img.format or 'JPEG'
                max_w, max_h = 320, 240
                if img.width > max_w or img.height > max_h:
                    img.thumbnail((max_w, max_h), Image.LANCZOS)
                buffer = BytesIO()
                save_format = 'PNG' if img_format.upper() == 'PNG' else 'JPEG'
                if save_format == 'JPEG' and img.mode in ('RGBA', 'P'):
                    img = img.convert('RGB')
                img.save(buffer, format=save_format)
                buffer.seek(0)
                new_name = value.name.rsplit('.', 1)[0] + ('.png' if save_format == 'PNG' else '.jpg')
                value = ContentFile(buffer.getvalue(), name=new_name)
                buffer.close()
            elif ext in allowed_files:
                if value.size > 100 * 1024:
                    raise serializers.ValidationError('Text file size must not exceed 100KB.')
                content = value.read().decode('utf-8', errors='ignore')
                value.seek(0)
                if not content or len(content) == 0:
                    raise serializers.ValidationError('File is empty.')
            else:
                raise serializers.ValidationError(
                    'Allowed file formats: JPG, GIF, PNG, TXT.'
                )
        return value


class CommentSerializer(CommentValidationMixin, serializers.ModelSerializer):
    author_name = serializers.CharField(source='author.username', read_only=True)
    parent_author_name = serializers.SerializerMethodField()
    replies = serializers.SerializerMethodField()
    file_url = serializers.SerializerMethodField()

    class Meta:
        model = Comment
        fields = [
            'id', 'discussion', 'author', 'author_name', 'parent_author_name',
            'text', 'parent', 'file', 'file_url', 'replies', 'created_at',
        ]
        read_only_fields = ['id', 'author', 'created_at']

    def get_parent_author_name(self, obj):
        if obj.parent:
            return obj.parent.author.username
        return None

    def get_replies(self, obj):
        replies = obj.replies.all()
        return CommentSerializer(replies, many=True, context=self.context).data

    def get_file_url(self, obj):
        if obj.file:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(obj.file.url)
            return obj.file.url
        return None


class RecursiveCommentSerializer(CommentSerializer):
    replies = serializers.SerializerMethodField()

    def get_replies(self, obj):
        replies = obj.replies.all()
        return CommentSerializer(replies, many=True, context=self.context).data
    

class CreateCommentSerializer(CommentValidationMixin, serializers.ModelSerializer):
    captcha_token = serializers.CharField(write_only=True)
    captcha_text = serializers.CharField(write_only=True)

    class Meta:
        model = Comment
        fields = [
            'discussion', 'text', 'parent', 'file',
            'captcha_token', 'captcha_text',
        ]

    def validate(self, attrs):
        captcha_token = attrs.get('captcha_token')
        captcha_text = attrs.get('captcha_text')

        if not captcha_token or not captcha_text:
            raise serializers.ValidationError({'captcha_text': 'CAPTCHA validation failed'})

        try:
            captcha_store = CaptchaStore.objects.get(hashkey=captcha_token)
            if captcha_store.response.lower() != captcha_text.lower():
                captcha_store.delete()
                raise serializers.ValidationError({'captcha_text': 'Invalid CAPTCHA code'})
            
            captcha_store.delete()
        except CaptchaStore.DoesNotExist:
            raise serializers.ValidationError({'captcha_text': 'CAPTCHA expired or invalid'})

        return attrs
    
    def create(self, validated_data):
        validated_data['author'] = self.context['request'].user
        validated_data.pop('captcha_token', None)
        validated_data.pop('captcha_text', None)
        return super().create(validated_data)
