/**
 * Mock API Service Layer
 * Simulates a Python backend natively and securely.
 */

const ApiService = {
    async evaluateLocation(lat, lon, radius) {
        // India's rough bounding box
        const isInIndia = lat >= 6.5 && lat <= 36.0 && lon >= 68.0 && lon <= 97.4;
        
        if (!isInIndia) {
            throw new Error("Operational Boundary: That location is outside the Indian geographical extent.");
        }

        // Mock network delay for processing analysis
        await new Promise(resolve => setTimeout(resolve, 1200));

        // Let's use a free reverse geocoding to get the exact place name
        let placeName = "Unknown Region";
        let pincode = "XXXXXX";
        
        try {
            const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lon}`);
            if (res.ok) {
                const data = await res.json();
                placeName = data.address.city || data.address.state_district || data.address.county || data.address.state || "Indian Region";
                pincode = data.address.postcode || Math.floor(100000 + Math.random() * 900000).toString();
            }
        } catch (e) {
            console.warn("Reverse geocode failed, using fallback.");
            placeName = "Indian Region";
            pincode = Math.floor(100000 + Math.random() * 900000).toString();
        }

        // Random deterministic seed based on lat/lon
        const seed = Math.abs(Math.sin(lat * lon)) * 10000;
        
        // Populate randomly but deterministically
        const popDensity = 500 + (seed % 25000); // 500 to 25500
        
        // Base Price formulation
        let basePrice = 1500;
        if (popDensity > 15000) basePrice = 5500;
        else if (popDensity > 5000) basePrice = 3500;
        else if (popDensity > 1000) basePrice = 2500;

        const featureWeights = {
            'education': 0.08,
            'healthcare': 0.10,
            'buildings': 0.02,
            'airport': 0.05,
            'railway': 0.03,
            'roads': 0.05,
            'waterways': 0.02,
            'seaport': 0.01
        };

        const features = {};
        const categories = Object.keys(featureWeights);
        let varietyScore = 0;
        let proximityBonus = 0;

        categories.forEach((cat, index) => {
            // Pseudo-random presence based on seed and density
            const isPresent = ((seed * (index + 1)) % 100) < ((popDensity / 30000) * 100 + 30); 
            
            if (isPresent) {
                const count = Math.floor((seed % (index + 1)) % 15) + 1;
                const avgDist = 10 + (((seed * index) % (radius - 10)));
                
                features[cat] = {
                    count: count,
                    avg_dist_m: avgDist
                };

                varietyScore += 1;
                const weight = featureWeights[cat];
                const decayFactor = Math.exp(-avgDist / 2000);
                const scoreAddition = weight * decayFactor * Math.sqrt(count);
                
                proximityBonus += scoreAddition;
            } else {
                features[cat] = { count: 0, avg_dist_m: null };
            }
        });

        const densityMultiplier = Math.min(popDensity / 10000, 1.5);
        const finalPrice = basePrice * (1 + densityMultiplier + (varietyScore * 0.05) + proximityBonus);

        return {
            status: "success",
            location: {
                lat, lon,
                place_name: placeName,
                nearest_pincode: pincode
            },
            metrics: {
                pop_density: Math.round(popDensity),
                base_price: basePrice,
                variety_score: varietyScore,
                proximity_bonus_pct: proximityBonus * 100,
                density_multiplier_pct: densityMultiplier * 100,
                estimated_price_sqft: Math.round(finalPrice)
            },
            features: features
        };
    }
};
