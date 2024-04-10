"""
URL configuration for PyPSAEarthDashboard project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/4.2/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path
from geojson.views import index
from geojson import views


urlpatterns = [
    path('admin/', admin.site.urls),
    path('', index, name='index'),
    path('api/line-data/', views.line_data_json, name='line_data_json'),
    path('api/optimal-storage-capacity/', views.optimal_storage_capacity_json, name='optimal_storage_capacity_json'),
    path('api/nominal-storage-capacity/', views.nominal_storage_capacity_json, name='nominal_storage_capacity_json'),
    path('api/optimal-generator-capacity/', views.optimal_generator_capacity_json, name='optimal_generator_capacity_json'),
    path('api/nominal-generator-capacity/', views.nominal_generator_capacity_json, name='nominal_generator_capacity_json'),
]
