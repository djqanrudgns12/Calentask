# Chrome 디버그 모드 실행 스크립트
# 용도: 에이전트 또는 개발자가 Chrome DevTools Protocol을 통해 브라우저를 원격 조작할 때 사용
# 사용법: powershell -ExecutionPolicy Bypass -File .\scripts\start-chrome-debug.ps1

$chromePath = "C:\Program Files\Google\Chrome\Application\chrome.exe"
$debugPort = 9222
$debugProfile = "$env:USERPROFILE\ChromeDebugNew"

# 1. 기존 Chrome 프로세스 종료
Write-Host "[1/3] 기존 Chrome 프로세스 종료 중..." -ForegroundColor Yellow
Stop-Process -Name chrome -Force -ErrorAction SilentlyContinue
Start-Sleep -Seconds 3

# 2. 디버그 모드로 Chrome 시작
Write-Host "[2/3] Chrome 디버그 모드로 시작 (port $debugPort)..." -ForegroundColor Yellow
Start-Process -FilePath $chromePath -ArgumentList @(
    "--remote-debugging-port=$debugPort",
    "--user-data-dir=$debugProfile",
    "--no-first-run",
    "--disable-extensions",
    "--no-default-browser-check"
) -WindowStyle Normal

Start-Sleep -Seconds 5

# 3. 연결 확인
Write-Host "[3/3] 디버그 포트 연결 확인..." -ForegroundColor Yellow
try {
    $response = curl.exe -s "http://127.0.0.1:$debugPort/json/version" | ConvertFrom-Json
    Write-Host ""
    Write-Host "=== Chrome 디버그 모드 활성화 ===" -ForegroundColor Green
    Write-Host "브라우저: $($response.Browser)" -ForegroundColor Cyan
    Write-Host "포트: $debugPort" -ForegroundColor Cyan
    Write-Host "WebSocket: $($response.webSocketDebuggerUrl)" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "디버그 포트 연결 실패. Chrome이 정상적으로 시작되었는지 확인하세요." -ForegroundColor Red
}
