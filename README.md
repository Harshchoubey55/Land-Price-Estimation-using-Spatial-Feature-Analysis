# GeoPredict AI: Spatial Feature Land Valuation

<div align="center">
  <img src="https://img.shields.io/badge/Status-Active-success.svg?style=for-the-badge" alt="Status" />
  <img src="https://img.shields.io/badge/Python-3.x-blue.svg?style=for-the-badge&logo=python" alt="Python Badge"/>
  <img src="https://img.shields.io/badge/Vanilla_JS-ES6-yellow.svg?style=for-the-badge&logo=javascript" alt="JavaScript Badge"/>
  <img src="https://img.shields.io/badge/Mapping-Leaflet.js-brightgreen.svg?style=for-the-badge&logo=leaflet" alt="Leaflet Badge"/>
</div>

<br/>

**GeoPredict AI** evaluates highly contextual real estate values using geospatial data architecture. The core algorithm implements a continuous logarithmic decay penalty logic to precisely benchmark infrastructure proximity (healthcare, education, transport) and mathematically map it against baseline Population Density thresholds. 

---

## 🚀 Features

- **Continuous Distance Decay**: Eschews flat proximity binning; weights amenities strictly dynamically based on `e^(-distance)`.
- **Diminishing Spatial Returns**: Analyzes aggregated hotspots utilizing a root-dampening logic ensuring 10 hospitals nearby aren't erroneously flagged as 10x more valuable than 1.
- **Offline Cascading Search**: Zero reliance on 3rd party search telemetry. Fully queries a hierarchical indexed tree of Indian spatial data (State → District → Location Pincode) built entirely from localized Excel datasets.
- **Vanguard UI Interface**: Custom Neo-tactical interface utilizing a full-bleed ESRI Satellite overlay equipped with pure CSS CartoDB topological label projections to strictly bypass geopolitical mapping boundary issues.

## 🛠️ Architecture Setup

### 1. The Backend Engine (Python)
The project began as an execution-blocked data science notebook.
1. Downloaded datasets directly from **HOTOSM** and mapped Indian spatial datasets (`Pin_code_and_postal.xlsx`).
2. Run the Jupyter Notebook cells inside `land_price_prediction_spatial_analysis.ipynb`. The script resolves coordinate grids, handles spatial intersections (`geopandas`), evaluates infrastructure metrics, and establishes a formulaic baseline for evaluation.

### 2. The Frontend Client (Web)
Run the interface purely client-side without any server requirements!
1. Navigate to the `/frontend` directory.
2. Directly open `index.html` in Chrome or Edge.
3. You can click on the `YOUR PROJECT NAME` text on the top left of the screen to edit it persistently for your presentations!

## 🌍 Dataset Overview
The engine queries the following metrics inside generated bounds:
- **WorldPop Population Raster (.tif)**
- **Education Vectors** (Points, Polygons)
- **Healthcare Clusters** 
- **Transit Hotspots** (Airports, Railway grids, Roads)

> Note: To visualize these specific polygons natively inside the frontend map interface, the Python backend must be further modularized into a continuous Flask/FastAPI REST server serving raw GeoJSON shapes. Currently, the UI leverages predictive spatial representations.

---
_A technical evaluation module geared towards urban geographical analytics._
