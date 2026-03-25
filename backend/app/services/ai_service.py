import uuid
from datetime import datetime, timezone
from typing import Any

import httpx

from app.config import get_settings

settings = get_settings()


class AIService:
    def __init__(self) -> None:
        self._agents: dict[str, dict] = {}

    def create_agent(
        self,
        name: str,
        description: str = "",
        capabilities: list[str] | None = None,
        model: str = "gpt-4",
        system_prompt: str = "",
    ) -> dict:
        agent_id = str(uuid.uuid4())
        agent_code = self._generate_agent_code(name, description, capabilities or [], system_prompt)
        agent = {
            "id": agent_id,
            "name": name,
            "description": description,
            "capabilities": capabilities or [],
            "model": model,
            "system_prompt": system_prompt,
            "status": "active",
            "created_at": datetime.now(timezone.utc).isoformat(),
            "code": agent_code,
        }
        self._agents[agent_id] = agent
        return agent

    def list_agents(self) -> list[dict]:
        return [
            {k: v for k, v in a.items() if k != "code"}
            for a in self._agents.values()
        ]

    def get_agent(self, agent_id: str) -> dict | None:
        return self._agents.get(agent_id)

    def _generate_agent_code(
        self, name: str, description: str, capabilities: list[str], system_prompt: str
    ) -> str:
        caps_str = ", ".join(f'"{c}"' for c in capabilities)
        return f'''"""Auto-generated AI Agent: {name}
{description}
"""

AGENT_NAME = "{name}"
CAPABILITIES = [{caps_str}]
SYSTEM_PROMPT = """{system_prompt or f"You are {name}, an AI agent. {description}"}"""


async def execute(prompt: str, context: dict | None = None) -> dict:
    return {{
        "agent": AGENT_NAME,
        "prompt": prompt,
        "context": context or {{}},
        "capabilities": CAPABILITIES,
    }}
'''

    async def _call_llm(self, messages: list[dict], model: str = "gpt-4") -> dict:
        if not settings.OPENAI_API_KEY:
            return self._fallback_response(messages)

        async with httpx.AsyncClient(timeout=60.0) as client:
            try:
                response = await client.post(
                    "https://api.openai.com/v1/chat/completions",
                    headers={
                        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                        "Content-Type": "application/json",
                    },
                    json={
                        "model": model,
                        "messages": messages,
                        "temperature": 0.7,
                        "max_tokens": 4096,
                    },
                )
                response.raise_for_status()
                data = response.json()
                content = data["choices"][0]["message"]["content"]
                tokens = data.get("usage", {}).get("total_tokens", 0)
                return {"result": content, "tokens_used": tokens}
            except httpx.HTTPStatusError:
                return self._fallback_response(messages)
            except Exception:
                return self._fallback_response(messages)

    def _fallback_response(self, messages: list[dict]) -> dict:
        last_msg = messages[-1]["content"] if messages else ""
        return {
            "result": {
                "note": "AI service running in offline mode (no API key configured)",
                "input": last_msg,
                "suggestion": "Configure OPENAI_API_KEY for full AI capabilities",
            },
            "tokens_used": 0,
        }

    async def plan_task(self, prompt: str, context: dict[str, Any] | None = None) -> dict:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a task planning assistant. Break down the given task into clear, "
                    "actionable subtasks. Return a JSON object with keys: 'title', 'subtasks' "
                    "(list of {title, description, estimated_minutes}), 'total_estimated_minutes'."
                ),
            },
            {
                "role": "user",
                "content": f"Plan this task: {prompt}\n\nContext: {context or {}}",
            },
        ]
        result = await self._call_llm(messages)
        if isinstance(result["result"], str):
            try:
                import json
                result["result"] = json.loads(result["result"])
            except (json.JSONDecodeError, TypeError):
                result["result"] = {
                    "title": prompt,
                    "subtasks": [
                        {"title": "Analyze requirements", "description": prompt, "estimated_minutes": 15},
                        {"title": "Implement solution", "description": "Build the solution", "estimated_minutes": 30},
                        {"title": "Test and validate", "description": "Verify correctness", "estimated_minutes": 15},
                    ],
                    "total_estimated_minutes": 60,
                    "raw_response": result["result"],
                }
        return result

    async def generate_code(self, prompt: str, context: dict[str, Any] | None = None) -> dict:
        lang = (context or {}).get("language", "python")
        messages = [
            {
                "role": "system",
                "content": (
                    f"You are an expert {lang} programmer. Generate clean, well-documented code "
                    "based on the user's request. Include proper error handling and type hints."
                ),
            },
            {
                "role": "user",
                "content": f"{prompt}\n\nContext: {context or {}}",
            },
        ]
        return await self._call_llm(messages)

    async def research_topic(self, prompt: str, context: dict[str, Any] | None = None) -> dict:
        messages = [
            {
                "role": "system",
                "content": (
                    "You are a research assistant. Provide comprehensive, well-sourced information "
                    "on the given topic. Structure your response with: summary, key findings, "
                    "sources/references, and further reading suggestions."
                ),
            },
            {
                "role": "user",
                "content": f"Research this topic: {prompt}\n\nContext: {context or {}}",
            },
        ]
        return await self._call_llm(messages)


ai_service = AIService()
