from django.test import TestCase



from django.test import SimpleTestCase

from .risk import (
    get_wind_risk,
    get_rain_risk,
    get_snow_risk,
    calculate_checkpoint_risk
)


class WeatherRiskTests(SimpleTestCase):

    def test_wind_risk(self):
        self.assertEqual(get_wind_risk(20), "Low")
        self.assertEqual(get_wind_risk(30), "Moderate")
        self.assertEqual(get_wind_risk(40), "High")
        self.assertEqual(get_wind_risk(50), "Severe")
        self.assertEqual(get_wind_risk(55), "No Travel")

    def test_rain_risk(self):
        self.assertEqual(get_rain_risk(0.05), "Low")
        self.assertEqual(get_rain_risk(0.15), "Moderate")
        self.assertEqual(get_rain_risk(0.30), "High")
        self.assertEqual(get_rain_risk(0.75), "Severe")
        self.assertEqual(get_rain_risk(1.10), "No Travel")

    def test_snow_risk(self):
        self.assertEqual(get_snow_risk(0.2), "Low")
        self.assertEqual(get_snow_risk(0.7), "Moderate")
        self.assertEqual(get_snow_risk(1.5), "High")
        self.assertEqual(get_snow_risk(2.5), "Severe")
        self.assertEqual(get_snow_risk(3.5), "No Travel")

    def test_heavy_load_rule(self):
        weather = {
            "wind_speed": 40,
            "rainfall": 0,
            "snowfall": 0
        }

        result = calculate_checkpoint_risk(
            weather,
            42000
        )

        self.assertEqual(result["risk_level"], "Severe")

    def test_no_travel_rule(self):
        weather = {
            "wind_speed": 50,
            "rainfall": 0,
            "snowfall": 0
        }

        result = calculate_checkpoint_risk(
            weather,
            35000
        )

        self.assertEqual(result["risk_level"], "No Travel")
