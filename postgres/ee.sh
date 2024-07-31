#!/bin/bash

export PGPASSWORD=${POSTGRES_PASSWORD}

# Initialize the PostgreSQL data directory
# initdb -D ${PGDATA} -A md5 --pwfile=<(echo "$PGPASSWORD")
initdb -D ${PGDATA} 


# cp /data/postgresql.conf ${PGDATA}/postgresql.conf
# cp /data/pg_hba.conf ${PGDATA}/pg_hba.conf

# Start PostgreSQL in the background
pg_ctl -D ${PGDATA} -l /var/log/postgresql/logfile start

# Wait for PostgreSQL to start
wait_postgresql() {
  while ! pg_isready -q; do
    echo "Waiting for PostgreSQL to start..."
    sleep 1
  done
}
wait_postgresql

# Create the Postgres database named "mypostgresDB" with the "template_postgis" template
createdb mypostgresDB 

# Extract the schema and data from the backup file
pg_restore -f /tmp/schema_new.sql -s /data/mypostgresDB-backup.sql 2>&1 | tee /var/log/postgresql/schema_extract.log
pg_restore -f /tmp/new_data.sql -a /data/mypostgresDB-backup.sql 2>&1 | tee /var/log/postgresql/data_extract.log

# Import the schema and data into the new database
psql --dbname=mypostgresDB -f /tmp/schema_new.sql 2>&1 | tee /var/log/postgresql/schema_import.log
psql --dbname=mypostgresDB -f /tmp/new_data.sql 2>&1 | tee /var/log/postgresql/data_import.log

# cp /data/postgresql.conf ${PGDATA}/postgresql.conf
# cp /data/pg_hba.conf ${PGDATA}/pg_hba.conf

pg_ctl reload

# Keep PostgreSQL running
tail -f /var/log/postgresql/logfile
