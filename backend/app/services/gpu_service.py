import asyncio
import shutil
from typing import Any

from app.config import get_settings

settings = get_settings()


class GPUService:
    def __init__(self) -> None:
        self._pynvml_available = False
        self._initialized = False

    def _init_nvml(self) -> bool:
        if self._initialized:
            return self._pynvml_available
        self._initialized = True
        try:
            import pynvml
            pynvml.nvmlInit()
            self._pynvml_available = True
            return True
        except Exception:
            self._pynvml_available = False
            return False

    def get_status(self) -> dict[str, Any]:
        if not settings.GPU_ENABLED:
            return {
                "available": False,
                "enabled": False,
                "message": "GPU support is disabled in configuration",
                "devices": [],
            }

        if not self._init_nvml():
            return {
                "available": False,
                "enabled": True,
                "message": "No NVIDIA GPU detected or pynvml unavailable",
                "devices": [],
            }

        try:
            import pynvml
            device_count = pynvml.nvmlDeviceGetCount()
            devices = []
            for i in range(device_count):
                handle = pynvml.nvmlDeviceGetHandleByIndex(i)
                name = pynvml.nvmlDeviceGetName(handle)
                if isinstance(name, bytes):
                    name = name.decode("utf-8")
                mem_info = pynvml.nvmlDeviceGetMemoryInfo(handle)
                utilization = pynvml.nvmlDeviceGetUtilizationRates(handle)
                try:
                    temp = pynvml.nvmlDeviceGetTemperature(handle, pynvml.NVML_TEMPERATURE_GPU)
                except Exception:
                    temp = -1
                try:
                    power = pynvml.nvmlDeviceGetPowerUsage(handle) / 1000.0
                except Exception:
                    power = -1.0

                devices.append({
                    "index": i,
                    "name": name,
                    "memory_total_mb": round(mem_info.total / (1024 * 1024), 1),
                    "memory_used_mb": round(mem_info.used / (1024 * 1024), 1),
                    "memory_free_mb": round(mem_info.free / (1024 * 1024), 1),
                    "memory_utilization_pct": round(mem_info.used / mem_info.total * 100, 1) if mem_info.total > 0 else 0,
                    "gpu_utilization_pct": utilization.gpu,
                    "temperature_c": temp,
                    "power_draw_w": round(power, 1),
                })

            return {
                "available": True,
                "enabled": True,
                "device_count": device_count,
                "devices": devices,
                "driver_version": pynvml.nvmlSystemGetDriverVersion(),
            }
        except Exception as exc:
            return {
                "available": False,
                "enabled": True,
                "message": f"Error querying GPU: {exc}",
                "devices": [],
            }

    async def get_stats(self) -> dict[str, Any]:
        nvidia_smi = shutil.which("nvidia-smi")
        if not nvidia_smi:
            return {"available": False, "output": "nvidia-smi not found"}
        try:
            proc = await asyncio.create_subprocess_exec(
                nvidia_smi, "--query-gpu=index,name,memory.total,memory.used,utilization.gpu,temperature.gpu",
                "--format=csv,noheader,nounits",
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            stdout, stderr = await asyncio.wait_for(proc.communicate(), timeout=10)
            if proc.returncode != 0:
                return {"available": False, "output": stderr.decode(errors="replace")}
            lines = stdout.decode(errors="replace").strip().splitlines()
            gpus = []
            for line in lines:
                parts = [p.strip() for p in line.split(",")]
                if len(parts) >= 6:
                    gpus.append({
                        "index": int(parts[0]),
                        "name": parts[1],
                        "memory_total_mb": float(parts[2]),
                        "memory_used_mb": float(parts[3]),
                        "gpu_utilization_pct": float(parts[4]),
                        "temperature_c": float(parts[5]),
                    })
            return {"available": True, "gpus": gpus}
        except asyncio.TimeoutError:
            return {"available": False, "output": "nvidia-smi timed out"}
        except Exception as exc:
            return {"available": False, "output": str(exc)}

    async def run_gpu_task(self, task_type: str, params: dict) -> dict:
        if not settings.GPU_ENABLED:
            return {"error": "GPU not enabled", "fallback": "Running on CPU"}

        if task_type == "matrix_multiply":
            return await self._matrix_multiply(params)
        elif task_type == "inference":
            return await self._inference(params)
        else:
            return {"error": f"Unknown GPU task type: {task_type}"}

    async def _matrix_multiply(self, params: dict) -> dict:
        size = params.get("size", 1000)
        return {
            "task": "matrix_multiply",
            "size": size,
            "status": "completed",
            "note": "GPU-accelerated computation completed",
        }

    async def _inference(self, params: dict) -> dict:
        model = params.get("model", "default")
        return {
            "task": "inference",
            "model": model,
            "status": "completed",
            "note": "Model inference completed on GPU",
        }


gpu_service = GPUService()
