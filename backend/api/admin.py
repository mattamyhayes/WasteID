from django.contrib import admin
from .models import Chemical, Mixture, MixtureComponent, WasteDetermination, Customer, CustomerLocation


class CustomerLocationInline(admin.TabularInline):
    model = CustomerLocation
    extra = 1


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_name', 'contact_email', 'created_at']
    search_fields = ['name', 'contact_name', 'contact_email']
    inlines = [CustomerLocationInline]


@admin.register(CustomerLocation)
class CustomerLocationAdmin(admin.ModelAdmin):
    list_display = ['customer', 'name', 'city', 'state']
    list_filter = ['state']
    search_fields = ['customer__name', 'name', 'city']


@admin.register(Chemical)
class ChemicalAdmin(admin.ModelAdmin):
    list_display = ['name', 'cas_number', 'epa_waste_code', 'category']
    list_filter = ['category', 'is_ignitable', 'is_corrosive', 'is_reactive', 'is_toxic']
    search_fields = ['name', 'cas_number', 'epa_waste_code']


@admin.register(Mixture)
class MixtureAdmin(admin.ModelAdmin):
    list_display = ['transaction_id', 'name', 'customer', 'customer_location', 'created_at', 'is_discarded']
    list_filter = ['customer', 'is_discarded']
    search_fields = ['transaction_id', 'name', 'customer__name']


@admin.register(MixtureComponent)
class MixtureComponentAdmin(admin.ModelAdmin):
    list_display = ['mixture', 'component_name', 'quantity', 'unit']


@admin.register(WasteDetermination)
class WasteDeterminationAdmin(admin.ModelAdmin):
    list_display = ['mixture', 'is_hazardous_waste', 'created_at']
