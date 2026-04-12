#!/usr/bin/env python3
import os
import sys
import json
import asyncio
import logging
import httpx
import re
from datetime import datetime
from typing import Dict, List, Any, Optional

os.environ.setdefault("OPENAI_LOG", "warning")
logging.basicConfig(
    level=logging.WARNING, format="%(asctime)s - %(levelname)s - %(message)s"
)

AGENT_DIR = os.environ.get("AGENT_DIR", "/agent")
AGENT_ID = os.environ.get("AGENT_ID", "")
OPENAI_BASE_URL = os.environ.get("OPENAI_BASE_URL", "http://host:11434/v1")
OPENAI_API_KEY = os.environ.get("OPENAI_API_KEY", "dummy")
API_BASE_URL = os.environ.get("API_BASE_URL", "http://host:8080")
POLL_INTERVAL = int(os.environ.get("POLL_INTERVAL", "5"))
MODEL = os.environ.get("MODEL", "llama3")

DEFAULT_CONTEXT_LIMIT = 8192
TOKEN_WARNING_THRESHOLD = 0.7


def load_config(filename: str) -> str:
    path = os.path.join(AGENT_DIR, filename)
    if os.path.exists(path):
        with open(path, "r") as f:
            return f.read()
    return ""


def save_config(filename: str, content: str) -> None:
    path = os.path.join(AGENT_DIR, filename)
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        f.write(content)


def load_context() -> Optional[Dict]:
    path = os.path.join(AGENT_DIR, "context.md")
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r") as f:
            content = f.read()
        return {"content": content, "loaded_at": datetime.now().isoformat()}
    except Exception as e:
        logging.warning(f"Failed to load context: {e}")
        return None


def save_context(
    summary: str,
    todos: List[str],
    recent_messages: List[Dict] = None,
    reason: str = "checkpoint",
) -> None:
    lines = [
        "# Context",
        f"Last Update: {datetime.now().isoformat()}",
        f"Reason: {reason}",
        "",
        "## Summary",
        summary,
        "",
        "## TODOs",
    ]
    for todo in todos:
        lines.append(f"- {todo}")

    if recent_messages:
        lines.append("")
        lines.append("## Recent Messages")
        for msg in recent_messages[-10:]:
            role = msg.get("role", "unknown")
            content = msg.get("content", "")
            if len(content) > 200:
                content = content[:200] + "..."
            lines.append(f"**{role}**: {content}")

    content = "\n".join(lines)
    save_config("context.md", content)


def estimate_tokens(text: str) -> int:
    return len(text) // 4


def count_message_tokens(messages: List[Dict], system_prompt: str) -> int:
    total = estimate_tokens(system_prompt)
    for msg in messages:
        content = msg.get("content", "")
        if content:
            total += estimate_tokens(content)
        tool_calls = msg.get("tool_calls", [])
        for tc in tool_calls:
            tc_content = json.dumps(tc)
            total += estimate_tokens(tc_content)
    return total


async def detect_model_limit(llm: "LLMClient") -> int:
    model = MODEL.lower()

    known_limits = {
        "gpt-3.5-turbo": 4096,
        "gpt-4": 8192,
        "gpt-4-32k": 32768,
        "gpt-4-turbo": 128000,
        "gpt-4o": 128000,
        "llama2": 4096,
        "llama3": 8192,
        "llama3.1": 128000,
        "llama3.2": 128000,
        "mistral": 8192,
    }

    for known, limit in known_limits.items():
        if known in model:
            logging.info(f"Detected model limit: {limit} (via {known})")
            return limit

    test_prompt = "Count"
    response = await llm.chat([{"role": "user", "content": test_prompt}])
    usage = response.get("usage", {})
    prompt_tokens = usage.get("prompt_tokens", 0)

    if prompt_tokens > 0:
        limit = DEFAULT_CONTEXT_LIMIT
        logging.info(f"Could not detect model, using default limit: {limit}")
        return limit

    limit = DEFAULT_CONTEXT_LIMIT
    logging.warning(f"Could not detect model limit, using default: {limit}")
    return limit


def update_heartbeat(status: str, message: str = "") -> None:
    content = f"""# Heartbeat

Status: {status}
Last Update: {datetime.now().isoformat()}
Message: {message}
"""
    save_config("heartbeat.md", content)


class APIClient:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.session = None

    async def _get_session(self):
        if self.session is None:
            import httpx

            self.session = httpx.AsyncClient(timeout=60.0)
        return self.session

    async def get(self, path: str, params: Dict = None) -> Dict:
        session = await self._get_session()
        url = f"{self.base_url}{path}"
        try:
            resp = await session.get(url, params=params)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logging.warning(f"GET {path}: {e}")
            return {}

    async def post(self, path: str, json: Dict = None) -> Dict:
        session = await self._get_session()
        url = f"{self.base_url}{path}"
        try:
            resp = await session.post(url, json=json)
            resp.raise_for_status()
            return resp.json()
        except Exception as e:
            logging.warning(f"POST {path}: {e}")
            return {}

    async def close(self):
        if self.session:
            await self.session.aclose()
            self.session = None


class LLMClient:
    def __init__(self, base_url: str, api_key: str):
        self.base_url = base_url
        self.api_key = api_key
        self.client = None

    async def _get_client(self):
        if self.client is None:
            from openai import AsyncOpenAI

            self.client = AsyncOpenAI(base_url=self.base_url, api_key=self.api_key)
        return self.client

    async def chat(
        self, messages: List[Dict], tools: List[Dict] = None, model: str = None
    ) -> Dict:
        model = model or MODEL
        client = await self._get_client()

        kwargs = {
            "model": model,
            "messages": messages,
        }

        if tools:
            kwargs["tools"] = tools

        try:
            resp = await client.chat.completions.create(**kwargs)
            return resp.model_dump()
        except Exception as e:
            logging.error(f"LLM chat error: {e}")
            return {"choices": [{"message": {"content": f"Error: {str(e)}"}}]}

    async def close(self):
        if self.client:
            await self.client.close()
            self.client = None


class AgentRuntime:
    def __init__(self):
        self.api = APIClient(API_BASE_URL)
        self.llm = LLMClient(OPENAI_BASE_URL, OPENAI_API_KEY)
        self.tools = None
        self.running = True
        self.context_limit = DEFAULT_CONTEXT_LIMIT
        self.current_summary = "Agent started"
        self.current_todos = []
        self.messages_history = []

    def load_system_prompt(self) -> str:
        content = load_config("agent.md")
        if content:
            return content
        return "You are a helpful AI agent."

    def load_tools(self) -> List[Dict]:
        from tools import get_registry

        registry = get_registry()
        tools = registry.list()

        if tools:
            logging.info(f"Loaded {len(tools)} tools from registry")
            return tools

        tools = self.load_tools_from_md()
        if tools:
            logging.info(f"Loaded {len(tools)} tools from tool.md")
            return tools

        logging.warning("No tools available")
        return []

    def load_tools_from_md(self) -> List[Dict]:
        """Parse tool.md for JSON schema definitions"""
        path = os.path.join(AGENT_DIR, "tool.md")
        if not os.path.exists(path):
            return []

        try:
            with open(path, "r") as f:
                content = f.read()

            import re

            json_blocks = re.findall(r"```json\n({.*?})\n```", content, re.DOTALL)

            tools = []
            for block in json_blocks:
                try:
                    tool = json.loads(block)
                    if "function" in tool:
                        tools.append(tool)
                except json.JSONDecodeError:
                    continue

            return tools
        except Exception as e:
            logging.warning(f"Failed to parse tool.md: {e}")
            return []

    async def poll_tasks(self, limit: int = 5) -> List[Dict]:
        if not AGENT_ID:
            return []

        try:
            tasks = await self.api.get(
                f"/api/v1/agents/{AGENT_ID}/tasks/poll", params={"limit": limit}
            )
            return tasks if isinstance(tasks, list) else []
        except Exception as e:
            logging.warning(f"Poll error: {e}")
            return []

    async def execute_task(self, task: Dict) -> Dict:
        task_id = task.get("id", "")

        try:
            task_input = json.loads(task.get("input", "{}"))
        except json.JSONDecodeError:
            task_input = {"message": task.get("input", "")}

        message = task_input.get("message", "")

        system_prompt = self.load_system_prompt()
        tools_schema = self.load_tools()

        saved_context = load_context()
        if saved_context:
            self.current_summary = saved_context.get("content", "")[:500]
            logging.info("Loaded previous context")

        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": message},
        ]

        response = await self.llm.chat(messages, tools=tools_schema)

        usage = response.get("usage", {})
        prompt_tokens = usage.get("prompt_tokens", 0)
        completion_tokens = usage.get("completion_tokens", 0)
        total_tokens = prompt_tokens + completion_tokens

        self.messages_history.extend(messages)

        choice = response.get("choices", [{}])[0]
        assistant_message = choice.get("message", {})
        content = assistant_message.get("content", "")
        tool_calls = assistant_message.get("tool_calls", [])

        tool_results = []
        if tool_calls:
            for tc in tool_calls:
                tool_name = tc.get("function", {}).get("name", "")
                tool_args = tc.get("function", {}).get("arguments", "")

                try:
                    args = json.loads(tool_args) if tool_args else {}
                except json.JSONDecodeError:
                    args = {"raw": tool_args}

                result = await self.execute_tool_call(tool_name, args)
                tool_results.append(
                    {
                        "tool_call_id": tc.get("id", ""),
                        "tool_name": tool_name,
                        "result": result,
                    }
                )

                messages.append(
                    {"role": "assistant", "content": None, "tool_calls": [tc]}
                )
                messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.get("id", ""),
                        "content": json.dumps(result),
                    }
                )
                self.messages_history.extend([messages[-2], messages[-1]])

            if tool_results:
                final_response = await self.llm.chat(messages)
                choice = final_response.get("choices", [{}])[0]
                content = choice.get("message", {}).get("content", "")

                final_usage = final_response.get("usage", {})
                total_tokens += final_usage.get("completion_tokens", 0)
                self.messages_history.extend(
                    [
                        {"role": "assistant", "content": content},
                    ]
                )

        usage_info = f"Task {task_id}: {total_tokens} tokens"
        if total_tokens >= self.context_limit * TOKEN_WARNING_THRESHOLD:
            self.current_summary = (
                f"Task '{task_id}' completed. Output: {content[:300]}..."
            )
            self.current_todos.append(f"Check context for task {task_id}")
            save_context(
                summary=self.current_summary,
                todos=self.current_todos,
                recent_messages=self.messages_history,
                reason="70% token limit reached",
            )
            usage_info += " (context saved)"

        update_heartbeat("running", usage_info)

        return {"content": content, "tool_results": tool_results}

    async def execute_tool_call(self, tool_name: str, arguments: Dict) -> Dict:
        try:
            from tools import get_registry

            registry = get_registry()
            return await registry.execute(tool_name, "", arguments)
        except Exception as e:
            logging.error(f"Tool execution error: {e}")
            return {"success": False, "error": str(e)}

    async def report_completion(self, task_id: str, output: Dict) -> None:
        if not task_id:
            return

        try:
            await self.api.post(
                f"/api/v1/tasks/{task_id}/complete", json={"output": json.dumps(output)}
            )
        except Exception as e:
            logging.warning(f"Report completion error: {e}")

    async def run(self):
        print(f"Starting agent {AGENT_ID or 'unknown'}...")
        update_heartbeat("initializing", f"LLM: {OPENAI_BASE_URL}")

        from tools import BashTool, FileTool, HTTPTool
        from tools import register_tool

        register_tool(BashTool(timeout=60))
        register_tool(FileTool(base_dir=AGENT_DIR))
        register_tool(HTTPTool(timeout=30))

        self.context_limit = await detect_model_limit(self.llm)
        logging.info(f"Using context limit: {self.context_limit}")

        saved_context = load_context()
        if saved_context:
            logging.info("Restored previous context on startup")

        update_heartbeat(
            "running", f"Polling every {POLL_INTERVAL}s, limit: {self.context_limit}"
        )

        while self.running:
            tasks = await self.poll_tasks()

            if tasks:
                logging.info(f"Found {len(tasks)} pending tasks")
                update_heartbeat("running", f"Processing {len(tasks)} tasks")

            for task in tasks:
                task_id = task.get("id", "")
                logging.info(f"Processing task {task_id}")

                try:
                    output = await self.execute_task(task)
                    await self.report_completion(task_id, output)
                    logging.info(f"Task {task_id} completed")
                except Exception as e:
                    logging.error(f"Task {task_id} failed: {e}")
                    await self.api.post(
                        f"/api/v1/tasks/{task_id}/complete", json={"error": str(e)}
                    )

            await asyncio.sleep(POLL_INTERVAL)

    async def shutdown(self):
        self.running = False
        save_context(
            summary=self.current_summary,
            todos=self.current_todos,
            recent_messages=self.messages_history[-20:]
            if self.messages_history
            else [],
            reason="shutdown",
        )
        logging.info("Context saved on shutdown")
        await self.api.close()
        await self.llm.close()


async def main():
    runtime = AgentRuntime()
    try:
        await runtime.run()
    except KeyboardInterrupt:
        print("Shutting down...")
    finally:
        await runtime.shutdown()


if __name__ == "__main__":
    asyncio.run(main())
