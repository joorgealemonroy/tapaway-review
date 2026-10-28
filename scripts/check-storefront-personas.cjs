/* Synthetic customer questions against the real handler. All provider, Stripe,
 * database, and email calls are isolated fixtures, never customer traffic. */
const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const { environment, load, request } = require('./check-personal-commerce.cjs');
const cases = [
  ['NFC beginner', 'What is an NFC card?', /physical card/i, /tap|scan/i],
  ['Social video visitor', 'What do you sell?', /physical card/i, /link/i],
  ['Recipient', 'Does the other person need an app?', /No app/i, /phone/i],
  ['Existing Linktree owner', 'Can I use my Linktree without a subscription?', /\$39 once/, /no ongoing TapAway fee/],
  ['Existing Linkme owner', 'Can I keep my Linkme?', /Linkme/, /no ongoing TapAway fee/],
  ['No website yet', 'What does the $5 personal hub include?', /No website is needed/, /dashboard, analytics/],
  ['Hub add-on timing', 'Can I add the hub after paying for my cards?', /BEFORE checkout/, /existing card-only order, ask our team/],
  ['Transparent initial total', 'When will I be charged?', /\$44 total/, /\$5\/month/],
  ['Designer', 'Can I customize both sides of my cards?', /BEFORE you pay/, /after payment/],
  ['NFC expert', 'Can NFC and QR open different links?', /same link/, /two cards can open different links/],
  ['Subscription concern', 'How do I cancel hosting?', /dashboard.*billing/, /stops the next renewal/],
  ['Individual sees Club', 'Can I get Card Club for personal cards?', /businesses only/, /Personal orders do not/],
  ['Trial confusion', 'Do personal cards have a free trial?', /no free trial/, /\$39/],
  ['Small business', 'What does the 4-card business plan cost?', /\$20\/month/, /\$199\/year/],
  ['Larger business', 'What is the price for 15 business cards?', /\$39\/month/, /\$390\/year/],
  ['Shipping deadline', 'Can you guarantee delivery tomorrow?', /ask our team/i, /Timing depends/],
  ['Phone compatibility', 'Will it work with Android?', /NFC is enabled/, /QR code/],
  ['Purchase follow-up', 'Where is my order?', /can't look up orders/, /reply by email/],
  ['Seasonal shopper', 'What is the Halloween sale?', /\$39 once/, /October 31, 2026/],
];
(async()=>{
  for(const [persona,question,...expected] of cases){
    const s=environment(),h=await load('supabase/functions/storefront-support/index.ts',s);
    const result=await h(request({mode:'ai',visitor:randomUUID(),message:question}));
    assert.equal(result.status,200,persona);const data=await result.json();
    for(const pattern of expected)assert.match(data.answer,pattern,persona);
    assert.equal(data.source,'reviewed_faq',persona);assert.equal(data.remaining,4);
    assert.equal(s.calls.ai.length,0);assert.equal(s.calls.emails.length,0);
    console.log('PASS '+persona+': '+question);
  }
  const s=environment(),offers=await load('supabase/functions/_shared/storefrontOffers.ts',s);
  assert.match(offers.seasonalOfferFacts(Date.parse('2026-11-01T06:59:59Z')),/Halloween sale:/);
  assert.match(offers.seasonalOfferFacts(Date.parse('2026-11-01T07:00:00Z')),/No current seasonal promotion/);
  console.log('PASS Halloween deadline expires at Pacific midnight without changing the price');
  console.log(`${cases.length+1} isolated customer-scenario checks passed. No live customer, payment, provider, or email traffic.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
