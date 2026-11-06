
import logging
import requests



from rest_framework.decorators import api_view
from rest_framework.response import Response
from rest_framework import status

from .services import create_route_analysis

logger = logging.getLogger(__name__)


@api_view(["POST"])
def analyze_routes(request):
    try:
        required_fields = [
            "origin",
            "destination",
            "departure_time",
            "load_weight"
        ]

        for field in required_fields:
            if request.data.get(field) is None or request.data.get(field) == "":
                return Response(
                    {"error": f"{field} is required"},
                    status=status.HTTP_400_BAD_REQUEST
                )

        result = create_route_analysis(request.data)

        return Response(
            result,
            status=status.HTTP_200_OK
        )

    except ValueError as error:
        return Response(
            {"error": str(error)},
            status=status.HTTP_400_BAD_REQUEST
        )

    except requests.RequestException:
        logger.exception("External routing or weather API error")

        return Response(
            {"error": "Unable to connect to a routing or weather service."},
            status=status.HTTP_502_BAD_GATEWAY
        )

    except Exception:
        logger.exception("Route analysis failed")

        return Response(
            {"error": "Something went wrong while analyzing the routes."},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )
