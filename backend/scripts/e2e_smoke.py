"""端到端冒烟：真实启动前后端，用 Playwright 验证登录/工作台/响应式/无障碍。

用法（需先启动后端 8000 与前端 8080）：
  backend:  $env:HEYGEM_AI_MODE='mock'; python main.py
  web:      npm run dev
  然后：    python scripts/e2e_smoke.py
"""

from __future__ import annotations

import json
import sys
import time
import urllib.request

from playwright.sync_api import sync_playwright

BASE = "http://127.0.0.1:8080"
API = "http://127.0.0.1:8000"
LABEL_EMAIL = "邮箱"
LABEL_PASSWORD = "密码"
LABEL_CONFIRM = "确认密码"
BTN_REGISTER_TAB = "注册"
BTN_SUBMIT_REGISTER = "注册并登录"

results: list[tuple[str, bool, str]] = []


def check(name: str, ok: bool, detail: str = "") -> None:
    results.append((name, ok, detail))
    print(("PASS " if ok else "FAIL ") + name + (f"  <- {detail}" if detail and not ok else ""))


def no_horizontal_scroll(page, label: str) -> None:
    overflow = page.evaluate("document.documentElement.scrollWidth - window.innerWidth")
    check(f"no-horizontal-scroll @{label}", overflow <= 1, f"overflow={overflow}px")


def wait_backend(timeout: float = 40.0) -> None:
    deadline = time.time() + timeout
    while time.time() < deadline:
        try:
            with urllib.request.urlopen(f"{API}/api/system/status", timeout=2) as resp:
                if resp.status == 200:
                    return
        except Exception:
            time.sleep(0.5)
    raise SystemExit("后端未就绪：请先启动 backend（HEYGEM_AI_MODE=mock）")


def main() -> int:
    wait_backend()
    email = f"e2e-{int(time.time())}@example.com"
    password = "strong-pass-2026"

    with sync_playwright() as p:
        browser = p.chromium.launch()
        context = browser.new_context(viewport={"width": 1440, "height": 900})
        page = context.new_page()
        console_errors: list[str] = []
        page.on("console", lambda m: console_errors.append(m.text) if m.type == "error" else None)
        page.on("pageerror", lambda e: console_errors.append(str(e)))

        # 1) 未登录访问受保护页面 → 跳登录页
        page.goto(BASE + "/", wait_until="networkidle")
        check("unauth-redirect-to-login", "/login" in page.url, page.url)
        no_horizontal_scroll(page, "login-1440")

        # 2) 切到注册并注册
        page.locator('button[role="tab"]').nth(1).click()
        page.wait_for_timeout(250)
        page.get_by_label(LABEL_EMAIL).first.fill(email)
        page.get_by_label(LABEL_PASSWORD, exact=True).first.fill(password)
        confirm = page.get_by_label(LABEL_CONFIRM)
        if confirm.count():
            confirm.first.fill(password)
        page.locator('form button[type="submit"]').first.click()
        page.wait_for_timeout(4000)
        # 首访引导可能覆盖工作台：存在则关闭（跳过）
        skip = page.locator('[aria-label="跳过"]')
        if skip.count():
            skip.first.click()
            page.wait_for_timeout(400)
        check("register-enters-workbench", "/login" not in page.url, page.url)

        # 3) 三档宽度无横向滚动
        for width, height, label in (
            (1440, 900, "home-1440"),
            (768, 1024, "home-768"),
            (390, 844, "home-390"),
        ):
            page.set_viewport_size({"width": width, "height": height})
            page.wait_for_timeout(500)
            no_horizontal_scroll(page, label)

        # 4) 各页面渲染
        page.set_viewport_size({"width": 1440, "height": 900})
        for path in ("/works", "/avatars", "/voices"):
            page.goto(BASE + path, wait_until="networkidle")
            page.wait_for_timeout(700)
            check(f"route-{path}-renders", page.locator("main").count() > 0, page.url)
            no_horizontal_scroll(page, path.strip("/") + "-1440")

        # 5) 深浅主题切换后仍无横向滚动
        page.goto(BASE + "/", wait_until="networkidle")
        theme_buttons = page.locator("button[aria-label]").all()
        if theme_buttons:
            theme_buttons[0].click()
            page.wait_for_timeout(500)
            no_horizontal_scroll(page, "home-light-1440")
            theme_buttons[0].click()

        # 6) 无障碍：图标按钮必须有 aria-label / title
        unlabeled = page.evaluate(
            """() => Array.from(document.querySelectorAll('button'))
                .filter(b => !b.innerText.trim() && !b.getAttribute('aria-label') && !b.getAttribute('title'))
                .map(b => b.outerHTML.slice(0, 90))"""
        )
        check("icon-buttons-labelled", len(unlabeled) == 0, json.dumps(unlabeled[:3], ensure_ascii=False))

        # 7) 控制台无错误
        check("no-console-errors", len(console_errors) == 0, " | ".join(console_errors[:3]))

        browser.close()

    failed = [r for r in results if not r[1]]
    print(f"\n{len(results) - len(failed)}/{len(results)} checks passed")
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())