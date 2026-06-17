const fs = require('fs');
const path = require('path');

const filesToPatch = [
  path.join(__dirname, 'node_modules', '@fortune-sheet', 'core', 'dist', 'index.esm.js'),
  path.join(__dirname, 'node_modules', '@fortune-sheet', 'core', 'dist', 'index.js')
];

for (const file of filesToPatch) {
  let content = fs.readFileSync(file, 'utf8');

  // 1. Replace fontarray
  content = content.replace(
    /fontarray: \[([^\]]+)\],/g,
    `fontarray: ["기본 글꼴", "맑은 고딕", "애플 SD 산돌고딕 Neo", "돋움", "굴림", "바탕체", "궁서체", "함초롬돋움", "함초롬바탕", "본고딕", "본명조", "프리텐다드", "나눔고딕", "나눔스퀘어 네오", "지마켓 산스", "배달의민족 주아"],`
  );

  // 2. Replace fontjson
  content = content.replace(
    /fontjson: \{[^\}]+\},/g,
    `fontjson: {
    "기본 글꼴": 0,
    "맑은 고딕": 1,
    "애플 sd 산돌고딕 neo": 2,
    "돋움": 3,
    "굴림": 4,
    "바탕체": 5,
    "궁서체": 6,
    "함초롬돋움": 7,
    "함초롬바탕": 8,
    "본고딕": 9,
    "본명조": 10,
    "프리텐다드": 11,
    "나눔고딕": 12,
    "나눔스퀘어 네오": 13,
    "지마켓 산스": 14,
    "배달의민족 주아": 15
  },`
  );

  // 3. Replace English defaultFmt block
  // We need to find the block matching "Automatic" and "Plain text"
  content = content.replace(
    /text: "Automatic"/g,
    'text: "자동"'
  );
  content = content.replace(
    /text: "Plain text"/g,
    'text: "일반 텍스트"'
  );
  content = content.replace(
    /text: "Number",\s*value: "##0\.00"/g,
    'text: "숫자",\n      value: "##0.00"'
  );
  content = content.replace(
    /text: "Percent",\s*value: "#0\.00%"/g,
    'text: "퍼센트",\n      value: "#0.00%"'
  );
  content = content.replace(
    /text: "Scientific"/g,
    'text: "과학적 표기법"'
  );
  content = content.replace(
    /text: "Accounting"/g,
    'text: "회계"'
  );
  content = content.replace(
    /text: "Currency"/g,
    'text: "통화"'
  );
  content = content.replace(
    /text: "Date",\s*value: "yyyy-MM-dd"/g,
    'text: "날짜",\n      value: "yyyy-MM-dd"'
  );
  content = content.replace(
    /text: "Time",\s*value: "hh:mm AM\/PM"/g,
    'text: "시간",\n      value: "hh:mm AM/PM"'
  );
  content = content.replace(
    /text: "Time 24H"/g,
    'text: "시간 (24H)"'
  );
  content = content.replace(
    /text: "Date time",\s*value: "yyyy-MM-dd hh:mm AM\/PM"/g,
    'text: "날짜 및 시간",\n      value: "yyyy-MM-dd hh:mm AM/PM"'
  );
  content = content.replace(
    /text: "Date time 24 H"/g,
    'text: "날짜 및 시간 (24H)"'
  );
  content = content.replace(
    /text: "Custom formats"/g,
    'text: "맞춤 형식"'
  );

  fs.writeFileSync(file, content, 'utf8');
  console.log(`Patched ${file}`);
}
