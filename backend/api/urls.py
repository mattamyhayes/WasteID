from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (ChemicalViewSet, MixtureViewSet, MixtureComponentViewSet,
                    WasteDeterminationViewSet, CustomerViewSet, CustomerLocationViewSet)

router = DefaultRouter()
router.register(r'chemicals', ChemicalViewSet)
router.register(r'mixtures', MixtureViewSet)
router.register(r'components', MixtureComponentViewSet)
router.register(r'determinations', WasteDeterminationViewSet)
router.register(r'customers', CustomerViewSet)
router.register(r'customer-locations', CustomerLocationViewSet)

urlpatterns = [
    path('', include(router.urls)),
]
