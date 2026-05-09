from rest_framework import serializers
import json
from .models import (Chemical, Mixture, MixtureComponent, WasteDetermination,
                     Customer, CustomerLocation, Shipper, EPAManifest)


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
                  'billing_address', 'notes', 'created_at', 'updated_at', 'locations']
        read_only_fields = ['created_at', 'updated_at']


class ChemicalSerializer(serializers.ModelSerializer):
    category_display = serializers.CharField(source='get_category_display', read_only=True)

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
