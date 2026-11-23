"""Offline hub behavior checks. All remote traffic is intercepted; no live reviews."""
import asyncio
import copy
import re
from datetime import datetime, timedelta, timezone
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
    data['blocks'] = [block for block in data['blocks'] if block.get('content', {}).get('variant') != 'customer_reviews']
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


async def mount(browser, data, width=390, reviews=None, own_review=None, fail_once=False,
                suffix='', sms_available=True, verification_available=True):
    context = await browser.new_context(viewport={'width': width, 'height': 844})
    state = {'reviews': copy.deepcopy(reviews or []), 'own_review': copy.deepcopy(own_review),
        'writes': [], 'code_requests': [], 'verify_requests': [], 'marketing_subscriptions': [],
        'fail_once': fail_once, 'expire_save_once': False, 'errors': [], 'unexpected_writes': [],
        'valid_tokens': set(), 'session_calls': 0, 'sms_available': sms_available,
        'verification_available': verification_available}
    expires_at = (datetime.now(timezone.utc) + timedelta(days=30)).isoformat()
    config = {'enabled': True, 'phoneVerification': True, 'verificationAvailable': verification_available,
        'otpConsentVersion': 1, 'otpConsentText': 'By choosing Send code, I agree to receive a text with a verification code. Message and data rates may apply.',
        'sms': {'available': sms_available, 'brandName': 'A.V. Meal Preps', 'consentVersion': 2,
            'consentText': 'I agree to receive recurring automated marketing texts from A.V. Meal Preps about offers and announcements. Message frequency varies. Consent is not a condition of purchase. Message and data rates may apply. Reply STOP to unsubscribe or HELP for help.',
            'termsUrl': 'https://tapaway.co/terms', 'privacyUrl': 'https://tapaway.co/privacy',
            'frequencyText': 'Message frequency varies.'} if sms_available else None}

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
            state['unexpected_writes'].append('obsolete guest review RPC')
            return await reply({'code': '42501', 'message': 'Phone verification is required.'}, 403)
        if pathname.endswith('/functions/v1/profile-review'):
            body = request.post_data_json
            action = body.get('action')
            assert body.get('profileId') == PID, body
            if action == 'config':
                return await reply(config)
            if action == 'request_code':
                state['code_requests'].append(body)
                if not verification_available:
                    return await reply({'code': 'VERIFICATION_UNAVAILABLE', 'error': 'Phone verification is temporarily unavailable.'}, 503)
                assert body.get('otpConsent') is True and body.get('otpConsentVersion') == 1
                return await reply({'success': True, 'challengeId': '33333333-3333-4333-8333-333333333333',
                    'maskedPhone': '••• ••• 0123', 'expiresIn': 600, 'retryAfter': 60})
            if action == 'verify_code':
                state['verify_requests'].append(body)
                if body.get('code') != '123456':
                    return await reply({'code': 'OTP_INVALID', 'error': 'Invalid or expired code. Please try again.'}, 400)
                token = f'{len(state["verify_requests"]):064x}'
                state['valid_tokens'].add(token)
                return await reply({'success': True, 'token': token, 'expiresAt': expires_at,
                    'maskedPhone': '••• ••• 0123', 'review': state['own_review']})
            if action == 'session':
                state['session_calls'] += 1
                if body.get('token') not in state['valid_tokens']:
                    return await reply({'code': 'SESSION_EXPIRED', 'error': 'Verify your phone again to continue.'}, 401)
                return await reply({'success': True, 'expiresAt': expires_at,
                    'maskedPhone': '••• ••• 0123', 'review': state['own_review']})
            if action == 'save':
                state['writes'].append(body)
                if state['expire_save_once']:
                    state['expire_save_once'] = False
                    state['valid_tokens'].clear()
                    return await reply({'code': 'SESSION_EXPIRED', 'error': 'Verify your phone again to continue.'}, 401)
                if body.get('token') not in state['valid_tokens']:
                    return await reply({'code': 'SESSION_EXPIRED', 'error': 'Verify your phone again to continue.'}, 401)
                if state['fail_once']:
                    state['fail_once'] = False
                    return await reply({'code': 'SAVE_UNAVAILABLE', 'error': 'We couldn’t save your review. Please try again.'}, 503)
                assert isinstance(body.get('rating'), int) and 1 <= body['rating'] <= 5
                old = state['own_review']
                row = {'id': old['id'] if old else '77777777-7777-4777-8777-777777777777',
                    'rating': body['rating'], 'comment': body.get('comment') or None,
                    'created_at': old['created_at'] if old else '2026-11-23T06:00:00Z',
                    'updated_at': '2026-11-23T07:00:00Z', 'phone_verified': True}
                state['own_review'] = row
                if old:
                    state['reviews'] = [row if value['id'] == old['id'] else value for value in state['reviews']]
                else:
                    state['reviews'].insert(0, row)
                sms_status = 'not_requested'
                if body.get('marketingConsent') is True:
                    assert body.get('consentVersion') == config['sms']['consentVersion']
                    state['marketing_subscriptions'].append({'review': row['id'], 'version': body['consentVersion']})
                    sms_status = 'subscribed'
                return await reply({'success': True, 'review': row, 'smsStatus': sms_status})
            raise AssertionError('Unknown review action: ' + str(action))
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
            if request.method not in ['GET', 'HEAD']:
                state['unexpected_writes'].append(pathname)
            return await reply([])
        return await route.fulfill(status=200, body='')

    await context.route('**/*', handle)
    page = await context.new_page()
    page.on('pageerror', lambda error: state['errors'].append(str(error)))
    await page.goto(BASE + '/avmeals' + suffix)
    await page.get_by_role('heading', name='Customer reviews', exact=True).wait_for()
    await page.get_by_role('heading', name='Pickup locations', exact=True).wait_for()
    return context, page, state


def reviews_region(page):
    return page.get_by_role('region', name='Customer reviews', exact=True)


async def select_rating(page, score):
    radio = page.get_by_role('radio', name=f'{score} ' + ('star' if score == 1 else 'stars'), exact=True)
    await radio.locator('..').click()


async def verify_phone(page, state, invalid_first=False):
    subscription_count = len(state['marketing_subscriptions'])
    write_count = len(state['writes'])
    await page.get_by_role('textbox', name='Mobile number', exact=True).fill('(661) 555-0123')
    await page.get_by_role('button', name='Send code', exact=True).click()
    code = page.get_by_role('textbox', name='Verification code', exact=True)
    await code.wait_for()
    assert len(state['marketing_subscriptions']) == subscription_count, 'OTP send does not create marketing consent'
    assert state['code_requests'][-1]['phone'] == '+16615550123', 'Phone input is normalized for verification'
    if invalid_first:
        await code.fill('000000')
        await page.get_by_role('button', name='Verify phone', exact=True).click()
        await page.get_by_role('alert').filter(has_text='Invalid or expired code').wait_for()
        assert len(state['writes']) == write_count, 'A failed OTP cannot post a review'
    await code.fill('123456')
    await page.get_by_role('button', name='Verify phone', exact=True).click()
    await page.get_by_role('button', name=re.compile(r'^(Post review|Save changes)$')).wait_for()


async def open_feed(page):
    region = reviews_region(page)
    button = region.get_by_role('button', name=re.compile(r'^Read (the review|all .* reviews)$'))
    if await button.count():
        await button.click()
    return region


async def assert_private_phone(page, state):
    region = reviews_region(page)
    feed_text = ' '.join(await region.locator('article').all_text_contents())
    for raw in ['+16615550123', '(661) 555-0123', '6615550123']:
        assert raw not in feed_text, 'Reviewer phone numbers never enter public review cards'
    assert not state['unexpected_writes'], state['unexpected_writes']
    assert not state['errors'], state['errors']


async def run():
    OUTPUT.mkdir(parents=True, exist_ok=True)
    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(executable_path=os.environ.get('QA_BROWSER') or shutil.which('chromium'))
        data = fixture()

        context, page, state = await mount(browser, data)
        await page.get_by_text('Be the first to leave a review.', exact=True).wait_for()
        region = reviews_region(page)
        menu = page.get_by_text('View menu', exact=True).first
        assert (await region.bounding_box())['y'] < (await menu.bounding_box())['y'], 'Reviews precede menu actions'
        pickups = page.get_by_role('region', name='Pickup locations', exact=True)
        assert await pickups.locator('article').count() == 2
        assert await pickups.get_by_role('link').count() == 0, 'Placeholders must not navigate'
        assert await page.locator('a[href*="?location="]').count() == 0, 'One shared hub has no location sublinks'
        assert (await pickups.bounding_box())['y'] > (await page.get_by_text('Visit AV’s website', exact=True).first.bounding_box())['y']
        await select_rating(page, 4)
        marketing = region.get_by_role('checkbox')
        await marketing.wait_for()
        assert not await marketing.is_checked(), 'Marketing is unchecked by default'
        assert await region.get_by_role('link', name='Terms', exact=True).count() >= 1
        assert await region.get_by_role('link', name='Privacy', exact=True).count() >= 1
        assert await region.get_by_role('button', name='Post review', exact=True).count() == 0
        await page.screenshot(path=str(OUTPUT / 'avmeals-mobile-phone.png'), full_page=True)
        await verify_phone(page, state, invalid_first=True)
        assert not state['writes'], 'Phone verification does not automatically post a rating'
        assert not state['marketing_subscriptions'], 'Phone verification does not enroll marketing'
        assert not await marketing.is_checked()
        await region.get_by_role('button', name='Post review', exact=True).click()
        await region.get_by_text('4/5', exact=True).first.wait_for()
        assert len(state['writes']) == 1
        assert state['writes'][0].get('comment') is None, 'Star-only verified reviews work'
        assert state['writes'][0]['marketingConsent'] is False
        assert len(state['reviews']) == 1 and state['reviews'][0]['phone_verified'] is True
        await assert_private_phone(page, state)
        print('PASS verified OTP with invalid-code retry, optional star-only review, default-unchecked marketing, top reviews and two pickup cards')

        # The saved session restores editing without creating a second public rating.
        await page.reload()
        await region.get_by_text('Your review', exact=True).wait_for()
        edit_button = region.get_by_role('button', name='Edit my review', exact=True)
        await edit_button.wait_for()
        await edit_button.click()
        await region.get_by_role('button', name='Save changes', exact=True).wait_for()
        assert await page.get_by_role('radio', name='4 stars', exact=True).is_checked()
        assert not await region.get_by_role('checkbox').is_checked(), 'Editing does not preselect marketing'
        await select_rating(page, 5)
        await page.get_by_role('textbox', name='Your feedback (optional)').fill('Updated: pickup was easy.')
        await region.get_by_role('checkbox').check()
        await region.get_by_role('button', name='Save changes', exact=True).click()
        await region.get_by_text('Updated: pickup was easy.', exact=True).wait_for()
        assert len(state['reviews']) == 1, 'Editing preserves one review per phone'
        assert state['reviews'][0]['rating'] == 5
        assert len(state['marketing_subscriptions']) == 1, 'Only an explicit checked save grants marketing consent'
        assert state['writes'][-1]['marketingConsent'] is True
        assert state['session_calls'] >= 1
        await assert_private_phone(page, state)
        await page.screenshot(path=str(OUTPUT / 'avmeals-mobile-verified-review.png'), full_page=True)
        print('PASS later editing restores the saved review; explicit offers consent is separate from verification and updates')

        # An editor without a saved device session can find the same review by phone.
        await page.evaluate('(key) => localStorage.removeItem(key)', f'tapaway:review-session:{PID}')
        await page.reload()
        await region.get_by_role('button', name='Edit my review', exact=True).click()
        await verify_phone(page, state)
        assert await page.get_by_role('radio', name='5 stars', exact=True).is_checked()
        assert await page.get_by_role('textbox', name='Your feedback (optional)').input_value() == 'Updated: pickup was easy.'
        assert not await region.get_by_role('checkbox').is_checked()
        assert len(state['writes']) == 2 and len(state['reviews']) == 1, 'Verifying to edit does not create or alter a review'
        await assert_private_phone(page, state)
        print('PASS same-number verification recovers an existing review without a device session')
        await context.close()

        stored = [{'id': f'10000000-0000-4000-8000-{index:012d}', 'rating': score,
            'comment': text, 'created_at': f'2026-11-{22-index:02d}T12:00:00Z',
            'phone_verified': index % 2 == 0}
            for index, (score, text) in enumerate([(1, 'Please improve the seasoning.'), (5, 'Great portions.'),
                (4, None), (3, 'More vegetable options, please.'), (5, 'Easy pickup.')], 1)]
        context, page, state = await mount(browser, data, width=320, reviews=stored, fail_once=True,
            suffix='?location=5e44d809-037a-47c7-9f14-3f585dcbccec')
        assert await page.get_by_text('This location is currently unavailable.', exact=True).count() == 0
        assert await page.get_by_role('region', name='Pickup locations', exact=True).locator('article').count() == 2
        region = await open_feed(page)
        await region.get_by_text('Please improve the seasoning.', exact=True).wait_for()
        low_row = region.locator('article').filter(has_text='Please improve the seasoning.')
        assert await low_row.get_by_text('Phone verified', exact=True).count() == 0, 'Old guest rows are not mislabeled verified'
        await region.get_by_role('button', name='Load more reviews', exact=True).click()
        await region.get_by_text('Easy pickup.', exact=True).wait_for()
        assert await region.locator('article').count() == 5
        await select_rating(page, 2)
        feedback = '<script>window.badReview = true</script> Pickup was late.'
        await page.get_by_role('textbox', name='Your feedback (optional)').fill(feedback)
        await verify_phone(page, state)
        await region.get_by_role('button', name='Post review', exact=True).click()
        await region.get_by_role('alert').wait_for()
        assert await page.get_by_role('textbox', name='Your feedback (optional)').input_value() == feedback
        await region.get_by_role('button', name='Post review', exact=True).click()
        await region.get_by_text(feedback, exact=True).wait_for()
        assert len(state['writes']) == 2
        assert state['writes'][0]['submissionId'] == state['writes'][1]['submissionId'], 'Ambiguous save retry keeps its idempotency key'
        assert await page.evaluate('window.badReview === undefined')
        assert await page.evaluate('document.documentElement.scrollWidth <= innerWidth'), '320px mobile has no horizontal overflow'
        await assert_private_phone(page, state)

        # Expiration while editing must reverify without overwriting unsaved text.
        await region.get_by_role('button', name='Edit my review', exact=True).click()
        await page.get_by_role('textbox', name='Your feedback (optional)').fill('Draft preserved after verification expires.')
        state['expire_save_once'] = True
        await region.get_by_role('button', name='Save changes', exact=True).click()
        await region.get_by_role('button', name='Send code', exact=True).wait_for()
        await region.get_by_role('alert').filter(has_text='verify your phone again').wait_for()
        await verify_phone(page, state)
        assert await page.get_by_role('textbox', name='Your feedback (optional)').input_value() == 'Draft preserved after verification expires.'
        await region.get_by_role('button', name='Save changes', exact=True).click()
        await region.get_by_text('Draft preserved after verification expires.', exact=True).wait_for()
        assert len(state['reviews']) == 6, 'Editing after expiration does not duplicate a review'
        await assert_private_phone(page, state)
        print('PASS low scores, honest verification badges, pagination, safe text, retry idempotency, expired-session draft preservation and 320px layout')
        await context.close()

        # Review posting remains available even when marketing terms/program are unavailable.
        context, page, state = await mount(browser, data, sms_available=False)
        await select_rating(page, 3)
        assert await reviews_region(page).get_by_role('checkbox').count() == 0
        await verify_phone(page, state)
        await reviews_region(page).get_by_role('button', name='Post review', exact=True).click()
        await reviews_region(page).get_by_text('3/5', exact=True).first.wait_for()
        assert state['writes'][0]['marketingConsent'] is False
        assert not state['marketing_subscriptions']
        await assert_private_phone(page, state)
        print('PASS missing marketing setup does not block a verified review')
        await context.close()

        confirmed = copy.deepcopy(data)
        for index, location in enumerate(confirmed['locations'], 1):
            location.update({'name': f'Fixture pickup {index}', 'is_placeholder': False,
                'address': f'{index} Example Street, Test City, CA', 'directions_url': None, 'subtitle': 'Pickup on Sunday'})
        context, page, state = await mount(browser, confirmed, width=1280, verification_available=False)
        pickups = page.get_by_role('region', name='Pickup locations', exact=True)
        assert await pickups.get_by_role('link').count() == 2
        for link in await pickups.get_by_role('link').all():
            assert (await link.get_attribute('href')).startswith('https://www.google.com/maps/')
            assert await link.get_attribute('target') == '_blank'
        assert await page.locator('a[href*="?location="]').count() == 0
        # An unavailable OTP runtime must never expose a guest posting fallback.
        await select_rating(page, 5)
        await page.get_by_text(re.compile('verification.*unavailable', re.IGNORECASE)).first.wait_for()
        send_code = reviews_region(page).get_by_role('button', name='Send code', exact=True)
        assert not await send_code.count() or await send_code.is_disabled()
        assert not state['code_requests'] and not state['writes']
        await assert_private_phone(page, state)
        await page.screenshot(path=str(OUTPUT / 'avmeals-desktop-pickup.png'), full_page=True)
        print('PASS confirmed pickup addresses open maps directly; unavailable verification fails closed')
        await context.close()
        await browser.close()


if __name__ == '__main__':
    asyncio.run(run())
