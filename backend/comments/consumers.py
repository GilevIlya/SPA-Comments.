from channels.generic.websocket import AsyncWebsocketConsumer
import json

class DiscussionConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.discussion_id = self.scope['url_route']['kwargs']['pk']
        self.group_name = f'discussion_{self.discussion_id}'

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

    async def disconnect(self, close_code):
        if hasattr(self, 'group_name'):
            await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def new_comment(self, event):
        await self.send(text_data=json.dumps({
            'type': 'new_comment',
            'comment': event['comment'],
        }))
