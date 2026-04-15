import os
import pandas as pd
import geopandas as gpd
import rasterio
from shapely.geometry import Point
from flask import Flask, request, jsonify
from flask_cors import CORS
import math

app = Flask(__name__)
CORS(app)

print("Initializing Spatial Server...")
print("Loading core datasets (This may take several minutes)...")

# 1. Load Postal Data
postal_df = pd.read_excel(r"D:\Projects\intr\Land_Price_Prediction\Dataset\Pin_code_and_postal\Pin_code_and_postal.xlsx")
postal_df['Latitude'] = pd.to_numeric(postal_df['Latitude'].astype(str).str.replace(' N', '', regex=False).str.replace(',', '', regex=False), errors='coerce')
postal_df['Longitude'] = pd.to_numeric(postal_df['Longitude'].astype(str).str.replace(' E', '', regex=False).str.replace(',', '', regex=False), errors='coerce')
postal_df = postal_df.dropna(subset=['Latitude', 'Longitude'])

postal_gdf = gpd.GeoDataFrame(
    postal_df,
    geometry=gpd.points_from_xy(postal_df['Longitude'], postal_df['Latitude']),
    crs="EPSG:4326"
)

# Load Population Density Raster and Sample mapped to postal_gdf
raster_path = r"D:\Projects\intr\Land_Price_Prediction\Dataset\historical_residex_data\WorldPopOrg_India_Population_2020_dataset.tif"
try:
    with rasterio.open(raster_path) as src:
        coords = [(x, y) for x, y in zip(postal_gdf.geometry.x, postal_gdf.geometry.y)]
        pop_density_vals = list(src.sample(coords))
        pop_density = [val[0] if val[0] != src.nodata else 0 for val in pop_density_vals]
    postal_gdf['pop_density'] = pop_density
    print("Population density sampled.")
except Exception as e:
    print(f"Failed to load pop density, defaulting to 15000: {e}")
    postal_gdf['pop_density'] = 15000

postal_gdf_3857 = postal_gdf.to_crs("EPSG:3857")

def load_clean_dataset(path):
    try:
        gdf = gpd.read_file(path, engine="fiona")
        gdf = gdf[gdf.geometry.notnull() & ~gdf.geometry.is_empty]
        return gdf
    except Exception as e:
        print(f"Error loading {os.path.basename(path)}: {e}")
        return None

# Load Facilities (Subset for functional demo runtime safety)
# For full production, all GeoJSONs shapefiles would be pre-compiled into a PostGIS DB or Parquet.
print("Loading Spatial Geometries...")
HOT_BASE = r"D:\Projects\intr\Land_Price_Prediction\Dataset\HOTOSM\data_hum_data_org"
airport_points = load_clean_dataset(os.path.join(HOT_BASE, r"airports\hotosm_ind_airports_points_geojson\hotosm_ind_airports_points_geojson.geojson"))
edu_points = load_clean_dataset(os.path.join(HOT_BASE, r"education_facilities\hotosm_ind_education_facilities_points_geojson\hotosm_ind_education_facilities_points_geojson.geojson"))
health_points = load_clean_dataset(os.path.join(HOT_BASE, r"healthcare_facilites\hotosm_ind_health_facilities_points_geojson\hotosm_ind_health_facilities_points_geojson.geojson"))
railway_points = load_clean_dataset(os.path.join(HOT_BASE, r"railway\hotosm_ind_railways_points_geojson\hotosm_ind_railways_points_geojson.geojson"))
seaport_points = load_clean_dataset(os.path.join(HOT_BASE, r"seaport\hotosm_ind_sea_ports_points_geojson\hotosm_ind_sea_ports_points_geojson.geojson"))
water_points = load_clean_dataset(os.path.join(HOT_BASE, r"Waterways\hotosm_ind_waterways_points_geojson\hotosm_ind_waterways_points_geojson.geojson"))
building_points = load_clean_dataset(os.path.join(HOT_BASE, r"buildings\hotosm_ind_buildings_polygons_geojson\hotosm_ind_buildings_polygons_geojson.geojson"))

CATEGORY_DOMAINS = {
    "Airport": airport_points,
    "Education": edu_points,
    "Healthcare": health_points,
    "Railway": railway_points,
    "Seaport": seaport_points,
    "Waterways": water_points,
    "Buildings": building_points
}

print("Server Online! Spatial APIs active.\n")

@app.route('/api/evaluate', methods=['GET'])
def evaluate_location():
    try:
        lat = float(request.args.get('lat'))
        lon = float(request.args.get('lon'))
        radius = float(request.args.get('radius', 5000))
        
        user_point = gpd.GeoDataFrame(geometry=[Point(lon, lat)], crs="EPSG:4326")
        user_proj = user_point.to_crs("EPSG:3857")
        buffer_geom = user_proj.buffer(radius).iloc[0]

        # 1. Match Nearest Postal Code for Density
        postal_gdf_3857['distance'] = postal_gdf_3857.geometry.distance(user_proj.geometry[0])
        nearest = postal_gdf_3857.loc[postal_gdf_3857['distance'].idxmin()]

        pop_density = float(nearest['pop_density']) if pd.notnull(nearest['pop_density']) else 0
        pincode = str(int(nearest['Pincode']) if pd.notnull(nearest['Pincode']) else "Unknown")
        
        # Base setup
        base_price_sqft = 1000
        if pop_density > 10000: base_price_sqft = 3500
        elif pop_density > 2000: base_price_sqft = 2000
        
        density_mult = min((pop_density / 20000) * 100, 150) # Max 150% boost

        feature_outputs = {}
        proximity_bonus_pct = 0
        variety_score = 0
        
        for category, gdf in CATEGORY_DOMAINS.items():
            if gdf is None or gdf.empty:
                feature_outputs[category] = {"count": 0, "avg_dist_m": 0}
                continue
                
            gdf_proj = gdf.to_crs("EPSG:3857")
            nearby = gdf_proj[gdf_proj.intersects(buffer_geom)]
            
            count = len(nearby)
            if count > 0:
                avg_dist = nearby.distance(user_proj.geometry[0]).mean()
                feature_outputs[category] = {"count": count, "avg_dist_m": float(avg_dist)}
                variety_score += 1

                # Continuous Decay implementation e^(-d/1000)
                decay_bonus = math.exp(-avg_dist / 1000) * 10 
                saturation_dampener = math.sqrt(count)
                proximity_bonus_pct += (decay_bonus * saturation_dampener)
            else:
                feature_outputs[category] = {"count": 0, "avg_dist_m": 0}

        # Calculate final pricing
        final_price = base_price_sqft * (1 + (density_mult/100) + (variety_score * 0.05) + (proximity_bonus_pct/100))

        response = {
            "location": {
                "latitude": lat,
                "longitude": lon,
                "nearest_pincode": pincode,
                "place_name": "Mapped Spatial Grid"
            },
            "metrics": {
                "estimated_price_sqft": round(final_price, 2),
                "density_multiplier_pct": round(density_mult, 1),
                "variety_score": variety_score,
                "proximity_bonus_pct": round(proximity_bonus_pct, 1)
            },
            "features": feature_outputs
        }
        return jsonify(response)
        
    except Exception as e:
        import traceback
        traceback.print_exc()
        return jsonify({"error": str(e)}), 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=False)
