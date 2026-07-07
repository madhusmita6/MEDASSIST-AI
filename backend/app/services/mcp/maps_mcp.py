import os
from typing import List, Dict, Any
from app.logging import logger

class MapsMCPClient:
    """Standardized Maps MCP Connector interfacing with Geolocation and Places APIs."""
    def __init__(self):
        self.mode = os.getenv("MAPS_MCP_MODE", "mock").lower()
        self.is_mock = self.mode == "mock"
        logger.info(f"Maps MCP loaded in {self.mode.upper()} mode.")

    def find_nearby_hospitals(self, latitude: float, longitude: float) -> List[Dict[str, Any]]:
        if self.is_mock:
            logger.info(f"[MOCK MAPS MCP] Searching hospitals near: ({latitude}, {longitude})")
            return [
                {
                    "name": "City General Hospital",
                    "distance_miles": 1.1,
                    "address": "120 Main St, Metropolis",
                    "phone": "+15550190",
                    "directions_link": self.generate_directions_link(latitude, longitude, 37.7749, -122.4194)
                }
            ]
            
        # TODO: Implement Google Maps Places API call
        logger.info("[REAL MAPS MCP] Invoking Places API request...")
        return []

    def find_emergency_clinics(self, latitude: float, longitude: float) -> List[Dict[str, Any]]:
        if self.is_mock:
            logger.info(f"[MOCK MAPS MCP] Searching ERs near: ({latitude}, {longitude})")
            return [
                {
                    "name": "Community First Emergency Care",
                    "distance_miles": 0.5,
                    "address": "202 Health Way, Metropolis",
                    "phone": "+15550183",
                    "directions_link": self.generate_directions_link(latitude, longitude, 37.7780, -122.4150)
                }
            ]
            
        # TODO: Implement Google Maps Places API call for type=emergency_room
        return []

    def generate_directions_link(
        self, 
        start_lat: float, 
        start_lon: float, 
        dest_lat: float, 
        dest_lon: float
    ) -> str:
        """Returns direct Google Maps directions URL."""
        return f"https://www.google.com/maps/dir/?api=1&origin={start_lat},{start_lon}&destination={dest_lat},{dest_lon}&travelmode=driving"

maps_mcp = MapsMCPClient()
