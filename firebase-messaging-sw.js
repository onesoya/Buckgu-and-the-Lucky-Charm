// ============================================================
// 중요: notificationclick 커스텀 처리는 Firebase(FCM) 라이브러리를
// import하기 전에 등록해야 함 - Firebase 공식 문서에도 명시된 사항.
// "make sure to handle notificationclick before you import FCM
// functions or libraries. Otherwise, FCM may overwrite the custom behavior."
// 순서를 지키지 않으면 FCM이 우리 클릭 처리를 덮어써서 무시할 수 있음.
// ============================================================

const SW_VERSION = '2026.07.13-6'; // 코드를 새로 줄 때마다 이 값을 올림 (배포 확인용)
const DEFAULT_LINK = 'https://onesoya.github.io/Buckgu-and-the-Lucky-Charm/';
const USER_AGENT = self.navigator.userAgent || '';
// 아이폰/아이팟만 (아이패드 제외) - 실제로 검증된 범위를 그대로 따름
const IS_IPHONE = /iPhone|iPod/i.test(USER_AGENT);
const IS_SAMSUNG_INTERNET = /Android/i.test(USER_AGENT) && /SamsungBrowser/i.test(USER_AGENT);

// ---- 화면 잠긴 채로 알림 받았을 때 대비: 최근 알림을 IndexedDB에 잠깐 저장 ----
// (백씨스터즈 앱도 같은 출처(onesoya.github.io)를 쓰기 때문에, 이름이 겹치지 않게
// 이 앱 전용 접두사를 붙임 - 안 그러면 localStorage/IndexedDB가 출처 단위로 공유돼서
// 두 앱의 데이터가 서로 섞일 수 있음)
const NOTIF_DB_NAME = 'buckgu-lucky-notif';
const NOTIF_STORE = 'pending';

function openNotifDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(NOTIF_DB_NAME, 1);
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(NOTIF_STORE)) {
        req.result.createObjectStore(NOTIF_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function savePendingNotif(payload) {
  try {
    const db = await openNotifDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(NOTIF_STORE, 'readwrite');
      tx.objectStore(NOTIF_STORE).put(payload, 'latest');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { /* 저장 실패해도 다른 경로로 계속 시도되니 무시 */ }
}
async function readPendingNotif() {
  try {
    const db = await openNotifDB();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(NOTIF_STORE, 'readonly');
      const getReq = tx.objectStore(NOTIF_STORE).get('latest');
      getReq.onsuccess = () => resolve(getReq.result || null);
      getReq.onerror = () => reject(getReq.error);
    });
  } catch (e) { return null; }
}
async function clearPendingNotif() {
  try {
    const db = await openNotifDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(NOTIF_STORE, 'readwrite');
      tx.objectStore(NOTIF_STORE).delete('latest');
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) { /* 무시 */ }
}

// ---- 알림 클릭 처리 (Firebase import보다 먼저 등록하는 게 핵심) ----
self.addEventListener('notificationclick', (event) => {
  // SDK가 자동으로 띄운 알림은 데이터가 FCM_MSG라는 키 아래에 감싸져 있을 때가 있어서
  // 두 가지 구조를 다 확인함
  const raw = event.notification.data || {};
  const fcmPayload = raw.FCM_MSG || null;
  const data = (fcmPayload && fcmPayload.data) ? fcmPayload.data : raw;
  const fcmLink = fcmPayload && fcmPayload.fcmOptions && fcmPayload.fcmOptions.link;

  // 우리 앱 알림이 아니면(어떤 이유로든 다른 알림이 이 리스너까지 왔다면) 손대지 않고 넘어감
  if (!data.tab && !data.link && !fcmLink) return;

  // 이 이벤트를 우리가 확실히 처리했다는 뜻으로, FCM 등 이후 리스너가 또 처리하지 못하게 막음
  event.stopImmediatePropagation();
  event.notification.close();

  const { link, tab, itemId, commentTs, notifId } = data;
  const targetLink = link || fcmLink || DEFAULT_LINK;
  const navPayload = { type: 'navigate', tab, itemId, commentTs, notifId, link: targetLink };

  event.waitUntil((async () => {
    const windowClients = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    // 같은 출처(onesoya.github.io)에 다른 앱(백씨스터즈 등)이 열려있을 수 있어서,
    // 반드시 이 서비스워커의 범위(scope) 안에 있는 창만 대상으로 함
    const appClients = windowClients.filter((client) => client.url.startsWith(self.registration.scope));

    if (appClients.length > 0) {
      const client = appClients.find((c) => c.focused)
        || appClients.find((c) => c.visibilityState === 'visible')
        || appClients[0];

      // 어떤 플랫폼이든 postMessage가 유실될 가능성에 대비해 먼저 저장해둠.
      // 정상적으로 처리되면 앱이 CLEAR_PENDING_NOTIF로 알아서 지움.
      await savePendingNotif(navPayload);

      if (IS_SAMSUNG_INTERNET) {
        // 삼성인터넷 전용: postMessage를 먼저 보내지 않는 게 핵심.
        // postMessage 직후 focus()를 부르면, 안드로이드가 그 PWA 작업(task)을
        // 원래 상태로 복원하는 과정과 겹치면서 방금 적용한 이동 결과를 덮어써버리는
        // 것으로 확인됨. 대신 먼저 저장해두고(위 IS_IPHONE과 같은 패턴을 여기서도 응용),
        // focus()로 작업 복원을 먼저 끝낸 뒤, 앱이 복귀 시점에 알아서 확인하러 오게 함.
        try { await client.focus(); } catch (e) { /* 실패해도 pending은 이미 저장됨 */ }
        return;
      }

      // 그 외 플랫폼: 기존처럼 postMessage로 확실하게 이동시킴 (실패해도 pending으로 복구 가능)
      client.postMessage(navPayload);
      try { await client.focus(); } catch (e) { /* 실패해도 pending으로 복구 가능 */ }
      return;
    }

    // 열려있는 창이 없으면: 새 창을 해당 링크로 열기
    if (self.clients.openWindow) {
      return self.clients.openWindow(targetLink);
    }
  })());
});

// ---- 그 외 앱 메시지 처리 (알림 확인/정리, 버전 확인) ----
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'CHECK_PENDING_NOTIF') {
    // 앱이 "혹시 놓친 알림 있어?"라고 물어보면 IndexedDB에서 꺼내서 돌려줌 (지우지는 않음 -
    // 여러 번 물어볼 수 있어서, 정리는 앱이 확실히 처리한 뒤 CLEAR_PENDING_NOTIF로 따로 요청함)
    event.waitUntil(
      readPendingNotif().then((pending) => {
        if (pending && event.source) event.source.postMessage(pending);
      })
    );
  } else if (event.data && event.data.type === 'CLEAR_PENDING_NOTIF') {
    event.waitUntil(clearPendingNotif());
  } else if (event.data && event.data.type === 'CHECK_SW_VERSION') {
    if (event.source) event.source.postMessage({ type: 'sw_version', version: SW_VERSION });
  } else if (event.data && event.data.type === 'CLOSE_NOTIFICATION' && event.data.tag) {
    // 알림함에서 "읽음 처리"하면, 잠금화면/알림창에 남아있는 그 알림도 같이 사라지게
    event.waitUntil(
      self.registration.getNotifications({ tag: event.data.tag }).then((notifs) => {
        notifs.forEach((n) => n.close());
      })
    );
  } else if (event.data && event.data.type === 'CLEAR_ALL_NOTIFICATIONS') {
    // 알림함의 "전체 삭제" 버튼 전용 - 절대 앱을 열 때마다 자동으로 호출하면 안 됨
    // (확인하지도 않았는데 시스템 알림이 사라지는 혼란을 방지하기 위해, 명시적으로
    // "전체 삭제"를 눌렀을 때만 호출되도록 app.js 쪽에서 관리함)
    event.waitUntil(
      self.registration.getNotifications().then((notifs) => {
        notifs.forEach((n) => n.close());
      })
    );
  }
});

// 예전 서비스 워커가 남아서 알림이 중복으로 뜨는 것을 방지:
// 새 버전이 설치되면 바로 활성화하고, 열려있는 페이지도 즉시 이 버전이 담당하게 함
self.addEventListener('install', () => {
  self.skipWaiting();
});
self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// ---- Firebase(FCM) 라이브러리는 여기서부터 - 위의 notificationclick 등록보다 뒤에 와야 함 ----
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/12.15.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyBQ3_IMYp3R_w68Pd8UuFZ6NJQBIgL4AG4",
  authDomain: "buckgu-and-the-lucky-charm.firebaseapp.com",
  projectId: "buckgu-and-the-lucky-charm",
  storageBucket: "buckgu-and-the-lucky-charm.firebasestorage.app",
  messagingSenderId: "533762071912",
  appId: "1:533762071912:web:6e6b3c370f5f2bdbcf8add"
});

const messaging = firebase.messaging();

// 중요: 여기서 showNotification()을 직접 호출하지 않음.
// 서버가 notification 필드도 같이 보내고 있어서, 브라우저(FCM SDK)가 이미 자동으로
// 알림을 띄워줌 - 여기서 또 띄우면 알림이 두 번 뜸.
// 그런데도 이 리스너를 "등록"은 해두는 이유: 삼성인터넷 등 일부 브라우저는
// onBackgroundMessage가 등록되어 있어야 푸시가 왔을 때 서비스워커가 확실히 깨어남.
messaging.onBackgroundMessage(async (payload) => {
  const data = (payload && payload.data) ? payload.data : {};
  if (!data.tab) return;

  // 앱이 완전히 꺼진 상태에서 새 알림이 와도 배지를 갱신하기 위함
  const unreadCount = Number(data.unreadCount);
  if ('setAppBadge' in self.navigator && Number.isFinite(unreadCount)) {
    try {
      if (unreadCount > 0) await self.navigator.setAppBadge(unreadCount);
      else if ('clearAppBadge' in self.navigator) await self.navigator.clearAppBadge();
    } catch (e) { /* 배지 API 미지원 브라우저는 조용히 무시 */ }
  }

  // 아이폰 전용 우회: WebKit의 알려진 버그(#7309)로, 화면이 잠긴 채로 알림을 누르면
  // notificationclick 자체가 아예 실행되지 않는 경우가 있음.
  // 그래서 "클릭 시점"이 아니라 "알림이 도착하는 시점"에 미리 저장해둠.
  // 다른 플랫폼은 notificationclick이 정상 작동하니 여기 포함시키면 안 됨.
  if (IS_IPHONE) {
    await savePendingNotif({
      type: 'navigate',
      tab: data.tab,
      itemId: data.itemId,
      commentTs: data.commentTs,
      notifId: data.notifId,
      link: data.link || DEFAULT_LINK,
      receivedAt: Date.now()
    });
  }
});
