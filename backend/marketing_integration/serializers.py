from __future__ import annotations

from rest_framework import serializers


class PublishSingleSocialPostSerializer(serializers.Serializer):
    image_url = serializers.URLField(max_length=1024)
    title = serializers.CharField(max_length=512)
    caption = serializers.CharField(max_length=2000, allow_blank=True)
    destination_url = serializers.URLField(max_length=1024)
    platform = serializers.ChoiceField(choices=["pinterest"])
    board_id = serializers.CharField(max_length=64)


class PinterestOAuthCallbackSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=2048)
    state = serializers.CharField(max_length=256)
