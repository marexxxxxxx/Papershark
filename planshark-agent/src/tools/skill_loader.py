import os
import sys
import importlib.util
import inspect
import logging
from typing import List, Optional
from .registry import register_tool, get_registry
from .base import Tool
import requests

def load_skills(skills_dir: str, enabled_skills: Optional[List[str]] = None, api_base_url: str = None, agent_id: str = None):
    if not os.path.exists(skills_dir):
        logging.info(f"Skills directory {skills_dir} not found. Skipping.")
        return

    sys.path.insert(0, skills_dir)
    discovered_skills = []

    for filename in os.listdir(skills_dir):
        if filename.endswith(".py") and not filename.startswith("__"):
            module_name = filename[:-3]
            file_path = os.path.join(skills_dir, filename)
            discovered_skills.append(module_name)

            # If enabled_skills list is provided and this module isn't in it, skip registration
            if enabled_skills is not None and module_name not in enabled_skills:
                logging.info(f"Skill '{module_name}' is disabled. Skipping registration.")
                continue

            try:
                spec = importlib.util.spec_from_file_location(module_name, file_path)
                module = importlib.util.module_from_spec(spec)
                spec.loader.exec_module(module)

                # Check for setup function
                if hasattr(module, 'setup'):
                    module.setup(register_tool)
                    logging.info(f"Loaded skill module: {module_name} via setup()")
                else:
                    # Look for Tool classes
                    loaded_tools = 0
                    for name, obj in inspect.getmembers(module):
                        if inspect.isclass(obj) and issubclass(obj, Tool) and obj != Tool:
                            try:
                                tool_instance = obj()
                                register_tool(tool_instance)
                                loaded_tools += 1
                                logging.info(f"Registered tool {tool_instance.name} from {module_name}")
                            except Exception as e:
                                logging.error(f"Error instantiating {name} in {module_name}: {e}")
                    if loaded_tools == 0:
                        logging.warning(f"Module {module_name} has no setup() and no Tool classes.")
            except Exception as e:
                logging.error(f"Failed to load skill module {module_name}: {e}")

    sys.path.pop(0)

    # Sync discovered skills back to backend so UI knows they exist
    if api_base_url and agent_id and discovered_skills:
        try:
            # We fetch the current DB state first
            skills_resp = requests.get(f"{api_base_url}/api/v1/agents/{agent_id}/skills")
            if skills_resp.status_code == 200:
                current_db_skills = {s["skill_name"]: s["is_enabled"] for s in skills_resp.json()}

                # If a discovered skill is not in DB, tell backend it's available (default disabled or enabled, let's say disabled so user opts in)
                for ds in discovered_skills:
                    if ds not in current_db_skills:
                        logging.info(f"Syncing newly discovered skill '{ds}' to backend")
                        requests.put(f"{api_base_url}/api/v1/agents/{agent_id}/skills/{ds}", json={"is_enabled": False})
                        # Also register it for this first run if we want it enabled by default?
                        # Let's say user must enable it from UI first to be safe, so we did right by skipping it above (it wasn't in enabled_skills).
        except Exception as e:
            logging.error(f"Failed to sync discovered skills to backend: {e}")
