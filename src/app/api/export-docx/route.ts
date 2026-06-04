import { NextResponse } from 'next/server';
import htmlToDocx from 'html-to-docx';

export async function POST(req: Request) {
  try {
    const { html, title } = await req.json();
    
    const htmlString = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>${title}</title>
        </head>
        <body>
          ${html}
        </body>
      </html>
    `;
    
    const buffer = await htmlToDocx(htmlString, null, {
      margins: { top: 1440, right: 1440, bottom: 1440, left: 1440 }
    });
    
    // Buffer를 Uint8Array로 변환하여 NextResponse에 전달
    const uint8 = new Uint8Array(buffer);
    
    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'Content-Disposition': `attachment; filename*=UTF-8''${encodeURIComponent(title)}.docx`,
        'Content-Length': String(uint8.byteLength),
      },
    });
  } catch (error) {
    console.error('Docx export error:', error);
    return NextResponse.json({ error: 'Failed to generate docx' }, { status: 500 });
  }
}
