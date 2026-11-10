# DOKDO FC — 팀원 경기 종료 웹 푸시 (OneSignal)

카카오톡과 별개이며 기존 경기 기록, 선수 통계, 게시판, 디자인을 유지합니다.

## 현재 상태
- OneSignal 계정 연결 전까지 push/config.json은 enabled=false로 유지되어 알림 신청 버튼이 숨겨집니다.
- GitHub Actions는 경기 ID를 기록하나 비밀키가 없거나 설정이 비활성화되면 푸시 전송을 하지 않습니다.
- 실제 푸시 수신과 발송은 계정 연동과 기기 테스트 전까지 미완료입니다.

## 관리자 연결 절차
1. https://onesignal.com/ 에서 무료 계정을 생성하고 DOKDO FC 앱을 만듭니다.
2. Web Push 플랫폼 → Custom Code를 선택합니다.
3. Site Name: DOKDO FC / Site URL (origin): https://insungmeta.github.io
4. 서비스 워커 URL: https://insungmeta.github.io/dokdo-fc/push/OneSignalSDKWorker.js
   - SDK 코드의 serviceWorkerPath: dokdo-fc/push/OneSignalSDKWorker.js
   - SDK 코드의 serviceWorkerParam.scope: /dokdo-fc/push/
5. OneSignal Settings → Keys & IDs에서 App ID와 App API Key를 확인합니다.
6. GitHub 저장소 Settings → Secrets and variables → Actions에서 아래 두 비밀 변수를 추가합니다.
   - ONESIGNAL_APP_ID: OneSignal App ID (UUID)
   - ONESIGNAL_REST_API_KEY: OneSignal App API Key (개인 대화나 공개 파일에 절대 공유하지 마세요.)
7. 공개 설정 push/config.json의 enabled를 true로, appId를 App ID로 변경합니다.
8. GitHub Actions의 update-and-publish 워크플로우가 정상인지 확인합니다.

보안: App ID는 공개 가능한 식별자이고, App API Key는 GitHub 비밀키로만 저장합니다.
공개 홈페이지에는 API Key가 포함되지 않습니다.

## 팀원 이용
- 안드로이드/갤럭시: Chrome에서 홈페이지 접속 → 경기 알림 받기 → 알림 권한 허용
- 아이폰 iOS 16.4 이상: Safari로 사이트 접속 → 공유 → 홈 화면에 추가 → 추가된 앱으로 열어 알림 받기 → 알림 허용
- 신청은 매 경기마다 반복하지 않고 기기/브라우저당 한 번만 합니다.
- 해제하려면 홈페이지에서 경기 알림 켜짐 · 해제를 누릅니다.
- 새 기기, 브라우저 데이터 삭제, 권한 차단 등의 경우 다시 신청해야 할 수 있습니다.

## 자동 발송 정책
- 기존 GitHub Actions가 약 10분마다 EA API에서 FC27 기록 수집을 시도합니다.
- 이전에 없던 leagueMatch ID가 확인될 때마다 점수, 승무패, 득점·도움, MVP 또는 최고평점, GK 선방을 알립니다.
- 탭 시 DOKDO FC의 경기 기록 메뉴로 연결합니다.
- data/push-state.json에 경기 ID를 기록해 중복 방지, OneSignal idempotency key로 재시도 중복도 제한합니다.
- 최초 설정 시 과거 경기 알림은 보내지 않습니다.
- 48시간 이상 오래된 신규 발견 기록은 알림 과다 발생을 막기 위해 전송하지 않습니다.
- EA 반영, GitHub 스케줄 지연, OneSignal 및 휴대폰 알림 정책에 따라 도착 시각이 변할 수 있습니다.
- OneSignal API가 수락해도 단말 화면에 표시되었다는 보장은 아닙니다.

## 문서
- https://onesignal.com/pricing
- https://documentation.onesignal.com/docs/en/web-sdk-setup
- https://documentation.onesignal.com/docs/en/web-push-custom-code-setup
- https://documentation.onesignal.com/docs/en/onesignal-service-worker
- https://documentation.onesignal.com/reference/create-message
