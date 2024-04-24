# SPDX-FileCopyrightText: 2024 Bryan Ramirez <bryan.ramirez@openenergytransition.org>
#
# SPDX-License-Identifier: AGPL-3.0-or-later
#

import os
import glob
import zipfile
from sqlalchemy import *
from geo.Geoserver import Geoserver
# from pg.pg import Pg
from django.contrib.gis.db import models as gis_models
from django.contrib.gis.geos import GEOSGeometry
from django.db.models import JSONField 
import datetime
import json
from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
import geopandas as gpd
import pandas as pd
from sqlalchemy import create_engine
from geoserver.catalog import Catalog
from geoalchemy2 import Geometry, WKTElement
from sqlalchemy import text
from sqlalchemy import MetaData
from django.db import models

import logging

from environ import Env
env = Env()
env.read_env() 

GEOSERVER_URL = env("GEOSERVER_URL")
GEOSERVER_USER = env("GEOSERVER_USER")
GEOSERVER_PASS = env("GEOSERVER_PASS")
DATABASE_URL = env("DATABASE_URL")

logger = logging.getLogger(__name__)

geo = Catalog(GEOSERVER_URL, username=GEOSERVER_USER, password=GEOSERVER_PASS)
conn_str = DATABASE_URL


# Create your models here.

#########################################################################################
# Django model for geojson files
#########################################################################################

class Bus(models.Model):
  name = models.CharField(max_length=100, default="Buses_geojson_data")
  geojson_file = models.FileField(upload_to='geojson_files/', 
                                  null=True, blank=True)  # Field to load GeoJSON files
  uploaded_time = models.DateTimeField(default=datetime.datetime.now)  # load date 
  geometry = gis_models.GeometryField(srid=4326, db_index=True, null=True, blank=True)

  def __str__(self):
    return self.name

# Signal handlers
#########################################################################################
# Django post delete signal
#########################################################################################
# This signal function is triggered after a Bus instance is saved.
@receiver(post_save, sender=Bus)
def publish_data(sender, instance, created, **kwargs):
  if not created:
    return  # Skip processing if the instance is not newly created.
  
  try:
    # Process GeoJSON file if available for the new Bus instance.
    if instance.geojson_file:
      gdf = gpd.read_file(instance.geojson_file.path) # Load GeoJSON from the file into a GeoDataFrame for spatial operations.
    
      if not gdf.empty and 'geometry' in gdf and not gdf['geometry'].is_empty.all():
        engine = create_engine(conn_str, echo=True) # Establish Database connection
              
        # Convert geometries to WKT format and load them into PostGIS, using 'geom' as the geometry column name.
        gdf['geom'] = gdf['geometry'].apply(lambda x: x.wkt)
        gdf.drop('geometry', axis=1, inplace=True)
              
        # Creates a table name with the prefix 'geojson'.
        table_name = "geojson_" + instance.name 
        gdf.to_sql(name=table_name, con=engine, if_exists='replace', index=False,
                   dtype={'geom': Geometry('GEOMETRY', srid=4326)})

        
        # Publish the GeoJSON data to GeoServer using the GeoServer REST client.
        # Ensure proper configuration of store, workspace, and database details.
        GEOSERVER_URL = env("GEOSERVER_URL")
        GEOSERVER_USER = env("GEOSERVER_USER")
        GEOSERVER_PASS = env("GEOSERVER_PASS")
        geo = Catalog(GEOSERVER_URL, username=GEOSERVER_USER, password=GEOSERVER_PASS)
        geo.create_featurestore(name='PyPSAEarthDashboard', workspace='PyPSAEarthDashboard', 
                                        db='PyPSAEarthDashboard', host='localhost', 
                                        pg_user='postgres', pg_password='1234', schema='public')
        geo.publish_featurestore(workspace='PyPSAEarthDashboard', store_name='PyPSAEarthDashboard',
                                         pg_table=instance.name)

            
  except Exception as e:
    # print(f"There is a problem during file processing: {e}")
    logger.error(f"Error processing file: {e}", exc_info=True)


#########################################################################################
# Django post delete signal
#########################################################################################

@receiver(post_delete, sender=Bus)
def delete_data(sender, instance, **kwargs):
    DATABASE_URL = env("DATABASE_URL") ##
    engine = create_engine(conn_str)
    try:
        geojson_table_name = f"geojson_{instance.name}"
        sql = text(f"DROP TABLE IF EXISTS public.\"{geojson_table_name}\"")
        with engine.begin() as connection:
            connection.execute(sql)
            logger.info(f"Table '{geojson_table_name}' deleted from the database.")
    except Exception as e:
        logger.error(f"Error deleting table for {geojson_table_name}: {e}")


#########################################################################################
# Django model for json files
#########################################################################################

class JSONBus(models.Model):
    name = models.CharField(max_length=100)
    json_file = models.FileField(upload_to='json_files/', null=True, blank=True)
    uploaded_time = models.DateTimeField(default=datetime.datetime.now)

    def __str__(self):
        return self.name

# Signal handlers
#########################################################################################
# Django post save signal
#########################################################################################
@receiver(post_save, sender=JSONBus)
def publish_json_data(sender, instance, created, **kwargs):
    if not created or not instance.json_file:
        logger.info("Signal triggered, but no new file was created.")
        return

    try:
        logger.info(f"Processing JSON file for instance '{instance.name}'")
        # Check if the file is accessible
        if not os.path.isfile(instance.json_file.path):
            logger.error(f"File not found at '{instance.json_file.path}'")
            return

        # Load JSON file into a Python dictionary
        with open(instance.json_file.path, 'r') as file:
            json_data = json.load(file)

        # Check if 'data' key exists and it's not empty
        if 'data' in json_data and json_data['data']:
            # Process JSON data based on its structure
            if 'columns' in json_data:
                # Use 'columns' key for DataFrame columns if it exists
                json_df = pd.DataFrame(json_data['data'], columns=json_data['columns'])
            else:
                # If no 'columns' key, assume data is a list of dictionaries
                json_df = pd.DataFrame(json_data['data'])

            logger.info(f"DataFrame created for '{instance.name}'")

            # Write the DataFrame to SQL
            engine = create_engine(conn_str, echo=True)
            json_table_name = "json_" + instance.name
            json_df.to_sql(name=json_table_name, con=engine, if_exists='replace', index=False)
            logger.info(f"Data written to SQL table '{json_table_name}'")
        else:
            logger.warning(f"No data to write for '{instance.name}'")

    except Exception as e:
        logger.error(f"Error processing JSON file: {e}", exc_info=True)


# Signal handlers  
@receiver(post_delete, sender=JSONBus)
def delete_json_data(sender, instance, **kwargs):
    engine = create_engine(conn_str)
    try:
        json_table_name = f"json_{instance.name}"
        sql = text(f"DROP TABLE IF EXISTS public.\"{json_table_name}\"")
        with engine.begin() as connection:
            connection.execute(sql)
            logger.info(f"Table '{json_table_name}' deleted from the database.")
    except Exception as e:
        logger.error(f"Error deleting table for {json_table_name}: {e}")



#########################################################################################
# Django model for statistics files
#########################################################################################

# Clase Lines
class Lines(models.Model):
    Line = models.CharField(max_length=255, primary_key=True)
    bus0 = models.CharField(max_length=255)
    bus1 = models.CharField(max_length=255)
    length = models.FloatField()
    num_parallel = models.FloatField()
    carrier = models.CharField(max_length=255)
    type = models.CharField(max_length=255)
    s_max_pu = models.FloatField()
    s_nom = models.FloatField()
    capital_cost = models.FloatField()
    s_nom_extendable = models.BooleanField()
    s_nom_min = models.FloatField()
    x = models.FloatField()
    r = models.FloatField()
    b = models.FloatField()
    build_year = models.IntegerField(null=True, blank=True)
    x_pu_eff = models.FloatField()
    r_pu_eff = models.FloatField()
    s_nom_opt = models.FloatField()
    v_nom = models.FloatField()
    g = models.FloatField(null=True, blank=True)
    s_nom_max = models.FloatField(null=True, blank=True)
    lifetime = models.FloatField(null=True, blank=True)
    terrain_factor = models.FloatField(null=True, blank=True)
    v_ang_min = models.FloatField(null=True, blank=True)
    v_ang_max = models.FloatField(null=True, blank=True)
    sub_network = models.CharField(max_length=255, null=True, blank=True)
    x_pu = models.FloatField(null=True, blank=True)
    r_pu = models.FloatField(null=True, blank=True)
    g_pu = models.FloatField(null=True, blank=True)
    b_pu = models.FloatField(null=True, blank=True)
    line_geom = gis_models.GeometryField(db_index=True, null=True, blank=True)

    class Meta:
        managed = False
        db_table = 'network_lines_view'

# Clase generators p_nom 
class NominalGeneratorCapacity(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    Bus = models.CharField(max_length=255)
    v_nom = models.FloatField()
    country = models.CharField(max_length=255)
    x = models.FloatField()
    y = models.FloatField()
    control = models.CharField(max_length=255)
    generator = models.CharField(max_length=255)
    type = models.CharField(max_length=255, null=True, blank=True)
    unit = models.CharField(max_length=255, null=True, blank=True)
    v_mag_pu_set = models.FloatField()
    v_mag_pu_min = models.FloatField()
    sub_network = models.CharField(max_length=255, null=True, blank=True)
    geom = gis_models.GeometryField(db_index=True)
    carrier = models.CharField(max_length=255)
    p_nom = models.FloatField()

    class Meta:
        managed = False
        db_table = 'view_nominal_generator_capacity_with_geom'

class OptimalGeneratorCapacity(models.Model):
    id = models.CharField(max_length=255, primary_key=True)
    Bus = models.CharField(max_length=255)
    v_nom = models.FloatField()
    country = models.CharField(max_length=255)
    x = models.FloatField()
    y = models.FloatField()
    control = models.CharField(max_length=255)
    generator = models.CharField(max_length=255)
    type = models.CharField(max_length=255, null=True, blank=True)
    unit = models.CharField(max_length=255, null=True, blank=True)
    v_mag_pu_set = models.FloatField()
    v_mag_pu_min = models.FloatField()
    sub_network = models.CharField(max_length=255, null=True, blank=True)
    geom = gis_models.GeometryField(db_index=True)
    carrier = models.CharField(max_length=255)
    p_nom_opt = models.FloatField()

    class Meta:
        managed = False
        db_table = 'view_optimal_generator_capacity_with_geom'

class NominalStorageCapacity(models.Model):
    Bus = models.CharField(max_length=255, primary_key=True)
    geom = gis_models.GeometryField(db_index=True)
    carrier = models.CharField(max_length=255)
    p_nom = models.FloatField()

    class Meta:
        managed = False
        db_table = 'view_nominal_storage_unit_capacity_with_geom'

class OptimalStorageCapacity(models.Model):
    Bus = models.CharField(max_length=255, primary_key=True)
    geom = gis_models.GeometryField(db_index=True)
    carrier = models.CharField(max_length=255)
    p_nom_opt = models.FloatField()

    class Meta:
        managed = False
        db_table = 'view_optimal_storage_unit_capacity_with_geom'
