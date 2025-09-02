 document.addEventListener('DOMContentLoaded', () => {
            const GEO_API_URL = "https://geocoding-api.open-meteo.com/v1/search";
            const WEATHER_API_URL = "https://api.open-meteo.com/v1/forecast";

            const searchInput = document.getElementById('search-input');
            const searchForm = document.getElementById('search-form');
            const geoBtn = document.getElementById('geo-btn');
            const suggestionsEl = document.getElementById('suggestions');
            const statusEl = document.getElementById('status');
            const currentEl = document.getElementById('current');
            const hourlyEl = document.getElementById('hourly');
            const dailyEl = document.getElementById('daily');


            const debounce = (func, delay) => {
                let timeoutId;
                return (...args) => {
                    clearTimeout(timeoutId);
                    timeoutId = setTimeout(() => func.apply(this, args), delay);
                };
            };

            const getWindDirection = (deg) => {
                const directions = ["N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE", "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW"];
                const index = Math.round((deg % 360) / 22.5);
                return directions[index];
            };

            const getWeatherIcon = (code) => {
                if (code <= 1) return '☀️'; // Clear sky
                if (code <= 3) return '☁️'; // Partly cloudy
                if (code <= 48) return '🌫️'; // Fog
                if (code <= 65) return '🌧️'; // Rain
                if (code <= 86) return '❄️'; // Snow
                if (code >= 95) return '⛈️'; // Thunderstorm
                return '🌈';
            };

            const setStatus = (message, type = 'info') => {
                statusEl.innerHTML = `<span class="${type === 'error' ? 'text-red-400' : 'text-blue-300'} text-sm">${message}</span>`;
            };


            const renderCurrentWeather = (data, placeName) => {
                const now = data.current;
                const daily = data.daily;
                const isDay = now.is_day;
                const icon = getWeatherIcon(now.weather_code);
                
                const currentHTML = `
                    <div class="card bg-gray-800/90 rounded-2xl p-4 md:col-span-2">
                        <div class="top flex items-center justify-between gap-3">
                            <div>
                                <h2 class="text-3xl font-bold">${placeName}</h2>
                                <p class="text-lg text-blue-300">${new Date(now.time).toLocaleString('en-US', { weekday: 'long', hour: 'numeric', minute: 'numeric' })}</p>
                            </div>
                            <div class="text-6xl">${icon}</div>
                        </div>
                        <div class="mt-4 flex items-center justify-between">
                            <div class="flex flex-col">
                                <span class="text-6xl font-bold">${Math.round(now.temperature_2m)}°C</span>
                                <span class="text-lg text-gray-400">${Math.round(daily.temperature_2m_max[0])}°C / ${Math.round(daily.temperature_2m_min[0])}°C</span>
                            </div>
                        </div>
                        <div class="meta flex flex-wrap gap-3 mt-4 text-gray-400">
                            <span class="badge inline-flex items-center gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800">
                                💧 ${now.relative_humidity_2m}% Humidity
                            </span>
                            <span class="badge inline-flex items-center gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800">
                                💨 ${Math.round(now.wind_speed_10m)} km/h (${getWindDirection(now.wind_direction_10m)})
                            </span>
                            <span class="badge inline-flex items-center gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800">
                                🌡️ Feels like ${Math.round(now.apparent_temperature)}°C
                            </span>
                            <span class="badge inline-flex items-center gap-2 p-2 rounded-lg border border-gray-700 bg-gray-800">
                                👁️ ${now.visibility}m Visibility
                            </span>
                        </div>
                    </div>
                `;
                currentEl.innerHTML = currentHTML;
            };

            const renderHourlyForecast = (data) => {
                const hourlyData = data.hourly;
                let hourlyHTML = '';

                const now = new Date();
                const currentHour = now.getHours();

                const startIndex = hourlyData.time.findIndex(t => new Date(t).getHours() === currentHour);

                for (let i = startIndex; i < startIndex + 24; i++) {
                    const time = new Date(hourlyData.time[i]);
                    const temperature = Math.round(hourlyData.temperature_2m[i]);
                    const icon = getWeatherIcon(hourlyData.weather_code[i]);
                    hourlyHTML += `
                        <div class="hour min-w-[110px] bg-gray-900/40 border border-gray-800/70 rounded-xl p-3 text-center">
                            <div class="t text-sm text-gray-400">${time.getHours()}:00</div>
                            <div class="v text-2xl font-bold">${temperature}°</div>
                            <div class="text-3xl mt-2">${icon}</div>
                        </div>
                    `;
                }
                hourlyEl.innerHTML = hourlyHTML;
            };

            const renderDailyForecast = (data) => {
                const dailyData = data.daily;
                let dailyHTML = '';
                for (let i = 0; i < 7; i++) {
                    const date = new Date(dailyData.time[i]);
                    const weekday = date.toLocaleString('en-US', { weekday: 'short' });
                    const highTemp = Math.round(dailyData.temperature_2m_max[i]);
                    const lowTemp = Math.round(dailyData.temperature_2m_min[i]);
                    const icon = getWeatherIcon(dailyData.weather_code[i]);
                    dailyHTML += `
                        <div class="day bg-gray-900/40 border border-gray-800/70 rounded-xl p-3 text-center">
                            <div class="d font-bold">${weekday}</div>
                            <div class="text-4xl my-2">${icon}</div>
                            <div class="hi text-2xl font-bold">${highTemp}°</div>
                            <div class="lo text-sm text-gray-400">${lowTemp}°</div>
                        </div>
                    `;
                }
                dailyEl.innerHTML = dailyHTML;
            };


            const fetchWeather = async (lat, lon, placeName) => {
                setStatus('Fetching weather data...');
                try {
                    const params = new URLSearchParams({
                        latitude: lat,
                        longitude: lon,
                        current: 'temperature_2m,relative_humidity_2m,apparent_temperature,is_day,weather_code,wind_speed_10m,wind_direction_10m,visibility',
                        hourly: 'temperature_2m,weather_code',
                        daily: 'weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset',
                        timezone: 'auto',
                        forecast_days: 7,
                    });
                    const response = await fetch(`${WEATHER_API_URL}?${params}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    renderCurrentWeather(data, placeName);
                    renderHourlyForecast(data);
                    renderDailyForecast(data);
                    setStatus(''); 
                } catch (error) {
                    console.error('Failed to fetch weather data:', error);
                    setStatus(`Error: Failed to get weather for "${placeName}".`, 'error');
                }
            };


            const handleSearch = async (event) => {
                event.preventDefault();
                const query = searchInput.value.trim();
                if (!query) return;

                setStatus('Searching for city...');
                suggestionsEl.classList.add('hidden');

                try {
                    const params = new URLSearchParams({
                        name: query,
                        count: 1,
                        language: 'en',
                        format: 'json'
                    });
                    const response = await fetch(`${GEO_API_URL}?${params}`);
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }
                    const data = await response.json();
                    if (data.results && data.results.length > 0) {
                        const result = data.results[0];
                        fetchWeather(result.latitude, result.longitude, result.name);
                    } else {
                        setStatus(`City "${query}" not found.`, 'error');
                    }
                } catch (error) {
                    console.error('Failed to fetch city data:', error);
                    setStatus(`Error: Could not find city "${query}".`, 'error');
                }
            };

            const handleSuggestions = debounce(async (event) => {
                const query = event.target.value.trim();
                if (query.length < 3) {
                    suggestionsEl.innerHTML = '';
                    suggestionsEl.classList.add('hidden');
                    return;
                }

                try {
                    const params = new URLSearchParams({
                        name: query,
                        count: 5,
                        language: 'en',
                        format: 'json'
                    });
                    const response = await fetch(`${GEO_API_URL}?${params}`);
                    const data = await response.json();
                    if (data.results && data.results.length > 0) {
                        suggestionsEl.innerHTML = '';
                        suggestionsEl.classList.remove('hidden');
                        data.results.forEach(city => {
                            const option = document.createElement('div');
                            option.classList.add('opt', 'p-3', 'cursor-pointer', 'hover:bg-gray-800', 'border-b', 'border-gray-800/50');
                            option.textContent = `${city.name}, ${city.country}`;
                            option.dataset.lat = city.latitude;
                            option.dataset.lon = city.longitude;
                            option.dataset.name = city.name;
                            suggestionsEl.appendChild(option);
                        });
                    } else {
                        suggestionsEl.innerHTML = `<div class="p-3 text-gray-500">No results found.</div>`;
                        suggestionsEl.classList.remove('hidden');
                    }
                } catch (error) {
                    console.error('Failed to fetch suggestions:', error);
                    suggestionsEl.innerHTML = `<div class="p-3 text-red-400">Error fetching suggestions.</div>`;
                    suggestionsEl.classList.remove('hidden');
                }
            }, 300);

            const handleGeoLocation = () => {
                if (navigator.geolocation) {
                    setStatus('Getting your location...');
                    navigator.geolocation.getCurrentPosition(
                        (position) => {
                            const { latitude, longitude } = position.coords;
                            fetchWeather(latitude, longitude, 'Your Location');
                        },
                        (error) => {
                            console.error('Geolocation error:', error);
                            setStatus('Error: Unable to retrieve your location.', 'error');
                        }
                    );
                } else {
                    setStatus('Geolocation is not supported by your browser.', 'error');
                }
            };

           
            searchForm.addEventListener('submit', handleSearch);
           
            geoBtn.addEventListener('click', handleGeoLocation);

            suggestionsEl.addEventListener('click', (event) => {
                const target = event.target;
                if (target.classList.contains('opt')) {
                    const lat = target.dataset.lat;
                    const lon = target.dataset.lon;
                    const name = target.dataset.name;
                    searchInput.value = name;
                    suggestionsEl.classList.add('hidden');
                    fetchWeather(lat, lon, name);
                }
            });

          
            fetchWeather(28.7041, 77.1025, 'New Delhi');
        });