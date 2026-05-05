from django.db import models
import json
import uuid


class Customer(models.Model):
    name = models.CharField(max_length=200, unique=True)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    billing_address = models.TextField(blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class CustomerLocation(models.Model):
    customer = models.ForeignKey(Customer, on_delete=models.CASCADE, related_name='locations')
    name = models.CharField(max_length=200)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    postal_code = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['customer__name', 'name']
        unique_together = ('customer', 'name')

    def __str__(self):
        return f"{self.customer.name} - {self.name}"


class Chemical(models.Model):
    CATEGORY_CHOICES = [
        ('P', 'P-list (Acutely Hazardous)'),
        ('U', 'U-list (Toxic)'),
        ('F', 'F-list (Non-specific source)'),
        ('K', 'K-list (Specific source)'),
        ('D_CHAR', 'Characteristic (D-code)'),
        ('OTHER', 'Other'),
    ]

    name = models.CharField(max_length=500)
    cas_number = models.CharField(max_length=50, blank=True)
    synonyms = models.TextField(blank=True, default='[]')  # JSON list
    epa_waste_code = models.CharField(max_length=10, blank=True)
    category = models.CharField(max_length=10, choices=CATEGORY_CHOICES, default='OTHER')

    is_ignitable = models.BooleanField(default=False)
    is_corrosive = models.BooleanField(default=False)
    is_reactive = models.BooleanField(default=False)
    is_toxic = models.BooleanField(default=False)
    is_acutely_hazardous = models.BooleanField(default=False)

    flash_point_c = models.FloatField(null=True, blank=True)
    ph_value = models.FloatField(null=True, blank=True)
    tclp_threshold_mgl = models.FloatField(null=True, blank=True)

    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.name} ({self.epa_waste_code or self.cas_number})"

    class Meta:
        ordering = ['name']


def _generate_transaction_id():
    return f"TX-{uuid.uuid4().hex[:10].upper()}"


class Mixture(models.Model):
    name = models.CharField(max_length=200, default='Unnamed Mixture')
    transaction_id = models.CharField(max_length=32, unique=True, default=_generate_transaction_id)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='mixtures')
    customer_location = models.ForeignKey(CustomerLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='mixtures')
    created_at = models.DateTimeField(auto_now_add=True)

    is_discarded = models.BooleanField(default=True)
    discard_reason = models.CharField(max_length=50, blank=True)

    process_description = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return f"{self.transaction_id}: {self.name}"


class MixtureComponent(models.Model):
    UNIT_CHOICES = [
        ('kg', 'Kilograms (kg)'),
        ('L', 'Liters (L)'),
        ('pct_weight', '% by Weight'),
        ('pct_volume', '% by Volume'),
        ('g', 'Grams (g)'),
        ('mL', 'Milliliters (mL)'),
        ('lb', 'Pounds (lb)'),
        ('gal', 'Gallons (gal)'),
    ]

    mixture = models.ForeignKey(Mixture, on_delete=models.CASCADE, related_name='components')
    chemical = models.ForeignKey(Chemical, on_delete=models.SET_NULL, null=True, blank=True)
    custom_name = models.CharField(max_length=200, blank=True)
    quantity = models.FloatField()
    unit = models.CharField(max_length=20, choices=UNIT_CHOICES)

    override_flash_point_c = models.FloatField(null=True, blank=True)
    override_ph = models.FloatField(null=True, blank=True)
    override_is_reactive = models.BooleanField(default=False)

    notes = models.TextField(blank=True)

    @property
    def component_name(self):
        if self.chemical:
            return self.chemical.name
        return self.custom_name or 'Unknown Chemical'

    def __str__(self):
        return f"{self.component_name}: {self.quantity} {self.unit}"


class WasteDetermination(models.Model):
    mixture = models.ForeignKey(Mixture, on_delete=models.CASCADE, related_name='determinations')
    created_at = models.DateTimeField(auto_now_add=True)

    is_solid_waste = models.BooleanField(default=False)
    is_excluded = models.BooleanField(default=False)
    is_listed_hazardous = models.BooleanField(default=False)
    has_ignitability = models.BooleanField(default=False)
    has_corrosivity = models.BooleanField(default=False)
    has_reactivity = models.BooleanField(default=False)
    has_toxicity = models.BooleanField(default=False)
    is_hazardous_waste = models.BooleanField(default=False)

    waste_codes = models.TextField(default='[]')
    reasoning = models.TextField(default='[]')
    recommendations = models.TextField(blank=True)

    def get_waste_codes(self):
        return json.loads(self.waste_codes)

    def get_reasoning(self):
        return json.loads(self.reasoning)

    def __str__(self):
        return f"Determination for {self.mixture.name} - {'Hazardous' if self.is_hazardous_waste else 'Non-Hazardous'}"
