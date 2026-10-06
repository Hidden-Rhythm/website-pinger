from typing import Dict, Any, List, Optional
from pydantic import BaseModel, Field

class KeywordAssertionModel(BaseModel):
    expected: str = Field(..., max_length=1000)
    operator: str = Field("contains", pattern="^(contains|not_contains|does_not_contain)$")

class JsonAssertionModel(BaseModel):
    path: str = Field(..., max_length=250)
    operator: str = Field("equals", pattern="^(equals|not_equals|contains|exists|not_exists|greater_than|less_than)$")
    value: Optional[Any] = None

class HttpCheckRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    method: str = Field("GET", pattern="^(GET|HEAD|POST|PUT|PATCH|OPTIONS)$")
    headers: Optional[Dict[str, str]] = None
    body: Optional[str] = Field(None, max_length=65536)
    timeout: float = Field(10.0, ge=1.0, le=30.0)
    follow_redirects: bool = True
    expected_status_codes: Optional[List[int]] = None
    monitor_type: str = Field("http", pattern="^(http|keyword|json)$")
    keyword_assertion: Optional[KeywordAssertionModel] = None
    json_assertion: Optional[JsonAssertionModel] = None

class SslCheckRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)
    port: int = Field(443, ge=1, le=65535)
    timeout: float = Field(10.0, ge=1.0, le=30.0)

class ValidateUrlRequest(BaseModel):
    url: str = Field(..., min_length=1, max_length=2048)

class WebhookTestRequest(BaseModel):
    integration_type: str = Field("discord", pattern="^(discord|slack|webhook)$")
    webhook_url: str = Field(..., min_length=1, max_length=2048)
    custom_headers: Optional[Dict[str, str]] = None
    custom_template: Optional[str] = Field(None, max_length=4000)

class WebhookSendRequest(BaseModel):
    integration_type: str = Field("discord", pattern="^(discord|slack|webhook)$")
    webhook_url: str = Field(..., min_length=1, max_length=2048)
    event: str = Field(..., max_length=100)
    data: Dict[str, Any]
    custom_headers: Optional[Dict[str, str]] = None
    custom_template: Optional[str] = Field(None, max_length=4000)
