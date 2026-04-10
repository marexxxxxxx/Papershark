import asyncio
import httpx
from typing import Any, Dict
from .base import Tool


class HTTPTool(Tool):
    def __init__(self, timeout: int = 30):
        self.name = "http"
        self.description = "Make HTTP requests to external APIs or URLs."
        self.timeout = timeout
        self.parameters = {
            "type": "object",
            "properties": {
                "method": {
                    "type": "string",
                    "description": "HTTP method (GET, POST, PUT, DELETE)",
                    "enum": ["GET", "POST", "PUT", "DELETE"],
                },
                "url": {"type": "string", "description": "The URL to request"},
                "headers": {"type": "object", "description": "HTTP headers (optional)"},
                "body": {
                    "type": "string",
                    "description": "Request body (for POST/PUT, optional)",
                },
            },
            "required": ["method", "url"],
        }

    async def execute(
        self, method: str, url: str, headers: Dict = None, body: str = "", **kwargs
    ) -> Dict[str, Any]:
        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                request_kwargs = {
                    "method": method,
                    "url": url,
                }

                if headers:
                    request_kwargs["headers"] = headers

                if body and method in ("POST", "PUT"):
                    request_kwargs["content"] = body.encode("utf-8")
                    request_kwargs["headers"] = request_kwargs.get("headers", {})
                    request_kwargs["headers"]["Content-Type"] = "application/json"

                response = await client.request(**request_kwargs)

                return {
                    "success": True,
                    "status_code": response.status_code,
                    "headers": dict(response.headers),
                    "body": response.text[:10000],
                }
        except Exception as e:
            return {"success": False, "error": str(e)}
