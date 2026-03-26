from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from typing import Any

from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.ai_service import ai_service
from app.services.gpu_service import gpu_service

router = APIRouter(prefix="/ai", tags=["ai"])


class AgentCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    description: str = ""
    capabilities: list[str] = []
    model: str = "gpt-4"
    system_prompt: str = ""


class AgentResponse(BaseModel):
    id: str
    name: str
    description: str
    capabilities: list[str]
    model: str
    status: str
    created_at: str


class ExecuteRequest(BaseModel):
    agent_id: str | None = None
    prompt: str = Field(..., min_length=1)
    context: dict[str, Any] = {}
    mode: str = "plan"  # plan, generate, research


class ExecuteResponse(BaseModel):
    result: Any
    agent_id: str | None
    mode: str
    tokens_used: int


@router.post("/agents", response_model=AgentResponse)
async def create_agent(
    body: AgentCreate,
    _user: User = Depends(get_current_user),
) -> AgentResponse:
    agent = ai_service.create_agent(
        name=body.name,
        description=body.description,
        capabilities=body.capabilities,
        model=body.model,
        system_prompt=body.system_prompt,
    )
    return agent


@router.get("/agents", response_model=list[AgentResponse])
async def list_agents(
    _user: User = Depends(get_current_user),
) -> list[AgentResponse]:
    return ai_service.list_agents()


@router.post("/execute", response_model=ExecuteResponse)
async def execute_ai_task(
    body: ExecuteRequest,
    _user: User = Depends(get_current_user),
) -> ExecuteResponse:
    if body.mode == "plan":
        result = await ai_service.plan_task(body.prompt, body.context)
    elif body.mode == "generate":
        result = await ai_service.generate_code(body.prompt, body.context)
    elif body.mode == "research":
        result = await ai_service.research_topic(body.prompt, body.context)
    else:
        raise HTTPException(status_code=400, detail=f"Unknown mode: {body.mode}")

    return ExecuteResponse(
        result=result["result"],
        agent_id=body.agent_id,
        mode=body.mode,
        tokens_used=result.get("tokens_used", 0),
    )


@router.get("/gpu-status")
async def get_gpu_status(
    _user: User = Depends(get_current_user),
) -> dict:
    return gpu_service.get_status()
