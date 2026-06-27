import asyncio
import json
import os
import subprocess
import sys
import traceback

from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

# Load backend/.env explicitly by path — load_dotenv() with no args searches
# from the process's current working directory, which depends on how/where
# uvicorn was launched from and isn't reliable.
load_dotenv(os.path.join(os.path.dirname(os.path.abspath(__file__)), '.env'))

app = FastAPI(title="Trust Guard Scraper", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

_HERE = os.path.dirname(os.path.abspath(__file__))
_WORKER = os.path.join(_HERE, "scrape_worker.py")


def _run_scraper_blocking(url: str) -> dict:
    """
    Run scrape_worker.py in a subprocess via the plain `subprocess` module
    (not asyncio's subprocess transport). uvicorn forces
    WindowsSelectorEventLoopPolicy on Windows, which makes
    asyncio.create_subprocess_exec raise a bare NotImplementedError — this
    blocking call (dispatched to a thread, see _run_scraper) sidesteps that
    entirely.
    """
    env = {**os.environ, "PYTHONIOENCODING": "utf-8"}
    try:
        proc = subprocess.run(
            [sys.executable, _WORKER, url],
            capture_output=True,
            env=env,
            cwd=_HERE,
            timeout=60,
        )
    except subprocess.TimeoutExpired:
        raise TimeoutError("Scraper timed out after 60s")

    if proc.stderr:
        print(f"[worker stderr]\n{proc.stderr.decode('utf-8', errors='replace')}", flush=True)

    raw = proc.stdout.decode("utf-8", errors="replace").strip()
    if not raw:
        raise RuntimeError("Worker produced no output")

    data = json.loads(raw)
    if "error" in data:
        raise RuntimeError(data["error"])
    return data


async def _run_scraper(url: str) -> dict:
    loop = asyncio.get_event_loop()
    return await loop.run_in_executor(None, _run_scraper_blocking, url)


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/scrape")
async def scrape(url: str = Query(..., description="Product page URL to scrape")):
    try:
        return await _run_scraper(url)
    except TimeoutError:
        raise HTTPException(status_code=504, detail="Scraper timed out after 60s")
    except Exception as e:
        detail = str(e) or traceback.format_exc().strip().splitlines()[-1]
        raise HTTPException(status_code=502, detail=detail)
