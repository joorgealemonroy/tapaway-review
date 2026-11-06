"""Private print-file browser regression. All external requests use local fixtures."""
import asyncio
import json
import os
from pathlib import Path
from urllib.parse import unquote, urlparse

from playwright.async_api import async_playwright

BASE = os.environ.get("QA_BASE_URL", "http://localhost:8086")
USER_ID = "22222222-2222-4222-8222-222222222222"
USER = {"id": USER_ID, "email": "fixture@example.invalid", "aud": "authenticated", "role": "authenticated", "app_metadata": {}, "user_metadata": {}}
# A valid one-page card PDF with fixed dimensions, independent of print libraries.
stream = b"BT /F1 10 Tf 15 120 Td (Original card artwork) Tj ET"
objects = [
    b"<< /Type /Catalog /Pages 2 0 R >>",
    b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    b"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 153 243] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    b"<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    b"<< /Length " + str(len(stream)).encode() + b" >>\nstream\n" + stream + b"\nendstream",
]
PDF_BYTES = b"%PDF-1.4\n"
offsets = [0]
for index, obj in enumerate(objects, 1):
    offsets.append(len(PDF_BYTES))
    PDF_BYTES += f"{index} 0 obj\n".encode() + obj + b"\nendobj\n"
xref = len(PDF_BYTES)
PDF_BYTES += b"xref\n0 6\n0000000000 65535 f \n"
PDF_BYTES += b"".join(f"{offset:010} 00000 n \n".encode() for offset in offsets[1:])
PDF_BYTES += f"trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n{xref}\n%%EOF\n".encode()

def profile(number, name, status, with_pdf=True):
    hub_id = f"11111111-1111-4111-8111-{number:012}"
    return {"id": hub_id, "user_id": USER_ID, "sales_rep_id": USER_ID, "created_by_rep_id": USER_ID,
            "username": f"fixture-{number}", "full_name": name, "plan_type": None, "subscription_status": "pending",
            "is_approved": status == "approved", "pipeline_status": status, "background_color": "#ffffff",
            "header_color": "#47783b", "header_type": "color", "created_at": "2026-11-01T08:00:00Z",
            "card_print_pdf_path": f"{hub_id}/1785310425082-Bert & Rocky's original card artwork (1).pdf" if with_pdf else None}

async def main():
    async with async_playwright() as p:
        options = {"headless": True}
        if os.environ.get("QA_CHROMIUM"):
            options["executable_path"] = os.environ["QA_CHROMIUM"]
        browser = await p.chromium.launch(**options)
        for width in [320, 390, 1280]:
            context = await browser.new_context(viewport={"width": width, "height": 1000}, accept_downloads=True)
            hubs = [profile(1, "Fixture Coffee", "ready_for_review"), profile(2, "Missing Artwork", "ready_for_review", False), profile(3, "Approved Coffee", "approved")]
            state = {"storage_error": False, "admin": True}
            signs, downloads, mutations, errors = [], [], [], []

            async def handle(route):
                req = route.request
                if req.url.startswith(BASE):
                    return await route.continue_()
                async def reply(data, status=200):
                    await route.fulfill(status=status, content_type="application/json", body=json.dumps(data))
                url = req.url
                single = "vnd.pgrst.object" in req.headers.get("accept", "")
                if "/auth/v1/user" in url:
                    return await reply(USER)
                if "/rpc/is_admin" in url:
                    return await reply(state["admin"])
                if "/storage/v1/object/" in url:
                    assert "card-print-files/" in url
                    storage_path = unquote(urlparse(url).path.split("card-print-files/", 1)[1])
                    assert storage_path in [row["card_print_pdf_path"] for row in hubs]
                    if req.method == "POST" and "/object/sign/" in url:
                        signs.append(storage_path)
                        assert req.post_data_json == {"expiresIn": 900}
                        assert req.headers.get("authorization") == "Bearer fixture"
                        if state["storage_error"]:
                            return await reply({"statusCode": "403", "message": "Fixture access denied"}, 403)
                        return await reply({"signedURL": "/object/sign/card-print-files/" + url.split("card-print-files/", 1)[1] + "?token=fixture"})
                    assert req.method == "GET"
                    if "/object/sign/" not in url:
                        downloads.append(storage_path)
                        assert req.headers.get("authorization") == "Bearer fixture"
                        if state["storage_error"]:
                            return await reply({"statusCode": "403", "message": "Fixture access denied"}, 403)
                    return await route.fulfill(content_type="application/pdf", body=PDF_BYTES)
                if "/rest/v1/personal_profiles" in url:
                    if req.method not in ["GET", "HEAD"]:
                        mutations.append(url)
                        return await reply({"message": "Unexpected write"}, 500)
                    selected = [row for row in hubs if f"id=eq.{row['id']}" in url]
                    return await reply(selected[0] if single and selected else hubs)
                if "/rest/v1/user_roles" in url:
                    return await reply([{"role": "admin" if state["admin"] else "user"}])
                if "/rest/v1/sales_reps" in url:
                    return await reply([{"id": USER_ID, "name": "Fixture Rep", "is_active": True}])
                if "/rest/v1/" in url:
                    if req.method not in ["GET", "HEAD"] and "/rpc/" not in url:
                        mutations.append(url)
                    return await reply(None if single else [])
                if "/functions/v1/" in url:
                    mutations.append(url)
                    return await reply({"message": "Unexpected function"}, 500)
                return await route.abort()

            await context.route("**/*", handle)
            await context.add_init_script("localStorage.setItem('sb-xfrvckdcrqvkqdwjzopt-auth-token', JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:" + json.dumps(USER) + "}));")
            page = await context.new_page()
            page.on("pageerror", lambda e: errors.append(str(e)))
            await page.goto(BASE + "/admin/print-queue")
            await page.get_by_role("heading", name="Fulfillment pipeline", exact=True).wait_for()
            assert urlparse(page.url).path == "/admin/fulfillment"
            file = page.get_by_role("region", name="Fixture Coffee card print file", exact=True)
            missing = page.get_by_role("region", name="Missing Artwork card print file", exact=True)
            await file.get_by_role("button", name="View PDF", exact=True).wait_for()
            await missing.get_by_text("No print PDF attached to this hub.", exact=True).wait_for()
            assert await missing.get_by_role("button").count() == 0
            assert await page.get_by_role("button", name="Approve demo", exact=True).first.is_disabled()
            assert not signs and not downloads, "Don't fetch all private PDFs when opening the queue"

            async def check_download(region, expected_name):
                async with page.expect_download() as downloaded:
                    await region.get_by_role("button", name="Download PDF", exact=True).click()
                download = await downloaded.value
                assert download.suggested_filename == expected_name
                assert Path(await download.path()).read_bytes() == PDF_BYTES, "Keep original print dimensions and bytes"

            await file.get_by_role("button", name="View PDF", exact=True).click()
            await file.get_by_role("link", name="Open PDF in new tab").wait_for()
            assert "token=fixture" in await file.locator("iframe").get_attribute("src")
            async with page.expect_popup() as popup_event:
                await file.get_by_role("link", name="Open PDF in new tab").click()
            popup = await popup_event.value
            await popup.close()
            await check_download(file, "fixture-1-print.pdf")
            assert await page.get_by_role("button", name="Approve demo", exact=True).first.is_disabled(), "PDF access must not approve or unlock the hub"
            assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            await file.get_by_role("button", name="Hide PDF", exact=True).click()

            # Permissions/storage failures stay visible and retryable.
            state["storage_error"] = True
            await file.get_by_role("button", name="View PDF", exact=True).click()
            await file.get_by_role("alert").filter(has_text="Couldn't open").wait_for()
            await file.get_by_role("button", name="Download PDF", exact=True).click()
            await file.get_by_role("alert").filter(has_text="Couldn't download").wait_for()
            state["storage_error"] = False
            await file.get_by_role("button", name="View PDF", exact=True).click()
            await file.locator("iframe").wait_for()
            await file.get_by_role("button", name="Hide PDF", exact=True).click()

            # The approval dialog has the same original file and missing-file state.
            await page.get_by_role("button", name="Preview hub", exact=True).first.click()
            dialog = page.get_by_role("dialog")
            dialog_file = dialog.get_by_role("region", name="Fixture Coffee card print file", exact=True)
            await check_download(dialog_file, "fixture-1-print.pdf")
            await dialog_file.get_by_role("button", name="View PDF", exact=True).click()
            await dialog_file.get_by_role("link", name="Open PDF in new tab").wait_for()
            assert await page.evaluate("document.documentElement.scrollWidth <= innerWidth")
            await dialog.get_by_role("button", name="I've reviewed this hub", exact=True).click()
            assert await page.get_by_role("button", name="Approve demo", exact=True).first.is_enabled()
            await page.get_by_role("button", name="Preview hub", exact=True).nth(1).click()
            await dialog.get_by_text("No print PDF attached to this hub.", exact=True).wait_for()
            await page.keyboard.press("Escape")

            # The upload stays reachable after approval and from All.
            await page.get_by_role("button", name="To print", exact=True).click()
            approved = page.get_by_role("region", name="Approved Coffee card print file", exact=True)
            await check_download(approved, "fixture-3-print.pdf")
            await page.get_by_role("button", name="All", exact=True).click()
            assert await page.get_by_role("region", name="card print file", exact=False).count() == 3
            assert not mutations, mutations
            assert not errors, errors
            shots = Path(os.environ.get("QA_SCREENSHOTS", "/tmp/tapaway-print-files"))
            shots.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(shots / f"print-files-{width}.png"), full_page=True)
            print(f"PASS {width}px: original PDF preview/download before and after approval, review dialog, missing file, private storage failures/retry, no writes or overflow")
            await context.close()
        await browser.close()

asyncio.run(main())
