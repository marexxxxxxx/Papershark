# OpenClaw Integration Roadmap for Planshark

## Phase 1: Functional Workspace & Agent Awareness
*   **Goal:** Provide the agent with default instructions and awareness of its Docker sandbox environment, and ensure the frontend exposes this capability.
*   **Tasks:**
    *   Update `agent.md` (default template) to explicitly inform the agent about its Linux sandbox environment, available tools (Bash, File, HTTP), and how to use them to solve coding tasks autonomously.
    *   Ensure the dashboard UI correctly displays agent task progress and tool executions.

## Phase 2: OpenClaw Skills Integration
*   **Goal:** Allow the agent to load and use "skills" (Python functions/tools) that are compatible with OpenClaw.
*   **Tasks:**
    *   Design a skill registry system within the `planshark-agent` to dynamically load Python modules from a `skills/` directory.
    *   Create an adapter layer if necessary to make OpenClaw-style skills work with the Planshark tool registry format.
    *   Update the Docker container to mount or support a `skills/` directory per agent.

## Phase 3: Skill Management UI
*   **Goal:** Provide a frontend overview to manage installed skills for each agent.
*   **Tasks:**
    *   Add an API endpoint in `planshark-core` to list, enable, and disable skills for a specific agent.
    *   Add a "Skills" tab in the Agent Details view in `planshark-dashboard`.
    *   Allow toggling skills on/off, which updates the agent's active tool list.

## Phase 4: High-Efficiency Memory System
*   **Goal:** Implement a functional memory system for agents to retain context across sessions and tasks.
*   **Tasks:**
    *   Enhance the current `agent.py` context saving mechanism.
    *   Implement an embedding-based or hierarchical memory system (e.g., using a local vector store like ChromaDB or simply structured JSON logs with summarization) within the agent sandbox.
    *   Inject relevant memory snippets into the agent's context during task execution.

## Phase 5: Testing and Verification
*   **Goal:** Ensure end-to-end functionality of all new features.
*   **Tasks:**
    *   Run comprehensive tests on the agent's ability to use skills.
    *   Verify memory retention over multiple simulated tasks.
    *   Verify UI interactions for skill management.
