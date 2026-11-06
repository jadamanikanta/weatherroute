
import { useState } from "react";
import axios from "axios";

import RouteForm from "./components/RouteForm";
import RouteCard from "./components/RouteCard";
import RouteMap from "./components/RouteMap";
import WeatherSlider from "./components/WeatherSlider";
import RiskRules from "./components/RiskRules";

import "./App.css";

function App() {
    const [routes, setRoutes] = useState([]);
    const [recommendedRoute, setRecommendedRoute] = useState(null);
    const [selectedRoute, setSelectedRoute] = useState(null);
    const [forecastHour, setForecastHour] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [routeInfo, setRouteInfo] = useState(null);

    const analyzeJourney = async (formData) => {
        setLoading(true);
        setError("");

        setRoutes([]);
        setRecommendedRoute(null);
        setSelectedRoute(null);
        setRouteInfo(null);
        setForecastHour(0);

        try {
            const response = await axios.post(
                `${import.meta.env.VITE_API_URL}/api/analyze/`,
                formData
            );

            const result = response.data;

            console.log("Complete API Response:", result);
            console.log("Routes:", result.routes);
            console.log("Recommendation:", result.recommended_route);
            console.log(
                "Forecast:",
                result.routes?.[0]?.checkpoints?.[0]?.forecast
            );

            if (!result || !Array.isArray(result.routes)) {
                throw new Error(
                    "The API response does not contain a valid routes array."
                );
            }

            if (result.routes.length === 0) {
                throw new Error(
                    "No routes were generated. Please try another origin or destination."
                );
            }

            const normalizedRoutes = result.routes.map((route, index) => ({
                ...route,
                route_id: route.route_id ?? route.id ?? index + 1
            }));

            const recommendation = result.recommended_route;

            const recommendedId =
                typeof recommendation === "object" && recommendation !== null
                    ? recommendation.route_id ?? recommendation.id
                    : recommendation;

            const finalRecommendedRoute =
                recommendedId == null
                    ? null
                    : normalizedRoutes.find(
                        route =>
                            String(route.route_id) ===
                            String(recommendedId)
                    )?.route_id ?? null;

            const initialSelectedRoute =
                finalRecommendedRoute ??
                normalizedRoutes[0].route_id;

            setRoutes(normalizedRoutes);
            setRecommendedRoute(finalRecommendedRoute);
            setSelectedRoute(initialSelectedRoute);
            setRouteInfo({
                ...result,
                load_weight:
                    result.load_weight ?? formData.load_weight
            });

        } catch (err) {
            console.error("Route Analysis Error:", err);
            console.error("Backend Error Response:", err.response?.data);

            setError(
                err.response?.data?.error ||
                err.message ||
                "Unable to analyze the journey."
            );

        } finally {
            setLoading(false);
        }
    };

    const activeRoute = routes.find(
        route =>
            String(route.route_id) === String(selectedRoute)
    );

    const forecast =
        activeRoute?.checkpoints?.[0]?.forecast || [];

    return (
        <div className="app-container">

            <header className="app-header">
                <div className="brand">
                    <span className="brand-icon">W</span>

                    <div>
                        <h2>WeatherRoute</h2>
                        <p>TRUCK ROUTE INTELLIGENCE</p>
                    </div>
                </div>

                <span className="header-label">
                    Weather-Aware Routing
                </span>
            </header>

            <main className="dashboard">

                <section className="page-heading">
                    <span className="eyebrow">
                        SMART TRANSPORTATION
                    </span>

                    <h1>Plan a safer journey.</h1>

                    <p>
                        Compare routes, monitor weather conditions
                        and identify potential risks before departure.
                    </p>
                </section>

                <RouteForm
                    onSubmit={analyzeJourney}
                    loading={loading}
                />

                <RiskRules />

                {loading && (
                    <div className="loading-message">
                        Analyzing routes and weather conditions...
                    </div>
                )}

                {error && (
                    <div className="error-message">
                        {error}
                    </div>
                )}

                {routes.length > 0 && (
                    <section className="analysis-results">

                        <section className="results-heading">
                            <div>
                                <span className="eyebrow">
                                    ROUTE ANALYSIS
                                </span>

                                <h2>Available routes</h2>
                            </div>

                            <span>
                                {routes.length} routes generated
                            </span>
                        </section>

                        {routeInfo?.origin && (
                            <div className="journey-summary">

                                <div>
                                    <span>Origin</span>

                                    <strong>
                                        {typeof routeInfo.origin === "object"
                                            ? routeInfo.origin.name ||
                                              routeInfo.origin.place_name ||
                                              "Starting location"
                                            : routeInfo.origin}
                                    </strong>
                                </div>

                                <div>
                                    <span>Destination</span>

                                    <strong>
                                        {typeof routeInfo.destination === "object"
                                            ? routeInfo.destination.name ||
                                              routeInfo.destination.place_name ||
                                              "Destination location"
                                            : routeInfo.destination}
                                    </strong>
                                </div>

                            </div>
                        )}

                        <section className="route-cards">

                            {routes.map(route => (
                                <RouteCard
                                    key={route.route_id}
                                    route={route}
                                    recommended={
                                        recommendedRoute !== null &&
                                        String(route.route_id) ===
                                        String(recommendedRoute)
                                    }
                                    selected={
                                        String(route.route_id) ===
                                        String(selectedRoute)
                                    }
                                    onSelect={() =>
                                        setSelectedRoute(route.route_id)
                                    }
                                />
                            ))}

                        </section>

                        {routeInfo?.message && (
                            <p className="recommendation-message">
                                {routeInfo.message}
                            </p>
                        )}

                        {recommendedRoute === null && (
                            <div className="error-message">
                                No safe route is currently recommended.
                                Review the weather risks before travelling.
                            </div>
                        )}

                        <WeatherSlider
                            hour={forecastHour}
                            onChange={setForecastHour}
                            forecast={forecast}
                        />

                        <RouteMap
                            routes={routes}
                            selectedRoute={selectedRoute}
                            forecastHour={forecastHour}
                            loadWeight={Number(
                                routeInfo?.load_weight ?? 0
                            )}
                        />

                    </section>
                )}

            </main>

            <footer className="app-footer">
                WeatherRoute · Weather-Aware Truck Routing
            </footer>

        </div>
    );
}

export default App;
