# Play 프로텍트에 차단됐을 때 — DOKDO FC 봇 안전한 대체 경로

**메신저봇R APK 설치가 Google Play 프로텍트에 의해 차단됐다면, 보호 기능을 끄거나 강제로 설치하지 마세요.**

알림 접근과 접근성처럼 민감한 권한이 있는 외부 APK는 Google이 차단할 수 있습니다. 이것만으로 앱이 악성이라는 뜻은 아니지만, 실제 차단 원인을 확인하지 않고 우회 설치할 필요도 없습니다.

## 1단계: 구글 플레이스토어용 MacroDroid로 카카오톡 자동 응답 가능 여부 시험

[MacroDroid — Google Play](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid)

공식 플레이스토어에서 설치 가능하며, 무료 버전은 광고가 있고 **매크로 최대 5개**까지 지원합니다. 여기서는 테스트용 매크로 1개만 만듭니다.

1. 태블릿의 전용 카카오 계정으로 DOKDO FC 오픈채팅에 입장하고, 해당 방 메시지 알림을 켭니다.
2. Play 스토어에서 **MacroDroid** 설치.
3. MacroDroid 설정에서 **알림 접근 권한**을 허용합니다. 가능하면 배터리 제한을 해제합니다.
4. **매크로 추가** → **트리거(Triggers)** → **알림(Notification)** → **알림 수신(Notification Received)**.
5. 앱은 **카카오톡(KakaoTalk)**만 선택하고, 알림 본문에 `!DFC테스트` 포함을 조건으로 지정합니다. 가능하면 **제목과 메시지 구분(Separate title and message)**을 켜고 방 제목 `DOKDO FC`도 추가 확인합니다. *카카오톡 알림 제목 형식은 앱 버전에 따라 달라질 수 있으므로 실제 알림을 보고 조정하세요.*
6. **동작(Actions)** → **알림 답장(Notification Reply)** → **알림 트리거 사용(Use Notification Trigger)**.
7. 답장 내용은 `⚽ DFC 봇 테스트 성공! 이 메시지는 태블릿에서 자동으로 발송됐습니다.`로 지정합니다.
8. 저장하고 매크로 활성화. 태블릿의 카카오톡은 백그라운드에 두세요.
9. **다른 카카오 계정**으로 방에 `!DFC테스트`라고 입력합니다. *태블릿 계정 스스로 보낸 글은 카카오톡 알림이 오지 않을 수 있습니다.*
10. 방에 자동 답장이 올라오면 **카카오 알림 기반 회신 경로가 작동한다는 1차 테스트 성공**입니다. 답장이 없으면 먼저 태블릿의 카카오톡 알림 자체가 뜨는지 확인하세요.

### 1차 테스트가 성공해도 아직 입증되지 않은 것

- 즉시 반응하는 **알림 답장**과, 경기 종료 후 수십 분이 지나 **봇이 독립적으로 새 메시지를 발송**하는 것은 다릅니다.
- MacroDroid의 Notification Reply는 카카오톡 알림의 *빠른 답장(RemoteInput)*을 활용할 때만 작동할 수 있습니다. 최신 카카오톡이 지원하지 않거나 세션이 사라지면 실패할 수 있습니다.
- 기존 [메신저봇R용 API2 JavaScript](./DFC-OpenChat-API2.js)는 **MacroDroid에 그대로 붙여넣을 수 없습니다**. 동작을 확인한 뒤 매크로 구성으로 재구현해야 합니다.
- 경기 시작은 EA 데이터만으로 실시간 자동 감지가 검증되지 않았습니다.
- 다른 대화방에 원치 않는 답장이 나가는 것을 막기 위해 반드시 **전용 카카오 계정과 특정 방 제목 필터**를 사용하세요.

## 원천 자료
- [MacroDroid Play 스토어](https://play.google.com/store/apps/details?id=com.arlosoft.macrodroid)
- [MacroDroid 알림 수신 트리거](https://macrodroidforum.com/wiki/index.php/Trigger:_Notification)
- [MacroDroid 알림 답장 동작](https://macrodroidforum.com/wiki/index.php/Action:_Notification_Reply)
- [Google Play 프로텍트 앱 차단 가이드](https://developers.google.com/android/play-protect/warning-dev-guidance?hl=ko)

**현재 DOKDO FC 홈페이지와 경기 기록 보관은 영향을 받지 않습니다.** 이 안내는 구글 플레이에서 안전하게 설치 가능한 대체 도구의 가능성을 테스트하기 위한 것입니다.
