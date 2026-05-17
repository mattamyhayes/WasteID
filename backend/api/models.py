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


def _generate_profile_id():
    return f"PID-{uuid.uuid4().hex[:8].upper()}"


def _generate_order_id():
    return f"OID-{uuid.uuid4().hex[:8].upper()}"


class Mixture(models.Model):
    name = models.CharField(max_length=200, default='Unnamed Mixture')
    transaction_id = models.CharField(max_length=32, unique=True, default=_generate_profile_id)
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

    reviewer_name = models.CharField(max_length=200, blank=True, help_text='Name of person who reviewed and signed off on this determination')
    reviewer_sign_off_date = models.DateField(null=True, blank=True, help_text='Date the reviewer signed off on this determination')

    def get_waste_codes(self):
        return json.loads(self.waste_codes)

    def get_reasoning(self):
        return json.loads(self.reasoning)

    def __str__(self):
        return f"Determination for {self.mixture.name} - {'Hazardous' if self.is_hazardous_waste else 'Non-Hazardous'}"


class Shipper(models.Model):
    """Reusable shipper / generator profile for EPA manifests."""
    company_name = models.CharField(max_length=300)
    epa_id = models.CharField(max_length=20, blank=True, help_text='US EPA ID Number')
    address = models.CharField(max_length=500, blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=50, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    emergency_phone = models.CharField(max_length=50, blank=True)
    contact_name = models.CharField(max_length=200, blank=True)
    site_address = models.CharField(max_length=500, blank=True, help_text='Site address if different from mailing')
    site_city = models.CharField(max_length=100, blank=True)
    site_state = models.CharField(max_length=50, blank=True)
    site_zip_code = models.CharField(max_length=20, blank=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['company_name']

    def __str__(self):
        return f"{self.company_name} ({self.epa_id})"


class EPAManifest(models.Model):
    """EPA Form 8700-22 Uniform Hazardous Waste Manifest."""
    manifest_tracking_number = models.CharField(max_length=30, blank=True)
    generator_shipper = models.ForeignKey(Shipper, on_delete=models.SET_NULL, null=True, blank=True, related_name='manifests')
    generator_name = models.CharField(max_length=300, blank=True)
    generator_epa_id = models.CharField(max_length=20, blank=True)
    generator_address = models.CharField(max_length=500, blank=True)
    generator_city = models.CharField(max_length=100, blank=True)
    generator_state = models.CharField(max_length=50, blank=True)
    generator_zip = models.CharField(max_length=20, blank=True)
    generator_phone = models.CharField(max_length=50, blank=True)
    generator_site_address = models.CharField(max_length=500, blank=True)
    emergency_response_phone = models.CharField(max_length=50, blank=True)

    transporter1_name = models.CharField(max_length=300, blank=True)
    transporter1_epa_id = models.CharField(max_length=20, blank=True)
    transporter2_name = models.CharField(max_length=300, blank=True)
    transporter2_epa_id = models.CharField(max_length=20, blank=True)

    designated_facility_name = models.CharField(max_length=300, blank=True)
    designated_facility_address = models.CharField(max_length=500, blank=True)
    designated_facility_city = models.CharField(max_length=100, blank=True)
    designated_facility_state = models.CharField(max_length=50, blank=True)
    designated_facility_zip = models.CharField(max_length=20, blank=True)
    designated_facility_epa_id = models.CharField(max_length=20, blank=True)
    designated_facility_phone = models.CharField(max_length=50, blank=True)

    # Waste items stored as JSON array of objects
    # Each: {description, containers_no, container_type, quantity, unit, waste_codes[], dot_description}
    waste_items = models.TextField(default='[]', help_text='JSON array of waste line items')

    special_handling_instructions = models.TextField(blank=True)
    additional_info = models.TextField(blank=True)

    # Determinations linked to this manifest
    determination_ids = models.TextField(default='[]', help_text='JSON array of determination IDs')

    generator_certification = models.BooleanField(default=False)
    generator_printed_name = models.CharField(max_length=200, blank=True)
    generator_signature_date = models.DateField(null=True, blank=True)

    international_shipment = models.BooleanField(default=False)
    import_to_us = models.BooleanField(default=False)
    port_of_entry_exit = models.CharField(max_length=200, blank=True)
    date_leaving_us = models.DateField(null=True, blank=True)

    status = models.CharField(max_length=20, default='draft', choices=[
        ('draft', 'Draft'),
        ('signed', 'Signed'),
        ('shipped', 'Shipped'),
        ('received', 'Received'),
    ])

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def get_waste_items(self):
        return json.loads(self.waste_items)

    def get_determination_ids(self):
        return json.loads(self.determination_ids)

    def __str__(self):
        return f"Manifest {self.manifest_tracking_number or '(draft)'} - {self.generator_name}"


class Order(models.Model):
    """Work order that groups profiles for bidding and shipping."""
    STATUS_CHOICES = [
        ('open', 'Open Order'),
        ('in_quote', 'Waiting for Bid'),
        ('waiting_signature', 'Waiting for Customer Signature'),
        ('rejected_transport', 'Rejected by Transport'),
        ('rejected_tldr', 'Rejected by TLDR'),
    ]

    order_id = models.CharField(max_length=32, unique=True, default=_generate_order_id)
    owner_name = models.CharField(max_length=200, blank=True, help_text='Person who created this order')
    generator = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='orders')
    status = models.CharField(max_length=30, choices=STATUS_CHOICES, default='open')
    profiles = models.ManyToManyField(Mixture, blank=True, related_name='orders')
    potential_shippers = models.ManyToManyField(Shipper, blank=True, related_name='orders')
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Order {self.order_id} - {self.get_status_display()}"


class Journey(models.Model):
    """Tracks the lifecycle stages of an order."""
    STAGE_CHOICES = [
        ('open', 'Open'),
        ('in_quote', 'In Quote'),
        ('waiting_signature', 'Waiting for Customer Signature'),
        ('rejected_transport', 'Rejected by Transport'),
        ('rejected_tldr', 'Rejected by TLDR'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='journey_records')
    stage = models.CharField(max_length=30, choices=STAGE_CHOICES)
    timestamp = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['timestamp']

    def __str__(self):
        return f"Journey {self.order.order_id} → {self.get_stage_display()} at {self.timestamp}"
