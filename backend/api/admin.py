from django.contrib import admin
from .models import Chemical, Mixture, MixtureComponent, WasteDetermination


@admin.register(Chemical)
class ChemicalAdmin(admin.ModelAdmin):
    list_display = ['name', 'cas_number', 'epa_waste_code', 'category']
    list_filter = ['category', 'is_ignitable', 'is_corrosive', 'is_reactive', 'is_toxic']
    search_fields = ['name', 'cas_number', 'epa_waste_code']


@admin.register(Mixture)
class MixtureAdmin(admin.ModelAdmin):
    list_display = ['name', 'created_at', 'is_discarded']


@admin.register(MixtureComponent)
class MixtureComponentAdmin(admin.ModelAdmin):
    list_display = ['mixture', 'component_name', 'quantity', 'unit']


@admin.register(WasteDetermination)
class WasteDeterminationAdmin(admin.ModelAdmin):
    list_display = ['mixture', 'is_hazardous_waste', 'created_at']
