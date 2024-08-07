/*
 * SPDX-FileCopyrightText: 2024 Bryan Ramirez <bryan.ramirez@openenergytransition.org>
 *
 * SPDX-License-Identifier: AGPL-3.0-or-later
 */
//*****************************************************************************
//*****************************************************************************
// Global variables
//*****************************************************************************
//*****************************************************************************
let map;

//*****************************************************************************
//*****************************************************************************
// Map initialization function
//*****************************************************************************
//*****************************************************************************
async function init() {
  // Creates a div element for the Bus or Line Label and then it is added to the DOM
  const labelElement = document.createElement("div");
  labelElement.id = "map-label";
  labelElement.style.position = "absolute";
  labelElement.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
  labelElement.style.padding = "2px";
  labelElement.style.borderRadius = "5px";
  labelElement.style.fontSize = "0.7rem";
  labelElement.style.whiteSpace = "nowrap";
  labelElement.style.fontWeight = "bold";
  labelElement.style.display = "none"; // Initially hidden

  // Add the label as a child of the map div
  document.getElementById("js-map").appendChild(labelElement);

  const lineLabelElement = document.createElement("div");
  lineLabelElement.id = "line-map-label";
  lineLabelElement.style.position = "absolute";
  lineLabelElement.style.backgroundColor = "rgba(255, 255, 255, 0.7)";
  lineLabelElement.style.padding = "2px";
  lineLabelElement.style.borderRadius = "5px";
  lineLabelElement.style.fontSize = "0.7rem";
  lineLabelElement.style.whiteSpace = "nowrap";
  lineLabelElement.style.fontWeight = "bold";
  lineLabelElement.style.display = "none";

  document.getElementById("js-map").appendChild(lineLabelElement);

  // Map control definitions
  const fullScreenControl = new ol.control.FullScreen();
  const overViewMapControl = new ol.control.OverviewMap({
    collapsed: false,
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(), // Using OpenStreetMap as the source
        zIndex: 1,
        visible: true,
        opacity: 1,
      }),
    ],
  });
  const scaleLineControl = new ol.control.ScaleLine();
  const zoomSliderControl = new ol.control.ZoomSlider();
  const zoomToExtentControl = new ol.control.ZoomToExtent();

  // Map creation with defined layers and controls
  map = new ol.Map({
    view: new ol.View({
      multiWorld: false,
      // projection: "EPSG:4326",
      center: [1163126.8879498309, 6650038.165295189],
      zoom: 1,
      maxZoom: 20,
      minZoom: 1,
      rotation: 0, // No initial rotation (values in radians)
    }),
    layers: [
      new ol.layer.Tile({
        source: new ol.source.OSM(),
      }),
    ],
    target: "js-map", // The HTML element where the map will be displayed
    keyboardEventTarget: document,
    controls: ol.control.defaults.defaults().extend([
      fullScreenControl,
      // mousePositionControl,
      overViewMapControl,
      scaleLineControl,
      zoomSliderControl,
      zoomToExtentControl,
    ]),
  });
 

  //*****************************************************************************
  //*****************************************************************************
  // GeoServer WMS Layers
  //*****************************************************************************
  //*****************************************************************************

  let buses,
    lines,
    substations,
    generators,
    countries,
    gadm_shapes,
    offshore_shapes,
    africa_shape,
    all_clean_lines;

  async function getLayerCapabilities(layerName) {
    const url = `${GEOSERVER_URL}/geoserver/${GEOSERVER_WORKSPACE}/wms?service=WMS&version=1.1.1&request=GetCapabilities`;

    try {
      const response = await fetch(url);
      const text = await response.text();
      const parser = new DOMParser();
      const xml = parser.parseFromString(text, "application/xml");

      // Log all layer names in the capabilities
      const allLayers = Array.from(xml.getElementsByTagName("Layer"));
      allLayers.forEach((layer) => {
        const name = layer.getElementsByTagName("Name")[0]?.textContent;
      });

      // Search for the specific layer
      const layer = allLayers.find((layer) => {
        const name = layer.getElementsByTagName("Name")[0]?.textContent;
        return (
          name === `${GEOSERVER_WORKSPACE}:${layerName}` || name === layerName
        );
      });

      if (layer) {
        const bbox = layer.getElementsByTagName("BoundingBox")[0];
        const bboxValues = [
          parseFloat(bbox.getAttribute("minx")),
          parseFloat(bbox.getAttribute("miny")),
          parseFloat(bbox.getAttribute("maxx")),
          parseFloat(bbox.getAttribute("maxy")),
        ];

        const srs = bbox.getAttribute("CRS") || bbox.getAttribute("SRS");

        const RESOLUTION = 0.0001;
        const width = Math.round((bboxValues[2] - bboxValues[0]) / RESOLUTION);
        const height = Math.round((bboxValues[3] - bboxValues[1]) / RESOLUTION);
        const format = "application%2Fopenlayers3";

        return { bbox: bboxValues.join(","), width, height, srs, format };
      } else {
        throw new Error(`Layer ${layerName} not found in capabilities`);
      }
    } catch (error) {
      throw error;
    }
  }

  async function createWMSUrl(layerName) {
    try {
      const { bbox, width, height, srs, format } = await getLayerCapabilities(
        layerName
      );
      const url = `${GEOSERVER_URL}/geoserver/${GEOSERVER_WORKSPACE}/wms?service=WMS&version=1.1.0&request=GetMap&layers=${GEOSERVER_WORKSPACE}:${layerName}&bbox=${bbox}&width=${width}&height=${height}&srs=${srs}&styles=&format=${format}`;

      return url;
    } catch (error) {}
  }

  async function addLayerToMap(layerName) {
    const wmsUrl = await createWMSUrl(layerName);
    if (wmsUrl) {
      const layer = new ol.layer.Image({
        source: new ol.source.ImageWMS({
          url: wmsUrl,
          params: {
            LAYERS: `${GEOSERVER_WORKSPACE}:${layerName}`,
            TILED: true,
          },
          serverType: "geoserver",
        }),
      });

      map.addLayer(layer);

      // Asigna la capa a una variable global
      switch (layerName) {
        case "africa_shape":
          africa_shape = layer;
          break;
        case "offshore_shapes":
          offshore_shapes = layer;
          break;
        case "gadm_shapes":
          gadm_shapes = layer;
          break;
        case "country_shapes":
          countries = layer;
          break;
        case "all_clean_lines":
          all_clean_lines = layer;
          break;
        case "all_clean_substations":
          substations = layer;
          break;
        case "All_clean_generators":
          generators = layer;
          break;
        case "network_lines_view":
          lines = layer;
          break;
        case "Buses_geojson_data":
          buses = layer;
          break;
      }
    } else {
    }
  }

  // Add layers to the map
  addLayerToMap("africa_shape");
  addLayerToMap("offshore_shapes");
  addLayerToMap("gadm_shapes");
  addLayerToMap("country_shapes");
  addLayerToMap("all_clean_lines");
  addLayerToMap("all_clean_substations");
  addLayerToMap("All_clean_generators");
  addLayerToMap("network_lines_view");
  addLayerToMap("Buses_geojson_data");

  //*****************************************************************************
  //*****************************************************************************
  // Layer Downloading
  //*****************************************************************************
  //*****************************************************************************

  function createWFSDownloadUrl(layerName) {
    const url = `${GEOSERVER_URL}/geoserver/${GEOSERVER_WORKSPACE}/ows?service=WFS&version=2.0.0&request=GetFeature&typeName=${GEOSERVER_WORKSPACE}:${layerName}&outputFormat=application/json`;

    return url;
  }

  document
    .getElementById("download-africa-shape")
    .addEventListener("click", () => downloadLayerData("africa_shape"));
  document
    .getElementById("download-offshore-shapes")
    .addEventListener("click", () => downloadLayerData("offshore_shapes"));
  document
    .getElementById("download-gadm-shapes")
    .addEventListener("click", () => downloadLayerData("gadm_shapes"));
  document
    .getElementById("download-countries")
    .addEventListener("click", () => downloadLayerData("country_shapes"));
  document
    .getElementById("download-all-clean-lines")
    .addEventListener("click", () => downloadLayerData("all_clean_lines"));
  document
    .getElementById("download-lines")
    .addEventListener("click", () => downloadLayerData("network_lines_view"));
  document
    .getElementById("download-all-clean-generators")
    .addEventListener("click", () => downloadLayerData("All_clean_generators"));
  document
    .getElementById("download-all-clean-substations")
    .addEventListener("click", () =>
      downloadLayerData("all_clean_substations")
    );
  document
    .getElementById("download-buses")
    .addEventListener("click", () => downloadLayerData("Buses_geojson_data"));

  function downloadLayerData(layerName) {
    const url = createWFSDownloadUrl(layerName);
    fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const downloadLink = document.createElement("a");
        downloadLink.href = downloadUrl;
        downloadLink.download = `${layerName}.geojson`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        window.URL.revokeObjectURL(downloadUrl);
      })
      .catch((error) => {});
  }

  //*****************************************************************************
  //*****************************************************************************
  // Geographic Buttons
  //*****************************************************************************
  //*****************************************************************************

  // Toggle layer visibility
  document
    .getElementById("toggle-africa-shape")
    .addEventListener("change", function () {
      if (africa_shape) africa_shape.setVisible(this.checked);
    });
  document
    .getElementById("toggle-offshore-shapes")
    .addEventListener("change", function () {
      if (offshore_shapes) offshore_shapes.setVisible(this.checked);
    });
  document
    .getElementById("toggle-gadm-shapes")
    .addEventListener("change", function () {
      if (gadm_shapes) gadm_shapes.setVisible(this.checked);
    });
  document
    .getElementById("toggle-countries")
    .addEventListener("change", function () {
      if (countries) countries.setVisible(this.checked);
    });
  document
    .getElementById("toggle-all-clean-lines")
    .addEventListener("change", function () {
      if (all_clean_lines) all_clean_lines.setVisible(this.checked);
    });
  document
    .getElementById("toggle-all-clean-generators")
    .addEventListener("change", function () {
      if (generators) generators.setVisible(this.checked);
    });
  document
    .getElementById("toggle-all-clean-substations")
    .addEventListener("change", function () {
      if (substations) substations.setVisible(this.checked);
    });
  document
    .getElementById("toggle-lines")
    .addEventListener("change", function () {
      if (lines) lines.setVisible(this.checked);
    });
  document
    .getElementById("toggle-buses")
    .addEventListener("change", function () {
      if (buses) buses.setVisible(this.checked);
    });

  // Overlays for displaying labels on the map
  // Label for Buses
  const labelOverlay = new ol.Overlay({
    element: labelElement,
    positioning: "bottom-center",
    stopEvent: false,
    offset: [0, -10],
  });
  map.addOverlay(labelOverlay);

  // Label for Lines
  const lineLabelOverlay = new ol.Overlay({
    element: lineLabelElement,
    positioning: "bottom-center",
    stopEvent: false,
    offset: [0, -10],
  });
  map.addOverlay(lineLabelOverlay);

  //*****************************************************************************
  //*****************************************************************************
  // Event Handlers and Map Interactions
  //*****************************************************************************
  //*****************************************************************************
  map.on("singleclick", function (evt) {
    const viewResolution = map.getView().getResolution();
    let clickedSomething = false;

    // Process clicks on buses, displaying specific information and labels
    const busUrl = buses
      .getSource()
      .getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
        INFO_FORMAT: "application/json",
      });

    if (busUrl) {
      fetch(busUrl)
        .then((response) => response.json())
        .then((data) => {
          if (data.features.length > 0) {
            handleBusClick(data.features[0], evt.coordinate);
          }
        });
    }

    // Process clicks on lines, similarly displaying labels and information
    const lineUrl = lines
      .getSource()
      .getFeatureInfoUrl(evt.coordinate, viewResolution, "EPSG:3857", {
        INFO_FORMAT: "application/json",
      });

    if (lineUrl) {
      fetch(lineUrl)
        .then((response) => response.json())
        .then((data) => {
          if (data.features.length > 0) {
            handleLineClick(data.features[0], evt.coordinate);
          }
        });
    }

    // If no specific feature was clicked, reset any displayed information or labels
    if (!clickedSomething) {
      resetCharts();
      document.getElementById("map-label").style.display = "none";
      document.getElementById("line-map-label").style.display = "none";
    }
  });

  // Functions for handling clicks on buses or lines, updating labels, and loading additional data
  function handleBusClick(busFeature, coordinate) {
    const busId = busFeature.properties.Bus;
    document.getElementById("line-map-label").innerHTML = ""; // Cleans Line Label
    updateLabelForBus(busId, coordinate); // Updates label  with bus Id
    // Load specific data for the clicked bus
    loadNominalGeneratorCapacityData(busId);
    loadOptimalGeneratorCapacityData(busId);
    loadNominalStorageCapacityData(busId);
    loadOptimalStorageCapacityData(busId);
  }

  function handleLineClick(lineFeature, coordinate) {
    const lineId = lineFeature.properties.Line;
    document.getElementById("map-label").innerHTML = "";
    updateLabelForLine(lineId, coordinate); // Update label with line ID
    // Load specific data for the clicked line
    loadLineData(lineId);
  }

  // Updates the label's text and visibility based on the selected bus or line
  function updateLabelForBus(busId, coordinate) {
    const labelElement = document.getElementById("map-label");
    labelElement.innerHTML = `Bus: ${busId}`;
    if (busId) {
      labelElement.style.display = "block";
    } else {
      labelElement.style.display = "none";
    }
    labelOverlay.setPosition(coordinate);
  }

  function updateLabelForLine(lineId, coordinate) {
    const lineLabelElement = document.getElementById("line-map-label");
    lineLabelElement.innerHTML = `Line: ${lineId}`;
    if (lineId) {
      lineLabelElement.style.display = "block";
    } else {
      lineLabelElement.style.display = "none";
    }
    lineLabelOverlay.setPosition(coordinate);
  }

  // Resets the display of any specific data or labels, reverting to a general state
  function resetCharts() {
    // Placeholder functions for resetting displayed data
    loadNominalGeneratorCapacityData();
    loadOptimalGeneratorCapacityData();
    loadNominalStorageCapacityData();
    loadOptimalStorageCapacityData();
    loadLineData();
    // Hide any labels that might be visible
    document.getElementById("map-label").style.display = "none";
    document.getElementById("line-map-label").style.display = "none";
  }

  //*****************************************************************************
  //*****************************************************************************
  // Map rotation Alt key Pressed
  //*****************************************************************************
  //*****************************************************************************

  // Enables rotation interaction by dragging with the Alt key pressed
  const dragRotateInteraction = new ol.interaction.DragRotate({
    condition: ol.events.condition.altKeyOnly,
  });
  map.addInteraction(dragRotateInteraction);

  //*****************************************************************************
  //*****************************************************************************
  // url coordinates handling
  //*****************************************************************************
  //*****************************************************************************
  if (map) {
    map.on("moveend", updateUrlWithCurrentView);
    map.on("singleclick", updateUrlWithCurrentView);
  } else {
    console.error('"map" not difined.');
  }
}

//*****************************************************************************
//*****************************************************************************
// Search Location
//*****************************************************************************
//*****************************************************************************

// Function to perform location search using OpenStreetMap's Nominatim API
async function searchLocation(query) {
  const response = await fetch(
    `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&q=${query}`
  );
  const data = await response.json();
  return data;
}
// Zoom levels for different countries (adjust as needed)
const countryZoomLevels = {
  // Europe
  Albania: 7,
  Andorra: 10,
  Armenia: 7,
  Austria: 7,
  Azerbaijan: 7,
  Belarus: 6,
  Belgium: 8,
  "Bosnia and Herzegovina": 7,
  Bulgaria: 7,
  Croatia: 7,
  Cyprus: 8,
  "Czech Republic": 7,
  Denmark: 7,
  Estonia: 7,
  Finland: 6,
  France: 6,
  Georgia: 7,
  Germany: 6,
  Greece: 6,
  Hungary: 7,
  Iceland: 6,
  Ireland: 6,
  Italy: 6,
  Kazakhstan: 5,
  Kosovo: 8,
  Latvia: 7,
  Liechtenstein: 9,
  Lithuania: 7,
  Luxembourg: 9,
  Malta: 9,
  Moldova: 7,
  Monaco: 10,
  Montenegro: 8,
  Netherlands: 7,
  "North Macedonia": 7,
  Norway: 5,
  Poland: 6,
  Portugal: 6,
  Romania: 6,
  Russia: 4, // Parte europea
  "San Marino": 10,
  Serbia: 7,
  Slovakia: 7,
  Slovenia: 7,
  Spain: 6,
  Sweden: 5,
  Switzerland: 7,
  Turkey: 6, // Parte europea
  Ukraine: 6,
  "United Kingdom": 6,
  "Vatican City": 11,
  // Asia
  Afghanistan: 6,
  Armenia: 7,
  Azerbaijan: 7,
  Bahrain: 8,
  Bangladesh: 7,
  Bhutan: 8,
  Brunei: 8,
  Cambodia: 7,
  China: 5,
  Cyprus: 8,
  Georgia: 7,
  India: 5,
  Indonesia: 5,
  Iran: 6,
  Iraq: 7,
  Israel: 7,
  Japan: 6,
  Jordan: 7,
  Kazakhstan: 5,
  Kuwait: 8,
  Kyrgyzstan: 7,
  Laos: 7,
  Lebanon: 8,
  Malaysia: 6,
  Maldives: 9,
  Mongolia: 6,
  Myanmar: 6,
  Nepal: 7,
  "North Korea": 7,
  Oman: 7,
  Pakistan: 6,
  Palestine: 9,
  Philippines: 6,
  Qatar: 8,
  Russia: 4, // Parte asiática
  "Saudi Arabia": 6,
  Singapore: 10,
  "South Korea": 7,
  "Sri Lanka": 7,
  Syria: 7,
  Taiwan: 7,
  Tajikistan: 7,
  Thailand: 6,
  "Timor-Leste": 8,
  Turkey: 6, // Parte asiática
  Turkmenistan: 7,
  "United Arab Emirates": 8,
  Uzbekistan: 6,
  Vietnam: 6,
  Yemen: 7,
  // America
  "Antigua and Barbuda": 9,
  Argentina: 5,
  Bahamas: 7,
  Barbados: 10,
  Belize: 8,
  Bolivia: 6,
  Brazil: 5,
  Canada: 4,
  Chile: 5,
  Colombia: 5.74,
  "Costa Rica": 8,
  Cuba: 7,
  Dominica: 10,
  "Dominican Republic": 8,
  Ecuador: 7,
  "El Salvador": 9,
  Grenada: 10,
  Guatemala: 7,
  Guyana: 7,
  Haiti: 8,
  Honduras: 7,
  Jamaica: 9,
  Mexico: 5,
  Nicaragua: 7,
  Panama: 8,
  Paraguay: 7,
  Peru: 6,
  "Saint Kitts and Nevis": 10,
  "Saint Lucia": 10,
  "Saint Vincent and the Grenadines": 10,
  Suriname: 7,
  "Trinidad and Tobago": 9,
  "United States": 4,
  Uruguay: 7,
  Venezuela: 6,
  // Africa
  Algeria: 5,
  Angola: 6,
  Benin: 7,
  Botswana: 6,
  "Burkina Faso": 6,
  Burundi: 8,
  "Cabo Verde": 10,
  Cameroon: 6,
  "Central African Republic": 6,
  Chad: 5,
  Comoros: 10,
  "Congo, Democratic Republic of the": 5,
  "Congo, Republic of the": 7,
  Djibouti: 8,
  Egypt: 6,
  "Equatorial Guinea": 8,
  Eritrea: 7,
  Eswatini: 9,
  Ethiopia: 6,
  Gabon: 7,
  Gambia: 8,
  Ghana: 7,
  Guinea: 7,
  "Guinea-Bissau": 8,
  "Ivory Coast": 7,
  Kenya: 6,
  Lesotho: 8,
  Liberia: 7,
  Libya: 5,
  Madagascar: 6,
  Malawi: 7,
  Mali: 5,
  Mauritania: 5,
  Mauritius: 10,
  Morocco: 6,
  Mozambique: 6,
  Namibia: 6,
  Niger: 6,
  Nigeria: 6.11,
  Rwanda: 9,
  "Sao Tome and Principe": 10,
  Senegal: 7,
  Seychelles: 10,
  "Sierra Leone": 8,
  Somalia: 6,
  "South Africa": 6,
  "South Sudan": 6,
  Sudan: 5,
  Tanzania: 6,
  Togo: 8,
  Tunisia: 7,
  Uganda: 7,
  Zambia: 6,
  Zimbabwe: 7,
  // Oceania
  Australia: 4,
  Fiji: 7,
  Kiribati: 8,
  "Marshall Islands": 7,
  Micronesia: 8,
  Nauru: 10,
  "New Zealand": 6,
  Palau: 9,
  "Papua New Guinea": 6,
  Samoa: 8,
  "Solomon Islands": 7,
  Tonga: 8,
  Tuvalu: 10,
  Vanuatu: 7,
};

// Function to implement autocomplete feature for a search input
function autocomplete(inp) {
  let currentFocus;

  inp.addEventListener("input", function (e) {
    let a,
      b,
      i,
      val = this.value;
    closeAllLists();
    if (val.length < 3) {
      return false;
    }
    currentFocus = -1;

    a = document.createElement("DIV");
    a.setAttribute("id", this.id + "autocomplete-list");
    a.setAttribute("class", "autocomplete-items");
    this.parentNode.appendChild(a);

    for (i in countryZoomLevels) {
      // Checks if the input value is anywhere within the country name
      if (i.toUpperCase().includes(val.toUpperCase())) {
        b = document.createElement("DIV");
        b.innerHTML = "<strong>" + i.substr(0, val.length) + "</strong>";
        b.innerHTML += i.substr(val.length);
        b.innerHTML += "<input type='hidden' value='" + i + "'>";
        b.addEventListener("click", function (e) {
          inp.value = this.getElementsByTagName("input")[0].value;
          closeAllLists();
        });
        a.appendChild(b);
      }
    }
  });

  // Function to close all autocomplete lists in the document, except the one passed as an argument
  function closeAllLists(elmnt) {
    var x = document.getElementsByClassName("autocomplete-items");
    for (var j = 0; j < x.length; j++) {
      if (elmnt != x[j] && elmnt != inp) {
        x[j].parentNode.removeChild(x[j]);
      }
    }
  }

  // Close lists when clicking outside of them
  document.addEventListener("click", function (e) {
    closeAllLists(e.target);
  });
}
// Initialize autocomplete on the location search input
autocomplete(document.getElementById("location-search"));

// Keypress event listener for the location search input to handle "Enter" key press
document
  .getElementById("location-search")
  .addEventListener("keypress", async function (e) {
    if (e.key === "Enter") {
      e.preventDefault();
      const searchQuery = this.value;
      const locations = await searchLocation(searchQuery);

      // If locations are found, zoom to the first location
      if (locations.length > 0) {
        const firstLocation = locations[0];
        const coords = [
          parseFloat(firstLocation.lon),
          parseFloat(firstLocation.lat),
        ];
        const country = firstLocation.address.country;
        const zoomLevel = countryZoomLevels[country] || 10; // Usa un nivel de zoom predeterminado si el país no está en la lista

        map.getView().animate({
          center: ol.proj.fromLonLat(coords),
          zoom: zoomLevel,
        });
      }
    }
  });

// Event listener for the search form submission
document
  .getElementById("location-search-form")
  .addEventListener("submit", async function (e) {
    e.preventDefault(); // Prevents the default form submission behavior
    const searchQuery = document.getElementById("location-search").value;

    // Call searchLocation and wait for results
    const locations = await searchLocation(searchQuery);

    // Check if locations were found and update the map
    if (locations && locations.length > 0) {
      const firstLocation = locations[0];
      const coords = [
        parseFloat(firstLocation.lon),
        parseFloat(firstLocation.lat),
      ];
      const country = firstLocation.address.country;
      const zoomLevel = countryZoomLevels[country] || 10; // Use a default zoom level if the country is not in the list

      // Animate map view to center on the found coordinates
      map.getView().animate({
        center: ol.proj.fromLonLat(coords),
        zoom: zoomLevel,
      });
    }
  });

//*****************************************************************************
//*****************************************************************************
// Toggle sidebar's visibility and adjust map elements accordingly
//*****************************************************************************
//*****************************************************************************
function toggleSidebar(side) {
  const flexContainer = document.querySelector(".flex-grow-1");
  const leftBtn = document.getElementById("btn-toggle-left-sidebar");
  const rightBtn = document.getElementById("btn-toggle-right-sidebar");

  // Toggle left sidebar visibility and adjust map view
  if (side === "left") {
    document.body.classList.toggle("show-left-sidebar");
    if (flexContainer) flexContainer.classList.toggle("map-shift-right");
  } else if (side === "right") {
    document.body.classList.toggle("show-right-sidebar");
    if (flexContainer) flexContainer.classList.toggle("map-shift-left");

    // Move buttons based on the right sidebar's visibility
    if (leftBtn) {
      leftBtn.classList.toggle(
        "move-right",
        document.body.classList.contains("show-right-sidebar")
      );
    }
    if (rightBtn) {
      rightBtn.classList.toggle(
        "move-left",
        document.body.classList.contains("show-right-sidebar")
      );
    }
  }

  // Update map size after sidebar transition to ensure proper display
  setTimeout(() => {
    map.updateSize();
  }, 350); // Adjust this timing based on your sidebar transition duration
}

// Attach event listeners to sidebar toggle buttons
document
  .getElementById("btn-toggle-left-sidebar")
  .addEventListener("click", function () {
    toggleSidebar("left");
  });

document
  .getElementById("btn-toggle-right-sidebar")
  .addEventListener("click", function () {
    toggleSidebar("right");
  });

// Initiates the map
window.onload = init;

// Define color codes for various energy generators and map elements
const generatorColors = {
  onwind: "#235ebc",
  "onshore wind": "#235ebc",
  offwind: "#6895dd",
  "offwind-ac": "#6895dd",
  "offshore wind": "#6895dd",
  "offshore wind ac": "#6895dd",
  "offwind-dc": "#74c6f2",
  "offshore wind dc": "#74c6f2",
  hydro: "#08ad97",
  "hydro+PHS": "#08ad97",
  PHS: "#08ad97",
  "hydro reservoir": "#08ad97",
  hydroelectricity: "#08ad97",
  ror: "#4adbc8",
  "run of river": "#4adbc8",
  solar: "#f9d002",
  "solar PV": "#f9d002",
  "solar thermal": "#ffef60",
  biomass: "#0c6013",
  "solid biomass": "#06540d",
  biogas: "#23932d",
  waste: "#68896b",
  geothermal: "#ba91b1",
  OCGT: "#d35050",
  gas: "#d35050",
  "natural gas": "#d35050",
  CCGT: "#b20101",
  nuclear: "#ff9000",
  coal: "#707070",
  lignite: "#9e5a01",
  oil: "#262626",
  H2: "#ea048a",
  "hydrogen storage": "#ea048a",
  battery: "#b8ea04",
  "Electric load": "#f9d002",
  electricity: "#f9d002",
  lines: "#70af1d",
  "transmission lines": "#70af1d",
  "AC-AC": "#70af1d",
  "AC line": "#70af1d",
  links: "#8a1caf",
  "HVDC links": "#8a1caf",
  "DC-DC": "#8a1caf",
  "DC link": "#8a1caf",
  load: "#FF0000",

  "Nominal Capacity": "#7ec8e3", // Azul Cobalto
  "Optimal Capacity": "#a4d65e", // Verde Esmeralda
};

// Initialize and configure charts with dynamic data using chart.js
function initChart(
  chartId,
  chartData,
  chartType,
  chartTitle,
  yAxisLabel = "",
  xAxisLabel = ""
) {
  const canvas = document.getElementById(chartId);
  const ctx = canvas.getContext("2d");

  // Destroys graph if already exists
  if (Chart.getChart(chartId)) {
    Chart.getChart(chartId).destroy();
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      zoom: {
        pan: {
          enabled: true,
          mode: "xy",
          speed: 10,
          threshold: 10,
        },
        zoom: {
          wheel: {
            enabled: true,
          },
          pinch: {
            enabled: true,
          },
          mode: "xy",
        },
      },
      tooltip: {
        enabled: true,
        mode: "index",
        callbacks: {
          label: function (context) {
            let label = context.dataset.label || "";
            if (label) {
              label += ": ";
            }
            label += context.parsed.y;
            return label;
          },
        },
      },
      legend: {
        position: "top",
      },
      title: {
        display: true,
        text: chartTitle,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: yAxisLabel, // 'Capacity (MW)'
        },
      },
      x: {
        title: {
          display: true,
          text: xAxisLabel, //'Category carriers'
        },
      },
    },
    animation: {
      duration: 1000,
      easing: "easeOutCubic",
    },
  };

  if (chartType === "bar") {
    options.scales = {
      ...options.scales,
      x: {
        stacked: false,
        title: {
          display: true,
          text: xAxisLabel,
        },
      },
      y: {
        stacked: false,
        title: {
          display: true,
          text: yAxisLabel,
        },
      },
    };
  }

  let data;
  if (Array.isArray(chartData)) {
    data = {
      labels: chartData.map((item) => item.label),
      datasets: [
        {
          label: "Dataset",
          data: chartData.map((item) => item.value),
          backgroundColor: chartData.map(
            (item) => generatorColors[item.label] || "#999999"
          ),
          borderColor: chartData.map((item) => "rgba(0, 150, 255, 1)"),
          borderWidth: 1,
        },
      ],
    };
  } else {
    data = chartData;
  }

  new Chart(ctx, {
    type: chartType,
    data: data,
    options: options,
  });
}

// Fetch data from a specified API endpoint
function fetchData(url) {
  return fetch(url).then((response) => {
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    return response.json();
  });
}

// Load and visualize nominal generator capacity data
function loadNominalGeneratorCapacityData(selectedBusId = null) {
  fetchData("/api/nominal-generator-capacity/")
    .then((data) => {
      if (selectedBusId) {
        // Filters the data to obtain only that of the selected bus and excludes 'load'
        const busData = data.filter(
          (item) => item.Bus === selectedBusId && item.carrier !== "load"
        );

        // Prepare data for the pie chart
        const pieChartData = busData.map((item) => {
          return {
            label: item.carrier,
            value: item.p_nom,
          };
        });

        // Create the pie chart
        createPieChart(
          "nominalGeneratorCapacityChart",
          pieChartData,
          `Nominal Generation Capacity for Bus: ${selectedBusId}`
        );
      } else {
        // General Bar Chart Logic
        const capacityByBusAndType = {};
        let loadValue = 0;

        data.forEach((item) => {
          if (item.carrier === "load") {
            loadValue += item.p_nom;
          } else {
            if (!capacityByBusAndType[item.Bus]) {
              capacityByBusAndType[item.Bus] = {};
            }
            const carrierType = item.carrier;
            capacityByBusAndType[item.Bus][carrierType] =
              (capacityByBusAndType[item.Bus][carrierType] || 0) + item.p_nom;
          }
        });

        // Show value of 'load' as comment
        displayLoadComment("nominalGeneratorCapacityChart", loadValue);

        // Create datasets for the bar chart
        const chartData = createDatasets(capacityByBusAndType);
        initChart(
          "nominalGeneratorCapacityChart",
          chartData,
          "bar",
          "Nominal Generation Capacity per Bus",
          "Capacity (MW)",
          "Generator Type"
        );
      }
    })
    .catch((error) => console.error("Error loading data:", error));
}

function displayLoadComment(chartId, loadValue) {
  const commentElement = document.getElementById(chartId + "Comment");
  if (commentElement) {
    commentElement.textContent = "Load: " + loadValue;
  }
}

function createDatasets(processedData) {
  const carriers = new Set();
  const buses = Object.keys(processedData);
  buses.forEach((bus) => {
    Object.keys(processedData[bus]).forEach((carrier) => {
      carriers.add(carrier);
    });
  });

  const datasets = Array.from(carriers).map((carrier) => {
    const data = buses.map((bus) => processedData[bus][carrier] || 0);
    return {
      label: carrier,
      data: data,
      // Assign color based on generator type
      backgroundColor: generatorColors[carrier] || "#999999", // Default color if not found
    };
  });

  return { labels: buses, datasets: datasets };
}

function createPieChart(chartId, pieChartData, chartTitle) {
  const ctx = document.getElementById(chartId).getContext("2d");
  if (Chart.getChart(chartId)) {
    Chart.getChart(chartId).destroy();
  }
  new Chart(ctx, {
    type: "pie",
    data: {
      labels: pieChartData.map((d) => d.label),
      datasets: [
        {
          data: pieChartData.map((d) => d.value),
          backgroundColor: pieChartData.map(
            (item) => generatorColors[item.label] || "#999999"
          ),
        },
      ],
    },
    options: {
      responsive: true,
      plugins: {
        legend: { position: "right" },
        title: { display: true, text: chartTitle },
      },
    },
  });
}

// Load and visualize optimal generator capacity data
function loadOptimalGeneratorCapacityData(selectedBusId = null) {
  fetchData("/api/optimal-generator-capacity/")
    .then((data) => {
      if (selectedBusId) {
        // Filters the data to obtain only that of the selected bus and excludes 'load'
        const busData = data.filter(
          (item) => item.Bus === selectedBusId && item.carrier !== "load"
        );

        // Prepare data for the pie chart
        const pieChartData = busData.map((item) => {
          return {
            label: item.carrier,
            value: item.p_nom_opt,
          };
        });

        // Create the pie chart
        createPieChart(
          "optimalGeneratorCapacityChart",
          pieChartData,
          `Optimal Generation Capacity for Bus: ${selectedBusId}` // Chart title with bus ID
        );
      } else {
        // General Bar Chart Logic
        const capacityByBusAndType = {};
        let loadValue = 0;

        data.forEach((item) => {
          if (item.carrier === "load") {
            loadValue += item.p_nom_opt; // Using p_nom_opt for 'load'
          } else {
            if (!capacityByBusAndType[item.Bus]) {
              capacityByBusAndType[item.Bus] = {};
            }
            const carrierType = item.carrier;
            capacityByBusAndType[item.Bus][carrierType] =
              (capacityByBusAndType[item.Bus][carrierType] || 0) +
              item.p_nom_opt; // Using p_nom_opt instead of p_nom
          }
        });

        // Show value of 'load' as comment
        displayLoadComment("optimalGeneratorCapacityChart", loadValue);

        // Create datasets for the bar chart
        const chartData = createDatasets(capacityByBusAndType);
        initChart(
          "optimalGeneratorCapacityChart",
          chartData,
          "bar",
          "Optimal Generator Capacity per Bus",
          "Capacity (MW)",
          "Generator Type"
        );
      }
    })
    .catch((error) => console.error("Error loading data:", error));
}

function updateChartOrShowMessage(chartId, data, pieChartDataFunction, title) {
  const chartContainer = document.getElementById(chartId);
  if (data.length > 0) {
    const pieChartData = data.map(pieChartDataFunction);
    createPieChart(chartId, pieChartData, title);
  } else {
    if (Chart.getChart(chartId)) {
      Chart.getChart(chartId).destroy();
    }
    chartContainer.innerHTML = `<p>${title}</p>`;
  }
}

// Load and visualize nominal generator capacity data
function loadNominalStorageCapacityData(selectedBusId = null) {
  fetchData("/api/nominal-storage-capacity/")
    .then((data) => {
      let busData;
      if (selectedBusId) {
        busData = data.filter((item) => item.Bus === selectedBusId);
      } else {
        busData = data;
      }

      if (busData.length === 0 && selectedBusId) {
        document.getElementById(
          "nominalStorageCapacityChart"
        ).innerHTML = `No storage data available for Bus: ${selectedBusId}`;
      } else {
        const capacityByBusAndType = busData.reduce((acc, item) => {
          acc[item.Bus] = acc[item.Bus] || {};
          acc[item.Bus][item.carrier] =
            (acc[item.Bus][item.carrier] || 0) + item.p_nom;
          return acc;
        }, {});

        const chartData = createDatasets(capacityByBusAndType);
        initChart(
          "nominalStorageCapacityChart",
          chartData,
          "bar",
          selectedBusId
            ? `Nominal Storage Capacity for Bus: ${selectedBusId}`
            : "Nominal Storage Capacity per Bus",
          "Capacity (MW)",
          "Bus"
        );
      }
    })
    .catch((error) =>
      console.error("Error loading nominal storage capacity data:", error)
    );
}

// Load and visualize optimal generator capacity data
function loadOptimalStorageCapacityData(selectedBusId = null) {
  fetchData("/api/optimal-storage-capacity/")
    .then((data) => {
      let busData;
      if (selectedBusId) {
        busData = data.filter((item) => item.Bus === selectedBusId);
      } else {
        busData = data;
      }

      if (busData.length === 0 && selectedBusId) {
        document.getElementById(
          "optimalStorageCapacityChart"
        ).innerHTML = `No storage data available for Bus: ${selectedBusId}`;
      } else {
        const capacityByBusAndType = busData.reduce((acc, item) => {
          acc[item.Bus] = acc[item.Bus] || {};
          acc[item.Bus][item.carrier] =
            (acc[item.Bus][item.carrier] || 0) + item.p_nom_opt;
          return acc;
        }, {});

        const chartData = createDatasets(capacityByBusAndType);
        initChart(
          "optimalStorageCapacityChart",
          chartData,
          "bar",
          selectedBusId
            ? `Optimal Storage Capacity for Bus: ${selectedBusId}`
            : "Optimal Storage Capacity per Bus",
          "Capacity (MW)",
          "Bus"
        );
      }
    })
    .catch((error) =>
      console.error("Error loading optimal storage capacity data:", error)
    );
}

// Load and visualize line data for nominal vs. optimal capacities
function loadLineData(selectedLineId = null) {
  fetchData("/api/line-data/")
    .then((data) => {
      if (selectedLineId) {
        const lineData = data.find((item) => item.Line === selectedLineId);
        if (lineData) {
          const pieChartData = [
            { label: "Nominal Capacity", value: lineData.s_nom },
            { label: "Optimal Capacity", value: lineData.s_nom_opt },
          ];
          createPieChart(
            "lineDataChart",
            pieChartData,
            `Nominal vs. Optimal Capacity for Line: ${selectedLineId}`
          );
        } else {
          document.getElementById(
            "lineDataChart"
          ).innerHTML = `No data available for Line: ${selectedLineId}`;
        }
      } else {
        const sNomData = {};
        const sNomOptData = {};
        data.forEach((item) => {
          sNomData[item.Line] = item.s_nom;
          sNomOptData[item.Line] = item.s_nom_opt;
        });
        const chartData = createDualDatasets(sNomData, sNomOptData);
        initChart(
          "lineDataChart",
          chartData,
          "bar",
          "Line Capacities Comparison",
          "Capacity (MW)",
          "Line"
        );
      }
    })
    .catch((error) => console.error("Error loading line data:", error));
}

// Dual dataset creation for visualizing nominal vs. optimal capacities
function createDualDatasets(sNomData, sNomOptData) {
  const lines = Object.keys(sNomData);

  const sNomDataset = {
    label: "Nom. Capacity",
    data: lines.map((line) => sNomData[line]),
    backgroundColor: "#7ec8e3", // Color azul
  };

  const sNomOptDataset = {
    label: "Opt. Capacity",
    data: lines.map((line) => sNomOptData[line]),
    backgroundColor: "#a4d65e", // Color verde
  };

  return {
    labels: lines,
    datasets: [sNomDataset, sNomOptDataset],
  };
}

// Initialize data loading and visualization once the DOM content is fully loaded
document.addEventListener("DOMContentLoaded", function () {
  // init();
  loadNominalGeneratorCapacityData();
  loadOptimalGeneratorCapacityData();
  loadNominalStorageCapacityData();
  loadOptimalStorageCapacityData();
  loadLineData();
});

function updateUrlWithCurrentView() {
  const view = map.getView();
  const center = ol.proj.toLonLat(view.getCenter());
  const zoom = view.getZoom();
  const queryParams = new URLSearchParams(window.location.search);

  // Update or set new query parameters
  queryParams.set("lat", center[1].toFixed(5)); // Latitude, fixed to 5 decimal places
  queryParams.set("lon", center[0].toFixed(5)); // Longitude, fixed to 5 decimal places
  queryParams.set("zoom", zoom.toFixed(2)); // Zoom level, fixed to 2 decimal places

  // Update the URL without reloading the page
  window.history.pushState(
    {},
    "",
    `${window.location.pathname}?${queryParams.toString()}`
  );
}

// Apply URL parameters on page load to set map view
document.addEventListener("DOMContentLoaded", function () {
  const queryParams = new URLSearchParams(window.location.search);
  const lat = parseFloat(queryParams.get("lat"));
  const lon = parseFloat(queryParams.get("lon"));
  const zoom = parseFloat(queryParams.get("zoom"));

  if (!isNaN(lat) && !isNaN(lon) && !isNaN(zoom)) {
    map.getView().setCenter(ol.proj.fromLonLat([lon, lat]));
    map.getView().setZoom(zoom);
  }
});
