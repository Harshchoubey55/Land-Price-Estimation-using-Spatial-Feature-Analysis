const ApiService = {
    async evaluateLocation(lat, lon, radius) {
        try {
            // Fetch real spatial intersection data from the local GeoPandas Python Server
            const url = `http://127.0.0.1:5000/api/evaluate?lat=${lat}&lon=${lon}&radius=${radius}`;
            const response = await fetch(url);
            
            if (!response.ok) {
                const errorBody = await response.json().catch(() => ({}));
                throw new Error(`Server Error: ${errorBody.error || response.statusText}`);
            }

            const data = await response.json();
            return data;

        } catch (error) {
            console.error("Evaluation Error:", error);
            if (error.message.includes('Failed to fetch')) {
                throw new Error("Cannot connect to Python Server Engine. Is app.py running?");
            }
            throw new Error(error.message || "Failed to process topological evaluation.");
        }
    }
};
