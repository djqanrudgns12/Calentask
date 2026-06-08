const cache = new Map<string, string>()

export async function getLocationFromIP(ip: string | null): Promise<string> {
  if (!ip) return 'IP 정보 없음'
  if (cache.has(ip)) return cache.get(ip)!

  try {
    const res = await fetch(`https://ipapi.co/${ip}/json/`, {
      signal: AbortSignal.timeout(3000)
    })
    
    if (!res.ok) throw new Error('API error')
    
    const data = await res.json()
    const location = [data.country_name, data.city]
      .filter(Boolean)
      .join(', ') || '알 수 없는 위치'

    cache.set(ip, location)
    return location
  } catch {
    return '위치 정보 없음'
  }
}
