from django.shortcuts import render
from django.http import JsonResponse
from django.shortcuts import render
from .models import (
  Lines,
  NominalGeneratorCapacity,
  OptimalGeneratorCapacity,
  NominalStorageCapacity,
  OptimalStorageCapacity
)

# Create your views here.
def index(request):
  return render(request, 'index.html')

def nominal_generator_capacity_json(request):
    # Selecciona solo los campos que necesitas
    capacities = NominalGeneratorCapacity.objects.all().values(
        'id', 'Bus', 'v_nom', 'country', 'x', 'y', 'control', 'generator',
        'type', 'unit', 'v_mag_pu_set', 'v_mag_pu_min', 'sub_network', 'geom',
        'carrier', 'p_nom'
    )
    # Convierte el QuerySet a una lista de diccionarios
    capacity_list = list(capacities)
    # Asegúrate de que los campos geométricos se convierten a un formato JSON amigable
    for capacity in capacity_list:
        capacity['geom'] = str(capacity['geom'])  # Convertir el valor geométrico a string, si es necesario
    return JsonResponse(capacity_list, safe=False)


def optimal_generator_capacity_json(request):
    # Selecciona solo los campos que necesitas
    capacities = OptimalGeneratorCapacity.objects.all().values(
        'id', 'Bus', 'v_nom', 'country', 'x', 'y', 'control', 'generator',
        'type', 'unit', 'v_mag_pu_set', 'v_mag_pu_min', 'sub_network', 'geom',
        'carrier', 'p_nom_opt'
    )
    # Convierte el QuerySet a una lista de diccionarios
    capacity_list = list(capacities)
    # Asegúrate de que los campos geométricos se convierten a un formato JSON amigable
    for capacity in capacity_list:
        capacity['geom'] = str(capacity['geom'])  # Convertir el valor geométrico a string, si es necesario
    return JsonResponse(capacity_list, safe=False)
    
def nominal_storage_capacity_json(request):
    capacities = NominalStorageCapacity.objects.all().values(
        'Bus', 'geom', 'carrier', 'p_nom'
    )
    # Convierte el QuerySet a una lista de diccionarios
    capacity_list = list(capacities)
    # Convertir el valor geométrico a string, si es necesario
    for capacity in capacity_list:
        capacity['geom'] = str(capacity['geom'])
    return JsonResponse(capacity_list, safe=False)
  
def optimal_storage_capacity_json(request):
    capacities = OptimalStorageCapacity.objects.all().values(
        'Bus', 'geom', 'carrier', 'p_nom_opt'
    )
    # Convierte el QuerySet a una lista de diccionarios
    capacity_list = list(capacities)
    # Convertir el valor geométrico a string, si es necesario
    for capacity in capacity_list:
        capacity['geom'] = str(capacity['geom'])
    return JsonResponse(capacity_list, safe=False)  
  
def line_data_json(request):
    line_data = Lines.objects.all().values(
        'Line', 'bus0', 'bus1', 'length', 'num_parallel', 'carrier', 'type',
        's_max_pu', 's_nom', 'capital_cost', 's_nom_extendable', 's_nom_min',
        'x', 'r', 'b', 'build_year', 'x_pu_eff', 'r_pu_eff', 's_nom_opt',
        'v_nom', 'g', 's_nom_max', 'lifetime', 'terrain_factor', 
        'v_ang_min', 'v_ang_max', 'sub_network', 'x_pu', 'r_pu', 'g_pu', 'b_pu', 'line_geom'
    )
    # Convierte el QuerySet a una lista de diccionarios
    line_list = list(line_data)
    # Convertir el valor geométrico a string, si es necesario
    for line in line_list:
        line['line_geom'] = str(line['line_geom'])
    return JsonResponse(line_list, safe=False)