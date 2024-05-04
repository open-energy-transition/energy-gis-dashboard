# PyPSA-Earth Dashboard: Nigeria Test Bench

## Project Description

The PyPSA-Earth Dashboard offers an interactive mapping and data visualization platform for energy systems analysis. Specifically personalized to examine Nigeria's electrical grid, this tool implements technologies such as OpenLayers, Django, and PostGIS to visualize the network architecture and optimized installed capacity.

## Features

- **Interactive Mapping:** Explore detailed visualizations of Nigeria's electrical grid and geographic features through an OpenLayers interface.
- **Data Visualization:** Utilize Chart.js to view and interact with energy data through dynamic charts and graphs.
- **Real-Time Search:** Find specific country locations or infrastructure components within the interactive map.
- **Customizable Data Layers:** Toggle various data layers to focus on different aspects of energy infrastructure, such as Network Statistics or existing grid structures.

## Installation

### Prerequisites

To run this project, ensure you have the following installed:
- [Conda](<https://docs.conda.io/projects/conda/en/latest/user-guide/install/index.html>) for managing the environment.
- [Redis](<https://redis.io/download>) for caching management.

### Environment Setup

1. **Fork and clone the Repository [link](https://github.com/open-energy-transition/energy-gis-dashboard.git):**
   ```bash
   # e.g., git clone https://github.com/your-user/energy-gis-dashboard.git
   cd PyPSAEarthDashboard

2. **Create and Activate the Conda Environment:**
    
    ```bash
    conda env create -f environment.yml
    conda activate dashboard_env
    
    ```
    
3. **Start Redis Server:**
Make sure your Redis server is running, as it handles caching and session management:
    
    ```bash
    redis-server
    ```
    
4. **Database Setup:**

    1. Create the Database (if not already created):
       Open pgAdmin and connect to your PostgreSQL server.
       Right-click on 'Databases', then select 'Create' -> 'Database'.
       Name the database `PyPSAEarthDashboard` and configure any additional settings as needed.
       Click 'Save' to create the database.

    2. Restore the Database:
       A database backup is provided in the form of an SQL file named `PyPSAEarthDashboard.sql` in the `database` folder. This file can be used to easily restore the database using pgAdmin, a popular database management tool for PostgreSQL.
       - Open pgAdmin and connect to your PostgreSQL server.
       - Right-click on your newly created database (`PyPSAEarthDashboard`) and select 'Restore'.
       - Navigate to the `database` folder, select the `PyPSAEarthDashboard.sql` file, and proceed with the restore.

    3. Apply Database Migrations:
       Adjust the `.env` file with your database and Redis connection settings if necessary.
       ```bash
       python manage.py migrate
       ```

    4. Create New Migrations (if necessary):
       If you have made changes to the database models since the last migration, navigate to the application folder and run the following command to apply migrations:
       ```bash
       python manage.py makemigrations
       ```
       Apply the new migrations:
       ```bash
       python manage.py migrate
       ```

    

## Usage

To use the dashboard:

1. **Start the Django Server:**
    
    ```bash
    python manage.py runserver
    ```
    
    This command starts a local web server. Access the dashboard by navigating to `http://localhost:8000` in your web browser.
    
2. **Explore the Dashboard:**
    - Utilize the layer controls in the sidebar to toggle different data layers.
    - Use the search bar to navigate to specific locations quickly.
    - View various statistics through charts and graphs.

## Contributing

Would you be interested in contributing? Great! You can contribute by forking the repository, making changes, and submitting a pull request. You can also report bugs or suggest new features by opening issues.

## Credits

This project was financed by the program ["Junge Innovatoren (JI)"](https://www.junge-innovatoren.de/) of the Federal State of Baden-Württemberg and developed in collaboration with the Karlsruhe Institute of Technology (KIT) [Karlsruhe Institute of Technology (KIT)](https://kit.edu/), [Open Energy Transition (OET)](https://openenergytransition.org/), and [Stuttgart University of Applied Sciences](https://www.hft-stuttgart.com/).

<p align="center">
  <a href="https://www.junge-innovatoren.de/" target="_blank">
    <img src="https://github.com/open-energy-transition/energy-gis-dashboard/assets/42655811/3bbe4241-4f39-47bb-bf9b-72e7076cf5a8" alt="junge-innovatoren_4c" height="100">
  </a>
  <a href="https://www.baden-wuerttemberg.de/de/startseite/" target="_blank">
    <img src="https://github.com/open-energy-transition/energy-gis-dashboard/assets/42655811/6f70ed80-eaf3-4e5e-b8ed-71b4b90bc8ad" alt="bw100_gr_4c_mwk" height="100">
  </a>
   <a href="https://www.kit.edu/" target="_blank">
      <img src="https://github.com/open-energy-transition/energy-gis-dashboard/assets/42655811/07e651ad-14fd-4611-b56a-a724346a1323" alt="kit-logo-color" height="100">
      </a>
   <a href="https://openenergytransition.org/" target="_blank">
      <img src="https://github.com/open-energy-transition/energy-gis-dashboard/assets/42655811/c771930a-36ff-40c8-aff1-f99634cffa12" alt="oet-logo-red-n-subtitle" height="100">
      </a>
</p>

## License

This project is open-source under the [GNU General Public License v3.0](https://www.gnu.org/licenses/gpl-3.0.html). The LICENSE file in this repository provides more details.


## Contact

Please get in touch with [Bryan Ramirez](https://github.com/BryanFran) and [Ekaterina Fedotova](https://github.com/ekatef) for further information or support.
