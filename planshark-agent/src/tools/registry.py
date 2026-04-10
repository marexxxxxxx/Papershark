from typing import Dict, List, Optional, Any
import json
import asyncio
from .base import Tool, ToolResult


class ToolRegistry:
    def __init__(self):
        self._tools: Dict[str, Tool] = {}

    def register(self, tool: Tool) -> None:
        if not tool.name:
            raise ValueError("Tool must have a name")
        self._tools[tool.name] = tool

    def get(self, name: str) -> Optional[Tool]:
        return self._tools.get(name)

    def list(self) -> List[Dict[str, Any]]:
        return [tool.to_openai_schema() for tool in self._tools.values()]

    def list_simple(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": tool.name,
                "description": tool.description,
                "parameters": tool.parameters,
            }
            for tool in self._tools.values()
        ]

    async def execute(
        self, tool_name: str, task_id: str, arguments: Dict[str, Any]
    ) -> Dict[str, Any]:
        tool = self.get(tool_name)
        if not tool:
            return {"success": False, "error": f"Tool '{tool_name}' not found"}

        if not tool.validate(**arguments):
            return {"success": False, "error": "Invalid arguments"}

        try:
            result = await tool.execute(**arguments)
            if isinstance(result, dict):
                return result
            return (
                result.to_dict()
                if hasattr(result, "to_dict")
                else {"result": str(result)}
            )
        except Exception as e:
            return {"success": False, "error": str(e)}


_registry: Optional[ToolRegistry] = None


def get_registry() -> ToolRegistry:
    global _registry
    if _registry is None:
        _registry = ToolRegistry()
    return _registry


def register_tool(tool: Tool) -> None:
    get_registry().register(tool)
