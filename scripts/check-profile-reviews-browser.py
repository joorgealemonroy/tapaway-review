"""Offline hub behavior checks. All remote traffic is intercepted; no live reviews."""
import asyncio
import copy
import json
import os
import shutil
from pathlib import Path
from urllib.parse import urlparse
from playwright.async_api import async_playwright

BASE = os.environ.get('QA_BASE_URL', 'http://127.0.0.1:8083')
SNAPSHOT = Path(os.environ['QA_HUB_SNAPSHOT']) if os.environ.get('QA_HUB_SNAPSHOT') else None
OUTPUT = Path(os.environ.get('QA_OUTPUT', '/tmp/tapaway-review-qa'))
ROOT = Path(__file__).resolve().parents[1]
PID = '45f38528-6c08-4d86-a095-54e1cdef73d9'


def fixture():
    data = json.loads(SNAPSHOT.read_text()) if SNAPSHOT else {
        'profile': {'id': PID, 'username': 'avmeals', 'full_name': 'A.V. Meal Preps',
            'profile_photo_url': '/avmeals/avm-logo-transparent.png', 'header_type': 'logo',
            'background_color': '#ffffff', 'logo_bg_color': '#ffffff', 'logo_scale': 'sm',
            'text_color': '#15251b', 'button_theme': '#005b32', 'show_username': False,
            'plan_type': 'solo_pro', 'is_approved': True, 'subscription_status': 'active',
            'headline': '', 'bio': '', 'contact_enabled': False, 'show_shop_section': False},
        'blocks': [
            {'id': 'fixture-cutoff', 'block_type': 'text', 'content': {'variant': 'weekly_cutoff',
                'title': 'Order cutoff', 'weekday': '5', 'hour': '23', 'minute': '0',
                'timeZone': 'America/Los_Angeles', 'deliveryLabel': 'Sunday delivery'}, 'sort_order': 5, 'is_active': True},
            {'id': 'fixture-locations', 'block_type': 'locations', 'content': {'managed': 'true'}, 'sort_order': 30, 'is_active': True},
            {'id': 'fixture-website', 'block_type': 'button', 'content': {'label': 'Visit AV’s website',
                'style': 'plain', 'url': 'https://example.invalid/'}, 'sort_order': 41, 'is_active': True}],
        'links': [{'id': 'fixture-menu', 'label': 'View menu', 'link_type': 'website', 'url': 'https://example.invalid/menu',
            'sort_order': 10, 'is_active': True, 'is_featured': False, 'display_style': 'button', 'grid_size': 'half'}],
        'locations': [{'id': f'22222222-2222-4222-8222-{index:012d}', 'name': f'Location {index}',
            'is_placeholder': True, 'is_active': True, 'sort_order': index * 10, 'address': None,
            'directions_url': None, 'subtitle': '', 'image_url': None} for index in range(1, 4)]}
    data['blocks'].append({'id': '00000000-0000-4000-8000-000000000001', 'profile_id': PID,
        'block_type': 'text', 'content': {'variant': 'customer_reviews', 'title': 'Customer reviews'},
        'alignment': 'center', 'sort_order': 0, 'is_active': True})
    for block in data['blocks']:
        if block['block_type'] == 'locations':
            block['content'].update({'mode': 'pickup', 'title': 'Pickup locations', 'subtitle': '',
                'ctaLabel': 'Get directions', 'maxLocations': '2'})
            block['sort_order'] = 50
        if block['block_type'] == 'sms_subscribe':
            block['content'].update({'mode': 'pickup', 'description': 'Choose pickup updates and weekly ordering reminders.'})
    data['locations'] = data['locations'][:2]
    for index, location in enumerate(data['locations'], 1):
        location['name'] = f'Pickup location {index}'
    return data


async def mount(browser, data, width=390, reviews=None, fail_once=False, suffix=''):
    context = await browser.new_context(viewport={'width': width, 'height': 844})
    state = {'reviews': copy.deepcopy(reviews or []), 'writes': [], 'fail_once': fail_once, 'errors': []}

    async def handle(route):
        request = route.request
        url = request.url
        if url.startswith(BASE):
            return await route.continue_()
        async def reply(value, status=200):
            await route.fulfill(status=status, content_type='application/json', body=json.dumps(value))
        pathname = urlparse(url).path
        if '/rpc/get_public_personal_profile' in pathname:
            return await reply([data['profile']])
        if '/rpc/get_public_profile_locations' in pathname:
            return await reply(data['locations'])
        if '/rpc/get_public_profile_sms_program' in pathname:
            return await reply(None)
        if '/rpc/get_public_profile_reviews' in pathname:
            body = request.post_data_json
            values = state['reviews']
            offset = body.get('p_offset', 0)
            limit = body.get('p_limit', 3)
            page = values[offset:offset + limit]
            return await reply({'enabled': True, 'total': len(values),
                'average': round(sum(row['rating'] for row in values) / len(values), 1) if values else None,
                'reviews': page, 'has_more': offset + len(page) < len(values)})
        if '/rpc/submit_profile_review' in pathname:
            body = request.post_data_json
            state['writes'].append(body)
            if state['fail_once']:
                state['fail_once'] = False
                return await reply({'message': 'Fixture connection failure', 'code': 'PGRST000'}, 503)
            row_id = f'00000000-0000-4000-9000-{len(state["reviews"]) + 100:012d}'
            state['reviews'].insert(0, {'id': row_id, 'rating': body['p_rating'],
                'comment': body['p_comment'], 'created_at': '2026-11-23T06:00:00Z'})
            return await reply(row_id)
        if '/rest/v1/personal_links' in pathname:
            return await reply(data['links'])
        if '/rest/v1/personal_blocks' in pathname:
            return await reply(data['blocks'])
        if '/rpc/profile_has_active_card' in pathname or '/rpc/is_admin' in pathname:
            return await reply(False)
        if '/auth/v1/' in pathname:
            return await reply({'message': 'No fixture account'}, 401)
        if pathname.startswith('/avmeals/'):
            source = ROOT / 'public' / pathname.lstrip('/')
            if source.is_file():
                return await route.fulfill(path=str(source))
        if '/functions/v1/' in pathname:
            return await reply({'success': True})
        if '/rest/v1/' in pathname:
            return await reply([])
        return await route.fulfill(status=200, body='')

    await context.route('**/*', handle)
    page = await context.new_page()
    page.on('pageerror', lambda error: state['errors'].append(str(error)))
    await page.goto(BASE + '/avmeals' + suffix)
    await page.get_by_text('How was your meal?', exact=True).wait_for()
    await page.get_by_role('heading', name='Pickup locations', exact=True).wait_for()
    return context, page, state


async def select_rating(page, score):
    radio = page.get_by_role('radio', name=f'{score} ' + ('star' if score == 1 else 'stars'), exact=True)
    await radio.locator('..').click()


async def run():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=os.environ.get('QA_BROWSER') or shutil.which('chromium'))
        data = fixture()

        context, page, state = await mount(browser, data)
        await page.get_by_text('Be the first to leave a review.', exact=True).wait_for()
        reviews = page.locator('section').filter(has=page.get_by_role('heading', name='Customer reviews', exact=True))
        menu = page.get_by_text('View menu', exact=True).first
        assert (await reviews.bounding_box())['y'] < (await menu.bounding_box())['y'], 'Reviews precede menu actions'
        pickups = page.get_by_role('region', name='Pickup locations', exact=True)
        assert await pickups.locator('article').count() == 2
        assert await pickups.get_by_role('link').count() == 0, 'Placeholders must not navigate'
        assert await page.locator('a[href*="?location="]').count() == 0, 'One shared hub has no location sublinks'
        assert (await pickups.bounding_box())['y'] > (await page.get_by_text('Visit AV’s website', exact=True).first.bounding_box())['y']
        await page.screenshot(path=str(OUTPUT / 'avmeals-mobile-empty.png'), full_page=True)
        await select_rating(page, 4)
        await page.get_by_text('Your rating and written feedback will be public.', exact=True).wait_for()
        await page.get_by_role('button', name='Post review', exact=True).click()
        await page.get_by_text('Thanks for your review!', exact=True).wait_for()
        assert len(state['writes']) == 1
        assert state['writes'][0]['p_comment'] is None, 'Star-only reviews work'
        assert state['writes'][0]['p_rating'] == 4
        await reviews.get_by_text('4.0', exact=False).first.wait_for()
        await reviews.get_by_text('4/5', exact=True).wait_for()
        assert not state['errors'], state['errors']
        print('PASS mobile empty state, reviews first, two pickup slots last, star-only persisted response')
        await context.close()

        stored = [{'id': f'10000000-0000-4000-8000-{index:012d}', 'rating': score,
            'comment': text, 'created_at': f'2026-11-{22-index:02d}T12:00:00Z'}
            for index, (score, text) in enumerate([(1, 'Please improve the seasoning.'), (5, 'Great portions.'),
                (4, None), (3, 'More vegetable options, please.'), (5, 'Easy pickup.')], 1)]
        context, page, state = await mount(browser, data, width=320, reviews=stored, fail_once=True,
            suffix='?location=5e44d809-037a-47c7-9f14-3f585dcbccec')
        assert await page.get_by_text('This location is currently unavailable.', exact=True).count() == 0
        assert await page.get_by_role('region', name='Pickup locations', exact=True).locator('article').count() == 2
        await page.get_by_role('button', name='Read all 5 reviews', exact=True).click()
        await page.get_by_text('Please improve the seasoning.', exact=True).wait_for()
        await page.get_by_text('1/5', exact=True).wait_for()
        await page.get_by_role('button', name='Load more reviews', exact=True).click()
        await page.get_by_text('Easy pickup.', exact=True).wait_for()
        assert await page.locator('section article').count() == 7
        await select_rating(page, 2)
        feedback = '<script>window.badReview = true</script> Pickup was late.'
        await page.get_by_role('textbox', name='Your feedback (optional)').fill(feedback)
        await page.get_by_role('button', name='Post review', exact=True).click()
        await page.get_by_role('alert').wait_for()
        assert await page.get_by_role('textbox', name='Your feedback (optional)').input_value() == feedback
        await page.get_by_role('button', name='Post review', exact=True).click()
        await page.get_by_text('Thanks for your review!', exact=True).wait_for()
        assert len(state['writes']) == 2
        assert state['writes'][0]['p_submission_id'] == state['writes'][1]['p_submission_id'], 'Retry keeps idempotency key'
        assert state['writes'][0]['p_visitor_id'] == state['writes'][1]['p_visitor_id']
        await page.get_by_text(feedback, exact=True).wait_for()
        assert await page.evaluate('window.badReview === undefined')
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), 'Small mobile has no horizontal overflow'
        assert not state['errors'], state['errors']
        await page.screenshot(path=str(OUTPUT / 'avmeals-mobile-reviews.png'), full_page=True)
        print('PASS low scores and comments, pagination, error preservation, safe text, retry dedupe, old location links, 320px layout')
        await context.close()

        confirmed = copy.deepcopy(data)
        for index, location in enumerate(confirmed['locations'], 1):
            location.update({'name': f'Fixture pickup {index}', 'is_placeholder': False,
                'address': f'{index} Example Street, Test City, CA', 'directions_url': None, 'subtitle': 'Pickup on Sunday'})
        context, page, state = await mount(browser, confirmed, width=1280)
        pickups = page.get_by_role('region', name='Pickup locations', exact=True)
        assert await pickups.get_by_role('link').count() == 2
        for link in await pickups.get_by_role('link').all():
            assert (await link.get_attribute('href')).startswith('https://www.google.com/maps/')
            assert await link.get_attribute('target') == '_blank'
        assert await page.locator('a[href*="?location="]').count() == 0
        assert not state['errors'], state['errors']
        await page.screenshot(path=str(OUTPUT / 'avmeals-desktop.png'), full_page=True)
        print('PASS confirmed pickup addresses open maps directly on desktop')
        await context.close()
        await browser.close()


if __name__ == '__main__':
    asyncio.run(run())
