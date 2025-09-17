// Stub WhatsApp service. Integrate with actual provider (e.g., Twilio, Meta WhatsApp Cloud API) later.
export interface WhatsAppMessageOptions {
  to: string
  template?: string
  body: string
}

async function sendMessage(opts: WhatsAppMessageOptions) {
  // Placeholder: log action. Replace with real API call.
  console.log('[WHATSAPP_SEND]', opts)
  return { success: true }
}

async function sendCollectionConfirmation({ phone, pickupTime }: { phone: string, pickupTime: Date }) {
  return sendMessage({ to: phone, body: `Your collection is scheduled. Pickup time: ${pickupTime.toISOString()}` })
}

async function sendListingConfirmation({ phone, items }: { phone: string, items: { name: string, id?: string }[] }) {
  return sendMessage({ to: phone, body: `Your items have been listed: ${items.map(i => i.name).join(', ')}` })
}

export const whatsappService = {
  sendMessage,
  sendCollectionConfirmation,
  sendListingConfirmation
}
