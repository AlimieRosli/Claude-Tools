#!/usr/bin/env python3
"""gen-image.py — generate images via the OpenRouter Images API (stdlib only).

Reads OPENROUTER_API_KEY from the environment or ~/.openrouter.key.

Model chain (first available wins):
    1. black-forest-labs/flux.2-pro        (+ hyphen variant flux-2-pro)
    2. black-forest-labs/flux.2-klein-4b   (+ hyphen variant)
    3. meta/muse-image
    4. bytedance-seed/seedream-5-0-lite
Model-specific errors (404 / model-not-found) advance the chain; transient
errors (429/5xx/network) retry the same model.

Usage:
    python tools/gen-image.py "a holographic kanban board in space" --aspect 16:9
    python tools/gen-image.py "..." --model meta/muse-image   # pin one model
"""

import argparse
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime
from pathlib import Path

ENDPOINT = "https://openrouter.ai/api/v1/images/generations"
MODEL_CHAIN = [
    "black-forest-labs/flux.2-pro",
    "black-forest-labs/flux-2-pro",       # hyphen spelling used previously
    "black-forest-labs/flux.2-klein-4b",
    "black-forest-labs/flux-2-klein-4b",
    "meta/muse-image",
    "bytedance-seed/seedream-5-0-lite",
]
RETRY_STATUSES = {429, 500, 502, 503, 504}   # transient -> retry same model
RETRIES = 3
BACKOFF_S = 2.0


def size_for_aspect(ratio: str) -> str:
    if not ratio or ":" not in ratio:
        return "auto"
    try:
        w, h = (int(x) for x in ratio.split(":", 1))
    except ValueError:
        return "auto"
    if w <= 0 or h <= 0:
        return "auto"
    if w == h:
        return "1024x1024"
    return "1536x1024" if w > h else "1024x1536"


def http_post(url: str, payload: dict, api_key: str, timeout: int):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode("utf-8"),
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "https://github.com/AlimieRosli/Claude-Tools",
            "X-Title": "Claude-Tools gen-image",
        },
        method="POST",
    )
    return urllib.request.urlopen(req, timeout=timeout)


def api_error_detail(exc: urllib.error.HTTPError) -> str:
    try:
        body = json.loads(exc.read().decode("utf-8"))
        return body.get("error", {}).get("message") or str(body)
    except Exception:
        return f"HTTP {exc.code}"


def is_model_error(code: int, detail: str) -> bool:
    """True when the failure is about the model itself (advance the chain)."""
    if code == 404:
        return True
    low = detail.lower()
    return code == 400 and any(
        s in low for s in ("no model found", "no endpoints", "not a valid model",
                           "unknown model", "invalid model", "not supported", "unsupported")
    )


class ModelUnavailable(RuntimeError):
    pass


def generate_one(model: str, prompt: str, aspect: str, api_key: str, timeout: int) -> dict:
    """Try a single model; raise ModelUnavailable to move down the chain."""
    size = size_for_aspect(aspect)
    payload = {"model": model, "prompt": prompt, "n": 1,
               "response_format": "b64_json", "size": size}
    last_err = None
    for attempt in range(1, RETRIES + 1):
        try:
            with http_post(ENDPOINT, payload, api_key, timeout) as resp:
                return json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            detail = api_error_detail(exc)
            if is_model_error(exc.code, detail):
                raise ModelUnavailable(f"{model}: {detail}") from exc
            if exc.code == 400 and "size" in detail.lower() and payload.get("size"):
                payload.pop("size")  # model may not support explicit sizes
                last_err = detail
                continue
            if exc.code in RETRY_STATUSES and attempt < RETRIES:
                wait = BACKOFF_S * (2 ** (attempt - 1))
                print(f"  attempt {attempt} failed ({detail}); retrying in {wait:.0f}s", file=sys.stderr)
                time.sleep(wait)
                continue
            raise ModelUnavailable(f"{model}: {detail}") from exc
        except (urllib.error.URLError, TimeoutError) as exc:
            last_err = str(exc)
            if attempt < RETRIES:
                time.sleep(BACKOFF_S * (2 ** (attempt - 1)))
                continue
            raise ModelUnavailable(f"{model}: network failure after {RETRIES} attempts: {last_err}") from exc
    raise ModelUnavailable(f"{model}: {last_err or 'generation failed'}")


def generate(prompt: str, aspect: str, api_key: str, timeout: int, chain: list) -> tuple:
    """Walk the model chain; return (result, model_that_served)."""
    failures = []
    for model in chain:
        print(f"trying model: {model}", flush=True)
        try:
            return generate_one(model, prompt, aspect, api_key, timeout), model
        except ModelUnavailable as exc:
            print(f"  unavailable: {exc}", file=sys.stderr)
            failures.append(str(exc))
    raise RuntimeError("all models in chain failed:\n  " + "\n  ".join(failures))


def extract_image_bytes(item: dict, timeout: int) -> bytes:
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        with urllib.request.urlopen(item["url"], timeout=timeout) as resp:
            return resp.read()
    raise RuntimeError("response contained no image data (neither b64_json nor url)")


def main() -> int:
    parser = argparse.ArgumentParser(description="Generate an image via OpenRouter.")
    parser.add_argument("prompt", help="text prompt for the image")
    parser.add_argument("--model", default=None, help="pin one OpenRouter model slug (default: walk the preferred chain)")
    parser.add_argument("--aspect", default="16:9", help="aspect ratio like 16:9, 1:1, 9:16 (default 16:9)")
    parser.add_argument("--out", default=None, help="output directory (default <repo>/assets/images)")
    parser.add_argument("--name", default=None, help="output filename without extension")
    parser.add_argument("--timeout", type=int, default=240, help="per-request timeout in seconds (default 240)")
    parser.add_argument("--keyfile", default=None, help="file containing the OpenRouter key (default ~/.openrouter.key)")
    args = parser.parse_args()

    key_file = Path(args.keyfile) if args.keyfile else Path.home() / ".openrouter.key"
    api_key = os.environ.get("OPENROUTER_API_KEY") or (
        key_file.read_text(encoding="utf-8").strip() if key_file.is_file() else ""
    )
    if not api_key:
        print("error: no API key found", file=sys.stderr)
        print(f"hint: put your key in {key_file}, or export OPENROUTER_API_KEY in this shell", file=sys.stderr)
        return 1

    print(f"aspect:  {args.aspect} -> {size_for_aspect(args.aspect)}")
    chain = [args.model] if args.model else MODEL_CHAIN
    print("generating ...", flush=True)
    started = time.monotonic()
    try:
        result, served_model = generate(args.prompt, args.aspect, api_key, args.timeout, chain)
    except RuntimeError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    elapsed = time.monotonic() - started

    data = result.get("data") or []
    if not data:
        print(f"error: no data array in response: {json.dumps(result)[:300]}", file=sys.stderr)
        return 1

    image_bytes = extract_image_bytes(data[0], args.timeout)

    out_dir = Path(args.out) if args.out else Path(__file__).resolve().parent.parent / "assets" / "images"
    out_dir.mkdir(parents=True, exist_ok=True)
    stem = args.name or f"{served_model.split('/')[-1]}-{datetime.now():%Y%m%d-%H%M%S}"
    out_path = out_dir / f"{stem}.png"
    out_path.write_bytes(image_bytes)

    usage = result.get("usage") or {}
    cost = usage.get("cost")
    cost_txt = f", cost ${cost:.4f}" if isinstance(cost, (int, float)) else ""
    print(f"model:   {served_model}")
    print(f"saved:   {out_path} ({len(image_bytes) / 1024:.0f} KiB, {elapsed:.1f}s{cost_txt})")
    return 0


if __name__ == "__main__":
    sys.exit(main())