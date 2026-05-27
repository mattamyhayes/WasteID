from rest_framework import serializers
import json
from .models import (Chemical, Mixture, MixtureComponent, WasteDetermination,
                     Customer, CustomerLocation, Shipper, EPAManifest,
                     Order, Journey, OrderJourney, StateRule, StateValidationResult,
                     MarketplaceListing, Bid, Incinerator, ProfileDocument,
                     SafetyDataSheet, ContactUsSubmission)


class CustomerLocationSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerLocation
        fields = ['id', 'customer', 'name', 'address', 'city', 'state', 'postal_code', 'notes', 'created_at']
        read_only_fields = ['created_at']


class CustomerSerializer(serializers.ModelSerializer):
    locations = CustomerLocationSerializer(many=True, read_only=True)

    class Meta:
        model = Customer
        fields = ['id', 'name', 'contact_name', 'contact_email', 'contact_phone',
                  'epa_generator_status', 'billing_address', 'notes', 'created_at', 'updated_at', 'locations']
        read_only_fields = ['created_at', 'updated_at']


class ContactUsSubmissionSerializer(serializers.ModelSerializer):
    recipient_emails_list = serializers.SerializerMethodField()

    def get_recipient_emails_list(self, obj):
        try:
            return json.loads(obj.recipient_emails)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    class Meta:
        model = ContactUsSubmission
        fields = [
            'id', 'name', 'company', 'role', 'email', 'phone',
            'message', 'recipient_emails', 'recipient_emails_list', 'submitted_at',
        ]
        read_only_fields = ['id', 'submitted_at', 'recipient_emails']


class ChemicalSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    source_display = serializers.CharField(source='get_source_display', read_only=True)

    class Meta:
        model = Chemical
        fields = '__all__'


class MixtureComponentSerializer(serializers.ModelSerializer):
    component_name = serializers.ReadOnlyField()
    chemical_detail = ChemicalSerializer(source='chemical', read_only=True)

    class Meta:
        model = MixtureComponent
        fields = '__all__'


class WasteDeterminationSerializer(serializers.ModelSerializer):
    waste_codes_list = serializers.SerializerMethodField()
    reasoning_list = serializers.SerializerMethodField()

    def get_waste_codes_list(self, obj):
        try:
            return json.loads(obj.waste_codes)
        except Exception:
            return []

    def get_reasoning_list(self, obj):
        try:
            return json.loads(obj.reasoning)
        except Exception:
            return []

    class Meta:
        model = WasteDetermination
        fields = '__all__'


class MixtureSerializer(serializers.ModelSerializer):
    components = MixtureComponentSerializer(many=True, read_only=True)
    determinations = WasteDeterminationSerializer(many=True, read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='')
    customer_location_name = serializers.CharField(source='customer_location.name', read_only=True, default='')
    ship_by_date = serializers.DateField(read_only=True)
    days_remaining_to_ship = serializers.IntegerField(read_only=True)
    hold_days = serializers.IntegerField(read_only=True)

    class Meta:
        model = Mixture
        fields = '__all__'
        read_only_fields = ['transaction_id']


class MixtureCreateSerializer(serializers.ModelSerializer):
    components = MixtureComponentSerializer(many=True, required=False)

    class Meta:
        model = Mixture
        fields = '__all__'
        read_only_fields = ['transaction_id']

    def create(self, validated_data):
        components_data = validated_data.pop('components', [])
        mixture = Mixture.objects.create(**validated_data)
        for comp_data in components_data:
            MixtureComponent.objects.create(mixture=mixture, **comp_data)
        return mixture


class ShipperSerializer(serializers.ModelSerializer):
    class Meta:
        model = Shipper
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class EPAManifestSerializer(serializers.ModelSerializer):
    waste_items_list = serializers.SerializerMethodField()
    determination_ids_list = serializers.SerializerMethodField()
    shipper_name = serializers.CharField(source='generator_shipper.company_name', read_only=True, default='')

    def get_waste_items_list(self, obj):
        try:
            return json.loads(obj.waste_items)
        except Exception:
            return []

    def get_determination_ids_list(self, obj):
        try:
            return json.loads(obj.determination_ids)
        except Exception:
            return []

    class Meta:
        model = EPAManifest
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at']


class JourneySerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)
    mixture_transaction_id = serializers.CharField(source='mixture.transaction_id', read_only=True)
    customer_name = serializers.CharField(source='customer.name', read_only=True, default='')
    generation_date = serializers.DateField(source='mixture.generation_date', read_only=True)
    pickup_by_date = serializers.DateField(source='mixture.pickup_by_date', read_only=True)
    ship_by_date = serializers.DateField(source='mixture.ship_by_date', read_only=True)

    class Meta:
        model = Journey
        fields = '__all__'
        read_only_fields = ['created_at', 'updated_at', 'duration_seconds']
        

class OrderJourneySerializer(serializers.ModelSerializer):
    stage_display = serializers.CharField(source='get_stage_display', read_only=True)

    class Meta:
        model = OrderJourney
        fields = '__all__'
        read_only_fields = ['timestamp']


class OrderSerializer(serializers.ModelSerializer):
    journey_records = OrderJourneySerializer(many=True, read_only=True)
    generator_name = serializers.CharField(source='generator.name', read_only=True, default='')
    profile_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Mixture.objects.all(), source='profiles', required=False)
    shipper_ids = serializers.PrimaryKeyRelatedField(
        many=True, queryset=Shipper.objects.all(), source='potential_shippers', required=False)

    class Meta:
        model = Order
        fields = ['id', 'order_id', 'owner_name', 'generator', 'generator_name',
                  'status', 'profiles', 'potential_shippers', 'profile_ids', 'shipper_ids',
                  'notes', 'created_at', 'updated_at', 'journey_records']
        read_only_fields = ['order_id', 'created_at', 'updated_at']


class StateRuleSerializer(serializers.ModelSerializer):
    questions = serializers.SerializerMethodField()
    conditions = serializers.SerializerMethodField()

    def get_questions(self, obj):
        try:
            return json.loads(obj.question_template)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    def get_conditions(self, obj):
        try:
            return json.loads(obj.condition_expression)
        except (json.JSONDecodeError, TypeError, ValueError):
            return {}

    class Meta:
        model = StateRule
        fields = '__all__'


class StateValidationResultSerializer(serializers.ModelSerializer):
    rule_results_list = serializers.SerializerMethodField()

    def get_rule_results_list(self, obj):
        try:
            return json.loads(obj.rule_results)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    class Meta:
        model = StateValidationResult
        fields = '__all__'
        read_only_fields = ['validated_at']


class BidSerializer(serializers.ModelSerializer):
    service_area_states_list = serializers.SerializerMethodField()
    waste_codes_handled_list = serializers.SerializerMethodField()
    bid_type_display = serializers.CharField(source='get_bid_type_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)

    def get_service_area_states_list(self, obj):
        try:
            return json.loads(obj.service_area_states)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    def get_waste_codes_handled_list(self, obj):
        try:
            return json.loads(obj.waste_codes_handled)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    class Meta:
        model = Bid
        fields = '__all__'
        read_only_fields = ['bid_id', 'submitted_at', 'updated_at']


class MarketplaceListingSerializer(serializers.ModelSerializer):
    bids = BidSerializer(many=True, read_only=True)
    bid_count = serializers.SerializerMethodField()
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    bid_type_needed_display = serializers.CharField(source='get_bid_type_needed_display', read_only=True)

    # Mixture summary fields for browsing without a separate join
    mixture_name = serializers.CharField(source='mixture.name', read_only=True)
    mixture_transaction_id = serializers.CharField(source='mixture.transaction_id', read_only=True)
    customer_name = serializers.CharField(source='mixture.customer.name', read_only=True, default='')
    epa_generator_status = serializers.CharField(source='mixture.epa_generator_status', read_only=True, default='')
    shipment_size_qty = serializers.IntegerField(source='mixture.shipment_size_qty', read_only=True, default=None)
    shipment_size_unit = serializers.CharField(source='mixture.shipment_size_unit', read_only=True, default='')
    days_remaining_to_ship = serializers.IntegerField(source='mixture.days_remaining_to_ship', read_only=True, default=None)
    is_hazardous = serializers.SerializerMethodField()
    waste_codes = serializers.SerializerMethodField()
    generator_state = serializers.SerializerMethodField()

    def get_bid_count(self, obj):
        return obj.bids.filter(status__in=['pending', 'accepted']).count()

    def _get_latest_determination(self, obj):
        return obj.mixture.determinations.order_by('-created_at').first()

    def get_is_hazardous(self, obj):
        det = self._get_latest_determination(obj)
        return det.is_hazardous_waste if det else None

    def get_waste_codes(self, obj):
        det = self._get_latest_determination(obj)
        if not det:
            return []
        try:
            return json.loads(det.waste_codes)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    def get_generator_state(self, obj):
        loc = obj.mixture.customer_location
        return loc.state if loc else ''

    class Meta:
        model = MarketplaceListing
        fields = [
            'id', 'listing_id', 'mixture', 'mixture_name', 'mixture_transaction_id',
            'customer_name', 'epa_generator_status', 'shipment_size_qty', 'shipment_size_unit',
            'days_remaining_to_ship', 'is_hazardous', 'waste_codes', 'generator_state',
            'status', 'status_display', 'bid_type_needed', 'bid_type_needed_display',
            'description', 'preferred_completion_date',
            'bid_count', 'bids', 'created_at', 'updated_at',
        ]
        read_only_fields = ['listing_id', 'created_at', 'updated_at']


class MarketplaceListingSummarySerializer(MarketplaceListingSerializer):
    """Lighter serializer for list view – omits full bids array."""
    class Meta(MarketplaceListingSerializer.Meta):
        fields = [f for f in MarketplaceListingSerializer.Meta.fields if f != 'bids']


class IncineratorSerializer(serializers.ModelSerializer):
    accepted_waste_codes = serializers.JSONField(default=list)

    class Meta:
        model = Incinerator
        fields = ['id', 'name', 'address', 'city', 'state', 'zip_code', 'phone',
                  'contact_name', 'contact_email', 'permit_number', 'notes',
                  'accepted_waste_codes', 'created_at', 'updated_at']
        read_only_fields = ['created_at', 'updated_at']

    def validate_accepted_waste_codes(self, value):
        if not isinstance(value, list):
            raise serializers.ValidationError("Must be a list of waste codes.")
        return value

    def to_representation(self, instance):
        rep = super().to_representation(instance)
        if isinstance(rep['accepted_waste_codes'], str):
            rep['accepted_waste_codes'] = json.loads(rep['accepted_waste_codes'])
        return rep

    def to_internal_value(self, data):
        ret = super().to_internal_value(data)
        if 'accepted_waste_codes' in ret and isinstance(ret['accepted_waste_codes'], list):
            ret['accepted_waste_codes'] = json.dumps(ret['accepted_waste_codes'])
        return ret


class ProfileDocumentSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProfileDocument
        fields = ['id', 'mixture', 'file_type', 'short_name', 'file', 'stored_filename', 'uploaded_at']
        read_only_fields = ['stored_filename', 'uploaded_at']


class SafetyDataSheetListSerializer(serializers.ModelSerializer):
    """Lighter serializer for SDS list view."""
    profile_name = serializers.CharField(source='mixture.name', read_only=True, default='')
    profile_transaction_id = serializers.CharField(source='mixture.transaction_id', read_only=True, default='')

    class Meta:
        model = SafetyDataSheet
        fields = ['id', 'product_name', 'cas_number', 'manufacturer_name',
                  'imported_at', 'import_status', 'original_filename',
                  'mixture', 'profile_name', 'profile_transaction_id']


class SafetyDataSheetSerializer(serializers.ModelSerializer):
    """Full serializer for SDS detail/create views."""
    profile_name = serializers.CharField(source='mixture.name', read_only=True, default='')
    profile_transaction_id = serializers.CharField(source='mixture.transaction_id', read_only=True, default='')
    composition_list = serializers.SerializerMethodField()
    hazard_statements_list = serializers.SerializerMethodField()
    precautionary_statements_list = serializers.SerializerMethodField()
    ghs_classification_list = serializers.SerializerMethodField()
    exposure_limits_list = serializers.SerializerMethodField()

    def get_composition_list(self, obj):
        try:
            return json.loads(obj.composition)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    def get_hazard_statements_list(self, obj):
        try:
            return json.loads(obj.hazard_statements)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    def get_precautionary_statements_list(self, obj):
        try:
            return json.loads(obj.precautionary_statements)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    def get_ghs_classification_list(self, obj):
        try:
            return json.loads(obj.ghs_classification)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    def get_exposure_limits_list(self, obj):
        try:
            return json.loads(obj.exposure_limits)
        except (json.JSONDecodeError, TypeError, ValueError):
            return []

    class Meta:
        model = SafetyDataSheet
        fields = '__all__'
        read_only_fields = ['imported_at']
