# Base image with PostgreSQL and PostGIS
FROM postgis/postgis:16-3.4

# Set up environment variables
ENV PGDATA=/var/pgdata
ENV POSTGRES_USER=postgres
ENV POSTGRES_PASSWORD=oetpostgres
ENV POSTGRES_DB=mypostgresDB
# ENV DB_HOST=127.0.0.1

# Create a directory to store PostgreSQL data and logs
RUN mkdir -p ${PGDATA} /tmp /var/log/postgresql && chown -R postgres:postgres ${PGDATA} /tmp /var/log/postgresql

WORKDIR /data

# Expose the PostgreSQL port
EXPOSE 5432

COPY . .

USER root
RUN chmod +x ./entrypoint.sh

USER postgres

CMD ["./entrypoint.sh"]