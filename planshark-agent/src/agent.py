#!/usr/bin/env python3
import os
import json
import time
from datetime import datetime

AGENT_DIR = os.environ.get("AGENT_DIR", "/agent/config")


def load_config(filename):
    path = os.path.join(AGENT_DIR, filename)
    if os.path.exists(path):
        with open(path, "r") as f:
            return f.read()
    return ""


def save_config(filename, content):
    path = os.path.join(AGENT_DIR, filename)
    with open(path, "w") as f:
        f.write(content)


def update_heartbeat(status, message=""):
    content = f"""# Heartbeat

Status: {status}
Last Update: {datetime.now().isoformat()}
Message: {message}
"""
    save_config("heartbeat.md", content)


def main():
    print("Planshark Agent starting...")
    update_heartbeat("initializing")

    agent_md = load_config("agent.md")
    tool_md = load_config("tool.md")

    if agent_md:
        print(f"Loaded agent.md ({len(agent_md)} chars)")
    else:
        print("Warning: agent.md is empty")

    if tool_md:
        print(f"Loaded tool.md ({len(tool_md)} chars)")

    update_heartbeat("running", "Agent ready")

    print("Agent running. Press Ctrl+C to stop.")

    while True:
        time.sleep(60)
        update_heartbeat("running", "Still active")


if __name__ == "__main__":
    main()
