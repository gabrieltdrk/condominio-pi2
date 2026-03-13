export type WeatherSnapshot = {
  city: string;
  temperature: number;
  apparentTemperature: number;
  humidity: number;
  windSpeed: number;
  high: number;
  low: number;
  condition: string;
  isDay: boolean;
  fetchedAt: string;
};

const SANTOS_LATITUDE = -23.9608;
const SANTOS_LONGITUDE = -46.3336;
const WEATHER_API_KEY = import.meta.env.VITE_WEATHERAPI_KEY as string | undefined;

function getWeatherConditionLabel(code: number) {
  if (code === 0) return "Ceu limpo";
  if ([1, 2, 3].includes(code)) return "Parcialmente nublado";
  if ([45, 48].includes(code)) return "Neblina";
  if ([51, 53, 55, 56, 57].includes(code)) return "Garoa";
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code)) return "Chuva";
  if ([71, 73, 75, 77, 85, 86].includes(code)) return "Granizo ou neve";
  if ([95, 96, 99].includes(code)) return "Tempestade";
  return "Tempo variavel";
}

export async function fetchSantosWeather() {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 8000);

  try {
    if (WEATHER_API_KEY) {
      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${WEATHER_API_KEY}&q=${SANTOS_LATITUDE},${SANTOS_LONGITUDE}&days=1&aqi=no&alerts=no`,
        { signal: controller.signal },
      );

      if (!response.ok) {
        throw new Error("Nao foi possivel carregar o clima de Santos.");
      }

      const data = await response.json() as {
        location?: {
          name: string;
          region: string;
          localtime: string;
        };
        current?: {
          temp_c: number;
          feelslike_c: number;
          humidity: number;
          wind_kph: number;
          is_day: number;
          condition?: {
            text: string;
          };
        };
        forecast?: {
          forecastday?: Array<{
            day?: {
              maxtemp_c: number;
              mintemp_c: number;
            };
          }>;
        };
      };

      const forecastDay = data.forecast?.forecastday?.[0]?.day;
      if (!data.location || !data.current || !forecastDay) {
        throw new Error("Resposta de clima incompleta.");
      }

      return {
        city: `${data.location.name}, ${data.location.region || "SP"}`,
        temperature: data.current.temp_c,
        apparentTemperature: data.current.feelslike_c,
        humidity: data.current.humidity,
        windSpeed: data.current.wind_kph,
        high: forecastDay.maxtemp_c,
        low: forecastDay.mintemp_c,
        condition: data.current.condition?.text ?? "Tempo variavel",
        isDay: data.current.is_day === 1,
        fetchedAt: data.location.localtime,
      } satisfies WeatherSnapshot;
    }

    const response = await fetch(
      `https://api.open-meteo.com/v1/forecast?latitude=${SANTOS_LATITUDE}&longitude=${SANTOS_LONGITUDE}&current=temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m&daily=temperature_2m_max,temperature_2m_min&forecast_days=1&timezone=America%2FSao_Paulo`,
      { signal: controller.signal },
    );

    if (!response.ok) {
      throw new Error("Nao foi possivel carregar o clima de Santos.");
    }

    const data = await response.json() as {
      current?: {
        temperature_2m: number;
        relative_humidity_2m: number;
        apparent_temperature: number;
        is_day: number;
        weather_code: number;
        wind_speed_10m: number;
        time: string;
      };
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
      };
    };

    if (!data.current || !data.daily?.temperature_2m_max?.length || !data.daily.temperature_2m_min?.length) {
      throw new Error("Resposta de clima incompleta.");
    }

    return {
      city: "Santos, SP",
      temperature: data.current.temperature_2m,
      apparentTemperature: data.current.apparent_temperature,
      humidity: data.current.relative_humidity_2m,
      windSpeed: data.current.wind_speed_10m,
      high: data.daily.temperature_2m_max[0],
      low: data.daily.temperature_2m_min[0],
      condition: getWeatherConditionLabel(data.current.weather_code),
      isDay: data.current.is_day === 1,
      fetchedAt: data.current.time,
    } satisfies WeatherSnapshot;
  } finally {
    window.clearTimeout(timeoutId);
  }
}
