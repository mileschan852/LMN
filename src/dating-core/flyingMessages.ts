const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

const headers = {
  'apikey': ANON_KEY,
  'Authorization': `Bearer ${ANON_KEY}`,
  'Content-Type': 'application/json',
  'Prefer': 'return=representation',
}

export async function insertFlyingMessage(userId: number, name: string, text: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/flying_messages`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId, name, text }),
  })
  if (!res.ok) throw new Error('Failed to insert flying message')
}

export async function fetchFlyingMessages() {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/flying_messages?select=*&order=created_at.desc&limit=50`, { headers })
  if (!res.ok) throw new Error('Failed to fetch flying messages')
  return await res.json() || []
}

export async function buyRaffleTicket(userId: number, name: string, raffleId: string) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/raffle_tickets`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ user_id: userId, name, raffle_id: raffleId }),
  })
  if (!res.ok) throw new Error('Failed to buy raffle ticket')
}
