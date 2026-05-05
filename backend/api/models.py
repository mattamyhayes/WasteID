from django.db import models
import json


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


class Mixture(models.Model):
    name = models.CharField(max_length=200, default='Unnamed Mixture')
    created_at = models.DateTimeField(auto_now_add=True)

    customer_name = models.CharField(max_length=200, blank=True)
    customer_location = models.CharField(max_length=300, blank=True)

    is_discarded = models.BooleanField(default=True)
    discard_reason = models.CharField(max_length=50, blank=True)

    process_description = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    def __str__(self):
        return self.name


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
