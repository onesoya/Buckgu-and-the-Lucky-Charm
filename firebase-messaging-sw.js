importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

// 예전 서비스 워커가 남아서 알림이 중복으로 뜨는 것을 방지:
// 새 버전이 설치되면 바로 활성화하고, 열려있는 페이지도 즉시 이 버전이 담당하게 함
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

firebase.initializeApp({
  apiKey: "AIzaSyBQ3_IMYp3R_w68Pd8UuFZ6NJQBIgL4AG4",
  authDomain: "buckgu-and-the-lucky-charm.firebaseapp.com",
  projectId: "buckgu-and-the-lucky-charm",
  storageBucket: "buckgu-and-the-lucky-charm.firebasestorage.app",
  messagingSenderId: "533762071912",
  appId: "1:533762071912:web:6e6b3c370f5f2bdbcf8add"
});

const messaging = firebase.messaging();
const DEFAULT_LINK = 'https://onesoya.github.io/Buckgu-and-the-Lucky-Charm/';

// 서버(Cloud Functions)에서 이제 data만 보내기 때문에, 알림 표시는
// 무조건 여기(onBackgroundMessage) 한 곳에서만 일어남 -> 중복 안 뜸
messaging.onBackgroundMessage((payload) => {
  const data = payload.data || {};
  const title = data.title || '벅구와 복덩어리';
  const body = data.body || '';
  const tab = data.tab || '';
  const itemId = data.itemId || '';
  const link = data.link || DEFAULT_LINK;

  const options = {
    body,
    icon: 'icon-180.png',
    badge: 'favicon-32.png',
    tag: 'bukgu-notification',
    data: { link, tab, itemId }
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const { link, tab, itemId } = event.notification.data || {};
  const targetLink = link || DEFAULT_LINK;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 이미 열려있는 창이 있으면: 주소 이동에만 의존하지 않고,
      // 페이지에 직접 "이 탭/게시글로 가" 메시지를 보내서 확실하게 이동시킴
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'navigate', tab, itemId, link: targetLink });
          if ('navigate' in client) {
            client.navigate(targetLink).catch(() => {});
          }
          return client.focus();
        }
      }
      // 열려있는 창이 없으면: 새 창을 해당 링크로 열기
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetLink);
      }
    })
  );
});
