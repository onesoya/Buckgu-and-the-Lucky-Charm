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

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || '벅구와 복덩어리';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: 'icon-180.png',
    badge: 'favicon-32.png',
    tag: 'bukgu-notification'
  };
  self.registration.showNotification(title, options);
});
