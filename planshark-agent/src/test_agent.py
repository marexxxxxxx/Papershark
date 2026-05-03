import pytest
import os
import sys

# Ensure src is in path
sys.path.insert(0, os.path.abspath(os.path.dirname(__file__)))

from tools.registry import ToolRegistry
from tools.base import Tool, ToolResult

class DummyTool(Tool):
    name = "dummy"
    description = "Dummy tool"
    parameters = {"type": "object", "properties": {}}

    async def execute(self, **kwargs) -> ToolResult:
        return ToolResult(success=True, result="dummy success")

@pytest.mark.asyncio
async def test_tool_registry():
    registry = ToolRegistry()
    dummy = DummyTool()
    registry.register(dummy)

    tools = registry.list()
    assert len(tools) == 1, "Should have registered one tool"

    tool = registry.get("dummy")
    assert tool is not None, "Tool should exist"
    assert tool.name == "dummy"

    result = await registry.execute("dummy", "task-123", {})
    assert result["success"] == True
    assert result["result"] == "dummy success"


@pytest.mark.asyncio
async def test_tool_result():
    res1 = ToolResult(success=True, result="hello")
    assert res1.to_dict() == {"success": True, "result": "hello"}

    res2 = ToolResult(success=False, error="bad")
    assert res2.to_dict() == {"success": False, "error": "bad"}
