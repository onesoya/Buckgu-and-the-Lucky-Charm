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

// 중요: 여기서 showNotification()을 직접 호출하지 않음.
// 서버가 notification 필드도 같이 보내고 있어서, 브라우저(FCM SDK)가 이미 자동으로
// 알림을 띄워줌 - 여기서 또 띄우면 알림이 두 번 뜸.
// 그런데도 이 리스너를 "등록"은 해두는 이유: 삼성인터넷 등 일부 브라우저는
// onBackgroundMessage가 등록되어 있어야 푸시가 왔을 때 서비스워커가 확실히 깨어남.
// (등록만 하고 비워두는 게 핵심 - 표시는 SDK한테 맡김)
messaging.onBackgroundMessage(() => {
  // 의도적으로 비워둠
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  // SDK가 자동으로 띄운 알림은 데이터가 FCM_MSG라는 키 아래에 감싸져 있을 때가 있어서
  // 두 가지 구조를 다 확인함
  const raw = event.notification.data || {};
  const data = (raw.FCM_MSG && raw.FCM_MSG.data) ? raw.FCM_MSG.data : raw;
  const { link, tab, itemId, commentTs } = data;
  const targetLink = link || DEFAULT_LINK;

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      // 이미 열려있는 창이 있으면: postMessage로 "이 탭/게시글로 가" 신호를 보내서 이동시킴.
      // (예전엔 안전장치로 client.navigate()도 같이 불렀는데, 이게 페이지를 다시 불러오는
      // 효과를 내서 postMessage로 시작된 스크롤/펼치기 작업을 화면이 초기화되며 끊어버리는
      // 것으로 확인되어 제거함. 지금은 다들 최신 페이지를 쓰고 있어서 postMessage 하나로 충분함.)
      for (const client of windowClients) {
        if ('focus' in client) {
          client.postMessage({ type: 'navigate', tab, itemId, commentTs, link: targetLink });
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
