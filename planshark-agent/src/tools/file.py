import os
from typing import Any, Dict
from .base import Tool


class FileTool(Tool):
    def __init__(self, base_dir: str = "/agent"):
        self.name = "file"
        self.description = "Read, write, or list files in the workspace."
        self.base_dir = base_dir
        self.parameters = {
            "type": "object",
            "properties": {
                "operation": {
                    "type": "string",
                    "description": "Operation: read, write, list, delete, exists",
                    "enum": ["read", "write", "list", "delete", "exists"],
                },
                "path": {
                    "type": "string",
                    "description": "File or directory path (relative to workspace)",
                },
                "content": {
                    "type": "string",
                    "description": "Content to write (for write operation)",
                },
            },
            "required": ["operation", "path"],
        }

    def _resolve_path(self, path: str) -> str:
        if os.path.isabs(path):
            return path
        return os.path.join(self.base_dir, path)

    async def execute(
        self, operation: str, path: str, content: str = "", **kwargs
    ) -> Dict[str, Any]:
        resolved = self._resolve_path(path)

        if operation == "read":
            return await self._read(resolved)
        elif operation == "write":
            return await self._write(resolved, content)
        elif operation == "list":
            return await self._list(resolved)
        elif operation == "delete":
            return await self._delete(resolved)
        elif operation == "exists":
            return await self._exists(resolved)
        else:
            return {"success": False, "error": f"Unknown operation: {operation}"}

    async def _read(self, path: str) -> Dict[str, Any]:
        try:
            if not os.path.exists(path):
                return {"success": False, "error": f"File not found: {path}"}
            if os.path.isdir(path):
                return {"success": False, "error": f"Path is a directory: {path}"}
            with open(path, "r") as f:
                content = f.read()
            return {"success": True, "content": content}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _write(self, path: str, content: str) -> Dict[str, Any]:
        try:
            os.makedirs(os.path.dirname(path), exist_ok=True)
            with open(path, "w") as f:
                f.write(content)
            return {"success": True, "path": path}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _list(self, path: str) -> Dict[str, Any]:
        try:
            if not os.path.exists(path):
                return {"success": False, "error": f"Directory not found: {path}"}
            if not os.path.isdir(path):
                return {"success": False, "error": f"Path is not a directory: {path}"}
            entries = os.listdir(path)
            return {"success": True, "entries": entries}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _delete(self, path: str) -> Dict[str, Any]:
        try:
            if not os.path.exists(path):
                return {"success": False, "error": f"Path not found: {path}"}
            if os.path.isdir(path):
                os.rmdir(path)
            else:
                os.remove(path)
            return {"success": True}
        except Exception as e:
            return {"success": False, "error": str(e)}

    async def _exists(self, path: str) -> Dict[str, Any]:
        exists = os.path.exists(path)
        return {"success": True, "exists": exists}
