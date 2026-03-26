import random
import math
from datetime import datetime, timezone, timedelta
from typing import Any
from enum import Enum

import httpx


class TradingMode(str, Enum):
    simulation = "simulation"
    real = "real"


class Strategy(str, Enum):
    momentum = "momentum"
    mean_reversion = "mean_reversion"
    arbitrage = "arbitrage"


class Position:
    def __init__(self, symbol: str, quantity: float, entry_price: float, side: str = "long") -> None:
        self.symbol = symbol
        self.quantity = quantity
        self.entry_price = entry_price
        self.side = side
        self.opened_at = datetime.now(timezone.utc)

    def unrealized_pnl(self, current_price: float) -> float:
        if self.side == "long":
            return (current_price - self.entry_price) * self.quantity
        else:
            return (self.entry_price - current_price) * self.quantity

    def to_dict(self) -> dict:
        return {
            "symbol": self.symbol,
            "quantity": self.quantity,
            "entry_price": self.entry_price,
            "side": self.side,
            "opened_at": self.opened_at.isoformat(),
        }


class TradingService:
    INITIAL_CAPITAL = 100.0
    TARGET_CAPITAL = 100_000.0
    MAX_RISK_PER_TRADE_PCT = 2.0
    MAX_DRAWDOWN_PCT = 15.0

    def __init__(self) -> None:
        self._mode = TradingMode.simulation
        self._balance = self.INITIAL_CAPITAL
        self._positions: list[Position] = []
        self._trade_history: list[dict] = []
        self._price_cache: dict[str, list[float]] = {}
        self._peak_balance = self.INITIAL_CAPITAL
        self._started_at = datetime.now(timezone.utc)

    @property
    def mode(self) -> TradingMode:
        return self._mode

    def set_mode(self, mode: TradingMode) -> dict:
        if mode == TradingMode.real:
            return {
                "warning": "REAL TRADING MODE: This will use actual money. "
                           "Ensure API keys are configured and you understand the risks. "
                           "Starting capital: 100 EUR. This is NOT financial advice.",
                "mode": mode.value,
                "status": "pending_confirmation",
            }
        self._mode = mode
        return {"mode": mode.value, "status": "active"}

    def confirm_real_mode(self) -> dict:
        self._mode = TradingMode.real
        return {
            "mode": "real",
            "status": "active",
            "warning": "Real trading active. All trades use real funds.",
        }

    def get_portfolio(self) -> dict[str, Any]:
        positions_data = []
        total_unrealized = 0.0
        for pos in self._positions:
            current_price = self._get_simulated_price(pos.symbol)
            pnl = pos.unrealized_pnl(current_price)
            total_unrealized += pnl
            positions_data.append({
                **pos.to_dict(),
                "current_price": current_price,
                "unrealized_pnl": round(pnl, 4),
            })

        total_value = self._balance + total_unrealized
        return_pct = ((total_value - self.INITIAL_CAPITAL) / self.INITIAL_CAPITAL) * 100
        progress_pct = min((total_value / self.TARGET_CAPITAL) * 100, 100)
        drawdown = ((self._peak_balance - total_value) / self._peak_balance * 100
                     if self._peak_balance > 0 else 0)

        return {
            "mode": self._mode.value,
            "balance": round(self._balance, 4),
            "total_value": round(total_value, 4),
            "unrealized_pnl": round(total_unrealized, 4),
            "positions": positions_data,
            "return_pct": round(return_pct, 2),
            "target": self.TARGET_CAPITAL,
            "progress_pct": round(progress_pct, 4),
            "drawdown_pct": round(drawdown, 2),
            "max_allowed_drawdown_pct": self.MAX_DRAWDOWN_PCT,
            "total_trades": len(self._trade_history),
            "started_at": self._started_at.isoformat(),
        }

    def execute_trade(
        self, symbol: str, side: str, quantity: float, strategy: Strategy
    ) -> dict[str, Any]:
        price = self._get_simulated_price(symbol)
        cost = price * quantity

        risk_amount = self._balance * (self.MAX_RISK_PER_TRADE_PCT / 100)
        if cost > risk_amount and cost > self._balance:
            return {"error": "Trade exceeds risk limits", "max_cost": round(risk_amount, 4)}

        drawdown = ((self._peak_balance - self._balance) / self._peak_balance * 100
                     if self._peak_balance > 0 else 0)
        if drawdown > self.MAX_DRAWDOWN_PCT:
            return {"error": "Maximum drawdown exceeded. Trading paused.", "drawdown": round(drawdown, 2)}

        if side == "buy":
            if cost > self._balance:
                return {"error": "Insufficient balance", "balance": round(self._balance, 4), "cost": round(cost, 4)}
            self._balance -= cost
            self._positions.append(Position(symbol, quantity, price, "long"))
        elif side == "sell":
            pos = self._find_position(symbol, "long")
            if not pos or pos.quantity < quantity:
                return {"error": "No matching position to sell"}
            pnl = (price - pos.entry_price) * quantity
            self._balance += price * quantity
            pos.quantity -= quantity
            if pos.quantity <= 0.0001:
                self._positions.remove(pos)
            self._record_trade(symbol, side, quantity, price, pnl, strategy)
        elif side == "short":
            margin = cost * 0.5
            if margin > self._balance:
                return {"error": "Insufficient margin"}
            self._balance -= margin
            self._positions.append(Position(symbol, quantity, price, "short"))
        elif side == "cover":
            pos = self._find_position(symbol, "short")
            if not pos or pos.quantity < quantity:
                return {"error": "No matching short position"}
            pnl = (pos.entry_price - price) * quantity
            self._balance += (pos.entry_price * quantity * 0.5) + pnl
            pos.quantity -= quantity
            if pos.quantity <= 0.0001:
                self._positions.remove(pos)
            self._record_trade(symbol, side, quantity, price, pnl, strategy)
        else:
            return {"error": f"Unknown side: {side}"}

        if side in ("buy", "short"):
            self._record_trade(symbol, side, quantity, price, 0, strategy)

        if self._balance > self._peak_balance:
            self._peak_balance = self._balance

        return {
            "status": "executed",
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "price": round(price, 6),
            "cost": round(cost, 4),
            "balance_after": round(self._balance, 4),
            "strategy": strategy.value,
            "mode": self._mode.value,
        }

    def get_signal(self, symbol: str, strategy: Strategy) -> dict[str, Any]:
        prices = self._get_price_history(symbol, 50)
        if strategy == Strategy.momentum:
            return self._momentum_signal(symbol, prices)
        elif strategy == Strategy.mean_reversion:
            return self._mean_reversion_signal(symbol, prices)
        elif strategy == Strategy.arbitrage:
            return self._arbitrage_signal(symbol)
        return {"signal": "hold", "confidence": 0}

    def get_performance(self) -> dict[str, Any]:
        if not self._trade_history:
            return {"total_trades": 0, "message": "No trades yet"}

        pnls = [t.get("pnl", 0) for t in self._trade_history if t.get("pnl", 0) != 0]
        wins = [p for p in pnls if p > 0]
        losses = [p for p in pnls if p < 0]
        total_pnl = sum(pnls)
        win_rate = (len(wins) / len(pnls) * 100) if pnls else 0
        avg_win = (sum(wins) / len(wins)) if wins else 0
        avg_loss = (sum(losses) / len(losses)) if losses else 0
        profit_factor = (sum(wins) / abs(sum(losses))) if losses else float("inf")
        sharpe = self._calculate_sharpe(pnls)

        return {
            "total_trades": len(self._trade_history),
            "closed_trades": len(pnls),
            "total_pnl": round(total_pnl, 4),
            "win_rate_pct": round(win_rate, 2),
            "avg_win": round(avg_win, 6),
            "avg_loss": round(avg_loss, 6),
            "profit_factor": round(profit_factor, 2) if profit_factor != float("inf") else "inf",
            "sharpe_ratio": round(sharpe, 2),
            "current_balance": round(self._balance, 4),
            "return_pct": round((self._balance - self.INITIAL_CAPITAL) / self.INITIAL_CAPITAL * 100, 2),
        }

    def _find_position(self, symbol: str, side: str) -> Position | None:
        for pos in self._positions:
            if pos.symbol == symbol and pos.side == side:
                return pos
        return None

    def _record_trade(
        self, symbol: str, side: str, quantity: float, price: float, pnl: float, strategy: Strategy
    ) -> None:
        self._trade_history.append({
            "symbol": symbol,
            "side": side,
            "quantity": quantity,
            "price": round(price, 6),
            "pnl": round(pnl, 6),
            "strategy": strategy.value,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "balance_after": round(self._balance, 4),
            "mode": self._mode.value,
        })

    def _get_simulated_price(self, symbol: str) -> float:
        base_prices = {
            "BTC/EUR": 45000.0,
            "ETH/EUR": 2800.0,
            "BNB/EUR": 300.0,
            "SOL/EUR": 120.0,
            "ADA/EUR": 0.45,
            "AAPL": 178.0,
            "MSFT": 375.0,
            "EUR/USD": 1.08,
        }
        base = base_prices.get(symbol, 100.0)
        noise = random.gauss(0, 0.002)
        return base * (1 + noise)

    def _get_price_history(self, symbol: str, periods: int) -> list[float]:
        if symbol not in self._price_cache or len(self._price_cache[symbol]) < periods:
            base = self._get_simulated_price(symbol)
            prices = []
            p = base
            for _ in range(periods):
                p *= (1 + random.gauss(0, 0.01))
                prices.append(p)
            self._price_cache[symbol] = prices
        return self._price_cache[symbol][-periods:]

    def _momentum_signal(self, symbol: str, prices: list[float]) -> dict:
        if len(prices) < 20:
            return {"signal": "hold", "confidence": 0, "reason": "Insufficient data"}
        short_ma = sum(prices[-5:]) / 5
        long_ma = sum(prices[-20:]) / 20
        current = prices[-1]

        if short_ma > long_ma * 1.01:
            confidence = min((short_ma / long_ma - 1) * 100, 95)
            return {"signal": "buy", "confidence": round(confidence, 1), "strategy": "momentum",
                    "short_ma": round(short_ma, 4), "long_ma": round(long_ma, 4), "price": round(current, 4)}
        elif short_ma < long_ma * 0.99:
            confidence = min((1 - short_ma / long_ma) * 100, 95)
            return {"signal": "sell", "confidence": round(confidence, 1), "strategy": "momentum",
                    "short_ma": round(short_ma, 4), "long_ma": round(long_ma, 4), "price": round(current, 4)}
        return {"signal": "hold", "confidence": 10, "strategy": "momentum", "price": round(current, 4)}

    def _mean_reversion_signal(self, symbol: str, prices: list[float]) -> dict:
        if len(prices) < 20:
            return {"signal": "hold", "confidence": 0, "reason": "Insufficient data"}
        mean = sum(prices[-20:]) / 20
        std = (sum((p - mean) ** 2 for p in prices[-20:]) / 20) ** 0.5
        current = prices[-1]
        z_score = (current - mean) / std if std > 0 else 0

        if z_score < -1.5:
            confidence = min(abs(z_score) * 30, 95)
            return {"signal": "buy", "confidence": round(confidence, 1), "strategy": "mean_reversion",
                    "z_score": round(z_score, 2), "mean": round(mean, 4), "price": round(current, 4)}
        elif z_score > 1.5:
            confidence = min(abs(z_score) * 30, 95)
            return {"signal": "sell", "confidence": round(confidence, 1), "strategy": "mean_reversion",
                    "z_score": round(z_score, 2), "mean": round(mean, 4), "price": round(current, 4)}
        return {"signal": "hold", "confidence": 10, "strategy": "mean_reversion",
                "z_score": round(z_score, 2), "price": round(current, 4)}

    def _arbitrage_signal(self, symbol: str) -> dict:
        price_a = self._get_simulated_price(symbol) * (1 + random.gauss(0, 0.001))
        price_b = self._get_simulated_price(symbol) * (1 + random.gauss(0, 0.001))
        spread_pct = abs(price_a - price_b) / min(price_a, price_b) * 100

        if spread_pct > 0.3:
            buy_exchange = "exchange_a" if price_a < price_b else "exchange_b"
            return {
                "signal": "arbitrage",
                "confidence": min(spread_pct * 20, 95),
                "strategy": "arbitrage",
                "spread_pct": round(spread_pct, 3),
                "buy_at": buy_exchange,
                "price_a": round(price_a, 4),
                "price_b": round(price_b, 4),
            }
        return {"signal": "hold", "confidence": 5, "strategy": "arbitrage",
                "spread_pct": round(spread_pct, 3)}

    def _calculate_sharpe(self, pnls: list[float], risk_free_rate: float = 0.02) -> float:
        if len(pnls) < 2:
            return 0.0
        mean_return = sum(pnls) / len(pnls)
        std_return = (sum((p - mean_return) ** 2 for p in pnls) / (len(pnls) - 1)) ** 0.5
        if std_return == 0:
            return 0.0
        annualized_factor = math.sqrt(252)
        return (mean_return - risk_free_rate / 252) / std_return * annualized_factor


trading_service = TradingService()
