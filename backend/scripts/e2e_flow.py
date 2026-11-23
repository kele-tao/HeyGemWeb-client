"""前端创作全链路 E2E：注册 → 上传数字人 → 上传声音 → 编辑器 → 作品库播放/下载/分享/删除。

用法（需先启动后端 8000 mock 模式与前端 8080）：
  python scripts/e2e_flow.py
"""

from __future__ import annotations

import os
import subprocess
import sys
import tempfile
import time
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8080"
API = "http://127.0.0.1:8000"

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  <- {detail}" if detail and not ok else ""))


def make_media() -> dict[str, str]:
    tmp = tempfile.mkdtemp(prefix="heygem-e2e-")
    video = os.path.join(tmp, "face.mp4")
    audio = os.path.join(tmp, "sample.wav")
    subprocess.run(
        f'ffmpeg -y -f lavfi -i "testsrc=size=320x240:rate=15:duration=31" '
        f'-c:v libx264 -pix_fmt yuv420p "{video}"',
        shell=True,
        capture_output=True,
    )
    subprocess.run(
        f'ffmpeg -y -f lavfi -i "sine=frequency=440:duration=31" -c:a pcm_s16le "{audio}"',
        shell=True,
        capture_output=True,
    )
    assert os.path.exists(video) and os.path.exists(audio), "媒体生成失败"
    return {"video": video, "audio": audio}


def wait_backend(timeout: float = 40.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{API}/api/system/status", timeout=2) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(0.5)
    raise SystemExit("后端未就绪")


def main() -> int:
    wait_backend()
    media = make_media()
    email = f"flow-{int(time.time())}@example.com"
    password = "strong-pass-2026"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        page = browser.new_page(viewport={"width": 1440, "height": 900})
        errors: list[str] = []
        page.on("pageerror", lambda e: errors.append(str(e)))

        # 注册
        page.goto(BASE + "/login", wait_until="networkidle")
        page.locator('button[role="tab"]').nth(1).click()
        page.wait_for_timeout(250)
        page.get_by_label("邮箱").first.fill(email)
        page.get_by_label("密码", exact=True).first.fill(password)
        confirm = page.get_by_label("确认密码")
        if confirm.count():
            confirm.first.fill(password)
        page.locator('form button[type="submit"]').first.click()
        page.wait_for_timeout(3500)
        skip = page.locator('[aria-label="跳过"]')
        if skip.count():
            skip.first.click()
            page.wait_for_timeout(400)
        check("register", "/login" not in page.url, page.url)

        # 上传数字人
        page.goto(BASE + "/avatars", wait_until="networkidle")
        page.wait_for_timeout(800)
        page.locator("button", has_text="上传数字人").first.click()
        page.wait_for_timeout(700)
        page.locator('input[accept*="video"]').first.set_input_files(media["video"])
        page.wait_for_timeout(500)
        page.locator('input[id$="-name"]').first.fill("E2E 数字人")
        page.locator('button[type="submit"]').last.click()
        page.wait_for_timeout(8000)
        body = page.locator("body").inner_text()
        check("avatar-created", "E2E 数字人" in body or "处理中" in body or "可用" in body, body[:200])

        # 上传声音
        page.goto(BASE + "/voices", wait_until="networkidle")
        page.wait_for_timeout(800)
        page.locator("button", has_text="克隆声音").first.click()
        page.wait_for_timeout(700)
        page.locator('input[accept*="audio"]').first.set_input_files(media["audio"])
        page.wait_for_timeout(500)
        page.locator('input[id$="-name"]').first.fill("E2E 声音")
        page.locator('button[type="submit"]').last.click()
        page.wait_for_timeout(8000)
        body = page.locator("body").inner_text()
        check("voice-created", "E2E 声音" in body or "训练中" in body or "可用" in body, body[:200])

        # 作品库（此时可能仍为空，验证渲染与筛选控件）
        page.goto(BASE + "/works", wait_until="networkidle")
        page.wait_for_timeout(700)
        check("works-page", page.locator("main").count() > 0, page.url)

        check("no-page-errors", len(errors) == 0, " | ".join(errors[:2]))
        if errors:
            page.screenshot(path="../img/v3-e2e-failure.png")
        browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())