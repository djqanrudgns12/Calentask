import { NextResponse } from 'next/server';

// SSRF 방지: 내부망·루프백·링크로컬 대상 요청 차단
function isBlockedHost(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (host === 'localhost' || host === '0.0.0.0' || host.endsWith('.local') || host.endsWith('.internal')) return true;
  // IPv6 리터럴은 공개 URL 미리보기에 필요성이 낮아 전면 차단
  if (host.includes(':') || host.startsWith('[')) return true;
  const m = host.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (m) {
    const a = Number(m[1]);
    const b = Number(m[2]);
    if (a === 0 || a === 10 || a === 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168) return true;
  }
  return false;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const url = searchParams.get('url');

  if (!url) {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }

  let parsedUrl: URL;
  try {
    parsedUrl = new URL(url);
  } catch {
    return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol) || isBlockedHost(parsedUrl.hostname)) {
    return NextResponse.json({ error: 'URL not allowed' }, { status: 400 });
  }

  try {
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9,ko;q=0.8',
      },
      // Avoid hanging requests
      signal: AbortSignal.timeout(8000),
      next: { revalidate: 3600 } // Cache for 1 hour
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.status}`);
    }

    const html = await response.text();

    const getMetaTag = (name: string) => {
      // Handles both <meta property="og:title" content="..."> and <meta content="..." property="og:title">
      const match = html.match(new RegExp(`<meta(?:\\s+[^>]*?)?(?:name|property)=["']${name}["'](?:\\s+[^>]*?)?content=["']([^"']*)["']`, 'i')) || 
                    html.match(new RegExp(`<meta(?:\\s+[^>]*?)?content=["']([^"']*)["'](?:\\s+[^>]*?)?(?:name|property)=["']${name}["']`, 'i'));
      
      // Clean up HTML entities in attributes
      let value = match ? match[1] : null;
      if (value) {
        value = value.replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>');
      }
      return value;
    };

    let title = getMetaTag('og:title') || getMetaTag('twitter:title');
    if (!title) {
      const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
      title = titleMatch ? titleMatch[1] : '';
    }

    const description = getMetaTag('og:description') || getMetaTag('twitter:description') || getMetaTag('description') || '';
    let image = getMetaTag('og:image') || getMetaTag('twitter:image') || '';

    // If image is relative, make it absolute
    if (image && !image.startsWith('http')) {
      try {
        const urlObj = new URL(url);
        image = new URL(image, urlObj.origin).toString();
      } catch (e) {
        // Fallback or ignore if URL parsing fails
      }
    }

    return NextResponse.json({
      title: title || '',
      description: description || '',
      image: image || ''
    });
  } catch (error) {
    console.error('Metadata fetch error:', error);
    return NextResponse.json({ error: 'Failed to fetch metadata' }, { status: 500 });
  }
}
