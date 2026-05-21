from django.db import models
import json
import uuid


class Customer(models.Model):
    EPA_GENERATOR_STATUS_CHOICES = [
        ('VSQG', 'VSQG – Very Small Quantity Generator'),
        ('SQG', 'SQG – Small Quantity Generator'),
        ('LQG', 'LQG – Large Quantity Generator'),
    ]

    name = models.CharField(max_length=200, unique=True)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=50, blank=True)
    epa_generator_status = models.CharField(max_length=4, choices=EPA_GENERATOR_STATUS_CHOICES, blank=True)
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


def _generate_prefixed_id(prefix):
    return f"{prefix}-{uuid.uuid4().hex[:8].upper()}"


def _generate_profile_id():
    return _generate_prefixed_id("PID")


# Alias retained for migration 0002_customers_and_transaction_id
_generate_transaction_id = _generate_profile_id


def _generate_order_id():
    return _generate_prefixed_id("OID")


def _generate_listing_id():
    return _generate_prefixed_id("MKT")


def _generate_bid_id():
    return _generate_prefixed_id("BID")


class Mixture(models.Model):
    REVIEW_STATUS_CHOICES = [
        ('draft', 'Draft'),
        ('pending_review', 'Pending Initial Review'),
        ('approved', 'Approved'),
        ('rejected', 'Rejected'),
    ]

    PROFILE_STAGE_CHOICES = [
        ('Draft', 'Draft'),
        ('Pending Review', 'Pending Review'),
        ('Approved', 'Approved'),
    ]

    SHIPMENT_SIZE_UNIT_CHOICES = [
        ('gallons', 'Gallons'),
        ('cyb', 'CYB'),
        ('bulk', 'Bulk'),
    ]

    SHIPMENT_SIZE_QTY_CHOICES = [
        (5, '5'),
        (15, '15'),
        (30, '30'),
        (55, '55'),
    ]

    EPA_GENERATOR_STATUS_CHOICES = [
        ('VSQG', 'VSQG – Very Small Quantity Generator'),
        ('SQG', 'SQG – Small Quantity Generator'),
        ('LQG', 'LQG – Large Quantity Generator'),
    ]

    EPA_STATUS_HOLD_DAYS = {
        'VSQG': 10,
        'SQG': 30,
        'LQG': 60,
    }
    name = models.CharField(max_length=200, default='Unnamed Mixture')
    transaction_id = models.CharField(max_length=32, unique=True, default=_generate_profile_id)
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='mixtures')
    customer_location = models.ForeignKey(CustomerLocation, on_delete=models.SET_NULL, null=True, blank=True, related_name='mixtures')
    created_at = models.DateTimeField(auto_now_add=True)

    is_discarded = models.BooleanField(default=True)
    discard_reason = models.CharField(max_length=50, blank=True)

    shipment_size_unit = models.CharField(max_length=10, choices=SHIPMENT_SIZE_UNIT_CHOICES, blank=True)
    shipment_size_qty = models.IntegerField(null=True, blank=True, choices=SHIPMENT_SIZE_QTY_CHOICES)
    epa_generator_status = models.CharField(max_length=4, choices=EPA_GENERATOR_STATUS_CHOICES, blank=True)
    generation_date = models.DateField(null=True, blank=True, help_text='Date the waste was generated')

    process_description = models.TextField(blank=True)
    notes = models.TextField(blank=True)

    review_status = models.CharField(max_length=20, choices=REVIEW_STATUS_CHOICES, blank=True, default='draft', help_text='Review workflow status')
    profile_stage = models.CharField(max_length=20, choices=PROFILE_STAGE_CHOICES, default='Draft', help_text='Current stage of the profile: Draft, Pending Review, or Approved')
    pickup_by_date = models.DateField(null=True, blank=True, help_text='Date by which waste must be picked up from generator')
    hold_time_days = models.IntegerField(null=True, blank=True, help_text='Total hold time in days from generation to required pickup')

    @property
    def hold_days(self):
        return self.EPA_STATUS_HOLD_DAYS.get(self.epa_generator_status)

    @property
    def ship_by_date(self):
        from datetime import timedelta
        days = self.hold_days
        if days is not None and self.generation_date:
            return self.generation_date + timedelta(days=days)
        return None

    @property
    def days_remaining_to_ship(self):
        from datetime import date
        sbd = self.ship_by_date
        if sbd:
            return (sbd - date.today()).days
        return None

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


class Journey(models.Model):
    """Tracks each stage of the customer workflow for executive journey-map reporting."""
    STAGE_CHOICES = [
        ('produced', 'Produced'),
        ('draft', 'Draft'),
        ('pending_review', 'Pending Review'),
        ('approved', 'Approved'),
        ('profile', 'Profile'),
        ('prof_review', 'Prof Review'),
        ('quote', 'Quote'),
        ('order', 'Order'),
        ('signed', 'Signed'),
        ('ship_accept', 'Ship Accept'),
        ('picked_up', 'Picked Up'),
        ('transit', 'Transit'),
        ('delivered', 'Delivered'),
        ('disposed', 'Disposed'),
    ]

    mixture = models.ForeignKey(Mixture, on_delete=models.CASCADE, related_name='journey_stages')
    customer = models.ForeignKey(Customer, on_delete=models.SET_NULL, null=True, blank=True, related_name='journey_stages')
    stage = models.CharField(max_length=20, choices=STAGE_CHOICES)
    entered_at = models.DateTimeField(help_text='Date/time the item entered this stage')
    completed_at = models.DateTimeField(null=True, blank=True, help_text='Date/time the item completed this stage')
    duration_seconds = models.FloatField(null=True, blank=True, help_text='Time spent in this stage in seconds')

    class Meta:
        ordering = ['mixture', 'entered_at']
        verbose_name_plural = 'journeys'

    def save(self, *args, **kwargs):
        if self.entered_at and self.completed_at:
            delta = self.completed_at - self.entered_at
            self.duration_seconds = delta.total_seconds()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.mixture.transaction_id} - {self.get_stage_display()}"


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


class OrderJourney(models.Model):
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


class StateRule(models.Model):
    """Data-driven state-specific hazardous waste rule."""
    CATEGORY_CHOICES = [
        ('identification', 'Identification'),
        ('storage', 'Storage'),
        ('manifest', 'Manifest'),
        ('transport', 'Transport'),
        ('reporting', 'Reporting'),
        ('labeling', 'Labeling'),
    ]
    RESULT_CHOICES = [
        ('pass', 'Pass'),
        ('needs_info', 'Needs Info'),
        ('fail', 'Fail'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    state_code = models.CharField(max_length=2, db_index=True, help_text='2-letter state/territory code')
    rule_category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    rule_id_code = models.CharField(max_length=20, unique=True, help_text='e.g., AL-001, CA-003')
    rule_reference = models.CharField(max_length=300, blank=True, help_text='Regulation citation')
    description = models.TextField()
    condition_expression = models.TextField(default='{}', help_text='JSON conditions for when this rule applies')
    question_template = models.TextField(default='[]', help_text='JSON array of questions to ask if NEEDS_INFO')
    effective_date = models.DateField(null=True, blank=True)
    sunset_date = models.DateField(null=True, blank=True)
    is_active = models.BooleanField(default=True)

    class Meta:
        ordering = ['state_code', 'rule_id_code']

    def get_conditions(self):
        return json.loads(self.condition_expression)

    def get_questions(self):
        return json.loads(self.question_template)

    def __str__(self):
        return f"{self.rule_id_code}: {self.description[:60]}"


class MarketplaceListing(models.Model):
    """A waste profile listed on the marketplace for bidding."""
    STATUS_CHOICES = [
        ('open', 'Open for Bids'),
        ('bid_accepted', 'Bid Accepted'),
        ('completed', 'Completed'),
        ('withdrawn', 'Withdrawn'),
    ]
    BID_TYPE_NEEDED_CHOICES = [
        ('shipping', 'Shipping Only'),
        ('disposal', 'Disposal Only'),
        ('both', 'Shipping and Disposal'),
        ('either', 'Either Shipping or Disposal'),
    ]

    listing_id = models.CharField(max_length=32, unique=True, default=_generate_listing_id)
    mixture = models.OneToOneField(Mixture, on_delete=models.CASCADE, related_name='marketplace_listing')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='open')
    bid_type_needed = models.CharField(max_length=20, choices=BID_TYPE_NEEDED_CHOICES, default='either')
    description = models.TextField(blank=True)
    preferred_completion_date = models.DateField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f"Listing {self.listing_id} – {self.mixture.name}"


class Bid(models.Model):
    """A bid submitted by a service provider on a marketplace listing."""
    STATUS_CHOICES = [
        ('pending', 'Pending Review'),
        ('accepted', 'Accepted'),
        ('rejected', 'Rejected'),
        ('withdrawn', 'Withdrawn'),
    ]
    BID_TYPE_CHOICES = [
        ('shipping', 'Shipping Only'),
        ('disposal', 'Disposal Only'),
        ('both', 'Shipping and Disposal'),
    ]

    listing = models.ForeignKey(MarketplaceListing, on_delete=models.CASCADE, related_name='bids')
    bid_id = models.CharField(max_length=32, unique=True, default=_generate_bid_id)
    bidder_company_name = models.CharField(max_length=300)
    bidder_contact_name = models.CharField(max_length=200, blank=True)
    bidder_contact_email = models.EmailField(blank=True)
    bidder_contact_phone = models.CharField(max_length=50, blank=True)
    epa_id = models.CharField(max_length=20, blank=True, help_text='Bidder EPA ID number')
    bid_type = models.CharField(max_length=20, choices=BID_TYPE_CHOICES)
    amount = models.DecimalField(max_digits=12, decimal_places=2, null=True, blank=True)
    service_area_states = models.TextField(default='[]', help_text='JSON array of 2-letter state codes')
    waste_codes_handled = models.TextField(default='[]', help_text='JSON array of EPA waste codes the bidder can handle')
    certifications = models.TextField(blank=True, help_text='Description of certifications and permits')
    notes = models.TextField(blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    submitted_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-submitted_at']

    def get_service_area_states(self):
        return json.loads(self.service_area_states)

    def get_waste_codes_handled(self):
        return json.loads(self.waste_codes_handled)

    def __str__(self):
        return f"Bid {self.bid_id} by {self.bidder_company_name} on {self.listing.listing_id}"


class StateValidationResult(models.Model):
    """Records the result of running state rules against a mixture profile."""
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    mixture = models.ForeignKey(Mixture, on_delete=models.CASCADE, related_name='state_validations')
    validated_at = models.DateTimeField(auto_now_add=True)
    state_code = models.CharField(max_length=2)
    overall_result = models.CharField(max_length=12, choices=[
        ('pass', 'Pass'),
        ('needs_info', 'Needs Info'),
        ('fail', 'Fail'),
    ])
    rule_results = models.TextField(default='[]', help_text='JSON array of {rule_id, result, details}')
    additional_data_collected = models.TextField(default='{}', help_text='JSON object of answers to state questions')

    class Meta:
        ordering = ['-validated_at']

    def get_rule_results(self):
        return json.loads(self.rule_results)

    def __str__(self):
        return f"State validation for {self.mixture} ({self.state_code}) - {self.overall_result}"


class Incinerator(models.Model):
    """Incinerator facility that can accept specific EPA waste codes for disposal."""
    name = models.CharField(max_length=300)
    address = models.TextField(blank=True)
    city = models.CharField(max_length=100, blank=True)
    state = models.CharField(max_length=100, blank=True)
    zip_code = models.CharField(max_length=20, blank=True)
    phone = models.CharField(max_length=50, blank=True)
    contact_name = models.CharField(max_length=200, blank=True)
    contact_email = models.EmailField(blank=True)
    permit_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    accepted_waste_codes = models.TextField(default='[]', help_text='JSON array of accepted EPA waste codes')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def get_accepted_waste_codes(self):
        return json.loads(self.accepted_waste_codes)

    def __str__(self):
        return self.name
