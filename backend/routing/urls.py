from django.urls import path
from .views import analyze_routes

urlpatterns = [
    path('analyze/', analyze_routes, name='analyze_routes'),
]