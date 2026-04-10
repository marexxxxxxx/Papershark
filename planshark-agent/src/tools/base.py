from abc import ABC, abstractmethod
from typing import Any, Dict, Optional
import json


class Tool(ABC):
    name: str = ""
    description: str = ""
    parameters: Dict[str, Any] = {}

    @abstractmethod
    async def execute(self, **kwargs) -> Dict[str, Any]:
        pass

    def validate(self, **kwargs) -> bool:
        required = self.parameters.get("required", [])
        for field in required:
            if field not in kwargs:
                return False
        return True

    def to_openai_schema(self) -> Dict[str, Any]:
        return {
            "type": "function",
            "function": {
                "name": self.name,
                "description": self.description,
                "parameters": self.parameters,
            },
        }


class ToolResult:
    def __init__(self, success: bool, result: Any = None, error: str = ""):
        self.success = success
        self.result = result
        self.error = error

    def to_dict(self) -> Dict[str, Any]:
        if self.success:
            return {"success": True, "result": self.result}
        return {"success": False, "error": self.error}

    def to_json(self) -> str:
        return json.dumps(self.to_dict())
