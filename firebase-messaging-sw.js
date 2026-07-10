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

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || '벅구와 복덩어리';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: 'icon-180.png',
    badge: 'favicon-32.png'
  };
  self.registration.showNotification(title, options);
});
