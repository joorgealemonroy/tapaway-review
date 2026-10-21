/** Serializes delivery across webhook/return-page retries; failures remain retryable. */
export async function deliverPurchaseEmail(db: any, table: 'checkout_intents' | 'personal_card_orders', id: string, send: () => Promise<boolean>) {
  const { data: current, error } = await db.from(table).select('welcome_email_sent_at').eq('id', id).single();
  if (error) throw error;
  if (current?.welcome_email_sent_at) return;
  const { data: claimed, error: claimError } = await db.from(table).update({ welcome_email_started_at: new Date().toISOString() }).eq('id', id).is('welcome_email_sent_at', null)
    .or(`welcome_email_started_at.is.null,welcome_email_started_at.lt.${new Date(Date.now() - 120000).toISOString()}`).select('id');
  if (claimError || !claimed?.length) throw claimError || new Error('Welcome email in progress; retry');
  try {
    if (!(await send())) throw new Error('Welcome email failed; retry');
    const saved = await db.from(table).update({ welcome_email_sent_at: new Date().toISOString(), welcome_email_started_at: null }).eq('id', id);
    if (saved.error) throw saved.error;
  } catch (error) {
    await db.from(table).update({ welcome_email_started_at: null }).eq('id', id);
    throw error;
  }
}
