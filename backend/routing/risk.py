
RISK_ORDER = {
    "Low": 0,
    "Moderate": 1,
    "High": 2,
    "Severe": 3,
    "No Travel": 4
}


def get_wind_risk(wind_speed):
    wind_speed = float(wind_speed)

    if wind_speed >= 55:
        return "No Travel"
    elif wind_speed >= 45:
        return "Severe"
    elif wind_speed >= 35:
        return "High"
    elif wind_speed >= 25:
        return "Moderate"
    return "Low"


def get_rain_risk(rainfall):
    rainfall = float(rainfall)

    if rainfall > 1.00:
        return "No Travel"
    elif rainfall >= 0.50:
        return "Severe"
    elif rainfall >= 0.25:
        return "High"
    elif rainfall >= 0.10:
        return "Moderate"
    return "Low"


def get_snow_risk(snowfall):
    snowfall = float(snowfall)

    if snowfall > 3.0:
        return "No Travel"
    elif snowfall >= 2.0:
        return "Severe"
    elif snowfall >= 1.0:
        return "High"
    elif snowfall >= 0.5:
        return "Moderate"
    return "Low"


def calculate_checkpoint_risk(weather, load_weight):
    wind = float(weather["wind_speed"])
    rain = float(weather["rainfall"])
    snow = float(weather["snowfall"])
    load_weight = float(load_weight)

    wind_risk = get_wind_risk(wind)
    rain_risk = get_rain_risk(rain)
    snow_risk = get_snow_risk(snow)

    risks = [wind_risk, rain_risk, snow_risk]

    if wind >= 55:
        risks.append("No Travel")
    elif wind >= 45 and load_weight > 30000:
        risks.append("No Travel")
    elif 35 <= wind < 45 and load_weight > 40000:
        risks.append("Severe")

    final_risk = max(risks, key=lambda risk: RISK_ORDER[risk])

    return {
        "risk_level": final_risk,
        "wind_risk": wind_risk,
        "rain_risk": rain_risk,
        "snow_risk": snow_risk
    }
