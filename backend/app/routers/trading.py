from fastapi import APIRouter, Depends

from app.middleware.auth import get_current_user
from app.models.user import User
from app.services.trading_service import trading_service

router = APIRouter(prefix="/trading", tags=["trading"])


@router.get("/portfolio")
async def get_portfolio(
    _user: User = Depends(get_current_user),
) -> dict:
    return trading_service.get_portfolio()
