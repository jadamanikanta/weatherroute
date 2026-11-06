
import { useEffect, useState } from "react";
import "./RouteCard.css";

const riskLevels = [
    { name: "Severe", className: "severe" },
    { name: "High", className: "high" },
    { name: "Moderate", className: "moderate" },
    { name: "Low", className: "low" },
    { name: "No Travel", className: "no-travel" }
];

function formatNumber(value, digits = 2) {
    const number = Number(value);
    return Number.isFinite(number) ? number.toFixed(digits) : "--";
}

function formatDate(value) {
    if (!value) return "Not available";

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return value;

    return date.toLocaleString();
}

function getRiskClass(level) {
    return String(level || "Unknown")
        .toLowerCase()
        .replace(/\s+/g, "-");
}

function getCheckpointWeather(checkpoint) {
    const forecast = checkpoint.forecast || [];

    return forecast.find(
        item => Number(item.hour) === 0
    ) || forecast[0] || null;
}

function RouteCard({
    route,
    recommended,
    selected,
    onSelect
}) {
    const [showModal, setShowModal] = useState(false);
    const [activeCheckpointIndex, setActiveCheckpointIndex] = useState(0);

    const risk = route.risk_miles || {};
    const checkpoints = route.checkpoints || [];

    const hasNoTravel = Number(risk["No Travel"] || 0) > 0;

    const isSafe = route.is_safe !== undefined
        ? route.is_safe
        : !hasNoTravel;

    const activeCheckpoint = checkpoints[activeCheckpointIndex];
    const activeForecast = activeCheckpoint?.forecast || [];

    const totalDistance = Number(
        route.distance_miles || 0
    );

    const openModal = () => {
        setActiveCheckpointIndex(0);
        setShowModal(true);
    };

    const closeModal = () => {
        setShowModal(false);
    };

    useEffect(() => {
        if (!showModal) return;

        const handleEscape = (event) => {
            if (event.key === "Escape") {
                closeModal();
            }
        };

        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("keydown", handleEscape);
        };
    }, [showModal]);

    return (
        <>
            <article
                className={`route-card ${selected ? "selected" : ""}`}
                onClick={onSelect}
            >
                <div className="route-card-top">
                    <div>
                        <span className="route-number">
                            ROUTE {route.route_id}
                        </span>

                        <h3>
                            {recommended
                                ? "Recommended Route"
                                : "Alternative Route"}
                        </h3>
                    </div>

                    {recommended && (
                        <span className="recommended-tag">
                            <span>★</span>
                            Best Route
                        </span>
                    )}
                </div>

                <div className="route-stats">
                    <div className="route-stat">
                        <span className="route-stat-label">
                            Total Distance
                        </span>

                        <strong>
                            {formatNumber(route.distance_miles)} mi
                        </strong>
                    </div>

                    <div className="route-stat">
                        <span className="route-stat-label">
                            Estimated Travel Time
                        </span>

                        <strong>
                            {formatNumber(route.duration_hours)} hrs
                        </strong>
                    </div>
                </div>

                <div className={`route-safety-status ${isSafe ? "safe" : "unsafe"}`}>
                    <span className="safety-status-icon">
                        {isSafe ? "✓" : "!"}
                    </span>

                    <div>
                        <strong>
                            {isSafe ? "Safe Route" : "Unsafe Route"}
                        </strong>

                        <span>
                            {isSafe
                                ? "No No-Travel conditions detected"
                                : "No-Travel conditions detected on this route"}
                        </span>
                    </div>
                </div>

                <div className="risk-distribution">
                    <div className="section-heading">
                        <h4>Risk Distribution</h4>
                        <span>{formatNumber(totalDistance)} mi total</span>
                    </div>

                    <div className="risk-bar">
                        {riskLevels.map(item => {
                            const miles = Math.max(
                                0,
                                Number(risk[item.name] || 0)
                            );

                            const percentage = totalDistance > 0
                                ? Math.min(100, (miles / totalDistance) * 100)
                                : 0;

                            return percentage > 0 ? (
                                <span
                                    key={item.name}
                                    className={`risk-bar-segment ${item.className}`}
                                    style={{ width: `${percentage}%` }}
                                    title={`${item.name}: ${formatNumber(miles)} miles`}
                                />
                            ) : null;
                        })}
                    </div>

                    <div className="risk-summary">
                        {riskLevels.map(item => (
                            <div className="risk-summary-row" key={item.name}>
                                <div className="risk-summary-label">
                                    <span className={`risk-dot ${item.className}`} />
                                    <span>{item.name}</span>
                                </div>

                                <strong>
                                    {formatNumber(risk[item.name] || 0)} mi
                                </strong>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="checkpoint-summary">
                    <div className="section-heading">
                        <div>
                            <h4>Weather Checkpoints</h4>
                            <p>
                                {checkpoints.length} checkpoints analyzed
                            </p>
                        </div>

                        <span className="checkpoint-count">
                            {checkpoints.length}
                        </span>
                    </div>

                    {checkpoints.length > 0 ? (
                        <div className="checkpoint-preview-list">
                            {checkpoints.slice(0, 3).map((checkpoint, index) => {
                                const weather = getCheckpointWeather(checkpoint);

                                const riskLevel =
                                    weather?.risk_level ||
                                    checkpoint.risk_level ||
                                    "Unknown";

                                const wind =
                                    weather?.wind_speed ??
                                    checkpoint.wind_speed;

                                const rain =
                                    weather?.rainfall ??
                                    checkpoint.rainfall;

                                const snow =
                                    weather?.snowfall ??
                                    checkpoint.snowfall;

                                return (
                                    <div
                                        className="checkpoint-preview"
                                        key={checkpoint.id || index}
                                    >
                                        <div className="checkpoint-preview-top">
                                            <strong>
                                                <span className="checkpoint-index">
                                                    {index + 1}
                                                </span>
                                                Checkpoint {index + 1}
                                            </strong>

                                            <span className={`checkpoint-risk ${getRiskClass(riskLevel)}`}>
                                                {riskLevel}
                                            </span>
                                        </div>

                                        <div className="checkpoint-weather">
                                            <span>
                                                <b>Wind</b>
                                                {wind ?? "--"} mph
                                            </span>

                                            <span>
                                                <b>Rain</b>
                                                {rain ?? "--"} in
                                            </span>

                                            <span>
                                                <b>Snow</b>
                                                {snow ?? "--"} in
                                            </span>
                                        </div>

                                        <span className="checkpoint-distance">
                                            {checkpoint.distance_from_start != null
                                                ? `${formatNumber(checkpoint.distance_from_start)} miles from origin`
                                                : `Checkpoint ${index + 1}`}
                                        </span>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <p className="no-checkpoints">
                            No checkpoint information available.
                        </p>
                    )}

                    {checkpoints.length > 0 && (
                        <button
                            className="view-all-points-button"
                            type="button"
                            onClick={(event) => {
                                event.stopPropagation();
                                openModal();
                            }}
                        >
                            <span>View All Points</span>
                            <span>→</span>
                        </button>
                    )}
                </div>

                <button
                    className="select-route-button"
                    type="button"
                    onClick={(event) => {
                        event.stopPropagation();
                        onSelect();
                    }}
                >
                    {selected ? "✓ Selected Route" : "View Route"}
                </button>
            </article>

            {showModal && (
                <div
                    className="checkpoint-modal-overlay"
                    onClick={closeModal}
                >
                    <div
                        className="checkpoint-modal"
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="checkpoint-modal-title"
                        onClick={(event) => event.stopPropagation()}
                    >
                        <div className="checkpoint-modal-header">
                            <div>
                                <span className="modal-eyebrow">
                                    ROUTE {route.route_id} DETAILS
                                </span>

                                <h2 id="checkpoint-modal-title">
                                    Weather Checkpoints
                                </h2>

                                <p>
                                    Explore all {checkpoints.length} checkpoints
                                    and their hourly weather forecasts.
                                </p>
                            </div>

                            <button
                                type="button"
                                className="modal-close-button"
                                onClick={closeModal}
                                aria-label="Close checkpoint details"
                            >
                                ×
                            </button>
                        </div>

                        <div className="checkpoint-modal-body">
                            <aside className="checkpoint-list">
                                <h3>All Checkpoints</h3>

                                <div className="checkpoint-list-items">
                                    {checkpoints.map((checkpoint, index) => {
                                        const weather = getCheckpointWeather(checkpoint);

                                        const riskLevel =
                                            weather?.risk_level ||
                                            checkpoint.risk_level ||
                                            "Unknown";

                                        return (
                                            <button
                                                type="button"
                                                key={checkpoint.id || index}
                                                className={`checkpoint-list-item ${
                                                    activeCheckpointIndex === index
                                                        ? "active"
                                                        : ""
                                                }`}
                                                onClick={() =>
                                                    setActiveCheckpointIndex(index)
                                                }
                                            >
                                                <span className="checkpoint-list-number">
                                                    {index + 1}
                                                </span>

                                                <span className="checkpoint-list-info">
                                                    <strong>
                                                        Checkpoint {index + 1}
                                                    </strong>

                                                    <small>
                                                        {checkpoint.distance_from_start != null
                                                            ? `${formatNumber(checkpoint.distance_from_start)} mi`
                                                            : "Distance unavailable"}
                                                    </small>
                                                </span>

                                                <span className={`checkpoint-risk ${getRiskClass(riskLevel)}`}>
                                                    {riskLevel}
                                                </span>
                                            </button>
                                        );
                                    })}
                                </div>
                            </aside>

                            {activeCheckpoint && (
                                <section className="checkpoint-detail">

                                    <div className="checkpoint-detail-heading">
                                        <div>
                                            <span className="modal-eyebrow">
                                                CHECKPOINT {activeCheckpointIndex + 1}
                                            </span>

                                            <h3>
                                                Weather and Safety Details
                                            </h3>
                                        </div>

                                        <span className={`checkpoint-risk ${getRiskClass(
                                            getCheckpointWeather(activeCheckpoint)?.risk_level ||
                                            activeCheckpoint.risk_level
                                        )}`}>
                                            {getCheckpointWeather(activeCheckpoint)?.risk_level ||
                                                activeCheckpoint.risk_level ||
                                                "Unknown"}
                                        </span>
                                    </div>

                                    <div className="checkpoint-location-card">
                                        <div className="location-icon">⌖</div>

                                        <div>
                                            <strong>Checkpoint Location</strong>

                                            <p>
                                                {activeCheckpoint.location ||
                                                    activeCheckpoint.name ||
                                                    activeCheckpoint.address ||
                                                    (
                                                        isFinite(Number(activeCheckpoint.latitude)) &&
                                                        isFinite(Number(activeCheckpoint.longitude))
                                                            ? `${activeCheckpoint.latitude}, ${activeCheckpoint.longitude}`
                                                            : "Location unavailable"
                                                    )}
                                            </p>

                                            {activeCheckpoint.distance_from_start != null && (
                                                <span>
                                                    {formatNumber(activeCheckpoint.distance_from_start)} miles from origin
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    <div className="checkpoint-detail-grid">
                                        <div>
                                            <span>Wind Speed</span>
                                            <strong>
                                                {getCheckpointWeather(activeCheckpoint)?.wind_speed ??
                                                    activeCheckpoint.wind_speed ??
                                                    "--"} mph
                                            </strong>
                                            <small>
                                                Risk: {getCheckpointWeather(activeCheckpoint)?.wind_risk ||
                                                    activeCheckpoint.wind_risk ||
                                                    "--"}
                                            </small>
                                        </div>

                                        <div>
                                            <span>Rainfall</span>
                                            <strong>
                                                {getCheckpointWeather(activeCheckpoint)?.rainfall ??
                                                    activeCheckpoint.rainfall ??
                                                    "--"} in
                                            </strong>
                                            <small>
                                                Risk: {getCheckpointWeather(activeCheckpoint)?.rain_risk ||
                                                    activeCheckpoint.rain_risk ||
                                                    "--"}
                                            </small>
                                        </div>

                                        <div>
                                            <span>Snowfall</span>
                                            <strong>
                                                {getCheckpointWeather(activeCheckpoint)?.snowfall ??
                                                    activeCheckpoint.snowfall ??
                                                    "--"} in
                                            </strong>
                                            <small>
                                                Risk: {getCheckpointWeather(activeCheckpoint)?.snow_risk ||
                                                    activeCheckpoint.snow_risk ||
                                                    "--"}
                                            </small>
                                        </div>
                                    </div>

                                    <div className="checkpoint-arrival">
                                        <span>Estimated Arrival</span>
                                        <strong>
                                            {formatDate(activeCheckpoint.arrival_time)}
                                        </strong>
                                    </div>

                                    {(
                                        getCheckpointWeather(activeCheckpoint)?.risk_reasons ||
                                        activeCheckpoint.risk_reasons ||
                                        []
                                    ).length > 0 && (
                                        <div className="checkpoint-reasons">
                                            <h4>Risk Assessment</h4>

                                            <ul>
                                                {(
                                                    getCheckpointWeather(activeCheckpoint)?.risk_reasons ||
                                                    activeCheckpoint.risk_reasons ||
                                                    []
                                                ).map((reason, index) => (
                                                    <li key={index}>{reason}</li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}

                                    <div className="hourly-forecast-section">
                                        <div className="section-heading">
                                            <div>
                                                <h4>Hourly Weather Forecast</h4>
                                                <p>
                                                    {activeForecast.length} forecast records available
                                                </p>
                                            </div>
                                        </div>

                                        {activeForecast.length > 0 ? (
                                            <div className="forecast-table-wrapper">
                                                <table className="forecast-table">
                                                    <thead>
                                                        <tr>
                                                            <th>Hour</th>
                                                            <th>Forecast Time</th>
                                                            <th>Wind</th>
                                                            <th>Rain</th>
                                                            <th>Snow</th>
                                                            <th>Risk</th>
                                                        </tr>
                                                    </thead>

                                                    <tbody>
                                                        {[...activeForecast]
                                                            .sort((a, b) =>
                                                                Number(a.hour) - Number(b.hour)
                                                            )
                                                            .map((item, index) => (
                                                                <tr key={`${item.hour}-${index}`}>
                                                                    <td>+{item.hour}h</td>

                                                                    <td>
                                                                        {formatDate(item.forecast_time)}
                                                                    </td>

                                                                    <td>
                                                                        {item.wind_speed ?? "--"} mph
                                                                    </td>

                                                                    <td>
                                                                        {item.rainfall ?? "--"} in
                                                                    </td>

                                                                    <td>
                                                                        {item.snowfall ?? "--"} in
                                                                    </td>

                                                                    <td>
                                                                        <span className={`checkpoint-risk ${getRiskClass(item.risk_level)}`}>
                                                                            {item.risk_level || "Unknown"}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <p className="no-checkpoints">
                                                No hourly forecast available for this checkpoint.
                                            </p>
                                        )}
                                    </div>
                                </section>
                            )}
                        </div>

                        <div className="checkpoint-modal-footer">
                            <span>
                                Route {route.route_id} · {checkpoints.length} checkpoints
                            </span>

                            <button
                                type="button"
                                onClick={closeModal}
                            >
                                Close Details
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}

export default RouteCard;
