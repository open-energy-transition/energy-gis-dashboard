#!/bin/bash
set -e

export PGPASSWORD=${POSTGRES_PASSWORD}

# Initialize the PostgreSQL data directory with md5 authentication
initdb -D ${PGDATA} -A md5 --pwfile=<(echo "$PGPASSWORD")

echo "host all all 172.17.0.0/16 md5" >> ${PGDATA}/pg_hba.conf

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

createdb ${POSTGRES_DB} --template=template1

# Extract the schema and data from the backup file
pg_restore -f /tmp/schema_new.sql -s /data/mypostgresDB-backup.sql 2>&1 | tee /var/log/postgresql/schema_extract.log
pg_restore -f /tmp/new_data.sql -a /data/mypostgresDB-backup.sql 2>&1 | tee /var/log/postgresql/data_extract.log

# Import the schema and data into the new database
psql --dbname=${POSTGRES_DB} -f /tmp/schema_new.sql 2>&1 | tee /var/log/postgresql/schema_import.log
psql --dbname=${POSTGRES_DB} -f /tmp/new_data.sql 2>&1 | tee /var/log/postgresql/data_import.log


# Stop the PostgreSQL server cleanly
pg_ctl -D ${PGDATA} -m fast -w stop

pg_ctl -D ${PGDATA} -l /var/log/postgresql/logfile start

wait_postgresql

tail -f /var/log/postgresql/logfile
