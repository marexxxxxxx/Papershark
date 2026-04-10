import asyncio
from typing import Any, Dict
from .base import Tool


class BashTool(Tool):
    def __init__(self, timeout: int = 30):
        self.name = "bash"
        self.description = "Execute shell commands in the workspace. Use this to run programs, scripts, or system commands."
        self.timeout = timeout
        self.parameters = {
            "type": "object",
            "properties": {
                "command": {
                    "type": "string",
                    "description": "The shell command to execute",
                },
                "timeout": {
                    "type": "number",
                    "description": "Timeout in seconds (default: 30)",
                    "default": 30,
                },
                "working_dir": {
                    "type": "string",
                    "description": "Working directory (default: /agent)",
                },
            },
            "required": ["command"],
        }

    async def execute(
        self, command: str, timeout: int = None, working_dir: str = None, **kwargs
    ) -> Dict[str, Any]:
        timeout = timeout or self.timeout
        working_dir = working_dir or "/agent"

        try:
            process = await asyncio.create_subprocess_shell(
                command,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=working_dir,
            )

            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=timeout
                )
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                return {
                    "success": False,
                    "error": f"Command timed out after {timeout}s",
                }

            return {
                "success": process.returncode == 0,
                "returncode": process.returncode,
                "stdout": stdout.decode("utf-8", errors="replace"),
                "stderr": stderr.decode("utf-8", errors="replace"),
            }
        except Exception as e:
            return {"success": False, "error": str(e)}
