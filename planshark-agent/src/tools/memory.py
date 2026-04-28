import os
import json
import logging
from typing import Any, Dict
from .base import Tool

class MemoryTool(Tool):
    def __init__(self, base_dir: str = "/agent"):
        self.name = "memory"
        self.description = "A highly efficient memory system to store and retrieve long-term context across tasks. Use this to remember user preferences, project structures, or important findings."
        self.memory_dir = os.path.join(base_dir, "memory")
        os.makedirs(self.memory_dir, exist_ok=True)

        self.parameters = {
            "type": "object",
            "properties": {
                "action": {
                    "type": "string",
                    "description": "The action to perform: 'save', 'search', or 'list'",
                    "enum": ["save", "search", "list"]
                },
                "key": {
                    "type": "string",
                    "description": "A short, descriptive key for the memory (used for 'save' and 'search')"
                },
                "content": {
                    "type": "string",
                    "description": "The information to remember (used for 'save')"
                }
            },
            "required": ["action"]
        }

    async def execute(self, action: str, key: str = None, content: str = None, **kwargs) -> Dict[str, Any]:
        try:
            if action == "save":
                if not key or not content:
                    return {"success": False, "error": "Both 'key' and 'content' are required to save a memory."}

                safe_key = "".join([c if c.isalnum() else "_" for c in key])
                file_path = os.path.join(self.memory_dir, f"{safe_key}.txt")
                with open(file_path, "w") as f:
                    f.write(content)
                return {"success": True, "message": f"Memory saved under key '{safe_key}'"}

            elif action == "search":
                if not key:
                    return {"success": False, "error": "'key' is required to search memory."}

                results = {}
                search_term = key.lower()
                for filename in os.listdir(self.memory_dir):
                    if filename.endswith(".txt"):
                        with open(os.path.join(self.memory_dir, filename), "r") as f:
                            data = f.read()
                            if search_term in filename.lower() or search_term in data.lower():
                                results[filename[:-4]] = data

                if not results:
                    return {"success": True, "message": "No matching memories found."}
                return {"success": True, "results": results}

            elif action == "list":
                memories = [f[:-4] for f in os.listdir(self.memory_dir) if f.endswith(".txt")]
                return {"success": True, "memories": memories}

            else:
                return {"success": False, "error": f"Unknown action: {action}"}

        except Exception as e:
            return {"success": False, "error": str(e)}

def setup(registry):
    registry(MemoryTool())
