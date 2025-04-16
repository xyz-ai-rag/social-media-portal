// /api/charts/top-cities/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { Op } from 'sequelize';
import { BusinessPostModel } from '@/feature/sqlORM/modelorm';


const TOP_K_CITES= 6
// Common city coordinates for quick lookup without API calls
// This serves as a fallback and caching mechanism
const commonCityCoordinates: Record<string, { lat: number; lng: number }> = {
  'bangkok': { lat: 13.7563, lng: 100.5018 },
  'tokyo': { lat: 35.6762, lng: 139.6503 },
  'new york': { lat: 40.7128, lng: -74.0060 },
  'paris': { lat: 48.8566, lng: 2.3522 },
  'london': { lat: 51.5074, lng: -0.1278 },
  'dubai': { lat: 25.2048, lng: 55.2708 },
  'singapore': { lat: 1.3521, lng: 103.8198 },
  'hong kong': { lat: 22.3193, lng: 114.1694 },
  'seoul': { lat: 37.5665, lng: 126.9780 },
  'beijing': { lat: 39.9042, lng: 116.4074 },
};

// In-memory cache for previously looked up coordinates
const coordinatesCache: Record<string, { lat: number; lng: number }> = { ...commonCityCoordinates };

// Function to get city coordinates
async function getCityCoordinates(cityName: string): Promise<{ lat: number; lng: number }> {
  const normalizedCityName = cityName.toLowerCase().trim();
  
  // Check cache first
  if (coordinatesCache[normalizedCityName]) {
    return coordinatesCache[normalizedCityName];
  }
  
  try {
    // In a real implementation, you would call a geocoding API here
    // For example, using Google Maps, OpenStreetMap Nominatim, or Mapbox
    
    // Example API call (commented out as it requires API setup):
    // const response = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(cityName)}.json?access_token=YOUR_MAPBOX_TOKEN&types=place`);
    // const data = await response.json();
    // const coordinates = data.features[0].center;
    // return { lng: coordinates[0], lat: coordinates[1] };
    
    // For now, use a simple algorithm to generate "fake" coordinates
    // This ensures we always get a response without an actual API
    const hash = normalizedCityName.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const lat = (hash % 180) - 90; // -90 to 90
    const lng = ((hash * 31) % 360) - 180; // -180 to 180
    
    // Cache the result
    const result = { lat, lng };
    coordinatesCache[normalizedCityName] = result;
    return result;
  } catch (error) {
    console.error(`Error getting coordinates for ${cityName}:`, error);
    // Return a default position if geocoding fails
    return { lat: 0, lng: 0 };
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");
    const start_date = searchParams.get("start_date");
    const end_date = searchParams.get("end_date");
    
    if (!business_id || !start_date || !end_date) {
      return NextResponse.json(
        { error: "Missing required parameters: business_id, start_date, end_date" },
        { status: 400 }
      );
    }
    
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return NextResponse.json({ error: "Invalid date format" }, { status: 400 });
    }
    
    // Query posts with city information
    const rows = await BusinessPostModel.findAll({
      attributes: ['english_ip_location'],  // Assuming there's a city_name field
      where: {
        business_id,
        is_relevant: true,
        last_update_time: { [Op.between]: [startDate, endDate] }
      }
    });
    
    // Process city data
    const cityCounts: Record<string, number> = {};
    
    rows.forEach(row => {
      const cityName = row.getDataValue("english_ip_location");
      
      if (cityName && typeof cityName === 'string' && cityName.trim() !== '') {
        const normalizedCity = cityName.trim().toLowerCase();
        cityCounts[normalizedCity] = (cityCounts[normalizedCity] || 0) + 1;
      }
    });
    
    // If no cities found, return an empty array
    if (Object.keys(cityCounts).length === 0) {
      return NextResponse.json([]);
    }
    
    // Convert counts to array and sort by frequency
    const sortedCities = Object.entries(cityCounts)
      .sort(([, countA], [, countB]) => countB - countA)
      .slice(0, TOP_K_CITES); // Take top 15
    
    // Calculate total count
    const totalCount = sortedCities.reduce((sum, [, count]) => sum + count, 0);
    
    // Prepare the final result with coordinates
    const result = await Promise.all(sortedCities.map(async ([city, count]) => {
      // Get coordinates, either from cache or by calling the geocoding function
      const coordinates = await getCityCoordinates(city);
      
      return {
        city: city.charAt(0).toUpperCase() + city.slice(1), // Capitalize city name
        count,
        percentage: parseFloat(((count / totalCount) * 100).toFixed(1)),
        coordinates
      };
    }));
    
    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}