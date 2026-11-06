"""Release browser fixtures. All backend, auth, analytics and image traffic is intercepted."""
import asyncio, json, os
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

BASE = os.environ.get('QA_BASE_URL', 'http://localhost:8080')
USER_ID = '22222222-2222-4222-8222-222222222222'
HUB_ID = '11111111-1111-4111-8111-111111111111'
USER = {'id': USER_ID, 'email': 'fixture@example.invalid', 'aud': 'authenticated', 'role': 'authenticated', 'app_metadata': {}, 'user_metadata': {}}
PROFILE = {'id': HUB_ID, 'user_id': USER_ID, 'sales_rep_id': USER_ID, 'created_by_rep_id': USER_ID, 'username': 'fixture-coffee', 'full_name': 'Fixture Coffee', 'plan_type': None, 'subscription_status': 'pending', 'is_approved': False, 'pipeline_status': 'draft', 'show_username': True, 'background_color': '#ffffff', 'header_color': '#47783b', 'header_type': 'color', 'created_at': '2026-11-01T08:00:00Z', 'contact_enabled': False}
HUB = {'id': HUB_ID, 'kind': 'solo', 'name': 'Fixture Coffee', 'slug': 'fixture-coffee'}
UNTIL = '2026-11-04T06:00:00Z'

def report(body, historical):
    until = body.get('_until') or UNTIL
    days = body.get('_days') or 30
    since = body.get('_since') or (datetime.fromisoformat(until.replace('Z', '+00:00')) - timedelta(days=days)).isoformat()
    hub = HUB if body.get('_hub') else None
    activities = [{'key': str(n), 'at': '2026-11-03T09:00:00Z', 'hub': HUB, 'event': 'link_click', 'label': 'Menu '+str(n), 'source': 'Direct / unknown'} for n in [1, 2, 3]]
    later = body.get('_cursor_id') is not None
    return {'meta': {'since': since, 'until': until, 'asOf': until, 'timezone': 'America/Los_Angeles', 'days': days, 'coverage': 'Fixture recorded events; clicks are not outcomes.', 'firstRecordedAt': activities[0]['at'], 'source': 'historical' if historical else 'filtered'}, 'hub': hub, 'totals': {'site_views': 4, 'hub_views': 9, 'sessions': None if historical else 3, 'clicks': 3, 'saves': 0, 'events': 16, 'excluded': 2}, 'daily': [{'day': '2026-11-03', 'events': {'hub_view': 9, 'link_click': 3}}], 'events': [], 'links': [{'event_name': 'link_click', 'label': 'Menu', 'clicks': 3}], 'devices': [{'name': 'mobile', 'views': 9}], 'sources': [{'source': 'Direct / unknown', 'views': 9}], 'hubs': [{**HUB, 'events': 12, 'views': 9, 'clicks': 3, 'saves': 0, 'last_active_at': activities[0]['at']}], 'hubCount': 1, 'activityCount': 3, 'activity': activities[2:] if later else activities[:2], 'nextCursor': None if later else {'at': activities[0]['at'], 'id': '22222222-0000-4000-8000-000000000002'}}

async def main():
    async with async_playwright() as p:
        options = {'headless': True}
        if os.environ.get('QA_CHROMIUM'): options['executable_path'] = os.environ['QA_CHROMIUM']
        browser = await p.chromium.launch(**options)
        for width in [320, 360, 390, 1280]:
            context = await browser.new_context(viewport={'width': width, 'height': 1800}, accept_downloads=True)
            state = {'admin': False, 'signed_in': True, 'assigned': True, 'public_visible': False, 'rpc_mode': 'normal'}
            profile = dict(PROFILE)
            calls, writes, tracks, errors = [], [], [], []
            async def handle(route):
                req = route.request
                if req.url.startswith(BASE): return await route.continue_()
                async def reply(data, status=200):
                    await route.fulfill(status=status, content_type='application/json', body=json.dumps(data))
                url = req.url
                single = 'vnd.pgrst.object' in req.headers.get('accept', '')
                if '/auth/v1/user' in url: return await reply(USER if state['signed_in'] else {'error': 'signed out'}, 200 if state['signed_in'] else 401)
                if '/rpc/is_admin' in url: return await reply(state['admin'])
                if '/rpc/canonical_analytics_report' in url or '/rpc/historical_analytics_report' in url:
                    body = req.post_data_json; calls.append(body)
                    if state['rpc_mode'] == 'error': return await reply({'message': 'Fixture unavailable'}, 503)
                    if state['rpc_mode'] == 'slow': await asyncio.sleep(0.8)
                    data = report(body, 'historical' in url)
                    if state['rpc_mode'] == 'empty':
                        data.update({'hubs': [], 'hubCount': 0, 'activity': [], 'activityCount': 0, 'nextCursor': None})
                        data['totals'] = {k: (None if k == 'sessions' and 'historical' in url else 0) for k in data['totals']}
                    return await reply(data)
                if '/rpc/get_public_personal_profile_status' in url: return await reply([profile])
                if '/rpc/get_public_personal_profile' in url: return await reply([profile] if state['public_visible'] else [])
                if '/rpc/is_username_available' in url: return await reply(True)
                if '/rest/v1/user_roles' in url: return await reply([{'role': 'admin' if state['admin'] else 'sales_rep'}])
                if '/rest/v1/sales_reps' in url: return await reply({'id': USER_ID, 'is_active': True} if single else [{'id': USER_ID, 'is_active': True}])
                if '/rest/v1/personal_profiles' in url:
                    if req.method not in ['GET', 'HEAD']:
                        writes.append(req.post_data_json); profile.update(req.post_data_json); return await reply(None)
                    return await reply((profile if single else [profile]) if state['assigned'] else (None if single else []))
                if '/rest/v1/personal_links' in url:
                    return await reply([{'id': '33333333-3333-4333-8333-333333333333', 'profile_id': HUB_ID, 'label': 'Fixture menu', 'url': 'https://example.invalid/menu', 'link_type': 'custom', 'sort_order': 0, 'is_active': True, 'display_style': 'pill'}])
                if '/rest/v1/' in url: return await reply(None if single else [])
                if '/functions/v1/track' in url: tracks.append(req.post_data_json); return await reply({'ok': True})
                if '/functions/v1/' in url: return await reply({'ok': True})
                return await route.abort()
            await context.route('**/*', handle)
            await context.add_init_script("(() => { const u = " + json.dumps(USER) + "; localStorage.setItem('sb-xfrvckdcrqvkqdwjzopt-auth-token', JSON.stringify({access_token:'fixture',refresh_token:'fixture',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,token_type:'bearer',user:u})); })();")
            page = await context.new_page()
            page.on('pageerror', lambda e: errors.append(str(e)))
            await page.goto(BASE+'/fixture-coffee?rep_preview=1')
            await page.get_by_text('Private preview · Only authorized staff can view this draft.', exact=True).wait_for()
            await page.get_by_role('link', name='Fixture menu', exact=False).wait_for()
            assert not tracks, 'Private preview must not send analytics'
            assert not await page.get_by_text('This TapAway page is paused.', exact=True).count()
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            await page.goto(BASE+'/fixture-coffee')
            await page.get_by_text('This TapAway page is paused.', exact=True).wait_for()
            assert not await page.get_by_role('link', name='Fixture menu', exact=False).count()
            # The real dashboard must save its hero without injecting a tap-prefixed address.
            await page.goto(BASE+'/dashboard?lite=1&profile_id='+HUB_ID+'&tab=links')
            await page.get_by_role('button', name='Hero Identity', exact=True).click()
            await page.get_by_placeholder('Your name', exact=True).fill('Fixture Coffee updated')
            await page.wait_for_function("document.body.innerText.includes('Saved')")
            assert writes and all('username' not in row for row in writes)
            assert not await page.get_by_text('Please fix username issues before saving', exact=False).count()
            # Clearing a display name must persist, including after a page reload
            # and an unrelated edit. No real customer records are involved.
            async with page.expect_response(lambda r: '/rest/v1/personal_profiles' in r.url and r.request.method == 'PATCH' and r.request.post_data_json.get('full_name') == ''):
                await page.get_by_label('Display Name (optional)', exact=True).fill('')
            await page.reload()
            await page.get_by_role('button', name='Hero Identity', exact=True).click()
            assert await page.get_by_label('Display Name (optional)', exact=True).input_value() == ''
            await page.get_by_text('Leave blank to hide the name on your hub.', exact=True).wait_for()
            async with page.expect_response(lambda r: '/rest/v1/personal_profiles' in r.url and r.request.method == 'PATCH' and r.request.post_data_json.get('headline') == 'Fresh coffee daily'):
                await page.get_by_placeholder('e.g. Creator • LA • Tap to connect', exact=True).fill('Fresh coffee daily')
            assert writes[-1]['full_name'] == '' and all('username' not in row for row in writes)
            assert not await page.get_by_text('Please add your display name before saving', exact=False).count()
            # A public blank name must not turn into a username heading. Check
            # normal/avatar, full-photo banner and logo layouts independently.
            state['public_visible'] = True
            # The public RPC authorizes gifts even when Stripe status is pending
            # or expired. Its projection does not include payment_state.
            profile['is_approved'] = True
            for gift_status in ['pending', 'expired']:
                profile['subscription_status'] = gift_status
                await page.goto(BASE+'/fixture-coffee')
                await page.get_by_role('link', name='Fixture menu', exact=False).wait_for()
                assert not await page.get_by_text('This TapAway page is paused.', exact=True).count()
                assert not await page.get_by_text('Private preview · Only authorized staff can view this draft.', exact=True).count()
                await page.reload()
                await page.get_by_role('link', name='Fixture menu', exact=False).wait_for()
            state['public_visible'] = False
            await page.reload()
            await page.get_by_text('This TapAway page is paused.', exact=True).wait_for()
            assert not await page.get_by_role('link', name='Fixture menu', exact=False).count()
            state['public_visible'] = True
            profile.update({'subscription_status': 'active', 'is_approved': True, 'show_username': False, 'profile_photo_url': 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'})
            for header in ['color', 'banner', 'logo']:
                profile['header_type'] = header
                for name in ['', '   ', 'Chosen display name']:
                    profile['full_name'] = name
                    await page.goto(BASE+'/fixture-coffee?admin_preview=1')
                    await page.get_by_role('link', name='Fixture menu', exact=False).wait_for()
                    assert await page.get_by_role('heading', level=1).all_text_contents() == ([name] if name.strip() else []), (width, header, name)
                    expected_title = name if name.strip() else 'fixture-coffee'
                    await page.wait_for_function('(expected) => document.title.includes(expected)', arg=expected_title)
                    assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
                profile.update({'full_name': '', 'show_username': True})
                await page.goto(BASE+'/fixture-coffee?admin_preview=1')
                await page.get_by_text('@fixture-coffee', exact=True).wait_for()
                assert await page.get_by_role('heading', level=1).all_text_contents() == (['@fixture-coffee'] if header == 'banner' else [])
                profile['show_username'] = False
            profile.clear(); profile.update(PROFILE); state['public_visible'] = False
            # Rejected rep assignment must fall back to the normal public gate.
            state['assigned'] = False
            await page.goto(BASE+'/fixture-coffee?rep_preview=1')
            await page.get_by_text('This TapAway page is paused.', exact=True).wait_for()
            state['assigned'] = True; state['admin'] = True
            await page.goto(BASE+'/admin/analytics')
            await page.get_by_role('heading', name='Recorded activity', exact=True).wait_for()
            await page.get_by_role('heading', name='Recent activity', exact=True).wait_for()
            for days in ['7', '90', '30']:
                await page.get_by_label('Analytics date range', exact=True).select_option(days)
                await page.get_by_role('button', name='Client report', exact=True).first.wait_for()
            await page.get_by_label('Analytics data source', exact=True).select_option('historical')
            await page.get_by_text('Historical records are unfiltered and may overlap filtered activity.', exact=False).wait_for()
            await page.get_by_role('button', name='Client report', exact=True).first.click()
            dialog = page.get_by_role('dialog')
            await dialog.get_by_role('heading', name='Fixture Coffee', exact=True).wait_for()
            await dialog.get_by_text('Not recorded', exact=True).wait_for()
            async with page.expect_download() as downloaded:
                await dialog.get_by_label('Export CSV', exact=True).click()
            download = await downloaded.value
            content = Path(await download.path()).read_text()
            assert 'Menu 3' in content and 'historical' in content and 'Fixture Coffee' in content
            async with page.expect_popup() as popup_event:
                await dialog.get_by_label('Print or save PDF', exact=True).click()
            popup = await popup_event.value
            await popup.get_by_role('heading', name='Fixture Coffee', exact=True).wait_for()
            await popup.get_by_text('Menu 3', exact=False).wait_for()
            await popup.close()
            assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth')
            await page.keyboard.press('Escape')
            await page.get_by_role('button', name='Next', exact=True).click()
            await page.get_by_text('Menu 3', exact=False).wait_for()
            await page.get_by_role('button', name='Previous', exact=True).click()
            await page.get_by_text('Menu 1', exact=False).wait_for()
            state['rpc_mode'] = 'error'
            await page.get_by_label('Refresh insights', exact=True).click()
            await page.get_by_text('Insights unavailable.', exact=False).wait_for()
            state['rpc_mode'] = 'empty'
            await page.get_by_role('button', name='Retry insights', exact=True).click()
            await page.get_by_text('No recorded matching hub activity.', exact=False).wait_for()
            state['rpc_mode'] = 'slow'
            await page.get_by_label('Analytics date range', exact=True).select_option('7')
            await page.get_by_text('Loading insights…', exact=True).wait_for()
            await page.get_by_label('Analytics date range', exact=True).select_option('90')
            await page.get_by_role('button', name='Client report', exact=True).first.wait_for()
            assert await page.get_by_label('Analytics date range', exact=True).input_value() == '90'
            state['rpc_mode'] = 'normal'
            await page.get_by_role('button', name='Client report', exact=True).first.click()
            await dialog.get_by_role('heading', name='Fixture Coffee', exact=True).wait_for()
            assert not errors, errors
            shots = Path('/tmp/browser/stats-release/screenshots'); shots.mkdir(parents=True, exist_ok=True)
            await page.screenshot(path=str(shots / f'report-{width}.png'))
            print(f'PASS {width}px: pending/expired gift hubs load and reload; revoked access stays paused; optional display-name save/reload; blank/named/username-only color/banner/logo hubs; assigned rep preview, public gate, draft autosave, activity/date/source filters, full CSV/print and no overflow')
            await context.close()
        await browser.close()

asyncio.run(main())
