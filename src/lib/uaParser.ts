import { UAParser } from 'ua-parser-js'

export function parseUserAgent(uaString: string | null) {
  if (!uaString) {
    return {
      browser: '알 수 없는 브라우저',
      browserVersion: '',
      os: '알 수 없는 OS',
      osVersion: '',
      deviceType: 'desktop',
      summary: '알 수 없는 기기'
    }
  }

  const parser = new UAParser(uaString)
  const result = parser.getResult()

  return {
    browser: result.browser.name || '알 수 없는 브라우저',
    browserVersion: result.browser.version?.split('.')[0] || '',
    os: result.os.name || '알 수 없는 OS',
    osVersion: result.os.version || '',
    deviceType: result.device.type || 'desktop',  // mobile, tablet, desktop
    summary: `${result.browser.name || '?'} ${result.browser.version?.split('.')[0] || ''} · ${result.os.name || '?'} ${result.os.version || ''}`.trim()
  }
}
