
import { useEffect } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { heatLayer } from "@linkurious/leaflet-heat";

import {
    MapContainer,
    TileLayer,
    Polyline,
    CircleMarker,
    Popup,
    useMap
} from "react-leaflet";

const riskColors = {
    Low: "#16A36A",
    Moderate: "#E7A52B",
    High: "#EF7D32",
    Severe: "#DC4242",
    "No Travel": "#801D35"
};

const RISK_ORDER = {
    Low: 0,
    Moderate: 1,
    High: 2,
    Severe: 3,
    "No Travel": 4
};

function getForecast(checkpoint, hour) {
    return checkpoint.forecast?.find(
        item => Number(item.hour) === Number(hour)
    );
}

function getWeatherRisk(weather, loadWeight = 0) {
    if (!weather) return checkpointFallbackRisk;

    const wind = Number(weather.wind_speed ?? 0);
    const rain = Number(weather.rainfall ?? 0);
    const snow = Number(weather.snowfall ?? 0);
    const load = Number(loadWeight);

    const risks = [];

    risks.push(
        wind >= 55 ? "No Travel" :
        wind >= 45 ? "Severe" :
        wind >= 35 ? "High" :
        wind >= 25 ? "Moderate" : "Low"
    );

    risks.push(
        rain > 1 ? "No Travel" :
        rain >= 0.5 ? "Severe" :
        rain >= 0.25 ? "High" :
        rain >= 0.1 ? "Moderate" : "Low"
    );

    risks.push(
        snow > 3 ? "No Travel" :
        snow >= 2 ? "Severe" :
        snow >= 1 ? "High" :
        snow >= 0.5 ? "Moderate" : "Low"
    );

    if (wind >= 55) {
        risks.push("No Travel");
    } else if (wind >= 45 && load > 30000) {
        risks.push("No Travel");
    } else if (wind >= 35 && wind < 45 && load > 40000) {
        risks.push("Severe");
    }

    return risks.reduce((highest, current) =>
        RISK_ORDER[current] > RISK_ORDER[highest]
            ? current
            : highest
    , "Low");
}

const checkpointFallbackRisk = "Low";

function isValidCoordinate(latitude, longitude) {
    return (
        Number.isFinite(Number(latitude)) &&
        Number.isFinite(Number(longitude)) &&
        Number(latitude) >= -90 &&
        Number(latitude) <= 90 &&
        Number(longitude) >= -180 &&
        Number(longitude) <= 180
    );
}

function getRoutePositions(route) {
    const coordinates = route.geometry?.coordinates;

    if (!Array.isArray(coordinates)) {
        return [];
    }

    return coordinates
        .filter(coordinate =>
            Array.isArray(coordinate) &&
            coordinate.length >= 2 &&
            isValidCoordinate(coordinate[1], coordinate[0])
        )
        .map(([longitude, latitude]) => [
            Number(latitude),
            Number(longitude)
        ]);
}

function getCheckpointPositions(checkpoints) {
    return checkpoints.filter(checkpoint =>
        isValidCoordinate(
            checkpoint.latitude,
            checkpoint.longitude
        )
    );
}

function HeatLayer({ checkpoints, hour, loadWeight }) {
    const map = useMap();

    useEffect(() => {
        const heatPoints = checkpoints
            .map(checkpoint => {
                const weather = getForecast(checkpoint, hour);

                if (!weather) return null;

                const risk = getWeatherRisk(weather, loadWeight);
                const intensity = Math.max(
                    0.1,
                    RISK_ORDER[risk] / 4
                );

                return [
                    Number(checkpoint.latitude),
                    Number(checkpoint.longitude),
                    intensity
                ];
            })
            .filter(point =>
                point &&
                Number.isFinite(point[0]) &&
                Number.isFinite(point[1]) &&
                point[0] >= -90 &&
                point[0] <= 90 &&
                point[1] >= -180 &&
                point[1] <= 180
            );

        if (heatPoints.length === 0) return;

        const weatherHeatLayer = heatLayer(heatPoints, {
            radius: 30,
            blur: 20,
            maxZoom: 12,
            minOpacity: 0.25
        });

        weatherHeatLayer.addTo(map);

        return () => {
            if (map.hasLayer(weatherHeatLayer)) {
                map.removeLayer(weatherHeatLayer);
            }
        };
    }, [map, checkpoints, hour, loadWeight]);

    return null;
}

function FitBounds({ routes }) {
    const map = useMap();

    useEffect(() => {
        const allPositions = routes.flatMap(route =>
            getRoutePositions(route)
        );

        if (allPositions.length === 0) return;

        const bounds = L.latLngBounds(allPositions);

        if (bounds.isValid()) {
            map.fitBounds(bounds, {
                padding: [40, 40],
                maxZoom: 10
            });
        }
    }, [map, routes]);

    return null;
}

function RouteMap({
    routes = [],
    selectedRoute,
    forecastHour,
    loadWeight = 0
}) {
    const activeRoute = routes.find(
        route =>
            String(route.route_id) === String(selectedRoute)
    );

    const checkpoints = getCheckpointPositions(
        activeRoute?.checkpoints || []
    );

    return (
        <section className="map-section">

            <div className="map-heading">
                <div>
                    <span className="eyebrow">
                        LIVE ROUTE VISUALIZATION
                    </span>
                    <h2>Weather and route map</h2>
                </div>
            </div>

            <div className="map-container">

                <MapContainer
                    center={[20.5937, 78.9629]}
                    zoom={5}
                    scrollWheelZoom={true}
                    className="route-map"
                >

                    <TileLayer
                        attribution="&copy; OpenStreetMap contributors"
                        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                    />

                    <FitBounds routes={routes} />

                    {routes.map(route => {
                        const positions = getRoutePositions(route);

                        if (positions.length < 2) return null;

                        const isSelected =
                            String(route.route_id) ===
                            String(selectedRoute);

                        return (
                            <Polyline
                                key={route.route_id}
                                positions={positions}
                                pathOptions={{
                                    color: isSelected
                                        ? "#087F8C"
                                        : "#82919D",
                                    weight: isSelected ? 6 : 3,
                                    opacity: isSelected ? 0.95 : 0.55
                                }}
                            />
                        );
                    })}

                    <HeatLayer
                        checkpoints={checkpoints}
                        hour={forecastHour}
                        loadWeight={loadWeight}
                    />

                    {checkpoints.map((checkpoint, index) => {
                        const weather = getForecast(
                            checkpoint,
                            forecastHour
                        );

                        const displayedRisk = weather
                            ? getWeatherRisk(weather, loadWeight)
                            : checkpoint.risk_level || "Low";

                        return (
                            <CircleMarker
                                key={checkpoint.id || index}
                                center={[
                                    Number(checkpoint.latitude),
                                    Number(checkpoint.longitude)
                                ]}
                                radius={8}
                                pathOptions={{
                                    color: "#ffffff",
                                    weight: 2,
                                    fillColor:
                                        riskColors[displayedRisk],
                                    fillOpacity: 0.95
                                }}
                            >

                                <Popup>
                                    <strong>
                                        Checkpoint {index + 1}
                                    </strong>

                                    <p>
                                        Distance: {
                                            checkpoint.distance_from_start ?? "N/A"
                                        } miles
                                    </p>

                                    <p>
                                        Arrival: {
                                            checkpoint.arrival_time
                                                ? new Date(
                                                    checkpoint.arrival_time
                                                ).toLocaleString()
                                                : "N/A"
                                        }
                                    </p>

                                    <p>
                                        Forecast hour: {forecastHour}
                                    </p>

                                    <p>
                                        Wind: {
                                            weather?.wind_speed ?? "N/A"
                                        } mph
                                    </p>

                                    <p>
                                        Rain: {
                                            weather?.rainfall ?? "N/A"
                                        } inches
                                    </p>

                                    <p>
                                        Snow: {
                                            weather?.snowfall ?? "N/A"
                                        } inches
                                    </p>

                                    <strong>
                                        Risk: {displayedRisk}
                                    </strong>
                                </Popup>

                            </CircleMarker>
                        );
                    })}

                </MapContainer>

            </div>

            <div className="map-legend">
                {Object.entries(riskColors).map(([risk, color]) => (
                    <div key={risk}>
                        <span
                            style={{ backgroundColor: color }}
                        ></span>
                        {risk}
                    </div>
                ))}
            </div>

        </section>
    );
}

export default RouteMap;
