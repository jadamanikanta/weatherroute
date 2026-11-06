
import os
import math
import logging
import requests
import time
import threading

from datetime import datetime, timedelta, timezone

from dotenv import load_dotenv

from .risk import calculate_checkpoint_risk, RISK_ORDER


load_dotenv()

logger = logging.getLogger(__name__)

MAPBOX_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")

MAPBOX_BASE_URL = "https://api.mapbox.com"
WEATHER_URL = "https://api.open-meteo.com/v1/forecast"

METERS_TO_MILES = 1609.344

WEATHER_CACHE = {}
WEATHER_CACHE_LOCK = threading.Lock()
WEATHER_CACHE_TTL = 900

WEATHER_BATCH_SIZE = 50


def get_coordinates(place):

    if not MAPBOX_TOKEN:
        raise ValueError(
            "MAPBOX_ACCESS_TOKEN is missing from your environment."
        )

    url = (
        f"{MAPBOX_BASE_URL}/geocoding/v5/mapbox.places/"
        f"{requests.utils.quote(place)}.json"
    )

    params = {
        "access_token": MAPBOX_TOKEN,
        "limit": 1
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=20
        )
        response.raise_for_status()

    except requests.RequestException:
        logger.exception("Mapbox geocoding request failed.")
        raise

    data = response.json()

    if not data.get("features"):
        raise ValueError(f"Location not found: {place}")

    coordinates = data["features"][0]["center"]

    return {
        "longitude": coordinates[0],
        "latitude": coordinates[1],
        "place_name": data["features"][0]["place_name"]
    }


def get_routes(origin, destination, departure_time):

    start = get_coordinates(origin)
    end = get_coordinates(destination)

    coordinates = (
        f'{start["longitude"]},{start["latitude"]};'
        f'{end["longitude"]},{end["latitude"]}'
    )

    url = (
        f"{MAPBOX_BASE_URL}/directions/v5/"
        f"mapbox/driving-traffic/{coordinates}"
    )

    params = {
        "access_token": MAPBOX_TOKEN,
        "alternatives": "true",
        "overview": "full",
        "geometries": "geojson",
        "steps": "true",
        "depart_at": departure_time.strftime(
            "%Y-%m-%dT%H:%M:%SZ"
        )
    }

    try:
        response = requests.get(
            url,
            params=params,
            timeout=30
        )
        response.raise_for_status()

    except requests.RequestException:
        logger.exception("Mapbox Directions request failed.")
        raise

    data = response.json()

    if data.get("code") != "Ok":
        raise ValueError(
            data.get("message", "Unable to generate routes.")
        )

    raw_routes = data.get("routes", [])

    if not raw_routes:
        raise ValueError("No routes were found.")

    return raw_routes[:3], start, end


def calculate_distance(point1, point2):

    earth_radius = 3958.8

    lat1 = math.radians(point1[1])
    lat2 = math.radians(point2[1])

    lat_difference = math.radians(
        point2[1] - point1[1]
    )

    lon_difference = math.radians(
        point2[0] - point1[0]
    )

    value = (
        math.sin(lat_difference / 2) ** 2
        + math.cos(lat1)
        * math.cos(lat2)
        * math.sin(lon_difference / 2) ** 2
    )

    return 2 * earth_radius * math.asin(
        math.sqrt(value)
    )


def generate_checkpoints(route, interval):

    coordinates = route.get(
        "geometry", {}
    ).get("coordinates", [])

    if not isinstance(coordinates, list) or len(coordinates) < 2:
        raise ValueError("Route geometry is invalid.")

    geometry_segments = []
    geometry_distance = 0

    for index in range(len(coordinates) - 1):

        start = coordinates[index]
        end = coordinates[index + 1]

        if len(start) < 2 or len(end) < 2:
            raise ValueError("Route contains invalid coordinates.")

        if not all(
            math.isfinite(float(value))
            for value in [start[0], start[1], end[0], end[1]]
        ):
            raise ValueError("Route contains invalid coordinates.")

        segment_distance = calculate_distance(start, end)

        geometry_segments.append({
            "start": start,
            "end": end,
            "distance": segment_distance,
            "start_distance": geometry_distance
        })

        geometry_distance += segment_distance

    if geometry_distance <= 0:
        raise ValueError("Unable to calculate route distance.")

    mapbox_distance = route.get("distance")

    if mapbox_distance is not None and mapbox_distance > 0:
        total_distance = mapbox_distance / METERS_TO_MILES
    else:
        total_distance = geometry_distance

    scale_factor = total_distance / geometry_distance

    route_segments = []

    for segment in geometry_segments:

        scaled_distance = segment["distance"] * scale_factor

        route_segments.append({
            "start": segment["start"],
            "end": segment["end"],
            "distance": scaled_distance,
            "start_distance": (
                segment["start_distance"] * scale_factor
            )
        })

    checkpoints = []
    current_distance = 0

    while current_distance < total_distance:

        segment_length = min(
            interval,
            total_distance - current_distance
        )

        midpoint_distance = (
            current_distance + segment_length / 2
        )

        for segment in route_segments:

            segment_end = (
                segment["start_distance"] + segment["distance"]
            )

            if midpoint_distance <= segment_end:

                if segment["distance"] <= 0:
                    continue

                ratio = (
                    midpoint_distance - segment["start_distance"]
                ) / segment["distance"]

                start = segment["start"]
                end = segment["end"]

                longitude = (
                    start[0] + (end[0] - start[0]) * ratio
                )

                latitude = (
                    start[1] + (end[1] - start[1]) * ratio
                )

                checkpoints.append({
                    "latitude": latitude,
                    "longitude": longitude,
                    "distance_from_start": round(
                        midpoint_distance, 2
                    ),
                    "segment_miles": round(
                        segment_length, 2
                    )
                })

                break

        current_distance += segment_length

    if not checkpoints:
        raise ValueError("No route checkpoints could be generated.")

    return checkpoints, total_distance


def get_risk_reason(weather, load_weight):

    wind = weather["wind_speed"]
    rain = weather["rainfall"]
    snow = weather["snowfall"]

    reasons = []

    if wind >= 55:
        reasons.append(
            f"Wind speed is {wind} mph, exceeding the 55 mph No Travel limit."
        )

    elif wind >= 45 and load_weight > 30000:
        reasons.append(
            f"Wind speed is {wind} mph and load weight is "
            f"{load_weight:,.0f} lb, exceeding the 30,000 lb restriction."
        )

    elif 35 <= wind < 45 and load_weight > 40000:
        reasons.append(
            f"Wind speed is {wind} mph with a load weight of "
            f"{load_weight:,.0f} lb, exceeding the 40,000 lb threshold."
        )

    if rain > 1.00:
        reasons.append("Rainfall exceeds 1.00 inch.")

    elif rain >= 0.50:
        reasons.append("Rainfall is in the severe-risk range.")

    elif rain >= 0.25:
        reasons.append("Rainfall is in the high-risk range.")

    elif rain >= 0.10:
        reasons.append("Rainfall is in the moderate-risk range.")

    if snow > 3.0:
        reasons.append("Snowfall exceeds 3.00 inches.")

    elif snow >= 2.0:
        reasons.append("Snowfall is in the severe-risk range.")

    elif snow >= 1.0:
        reasons.append("Snowfall is in the high-risk range.")

    elif snow >= 0.5:
        reasons.append("Snowfall is in the moderate-risk range.")

    return reasons or [
        "Weather conditions are within the low-risk range."
    ]


def get_weather_cache_key(checkpoint):

    return (
        round(float(checkpoint["latitude"]), 4),
        round(float(checkpoint["longitude"]), 4)
    )


def get_weather_data_batch(checkpoints):

    weather_results = {}
    missing_checkpoints = []

    for checkpoint in checkpoints:

        cache_key = get_weather_cache_key(checkpoint)

        with WEATHER_CACHE_LOCK:

            cached = WEATHER_CACHE.get(cache_key)

            if cached:

                cache_age = (
                    time.monotonic() - cached["timestamp"]
                )

                if cache_age < WEATHER_CACHE_TTL:
                    weather_results[cache_key] = cached["data"]
                    continue

                WEATHER_CACHE.pop(cache_key, None)

        missing_checkpoints.append(
            (cache_key, checkpoint)
        )

    if not missing_checkpoints:
        return weather_results

    for start_index in range(
        0,
        len(missing_checkpoints),
        WEATHER_BATCH_SIZE
    ):

        batch = missing_checkpoints[
            start_index:start_index + WEATHER_BATCH_SIZE
        ]

        latitudes = ",".join(
            str(item[1]["latitude"])
            for item in batch
        )

        longitudes = ",".join(
            str(item[1]["longitude"])
            for item in batch
        )

        params = {
            "latitude": latitudes,
            "longitude": longitudes,
            "hourly": "wind_speed_10m,rain,snowfall",
            "wind_speed_unit": "mph",
            "precipitation_unit": "inch",
            "timezone": "GMT",
            "forecast_days": 16
        }

        try:

            response = requests.get(
                WEATHER_URL,
                params=params,
                timeout=60
            )

            if response.status_code == 429:

                logger.error(
                    "Open-Meteo API limit reached: %s",
                    response.text[:500]
                )

                raise requests.HTTPError(
                    "Open-Meteo weather API daily limit reached. "
                    "Please try again after the quota resets.",
                    response=response
                )

            response.raise_for_status()

            data = response.json()

            if isinstance(data, dict):
                data = [data]

            if (
                not isinstance(data, list)
                or len(data) != len(batch)
            ):
                raise ValueError(
                    "Weather API returned an unexpected batch response."
                )

            for (cache_key, checkpoint), weather_data in zip(
                batch,
                data
            ):

                if (
                    not isinstance(weather_data, dict)
                    or "hourly" not in weather_data
                ):
                    raise ValueError(
                        "Weather API returned incomplete checkpoint data."
                    )

                weather_results[cache_key] = weather_data

                with WEATHER_CACHE_LOCK:

                    WEATHER_CACHE[cache_key] = {
                        "timestamp": time.monotonic(),
                        "data": weather_data
                    }

        except requests.RequestException:

            logger.exception(
                "Open-Meteo batch request failed."
            )

            raise

    return weather_results


def fetch_weather(
    checkpoint,
    departure_time,
    arrival_time,
    load_weight,
    weather_data
):

    data = weather_data
    hourly = data["hourly"]

    required_fields = [
        "time",
        "wind_speed_10m",
        "rain",
        "snowfall"
    ]

    for field in required_fields:

        if field not in hourly:
            raise ValueError(
                f"Weather forecast is missing {field}."
            )

    weather_times = []

    for value in hourly["time"]:

        parsed_time = datetime.fromisoformat(value)

        if parsed_time.tzinfo is None:

            parsed_time = parsed_time.replace(
                tzinfo=timezone.utc
            )

        else:

            parsed_time = parsed_time.astimezone(
                timezone.utc
            )

        weather_times.append(parsed_time)

    if not weather_times:
        raise ValueError(
            "No weather forecast times available."
        )

    if (
        arrival_time < weather_times[0]
        or arrival_time > weather_times[-1]
    ):

        raise ValueError(
            "Weather forecast is unavailable for the checkpoint arrival time."
        )

    def get_weather_at(target_time):

        nearest_index = min(
            range(len(weather_times)),
            key=lambda index: abs(
                (
                    weather_times[index] - target_time
                ).total_seconds()
            )
        )

        wind = hourly["wind_speed_10m"][nearest_index]
        rain = hourly["rain"][nearest_index]
        snow = hourly["snowfall"][nearest_index]

        weather = {
            "wind_speed": round(float(wind or 0), 2),
            "rainfall": round(float(rain or 0), 3),
            "snowfall": round(
                float(snow or 0) / 2.54, 3
            )
        }

        risk = calculate_checkpoint_risk(
            weather,
            load_weight
        )

        reasons = get_risk_reason(
            weather,
            load_weight
        )

        return {
            **weather,
            **risk,
            "risk_reasons": reasons
        }

    arrival_weather = get_weather_at(arrival_time)

    forecast = []

    for hour in range(49):

        forecast_time = (
            departure_time + timedelta(hours=hour)
        )

        if forecast_time < weather_times[0]:
            continue

        if forecast_time > weather_times[-1]:
            break

        forecast_weather = get_weather_at(
            forecast_time
        )

        forecast.append({
            "hour": hour,
            "forecast_time": forecast_time.isoformat(),
            **forecast_weather
        })

    return {
        **arrival_weather,
        "forecast": forecast,
        "forecast_hours_available": len(forecast)
    }


def get_checkpoint_arrival(
    departure_time,
    route_duration,
    distance,
    total_distance
):

    if total_distance <= 0:
        return departure_time

    travel_fraction = min(
        max(distance / total_distance, 0),
        1
    )

    return departure_time + timedelta(
        seconds=route_duration * travel_fraction
    )


def analyze_route(
    route,
    route_number,
    interval,
    departure_time,
    load_weight
):

    checkpoints, total_distance = generate_checkpoints(
        route,
        interval
    )

    route_duration = float(route["duration"])

    if not math.isfinite(route_duration) or route_duration <= 0:
        raise ValueError("Route duration is invalid.")

    weather_by_location = get_weather_data_batch(
        checkpoints
    )

    analyzed_checkpoints = []

    for checkpoint in checkpoints:

        arrival_time = get_checkpoint_arrival(
            departure_time,
            route_duration,
            checkpoint["distance_from_start"],
            total_distance
        )

        cache_key = get_weather_cache_key(checkpoint)

        weather = fetch_weather(
            checkpoint,
            departure_time,
            arrival_time,
            load_weight,
            weather_by_location[cache_key]
        )

        analyzed_checkpoints.append({
            **checkpoint,
            "arrival_time": arrival_time.isoformat(),
            **weather
        })

    risk_miles = {
        "Low": 0,
        "Moderate": 0,
        "High": 0,
        "Severe": 0,
        "No Travel": 0
    }

    weighted_risk = 0

    for checkpoint in analyzed_checkpoints:

        risk_level = checkpoint["risk_level"]
        segment_miles = checkpoint["segment_miles"]

        risk_miles[risk_level] += segment_miles

        weighted_risk += (
            RISK_ORDER[risk_level] * segment_miles
        )

    average_risk = (
        weighted_risk / total_distance
        if total_distance > 0
        else 0
    )

    arrival_time = (
        departure_time + timedelta(seconds=route_duration)
    )

    rounded_risk_miles = {
        key: round(value, 2)
        for key, value in risk_miles.items()
    }

    return {
        "route_id": route_number,
        "distance_miles": round(total_distance, 2),
        "duration_seconds": round(route_duration, 2),
        "duration_hours": round(route_duration / 3600, 2),
        "arrival_time": arrival_time.isoformat(),
        "geometry": route["geometry"],
        "checkpoints": analyzed_checkpoints,
        "checkpoint_count": len(analyzed_checkpoints),
        "risk_miles": rounded_risk_miles,
        "average_risk": round(average_risk, 2),
        "is_safe": risk_miles["No Travel"] == 0,
        "route_summary": {
            "distance_miles": round(total_distance, 2),
            "duration_hours": round(route_duration / 3600, 2),
            "arrival_time": arrival_time.isoformat(),
            "severe_miles": rounded_risk_miles["Severe"],
            "high_miles": rounded_risk_miles["High"],
            "no_travel_miles": rounded_risk_miles["No Travel"]
        }
    }


def recommend_route(routes):

    safe_routes = [
        route for route in routes
        if route["is_safe"]
    ]

    if not safe_routes:
        return {
            "recommended_route": None,
            "message": "No safe route is currently available."
        }

    safe_routes.sort(
        key=lambda route: (
            route["risk_miles"]["Severe"],
            route["risk_miles"]["High"],
            route["average_risk"],
            route["duration_seconds"]
        )
    )

    return {
        "recommended_route": safe_routes[0]["route_id"],
        "message": (
            "Recommended route based on Severe miles, "
            "High miles, average weather risk and travel time."
        )
    }


def create_route_analysis(data):

    origin = str(data["origin"]).strip()
    destination = str(data["destination"]).strip()

    if not origin or not destination:
        raise ValueError(
            "Origin and destination cannot be empty."
        )

    try:

        departure_time = datetime.fromisoformat(
            str(data["departure_time"]).replace(
                "Z", "+00:00"
            )
        )

    except ValueError:

        raise ValueError(
            "Invalid departure time. Use an ISO 8601 date and time."
        )

    if departure_time.tzinfo is None:
        raise ValueError(
            "Departure time must include a timezone."
        )

    departure_time = departure_time.astimezone(
        timezone.utc
    )

    current_time = datetime.now(timezone.utc)

    if departure_time < current_time:
        raise ValueError(
            "Departure time must be in the future."
        )

    if departure_time > current_time + timedelta(days=15):
        raise ValueError(
            "Departure time is outside the forecast period."
        )

    try:

        load_weight = float(data["load_weight"])

    except (TypeError, ValueError):

        raise ValueError(
            "Load weight must be a valid number."
        )

    if not math.isfinite(load_weight) or load_weight < 0:
        raise ValueError(
            "Load weight must be a non-negative number."
        )

    try:

        interval = int(data.get("interval", 25))

    except (TypeError, ValueError):

        raise ValueError(
            "Choose a 10, 25 or 50 mile interval."
        )

    if interval not in [10, 25, 50]:
        raise ValueError(
            "Choose a 10, 25 or 50 mile interval."
        )

    raw_routes, start, end = get_routes(
        origin,
        destination,
        departure_time
    )

    routes = []

    for index, route in enumerate(raw_routes, start=1):

        analyzed_route = analyze_route(
            route,
            index,
            interval,
            departure_time,
            load_weight
        )

        routes.append(analyzed_route)

    recommendation = recommend_route(routes)

    result_message = recommendation["message"]

    if len(routes) < 3:
        result_message += (
            f" The routing service returned {len(routes)} "
            "route option(s); three alternatives were not available."
        )

    return {
        "origin": start,
        "destination": end,
        "departure_time": departure_time.isoformat(),
        "load_weight": load_weight,
        "interval": interval,
        "route_count": len(routes),
        "routes": routes,
        "recommended_route": recommendation["recommended_route"],
        "message": result_message
    }
