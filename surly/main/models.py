from django.db import models

class short(models.Model):
    page_id = models.TextField(max_length=40)
    old_url = models.TextField()
    ip = models.TextField()
    date = models.IntegerField()
    views = models.IntegerField(default=0)

    def __str__(this) -> str:
        return this.url
    
class views(models.Model):
    page_id = models.TextField(max_length=40)
    ip = models.TextField()

    def __str__(this) -> str:
        return this.url