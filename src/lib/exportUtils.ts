import { saveAs } from 'file-saver';

export const exportToWord = async (html: string, filename: string = 'document') => {
  try {
    const res = await fetch('/api/export-docx', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ html, title: filename }),
    });

    if (!res.ok) {
      throw new Error('Failed to generate Word document');
    }

    const blob = await res.blob();
    saveAs(blob, `${filename}.docx`);
  } catch (error) {
    console.error('Error exporting to Word:', error);
    alert('Word 파일 생성에 실패했습니다.');
  }
};
