# Land Price Estimation using Spatial Feature Analysis

##  Overview
This project estimates the **land price** of a given location based on:  

- **Population density** from postal data.
- **Proximity & variety** of infrastructure such as buildings, education facilities, healthcare centers, railways, seaports, and waterways.
- **Dynamic price adjustments** depending on the availability and closeness of nearby amenities.

The system integrates multiple geospatial datasets, processes them in **GeoPandas**, and calculates a final estimated **price per square foot** for user-provided coordinates.  

---

##  Features Implemented

### 1. **User Coordinate Input**
- Accepts latitude and longitude from the user  
- Finds the nearest postal record within **1 km**  

### 2. **Population Density–Based Base Price**
- High density → higher base price  
- Rural areas → lower base price  

### 3. **Spatial Feature Extraction** *(1 km radius)*
Counts and measures average distances to:  
-  Buildings  
-  Education facilities *(points & polygons)*  
-  Healthcare facilities *(points & polygons)*  
-  Railways *(points & lines)*  
-  Seaports *(points & polygons)*  
-  Waterways *(points, lines & polygons)*  

### 4. **Variety Score Calculation**
- Measures diversity of available categories near the point  

### 5. **Dynamic Price Adjustment**
- Increases price if amenities are **closer** or **more varied**  

### 6. **Final Output**
- Table of nearby feature counts and average distances  
- Variety score  
- Estimated **land price in ₹/sq.ft**  

---

##  Data Used
- **Postal Data** *(Pincode, District, Lat/Lon, Population Density)*  
- **HOTOSM Datasets**:  
  - Buildings  
  - Education  
  - Healthcare  
  - Railways  
  - Seaports  
  - Waterways  

---

##  Tech Stack
- **Python 3.x**  
- **GeoPandas** – Spatial data handling  
- **Pandas** – Data processing  
- **Shapely** – Geometric operations  

---

##  How It Works
1. Load all infrastructure datasets  
2. Ask user for coordinates  
3. Match with nearest postal record  
4. Extract surrounding features within **1 km buffer**  
5. Calculate price based on **density, proximity, and variety**  
6. Display result  

---

##  Example Output
Available Coordinates (choose from below):

Pincode District Latitude Longitude
110001 Delhi 28.6300 77.2177
...

Enter Latitude and Longitude separated by space: 28.63 77.22

Nearest Match Found:

Pincode: 110001

District: Delhi

Latitude: 28.63

Longitude: 77.2177

pop_density: 20000

Spatial Features (within 1 km):

-> Buildings: 540 (Avg. Dist: 120.4 m)

-> Education: 5 (Avg. Dist: 450.8 m)

-> Healthcare: 8 (Avg. Dist: 320.2 m)

-> Railway: 1 (Avg. Dist: 850.6 m)

-> Seaport: 0 (Avg. Dist: N/A)

-> Waterways: 2 (Avg. Dist: 670.5 m)

Variety Score: 5

Estimated Land Price: ₹6,520.75 per sq.ft
