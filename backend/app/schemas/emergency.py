from pydantic import BaseModel
from typing import List, Dict, Any

class SOSRequest(BaseModel):
    latitude: float
    longitude: float

class HospitalDetail(BaseModel):
    name: str
    distance_miles: float
    address: str
    phone: str

class SOSResponse(BaseModel):
    status: str
    caregivers_notified: List[str]
    nearby_hospitals: List[HospitalDetail]
