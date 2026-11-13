"""Admin slug controls and public redirects against local, intercepted fixtures."""
import asyncio
import json
import os
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

BASE = os.environ.get("QA_BASE_URL", "http://127.0.0.1:8092")
USER = {"id": "00000000-0000-4000-8000-000000000099", "email": "fixture@example.invalid", "aud": "authenticated", "role": "authenticated", "app_metadata": {}, "user_metadata": {}}
HUB = {"id": "2a19029b-7ed9-46e4-bd6f-6416b39bf9a5", "kind": "personal", "name": "Greensleeves", "slug": "greensleevessteakhous", "is_approved": True, "payment_state": "complimentary", "subscription_status": "active", "stripe_subscription_id": None, "created_at": "2026-11-01", "views": 15, "clicks": 4, "photo_url": None}

async def main():
    async with async_playwright() as p:
        options = {"headless": True}
        if os.environ.get("QA_CHROMIUM"):
            options["executable_path"] = os.environ["QA_CHROMIUM"]
        browser = await p.chromium.launch(**options)
        for width in [320, 1280]:
            context = await browser.new_context(viewport={"width": width, "height": 900})
            await context.add_init_script("""(() => {if(location.origin !== %s) return; localStorage.setItem('sb-xfrvckdcrqvkqdwjzopt-auth-token', JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user:%s}));})();""" % (json.dumps(BASE), json.dumps(USER)))
            rows = [dict(HUB), {**HUB, "id": "00000000-0000-4000-8000-000000000020", "kind": "business", "name": "Legacy restaurant", "slug": "legacy-restaurant"}]
            state = {"admin": True}
            writes = []
            async def handle(route):
                req = route.request
                if req.url.startswith(BASE):
                    return await route.continue_()
                async def reply(data, status=200):
                    await route.fulfill(status=status, content_type="application/json", body=json.dumps(data))
                if "/auth/v1/user" in req.url: return await reply(USER)
                if "/rpc/is_admin" in req.url: return await reply(state["admin"])
                if "/rpc/admin_workspace_hubs" in req.url: return await reply(rows)
                if "/admin-billing-summary" in req.url: return await reply({"mrr_cents": 0, "active_count": 0})
                if req.method == "PATCH" and "/rest/v1/" in req.url:
                    table = urlparse(req.url).path.split("/")[-1]
                    body = req.post_data_json
                    writes.append((table, body))
                    value = body.get("username", body.get("custom_slug"))
                    if value == "taken": return await reply({"message": "This hub URL is already in use or retained for an existing card", "code": "23505"}, 409)
                    row = rows[0 if table == "personal_profiles" else 1]
                    row["slug"] = value
                    return await reply({"id": row["id"]})
                if "/rpc/get_hub_slug_redirect" in req.url: return await reply("greensleeves")
                if "/rpc/get_public_personal_profile" in req.url and req.post_data_json.get("_slug") == "greensleeves":
                    return await reply([{**HUB, "username": "greensleeves", "full_name": "", "plan_type": "solo_pro", "background_color": "#ffffff"}])
                if "/rest/v1/" in req.url: return await reply(None if "vnd.pgrst.object" in req.headers.get("accept", "") else [])
                if "/functions/v1/" in req.url: return await reply({"ok": True})
                return await route.abort()
            await context.route("**/*", handle)
            page = await context.new_page()
            errors = []
            page.on("pageerror", lambda error: errors.append(str(error)))
            await page.goto(BASE + "/admin?section=accounts")
            await page.get_by_role("button", name="Change URL", exact=True).first.click()
            await page.get_by_label("Hub URL", exact=True).fill("admin")
            await page.get_by_role("button", name="Save URL", exact=True).click()
            await page.get_by_role("alert").filter(has_text="Choose an available URL").wait_for()
            assert writes == []
            await page.get_by_label("Hub URL", exact=True).fill("taken")
            await page.get_by_role("button", name="Save URL", exact=True).click()
            await page.get_by_role("alert").filter(has_text="already in use").wait_for()
            assert rows[0]["slug"] == "greensleevessteakhous"
            await page.get_by_label("Hub URL", exact=True).fill("/greensleeves")
            assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            shots = Path(os.environ.get("QA_SCREENSHOTS", "/tmp/tapaway-slug-qa"))
            shots.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(shots / f"admin-slug-{width}.png"))
            await page.get_by_role("button", name="Save URL", exact=True).click()
            await page.get_by_role("dialog").wait_for(state="hidden")
            await page.get_by_text("tapaway.co/greensleeves", exact=True).wait_for()
            assert writes[-1] == ("personal_profiles", {"username": "greensleeves"})
            await page.get_by_role("button", name="Change URL", exact=True).nth(1).click()
            await page.get_by_label("Hub URL", exact=True).fill("restaurant-new")
            await page.get_by_role("button", name="Save URL", exact=True).click()
            await page.get_by_role("dialog").wait_for(state="hidden")
            assert writes[-1] == ("restaurants", {"custom_slug": "restaurant-new"})
            state["admin"] = False
            await page.reload()
            await page.get_by_role("heading", name="Admin access required", exact=True).wait_for()
            assert await page.get_by_role("button", name="Change URL", exact=True).count() == 0
            await page.goto(BASE + "/greensleevessteakhous?location=fixture&utm_source=card#menu")
            await page.wait_for_url(BASE + "/greensleeves?location=fixture&utm_source=card#menu")
            assert not errors, errors
            print(f"PASS {width}px: approved personal and legacy admin renames, collisions, reserved names, non-admin gate, public redirect/query/fragment, no overflow")
            await context.close()
        await browser.close()

asyncio.run(main())
