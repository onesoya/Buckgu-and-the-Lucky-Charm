const {onDocumentCreated, onDocumentUpdated} = require("firebase-functions/v2/firestore");
const {onCall, HttpsError} = require("firebase-functions/v2/https");
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {defineSecret} = require("firebase-functions/params");
const {initializeApp} = require("firebase-admin/app");
const {getMessaging} = require("firebase-admin/messaging");
const {getFirestore} = require("firebase-admin/firestore");

initializeApp();

const kakaoRestKey = defineSecret("KAKAO_REST_KEY");

const SITE_URL = "https://onesoya.github.io/Buckgu-and-the-Lucky-Charm/";

const COLLECTION_INFO = {
  schedule: {label: "일정", particle: "을", tab: "schedule"},
  wishlist: {label: "위시", particle: "를", tab: "wish"},
  datelog: {label: "데이트 기록", particle: "을", tab: "datelog"},
  stamps: {label: "스탬프", particle: "를", tab: "stamp"},
  letters: {label: "편지", particle: "를", tab: "letter"},
};

function particleFor(name) {
  return name === "소정" ? "이가" : "가";
}
// 호격조사(부르는 말): 받침 있으면 "아", 없으면 "야" -> 소정아 / 선호야
function vocativeFor(name) {
  return name === "소정" ? "아" : "야";
}

async function sendToOther(author, title, body, tab, itemId, commentTs) {
  if (!author || (author !== "소정" && author !== "선호")) return;
  const otherName = author === "소정" ? "선호" : "소정";
  const db = getFirestore();

  // 알림함에 항상 기록 (발송 성공 여부와 무관하게 - 푸시가 실패해도 앱을 열면 알림함에서 보임)
  const notifRef = db.collection("notifications").doc(otherName).collection("items").doc();
  const notifId = notifRef.id;
  await notifRef.set({
    title, body, tab, itemId: String(itemId),
    commentTs: commentTs ? String(commentTs) : "",
    createdAt: Date.now(), read: false,
  });
  const unreadSnap = await db.collection("notifications").doc(otherName).collection("items")
      .where("read", "==", false).get();
  const unreadCount = unreadSnap.size;

  // 한 사람이 여러 기기(아이폰+아이패드 등)에 로그인했을 수 있어서, 등록된 기기 전부에 보냄
  const devicesSnap = await db.collection("fcmTokens").doc(otherName).collection("devices").get();
  if (devicesSnap.empty) {
    console.log(`알림 미발송: ${otherName}의 등록된 기기 없음`);
    return;
  }

  const hashPart = commentTs ? `${tab}:${itemId}:c${commentTs}` : `${tab}:${itemId}`;
  // notifId를 쿼리로 실어 보냄: 앱이 완전히 꺼져있어서 콜드 스타트로 열릴 때도
  // 이 알림을 읽음 처리할 수 있게 하기 위함 (postMessage를 받을 창이 없는 경우 대비)
  const personalLink = `${SITE_URL}?notif=${notifId}#${hashPart}`;

  await Promise.all(devicesSnap.docs.map(async (deviceDoc) => {
    const token = deviceDoc.data().token;
    if (!token) return;
    try {
      // notification 필드를 포함함: 삼성인터넷 등 일부 브라우저는 data-only 메시지일 때
      // 서비스워커가 안 깨어나서 알림 자체가 안 오는 경우가 있음.
      // 대신 서비스워커의 onBackgroundMessage는 등록만 하고 아무것도 안 띄우게 해서
      // (SDK 자동표시 + 우리 표시가 겹쳐서 중복 뜨는 것을 방지) 딱 한 번만 뜨도록 함.
      const messageId = await getMessaging().send({
        token,
        notification: {title, body},
        data: {
          title, body, tab, itemId, link: personalLink,
          commentTs: commentTs ? String(commentTs) : "",
          notifId, unreadCount: String(unreadCount),
        },
        webpush: {
          headers: {Urgency: "high"}, // 안드로이드 절전모드(Doze)에서 배송 지연/누락 방지
          fcmOptions: {link: personalLink}, // SDK 자체 클릭 처리용 폴백
          notification: {tag: notifId}, // 나중에 이 알림만 콕 집어서 닫을 수 있게 하는 열쇠
        },
      });
      console.log(`알림 발송 성공: ${otherName}/${deviceDoc.id} (messageId: ${messageId})`);
    } catch (e) {
      console.error(`알림 발송 실패 (${otherName}/${deviceDoc.id}):`, e.code || e.message);
      // 토큰이 만료/무효화된 경우, 다음에 또 실패하지 않도록 그 기기 문서만 정리
      if (e.code === "messaging/registration-token-not-registered" ||
          e.code === "messaging/invalid-registration-token") {
        await db.collection("fcmTokens").doc(otherName).collection("devices").doc(deviceDoc.id)
            .delete().catch(() => {});
      }
    }
  }));
}

// ---- 새 글 작성 알림 (기존 기능, itemId만 추가됨) ----
async function notifyOther(collectionName, docData, docId) {
  const author = docData.author || docData.person;
  if (!author) return;

  const info = COLLECTION_INFO[collectionName] || {label: "새 글", particle: "을", tab: "schedule"};

  // 잠긴 편지(특정 날짜/시간까지 비공개)는 알림에 제목/내용을 미리 보여주지 않음 (스포일러 방지)
  const unlockTime = docData.unlockTime || "00:00";
  const unlockTs = docData.unlockDate ? new Date(`${docData.unlockDate}T${unlockTime}:00+09:00`).getTime() : 0;
  const isLockedLetter = collectionName === "letters" && docData.unlockDate && unlockTs > Date.now();

  const title = `${author}${particleFor(author)} ${info.label}${info.particle} 남겼어 🐶`;
  const bodyText = isLockedLetter
    ? `🔒 ${docData.unlockDate} ${unlockTime}에 열어볼 수 있어`
    : (docData.title || docData.text || docData.body || "");

  await sendToOther(author, title, bodyText.slice(0, 80), info.tab, docId);
}

exports.onScheduleCreate = onDocumentCreated("schedule/{id}", (event) =>
  notifyOther("schedule", event.data.data(), event.params.id)
);
exports.onWishlistCreate = onDocumentCreated("wishlist/{id}", (event) =>
  notifyOther("wishlist", event.data.data(), event.params.id)
);
exports.onDatelogCreate = onDocumentCreated("datelog/{id}", (event) =>
  notifyOther("datelog", event.data.data(), event.params.id)
);
exports.onStampsCreate = onDocumentCreated("stamps/{id}", (event) =>
  notifyOther("stamps", event.data.data(), event.params.id)
);
exports.onLettersCreate = onDocumentCreated("letters/{id}", (event) =>
  notifyOther("letters", event.data.data(), event.params.id)
);

// ---- 좋아요 / 댓글 알림 (신규) ----
async function notifyReaction(collectionName, beforeData, afterData, docId) {
  const info = COLLECTION_INFO[collectionName] || {label: "글", tab: "schedule"};
  const unlockTime = afterData.unlockTime || "00:00";
  const unlockTs = afterData.unlockDate ? new Date(`${afterData.unlockDate}T${unlockTime}:00+09:00`).getTime() : 0;
  const isLockedLetter = collectionName === "letters" && afterData.unlockDate && unlockTs > Date.now();
  const postTitle = isLockedLetter ? "🔒 잠긴 편지" : (afterData.title || afterData.text || afterData.body || "");

  // 좋아요 감지: 이전보다 늘어났고, 새로 추가된 사람이 있으면
  const beforeLikes = beforeData.likes || [];
  const afterLikes = afterData.likes || [];
  if (afterLikes.length > beforeLikes.length) {
    const newLiker = afterLikes.find((p) => !beforeLikes.includes(p));
    if (newLiker) {
      const title = `${newLiker}${particleFor(newLiker)} 좋아요를 눌렀어 ❤️`;
      await sendToOther(newLiker, title, postTitle.slice(0, 60), info.tab, docId);
    }
  }

  // 댓글 감지: 이전보다 늘어났고, 새로 추가된 댓글이 있으면
  const beforeComments = beforeData.comments || [];
  const afterComments = afterData.comments || [];
  if (afterComments.length > beforeComments.length) {
    const beforeTsSet = new Set(beforeComments.map((c) => c.ts));
    const newComment = afterComments.find((c) => !beforeTsSet.has(c.ts));
    if (newComment && newComment.author) {
      const title = `${newComment.author}${particleFor(newComment.author)} 댓글을 달았어 💬`;
      const body = `${postTitle.slice(0, 20)} · ${(newComment.text || "").slice(0, 50)}`;
      await sendToOther(newComment.author, title, body, info.tab, docId, newComment.ts);
    }
  }
}

exports.onDatelogUpdate = onDocumentUpdated("datelog/{id}", (event) =>
  notifyReaction("datelog", event.data.before.data(), event.data.after.data(), event.params.id)
);
exports.onStampsUpdate = onDocumentUpdated("stamps/{id}", (event) =>
  notifyReaction("stamps", event.data.before.data(), event.data.after.data(), event.params.id)
);
exports.onLettersUpdate = onDocumentUpdated("letters/{id}", (event) =>
  notifyReaction("letters", event.data.before.data(), event.data.after.data(), event.params.id)
);

// ---- 애정 신호(마음 보내기) 생성시 상대방에게 알림 ----
const LOVE_SIGNAL_DEFS = {
  missYou: {emoji: "❤️", label: "보고 싶어"},
  hug: {emoji: "🫂", label: "안아주기"},
  thought: {emoji: "🐶", label: "생각났어"},
  cheer: {emoji: "💪", label: "힘내"},
  rest: {emoji: "☕", label: "쉬었다 해"},
  love: {emoji: "😘", label: "사랑해"},
};
exports.onLoveSignalCreate = onDocumentCreated("loveSignals/{id}", async (event) => {
  const data = event.data.data();
  const sender = data.sender;
  if (!sender || (sender !== "소정" && sender !== "선호")) return;

  const def = LOVE_SIGNAL_DEFS[data.type];
  if (!def) return; // 허용된 신호 종류가 아니면 무시

  const expectedReceiver = sender === "소정" ? "선호" : "소정";
  if (data.receiver !== expectedReceiver) return; // 클라이언트가 잘못 보낸 값 방어

  // 알림 문구는 잠금화면에서도 안전하게 간단히만 (실제 신호 내용은 앱 홈에서 확인하도록).
  // 상세/간단 알림 중 고를 수 있는 기능은 나중 단계에서 기기별 설정으로 추가 예정.
  await sendToOther(sender, `${sender}${particleFor(sender)} 마음을 보냈어 💜`, "앱에서 확인해봐", "home", "loveSignal");
});

// ---- 잠긴 편지가 풀리는 시점에 받는 사람에게 알림 (5분마다 확인) ----
async function notifyLetterUnlocked(docData, docId) {
  const author = docData.author;
  if (!author || (author !== "소정" && author !== "선호")) return;
  const recipient = author === "소정" ? "선호" : "소정";
  const title = `${recipient}${vocativeFor(recipient)}, 편지가 열렸어 💌`;
  const body = docData.title || "편지를 확인해봐";
  await sendToOther(author, title, body.slice(0, 80), "letter", docId);
}

exports.checkLetterUnlocks = onSchedule(
  {schedule: "every 5 minutes", region: "asia-northeast3", timeZone: "Asia/Seoul"},
  async () => {
    const db = getFirestore();
    const now = Date.now();
    const snap = await db.collection("letters").get();

    let processedCount = 0;
    for (const doc of snap.docs) {
      const data = doc.data();
      if (!data.unlockDate || data.unlockNotified) continue;
      const unlockTime = data.unlockTime || "00:00";
      const unlockTs = new Date(`${data.unlockDate}T${unlockTime}:00+09:00`).getTime();
      if (unlockTs > now) continue;

      try {
        // 알림함 기록과 푸시 발송을 먼저 끝내고, 그게 성공했을 때만 완료 표시함.
        // 동시에 실행하면 "발송은 실패했는데 완료 표시만 성공"하는 경우 알림을
        // 영영 놓칠 수 있어서, 순서를 보장함.
        await notifyLetterUnlocked(data, doc.id);
        await doc.ref.update({unlockNotified: true});
        processedCount++;
      } catch (err) {
        console.error(`편지 잠금 해제 알림 실패: ${doc.id}`, err);
        // unlockNotified를 안 바꿔서, 다음 5분 스케줄에서 다시 시도할 수 있게 둠
      }
    }

    console.log(`잠금 해제 확인 완료: ${processedCount}건`);
  }
);

// ---- 위치 검색 (카카오 + Photon) ----
exports.geocodePlace = onCall({secrets: [kakaoRestKey], region: "asia-northeast3"}, async (request) => {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "로그인이 필요해.");
  }
  const allowedEmails = new Set(["sjsj980415@gmail.com", "kkang59405@gmail.com"]);
  if (!allowedEmails.has(request.auth.token.email)) {
    throw new HttpsError("permission-denied", "사용할 수 없는 계정이야.");
  }

  const query = (request.data && request.data.query) || "";
  if (!query) return {results: []};

  const results = [];

  try {
    const kakaoRes = await fetch(
      `https://dapi.kakao.com/v2/local/search/keyword.json?query=${encodeURIComponent(query)}&size=5`,
      {headers: {Authorization: `KakaoAK ${kakaoRestKey.value()}`}}
    );
    const kakaoData = await kakaoRes.json();
    if (kakaoData.documents) {
      kakaoData.documents.forEach((d) => {
        results.push({
          name: d.place_name,
          address: d.road_address_name || d.address_name,
          lat: parseFloat(d.y),
          lng: parseFloat(d.x),
        });
      });
    }
  } catch (e) {
    console.error("카카오 검색 실패", e);
  }

  if (results.length === 0) {
    try {
      const photonRes = await fetch(
        `https://photon.komoot.io/api/?q=${encodeURIComponent(query)}&limit=5`
      );
      const photonData = await photonRes.json();
      if (photonData.features) {
        photonData.features.forEach((f) => {
          const [lon, lat] = f.geometry.coordinates;
          const p = f.properties || {};
          const name = p.name || p.street || query;
          const address = [p.city, p.state, p.country].filter(Boolean).join(", ");
          results.push({name, address, lat, lng: lon});
        });
      }
    } catch (e) {
      console.error("포톤 검색 실패", e);
    }
  }

  return {results};
});
