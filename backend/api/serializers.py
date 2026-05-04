from rest_framework import serializers
import json
from .models import Chemical, Mixture, MixtureComponent, WasteDetermination


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

    class Meta:
        model = Mixture
        fields = '__all__'


class MixtureCreateSerializer(serializers.ModelSerializer):
    components = MixtureComponentSerializer(many=True, required=False)

    class Meta:
        model = Mixture
        fields = '__all__'

    def create(self, validated_data):
        components_data = validated_data.pop('components', [])
        mixture = Mixture.objects.create(**validated_data)
        for comp_data in components_data:
            MixtureComponent.objects.create(mixture=mixture, **comp_data)
        return mixture
