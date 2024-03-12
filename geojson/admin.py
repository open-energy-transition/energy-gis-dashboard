from django.contrib import admin
from .models import Bus, JSONBus

# Register your models here.
admin.site.register(Bus)

@admin.register(JSONBus)
class JSONBusAdmin(admin.ModelAdmin):
    list_display = ['name', 'uploaded_time']
    search_fields = ['name']
