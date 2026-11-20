export type WeatherSnapshot = {
  city: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  high: number;
  low: number;
  condition: string;
  weatherCode: number;
  isDay: boolean;
  fetchedAt: string;
};

const FALLBACK_LAT = -23.9608;
const FALLBACK_LON = -46.3336;
const FALLBACK_CITY = "Santos, SP";

function weatherLabel(code: number) {
  if (code === 0) return "Céu limpo";
  if ([1, 2, 3].includes(code)) return "Parcialmente nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Neve / Granizo";
  if ([95, 96, 99].includes(code)) return "Tempestade";
  return "Tempo variável";
}

async function getUserLocation(): Promise<{ lat: number; lon: number; city: string }> {
  return new Promise((resolve) => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON, city: FALLBACK_CITY });
      return;
    }

    const fallbackTimer = setTimeout(() => {
      resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON, city: FALLBACK_CITY });
    }, 6000);

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        clearTimeout(fallbackTimer);
        const { latitude: lat, longitude: lon } = pos.coords;
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lon}&format=json`,
            { headers: { "Accept-Language": "pt-BR" } },
          );
          const data = await res.json() as { address?: Record<string, string> };
          const addr = data.address ?? {};
          const city = addr.city ?? addr.town ?? addr.village ?? addr.county ?? "Minha localização";
          const state = addr.state ?? "";
          resolve({ lat, lon, city: state ? `${city}, ${state}` : city });
        } catch {
          resolve({ lat, lon, city: "Minha localização" });
        }
      },
      () => {
        clearTimeout(fallbackTimer);
        resolve({ lat: FALLBACK_LAT, lon: FALLBACK_LON, city: FALLBACK_CITY });
      },
      { timeout: 5000, enableHighAccuracy: false },
    );
  });
}

export async function fetchWeather(): Promise<WeatherSnapshot> {
  const { lat, lon, city } = await getUserLocation();

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m` +
      `&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=auto`,
      { signal: controller.signal },
    );

    if (!res.ok) throw new Error("Erro ao buscar clima.");

    const data = await res.json() as {
      current?: {
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        is_day: number;
        weather_code: number;
        wind_speed_10m: number;
        time: string;
      };
      daily?: { temperature_2m_max?: number[]; temperature_2m_min?: number[] };
    };

    if (!data.current || !data.daily?.temperature_2m_max?.length || !data.daily.temperature_2m_min?.length) {
      throw new Error("Resposta incompleta.");
    }

    return {
      city,
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      high: data.daily.temperature_2m_max[0],
      low: data.daily.temperature_2m_min[0],
      condition: weatherLabel(data.current.weather_code),
      weatherCode: data.current.weather_code,
      isDay: data.current.is_day === 1,
      fetchedAt: data.current.time,
    };
  } finally {
    window.clearTimeout(timeoutId);
  }
}

// backward compat alias
export const fetchSantosWeather = fetchWeather;
