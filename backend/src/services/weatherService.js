const axios = require('axios');
require('dotenv').config();

const OPENWEATHER_API_KEY = process.env.OPENWEATHER_API_KEY;
const OPENAQ_API_KEY = process.env.OPENAQ_API_KEY;

// Mock weather data per zone (realistic Mumbai monsoon-season values)
const mockWeatherData = {
  'Andheri East':  { temp: 31.2, humidity: 88, rainfall_mm: 58.4, condition: 'Heavy Rain',  description: 'heavy intensity rain' },
  'Dharavi':       { temp: 32.5, humidity: 92, rainfall_mm: 87.3, condition: 'Extreme Rain', description: 'extreme rain' },
  'Bandra West':   { temp: 30.8, humidity: 85, rainfall_mm: 22.1, condition: 'Moderate Rain', description: 'moderate rain' },
  'Kurla':         { temp: 31.9, humidity: 89, rainfall_mm: 65.7, condition: 'Heavy Rain',   description: 'heavy intensity rain' },
  'Borivali East': { temp: 30.5, humidity: 82, rainfall_mm: 18.3, condition: 'Light Rain',   description: 'light rain' },
};

const mockAQIData = {
  'Andheri East':  { aqi: 185, dominant_pollutant: 'PM2.5', category: 'Unhealthy' },
  'Dharavi':       { aqi: 312, dominant_pollutant: 'PM2.5', category: 'Very Unhealthy' },
  'Bandra West':   { aqi: 95,  dominant_pollutant: 'PM10',  category: 'Moderate' },
  'Kurla':         { aqi: 210, dominant_pollutant: 'PM2.5', category: 'Very Unhealthy' },
  'Borivali East': { aqi: 78,  dominant_pollutant: 'NO2',   category: 'Good' },
};

const getDefaultMock = (zoneName, data) => {
  // Find closest match or return Andheri East defaults
  if (data[zoneName]) return data[zoneName];
  const keys = Object.keys(data);
  return data[keys[0]];
};

/**
 * Get weather data for a zone.
 * Uses OpenWeatherMap API if key is set, otherwise falls back to mock data.
 * @param {Object} zone - must have lat, lon, and zone_name or name
 */
const getWeatherForZone = async (zone) => {
  const zoneName = zone.zone_name || zone.name || 'Andheri East';

  if (!OPENWEATHER_API_KEY || OPENWEATHER_API_KEY === 'your_openweathermap_api_key_here') {
    console.log(`[WeatherService] Using mock data for zone: ${zoneName}`);
    const mock = getDefaultMock(zoneName, mockWeatherData);
    return {
      source: 'mock',
      zone_name: zoneName,
      temperature_c: mock.temp,
      humidity_pct: mock.humidity,
      rainfall_mm_today: mock.rainfall_mm,
      condition: mock.condition,
      description: mock.description,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const lat = zone.lat || 19.1136;
    const lon = zone.lon || 72.8697;

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${OPENWEATHER_API_KEY}&units=metric`;
    const response = await axios.get(url, { timeout: 8000 });
    const data = response.data;

    const rainfall = (data.rain && data.rain['1h']) ? data.rain['1h'] * 24 :
                     (data.rain && data.rain['3h']) ? data.rain['3h'] * 8 : 0;

    return {
      source: 'openweathermap',
      zone_name: zoneName,
      temperature_c: data.main.temp,
      humidity_pct: data.main.humidity,
      rainfall_mm_today: parseFloat(rainfall.toFixed(2)),
      condition: data.weather[0].main,
      description: data.weather[0].description,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[WeatherService] API call failed for ${zoneName}, falling back to mock:`, err.message);
    const mock = getDefaultMock(zoneName, mockWeatherData);
    return {
      source: 'mock_fallback',
      zone_name: zoneName,
      temperature_c: mock.temp,
      humidity_pct: mock.humidity,
      rainfall_mm_today: mock.rainfall_mm,
      condition: mock.condition,
      description: mock.description,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Get AQI data for a zone.
 * Uses OpenAQ API if key is set, otherwise falls back to mock data.
 * @param {Object} zone - must have lat, lon, and zone_name or name
 */
const getAQIForZone = async (zone) => {
  const zoneName = zone.zone_name || zone.name || 'Andheri East';

  if (!OPENAQ_API_KEY || OPENAQ_API_KEY === 'your_openaq_api_key_here') {
    console.log(`[AQIService] Using mock data for zone: ${zoneName}`);
    const mock = getDefaultMock(zoneName, mockAQIData);
    return {
      source: 'mock',
      zone_name: zoneName,
      aqi: mock.aqi,
      dominant_pollutant: mock.dominant_pollutant,
      category: mock.category,
      timestamp: new Date().toISOString(),
    };
  }

  try {
    const lat = zone.lat || 19.1136;
    const lon = zone.lon || 72.8697;

    // OpenAQ v2: nearest measurement stations
    const url = `https://api.openaq.io/v2/latest?coordinates=${lat},${lon}&radius=5000&limit=5&parameter=pm25`;
    const response = await axios.get(url, {
      timeout: 8000,
      headers: { 'X-API-Key': OPENAQ_API_KEY },
    });

    const results = response.data.results;
    if (!results || results.length === 0) {
      throw new Error('No AQI data found near coordinates');
    }

    // Average PM2.5 from nearby stations
    let totalPM25 = 0;
    let count = 0;
    for (const station of results) {
      for (const measurement of station.measurements) {
        if (measurement.parameter === 'pm25') {
          totalPM25 += measurement.value;
          count++;
        }
      }
    }

    const avgPM25 = count > 0 ? totalPM25 / count : 0;
    // Convert PM2.5 ug/m3 to AQI (simplified US EPA formula)
    const aqi = pm25ToAQI(avgPM25);
    const category = aqiCategory(aqi);

    return {
      source: 'openaq',
      zone_name: zoneName,
      aqi: parseFloat(aqi.toFixed(1)),
      pm25_ugm3: parseFloat(avgPM25.toFixed(2)),
      dominant_pollutant: 'PM2.5',
      category,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    console.error(`[AQIService] API call failed for ${zoneName}, falling back to mock:`, err.message);
    const mock = getDefaultMock(zoneName, mockAQIData);
    return {
      source: 'mock_fallback',
      zone_name: zoneName,
      aqi: mock.aqi,
      dominant_pollutant: mock.dominant_pollutant,
      category: mock.category,
      timestamp: new Date().toISOString(),
    };
  }
};

// Simplified PM2.5 to AQI conversion (US EPA breakpoints)
const pm25ToAQI = (pm25) => {
  const breakpoints = [
    { lo: 0,    hi: 12,   aqiLo: 0,   aqiHi: 50  },
    { lo: 12.1, hi: 35.4, aqiLo: 51,  aqiHi: 100 },
    { lo: 35.5, hi: 55.4, aqiLo: 101, aqiHi: 150 },
    { lo: 55.5, hi: 150.4,aqiLo: 151, aqiHi: 200 },
    { lo: 150.5,hi: 250.4,aqiLo: 201, aqiHi: 300 },
    { lo: 250.5,hi: 500.4,aqiLo: 301, aqiHi: 500 },
  ];

  for (const bp of breakpoints) {
    if (pm25 >= bp.lo && pm25 <= bp.hi) {
      return ((bp.aqiHi - bp.aqiLo) / (bp.hi - bp.lo)) * (pm25 - bp.lo) + bp.aqiLo;
    }
  }
  return 500;
};

const aqiCategory = (aqi) => {
  if (aqi <= 50)  return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  if (aqi <= 200) return 'Unhealthy';
  if (aqi <= 300) return 'Very Unhealthy';
  return 'Hazardous';
};

module.exports = { getWeatherForZone, getAQIForZone };
