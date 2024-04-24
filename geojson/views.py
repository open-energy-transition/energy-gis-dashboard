# SPDX-FileCopyrightText: 2024 Bryan Ramirez <bryan.ramirez@openenergytransition.org>
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

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
    capacities = NominalGeneratorCapacity.objects.all().values(
        'id', 'Bus', 'v_nom', 'country', 'x', 'y', 'control', 'generator',
        'type', 'unit', 'v_mag_pu_set', 'v_mag_pu_min', 'sub_network', 'geom',
        'carrier', 'p_nom'
    )
    # Convert the QuerySet to a list of dictionaries
    capacity_list = list(capacities)
    # Convert geometric fields to a JSON-friendly format
    for capacity in capacity_list:
        capacity['geom'] = str(capacity['geom'])  # Convert geometric value to string if necessary
    return JsonResponse(capacity_list, safe=False)


def optimal_generator_capacity_json(request):
    capacities = OptimalGeneratorCapacity.objects.all().values(
        'id', 'Bus', 'v_nom', 'country', 'x', 'y', 'control', 'generator',
        'type', 'unit', 'v_mag_pu_set', 'v_mag_pu_min', 'sub_network', 'geom',
        'carrier', 'p_nom_opt'
    )
    # Convert the QuerySet to a list of dictionaries
    capacity_list = list(capacities)
    # Convert geometric fields to a JSON-friendly format
    for capacity in capacity_list:
        capacity['geom'] = str(capacity['geom'])  # Convert geometric value to string if necessary
    return JsonResponse(capacity_list, safe=False)
    
def nominal_storage_capacity_json(request):
    capacities = NominalStorageCapacity.objects.all().values(
        'Bus', 'geom', 'carrier', 'p_nom'
    )
    # Convert the QuerySet to a list of dictionaries
    capacity_list = list(capacities)
    # Convert geometric value to string if necessary
    for capacity in capacity_list:
        capacity['geom'] = str(capacity['geom'])
    return JsonResponse(capacity_list, safe=False)
  
def optimal_storage_capacity_json(request):
    capacities = OptimalStorageCapacity.objects.all().values(
        'Bus', 'geom', 'carrier', 'p_nom_opt'
    )
    # Convert the QuerySet to a list of dictionaries
    capacity_list = list(capacities)
    # Convert geometric value to string if necessary
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
    # Convert the QuerySet to a list of dictionaries
    line_list = list(line_data)
    # Convert geometric value to string if necessary
    for line in line_list:
        line['line_geom'] = str(line['line_geom'])
    return JsonResponse(line_list, safe=False)