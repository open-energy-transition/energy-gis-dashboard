#!/bin/bash
set -e


export PGPASSWORD=${POSTGRES_PASSWORD}

# Initialize the PostgreSQL data directory with md5 authentication
initdb -D ${PGDATA} -A md5 --pwfile=<(echo "$POSTGRES_PASSWORD")

# Initialize the PostgreSQL data directory
# initdb -D ${PGDATA} -A md5

# Copy custom configuration files to the PostgreSQL data directory
cp /data/postgresql.conf ${PGDATA}/postgresql.conf
cp /data/pg_hba.conf ${PGDATA}/pg_hba.conf

# Start PostgreSQL in the background with the custom configuration file
pg_ctl -D ${PGDATA} -l /var/log/postgresql/logfile start

# Wait for PostgreSQL to start
wait_postgresql() {
  while ! pg_isready -q; do
    echo "Waiting for PostgreSQL to start..."
    sleep 1
  done
}
wait_postgresql


createdb template_postgis

psql -d template_postgis -c "CREATE EXTENSION postgis;"
psql -d template_postgis -c "CREATE EXTENSION postgis_topology;"

# Create the Postgres database named "mypostgresDB" with the "template_postgis" template
createdb mypostgresDB --template=template_postgis

# Extract the schema and data from the backup file
pg_restore -f /tmp/schema_new.sql -s /data/mypostgresDB-backup.sql 2>&1 | tee /var/log/postgresql/schema_extract.log
pg_restore -f /tmp/new_data.sql -a /data/mypostgresDB-backup.sql 2>&1 | tee /var/log/postgresql/data_extract.log

# Import the schema and data into the new database
psql --dbname=mypostgresDB -f /tmp/schema_new.sql 2>&1 | tee /var/log/postgresql/schema_import.log
psql --dbname=mypostgresDB -f /tmp/new_data.sql 2>&1 | tee /var/log/postgresql/data_import.log

# # Stop the PostgreSQL server cleanly
pg_ctl -D ${PGDATA} -m fast -w stop

# Start PostgreSQL in the foreground with the custom configuration file
# exec postgres -D ${PGDATA} -c config_file=${PGDATA}/postgresql.conf -c logging_collector=on -c log_directory='/var/log/postgresql' -c log_filename='logfile'

pg_ctl -D ${PGDATA} -l /var/log/postgresql/logfile start

wait_postgresql

tail -f /var/log/postgresql/logfile
