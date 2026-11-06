
import "./WeatherSlider.css";

function WeatherSlider({ hour, onChange, forecast = [] }) {
    const weather = forecast.find(
        item => Number(item.hour) === Number(hour)
    );

    const formatTime = (time) => {
        if (!time) return "Time unavailable";

        return new Date(time).toLocaleString([], {
            day: "2-digit",
            month: "short",
            hour: "2-digit",
            minute: "2-digit"
        });
    };

    const getRiskColor = (risk) => {
        const colors = {
            "Low": "#16a34a",
            "Moderate": "#d97706",
            "High": "#ea580c",
            "Severe": "#dc2626",
            "No Travel": "#991b1b"
        };

        return colors[risk] || "#64748b";
    };

    if (!forecast.length) {
        return (
            <section className="weather-slider">
                <h2>Weather forecast unavailable</h2>
                <p>No forecast data was received.</p>
            </section>
        );
    }

    const risk = weather?.risk_level || "Unavailable";

    return (
        <section className="weather-slider">

            <div className="slider-heading">
                <div>
                    <span className="eyebrow">WEATHER FORECAST</span>
                    <h2>Explore weather conditions</h2>
                    <p>
                        {formatTime(weather?.forecast_time)}
                    </p>
                </div>

                <strong>+{hour} Hours</strong>
            </div>

            <input
                type="range"
                min="0"
                max="48"
                step="1"
                value={hour}
                onChange={(event) =>
                    onChange(Number(event.target.value))
                }
            />

            <div className="slider-labels">
                <span>Departure · 0h</span>
                <span>12h</span>
                <span>24h</span>
                <span>36h</span>
                <span>48h</span>
            </div>

            {weather && (
                <>
                    <div className="forecast-risk">
                        <span>Weather Risk</span>
                        <strong
                            style={{ backgroundColor: getRiskColor(risk) }}
                        >
                            {risk}
                        </strong>
                    </div>

                    <div className="forecast-grid">

                        <div className="forecast-card">
                            <span className="forecast-icon">💨</span>
                            <p>Wind Speed</p>
                            <h3>{weather.wind_speed ?? 0} mph</h3>
                        </div>

                        <div className="forecast-card">
                            <span className="forecast-icon">🌧️</span>
                            <p>Rainfall</p>
                            <h3>{weather.rainfall ?? 0} in</h3>
                        </div>

                        <div className="forecast-card">
                            <span className="forecast-icon">❄️</span>
                            <p>Snowfall</p>
                            <h3>{weather.snowfall ?? 0} in</h3>
                        </div>

                        {weather.temperature !== undefined && (
                            <div className="forecast-card">
                                <span className="forecast-icon">🌡️</span>
                                <p>Temperature</p>
                                <h3>{weather.temperature}°C</h3>
                            </div>
                        )}

                    </div>
                </>
            )}

        </section>
    );
}

export default WeatherSlider;
