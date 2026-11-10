/* DOKDO FC optional web push: no subscription requests until configured. */
(() => {
  'use strict';
  const btn = document.getElementById('pushToggle');
  const hint = document.getElementById('pushHint');
  if (!btn || !hint) return;
  const message = value => { hint.textContent = value; hint.hidden = !value; };
  const isIOS = /iPhone|iPad|iPod/.test(navigator.userAgent);
  const isStandalone = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const configURL = './push/config.json';

  async function start() {
    if (!window.isSecureContext) return;
    const response = await fetch(configURL, { cache: 'no-store' });
    if (!response.ok) return;
    const config = await response.json();
    const appId = typeof config.appId === 'string' ? config.appId.trim() : '';
    if (config.enabled !== true || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(appId)) return;

    if (isIOS && !isStandalone()) {
      btn.hidden = false;
      btn.textContent = '🔔 경기 알림 받기';
      btn.addEventListener('click', () => {
        message('아이폰에서는 Safari 공유 → 홈 화면에 추가 후, 추가된 DOKDO FC 아이콘을 열어 알림을 신청하세요.');
      });
      return;
    }
    if (!('serviceWorker' in navigator) || !('Notification' in window)) {
      btn.hidden = false;
      btn.textContent = '🔔 경기 알림 미지원';
      btn.disabled = true;
      message('이 브라우저는 웹 푸시를 지원하지 않습니다. Chrome 또는 Safari를 이용해 주세요.');
      return;
    }
    window.OneSignalDeferred = window.OneSignalDeferred || [];
    window.OneSignalDeferred.push(async function (OneSignal) {
      try {
        await OneSignal.init({
          appId,
          serviceWorkerPath: 'dokdo-fc/push/OneSignalSDKWorker.js',
          serviceWorkerParam: { scope: '/dokdo-fc/push/' },
          notifyButton: { enable: false },
          welcomeNotification: { disable: true },
          autoResubscribe: true
        });
        if (!OneSignal.Notifications.isPushSupported()) {
          btn.hidden = false;
          btn.disabled = true;
          btn.textContent = '🔔 경기 알림 미지원';
          return;
        }
        const sync = () => {
          const optedIn = OneSignal.User.PushSubscription.optedIn;
          btn.hidden = false;
          btn.disabled = false;
          btn.textContent = optedIn ? '🔔 경기 알림 켜짐 · 해제' : '🔔 경기 알림 받기';
          btn.setAttribute('aria-pressed', String(!!optedIn));
        };
        OneSignal.User.PushSubscription.addEventListener('change', sync);
        OneSignal.Notifications.addEventListener('permissionChange', sync);
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          message('');
          try {
            if (OneSignal.User.PushSubscription.optedIn) {
              await OneSignal.User.PushSubscription.optOut();
              message('이 기기에서 경기 알림을 해제했습니다.');
            } else if (Notification.permission === 'denied') {
              message('브라우저 설정에서 DOKDO FC의 알림 차단을 해제한 뒤 다시 시도하세요.');
            } else {
              await OneSignal.User.PushSubscription.optIn();
              message(OneSignal.User.PushSubscription.optedIn
                ? '신청 완료! 이후 새 리그 경기 결과가 확인되면 알림을 받습니다.'
                : '알림 권한이 허용되지 않았습니다. 브라우저 알림 설정을 확인하세요.');
            }
          } catch (error) {
            console.warn('DFC push subscription:', error);
            message('알림 설정에 실패했습니다. 브라우저 권한을 확인하고 다시 시도하세요.');
          } finally { sync(); }
        });
        sync();
      } catch (error) {
        console.warn('DFC push initialization:', error);
      }
    });
    const sdk = document.createElement('script');
    sdk.src = 'https://cdn.onesignal.com/sdks/web/v16/OneSignalSDK.page.js';
    sdk.defer = true;
    sdk.onerror = () => console.warn('DFC push SDK failed to load.');
    document.head.appendChild(sdk);
  }
  start().catch(error => console.warn('DFC push config:', error));
})();
