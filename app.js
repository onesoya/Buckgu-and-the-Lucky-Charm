(function(){
  const APP_VERSION = '2026.07.13-13'; // 코드를 새로 줄 때마다 이 값을 올림 (배포 확인용)
  // 백씨스터즈 앱도 같은 출처(onesoya.github.io)를 써서, localStorage/IndexedDB가 출처 단위로
  // 공유됨 -> 이름이 겹치면 임시저장 내용 등이 서로 섞일 수 있어서 이 앱 전용 접두사를 붙임
  const STORAGE_PREFIX = 'buckgu_lucky_';
  // iOS 사파리는 이게 없으면 버튼 :active(눌림) CSS가 탭 했을 때 거의 안 켜짐
  document.addEventListener('touchstart', function(){}, {passive:true});

  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const ANNIV = '2026-02-02';

  const firebaseConfig = {
    apiKey: "AIzaSyBQ3_IMYp3R_w68Pd8UuFZ6NJQBIgL4AG4",
    authDomain: "buckgu-and-the-lucky-charm.firebaseapp.com",
    projectId: "buckgu-and-the-lucky-charm",
    storageBucket: "buckgu-and-the-lucky-charm.firebasestorage.app",
    messagingSenderId: "533762071912",
    appId: "1:533762071912:web:6e6b3c370f5f2bdbcf8add"
  };
  firebase.initializeApp(firebaseConfig);
  const db = firebase.firestore();
  const storage = firebase.storage();

db.enablePersistence()
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn('여러 탭이 열려 있어 오프라인 모드를 켤 수 없어.');
      } else if (err.code == 'unimplemented') {
        console.warn('이 브라우저는 오프라인 모드를 지원하지 않아.');
      }
    });
  
  let identity = null;
  let schedule = [], wishes = [], dateLogs = [], stamps = [], letters = [];
  let stampPerson = null;
  let pendingWishPhotos = [], pendingDateLogPhotos = [], pendingStampPhotos = [], pendingLetterPhotos = [];
  let pendingDateLogGeo = null;
  let searchQuery = '';
  
  async function searchLocations(query){
    if(!query) return [];
    try{
      const callable = firebase.app().functions('asia-northeast3').httpsCallable('geocodePlace');
      const result = await callable({ query });
      return (result.data && result.data.results) || [];
    }catch(e){ console.error('위치 검색 실패', e); return []; }
  }

function resizeImage(file){
    return new Promise((resolve, reject)=>{
      const reader = new FileReader();
      reader.onload = (e)=>{
        const img = new Image();
        img.onload = ()=>{
          let w = img.width, h = img.height;
          const maxDim = 900;
          if(w > maxDim || h > maxDim){
            if(w > h){ h = Math.round(h * maxDim / w); w = maxDim; }
            else { w = Math.round(w * maxDim / h); h = maxDim; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w; canvas.height = h;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, w, h);
          
          // 파일 원본이 PNG인지 확인!
          const isPng = file.type === 'image/png';
          
          // PNG면 투명도 유지를 위해 PNG로, 아니면 용량을 위해 JPEG로 설정
          const outputType = isPng ? 'image/png' : 'image/jpeg';
          const outputQuality = isPng ? undefined : 0.55; // PNG는 화질 옵션이 무시됨

          canvas.toBlob((blob) => {
            if(!blob) return reject('이미지 변환 실패');
            resolve({
              url: URL.createObjectURL(blob), // 화면 미리보기용 가짜 URL
              blob: blob // Storage 업로드용 진짜 파일 데이터
            });
          }, outputType, outputQuality);
        };
        img.onerror = reject;
        img.src = e.target.result;
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }
  
  function revokePendingPhotoUrls(photosArray){
    (photosArray || []).forEach(p => {
      if(p && typeof p !== 'string' && p.url) URL.revokeObjectURL(p.url);
    });
  }

  function renderPhotoPreviewGrid(wrapId, getPhotos, setPhotos){
    const wrap = document.getElementById(wrapId);
    const photos = getPhotos();
    if(!photos || photos.length === 0){
      wrap.innerHTML = '';
      wrap.classList.add('hidden');
      return;
    }
    wrap.classList.remove('hidden');
    wrap.innerHTML = photos.map((p,i)=>{
      const src = typeof p === 'string' ? p : p.url; // 기존 사진은 string, 새 사진은 object
      return `
        <div class="photo-thumb">
          <img src="${src}">
          <button type="button" class="rm-photo-thumb" data-idx="${i}">✕</button>
        </div>
      `;
    }).join('');
    
    wrap.querySelectorAll('.rm-photo-thumb').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const idx = Number(btn.dataset.idx);
        const updated = getPhotos().slice();
        const removed = updated.splice(idx, 1)[0];
        
        // 브라우저 메모리 누수 방지
        if(typeof removed !== 'string' && removed.url) URL.revokeObjectURL(removed.url); 
        
        setPhotos(updated);
        renderPhotoPreviewGrid(wrapId, getPhotos, setPhotos);
      });
    });
  }

async function uploadPhotos(photosArray, onProgress) {
    const newPhotos = photosArray.filter(p => p && p.blob);
    const totalBytes = newPhotos.reduce((sum, p) => sum + p.blob.size, 0);
    const transferredMap = new Map();

    function reportProgress(){
      if(!onProgress || totalBytes === 0) return;
      let transferred = 0;
      transferredMap.forEach(v => transferred += v);
      onProgress(Math.min(100, Math.round((transferred / totalBytes) * 100)));
    }

    const uploadPromises = photosArray.map(async (p) => {
      if (typeof p === 'string') {
        // 이미 저장되어 있던 기존 사진 (수정 모드일 때)
        return p;
      } else if (p && p.blob) {
        // 새로 등록하는 사진 -> Storage 업로드
        // 파일 타입이 image/png면 확장자를 png로, 아니면 jpg로 설정!
        const ext = p.blob.type === 'image/png' ? 'png' : 'jpg';
        const fileName = `images/${identity || 'user'}_${Date.now()}_${Math.random().toString(36).substr(2,5)}.${ext}`;

        const ref = storage.ref().child(fileName);
        const task = ref.put(p.blob);
        task.on('state_changed', (snap)=>{
          transferredMap.set(p, snap.bytesTransferred);
          reportProgress();
        });
        await task;
        transferredMap.set(p, p.blob.size);
        reportProgress();
        return await ref.getDownloadURL();
      }
      return null;
    });
    const results = await Promise.all(uploadPromises);
    return results.filter(url => url !== null);
  }
  
// Storage에서 실제 이미지 파일 삭제하는 함수
  async function deletePhotosFromStorage(photosArray) {
    if (!photosArray || photosArray.length === 0) return;
    for (const url of photosArray) {
      try {
        // Firebase Storage URL인 경우에만 삭제 시도
        if (typeof url === 'string' && url.includes('firebasestorage')) {
          const ref = storage.refFromURL(url); // URL로 파일 위치 바로 찾기
          await ref.delete(); // 실제 파일 삭제!
        }
      } catch (e) {
        console.error('Storage 이미지 삭제 실패:', e);
      }
    }
  }
  
  function setupPhotoPicker(inputId, btnId, wrapId, getPhotos, setPhotos){
    const input = document.getElementById(inputId);
    document.getElementById(btnId).addEventListener('click', ()=> input.click());
    input.addEventListener('change', async ()=>{
      if(!input.files || !input.files.length) return;
      showLoadingOverlay('사진 처리 중이야...<br>잠시만 기다려줘');
      try{
        const files = Array.from(input.files);
        const newPhotos = await Promise.all(files.map(f=>resizeImage(f)));
        setPhotos(getPhotos().concat(newPhotos));
        renderPhotoPreviewGrid(wrapId, getPhotos, setPhotos);
      }catch(e){ console.error('사진 처리 실패', e); }
      finally{ hideLoadingOverlay(); }
      input.value = '';
    });
  }

  function setupAutoGrow(textareaId, maxHeight){
    const el = document.getElementById(textareaId);
    if(!el) return;
    const maxH = maxHeight || 240;
    function resize(){
      el.style.height = 'auto';
      el.style.height = Math.min(el.scrollHeight, maxH) + 'px';
    }
    el.addEventListener('input', resize);
    el._autoGrowResize = resize;
    resize();
  }

  // 작성 중인 글 자동 임시저장 (알림 등으로 화면이 새로고침돼도 쓰던 내용이 안 날아가게)
  function setupDraftAutosave(storageKey, fieldIds){
    // 복원
    try{
      const saved = localStorage.getItem(storageKey);
      if(saved){
        const data = JSON.parse(saved);
        fieldIds.forEach(id => {
          const el = document.getElementById(id);
          if(el && data[id]){
            el.value = data[id];
            if(el._autoGrowResize) el._autoGrowResize();
          }
        });
      }
    }catch(e){}

    // 입력할 때마다 저장
    const save = () => {
      const data = {};
      fieldIds.forEach(id => {
        const el = document.getElementById(id);
        if(el) data[id] = el.value;
      });
      try{ localStorage.setItem(storageKey, JSON.stringify(data)); }catch(e){}
    };
    fieldIds.forEach(id => {
      const el = document.getElementById(id);
      if(el) el.addEventListener('input', save);
    });
  }
  function clearDraftAutosave(storageKey){
    try{ localStorage.removeItem(storageKey); }catch(e){}
  }

  // 탭 이름(schedule/wish/datelog/stamp/letter) -> Firestore 컬렉션 이름 매핑
  // (댓글/답글 상태(openCommentSections, replyingToMap)의 키가 컬렉션 이름 기준이라 필요함)
  const tabToColName = { datelog:'datelog', stamp:'stamps', letter:'letters' };
  // 탭 이름 -> 실제 Firestore 컬렉션 이름 (삭제 여부를 서버에 직접 확인할 때 씀)
  const TAB_TO_COLLECTION = { schedule:'schedule', wish:'wishlist', datelog:'datelog', stamp:'stamps', letter:'letters' };

  // ---- 알림 등으로 특정 게시물/댓글까지 스크롤하기 (지속 확인 방식) ----
  // "몇 번 재시도하다 포기" 대신, 목표를 전역 상태로 기억해두고
  // 여러 경로(즉시/렌더될때마다/화면이 실제로 보이는 시점/폴링)에서 계속 확인함.
  // 하나라도 걸리면 성공 - 안드로이드에서 setTimeout이 지연/스킵되는 경우까지 대비.
  let pendingScrollTarget = null; // { tab, itemId, commentTs }
  let scrollPollInterval = null;

  function clearScrollState(){
    pendingScrollTarget = null;
    if(scrollPollInterval){ clearInterval(scrollPollInterval); scrollPollInterval = null; }
  }

  function scrollToEl(el){
    setTimeout(() => {
      el.getBoundingClientRect(); // 스크롤 직전 레이아웃 계산을 강제로 끝내서, 위치 계산이 덜 된 채로 스크롤되는 것 방지
      el.scrollIntoView({behavior:'smooth', block:'center'});
      el.classList.add('search-flash');
      setTimeout(()=> el.classList.remove('search-flash'), 1600);
    }, 200);
  }

  function tryConsumePendingScroll(){
    if(!pendingScrollTarget) return;
    const { tab, itemId, commentTs } = pendingScrollTarget;
    const card = document.querySelector(`[data-item-id="${itemId}"]`);

    if(!card){
      // 4초 넘게 카드를 못 찾았으면, 단순 로딩 지연인지 진짜 삭제된 건지 서버에 직접 확인
      if(!pendingScrollTarget.postCheckScheduled && Date.now() - pendingScrollTarget.setAt > 4000){
        pendingScrollTarget.postCheckScheduled = true;
        verifyDeletedPostTarget({ tab, itemId, commentTs });
      }
      return; // 아직 카드가 없음 - 다음 기회에 (렌더 훅이 다시 불러줌)
    }

    const detail = card.querySelector('.post-detail');
    if(detail) detail.classList.remove('hidden');

    if(!commentTs){
      clearScrollState();
      scrollToEl(card);
      return;
    }

    // 댓글 알림이면 댓글창도 펼침
    if(tabToColName[tab]) openCommentSections.add(`${tabToColName[tab]}-${itemId}`);
    const section = card.querySelector('.comment-section');
    if(section) section.classList.add('active');

    const commentEl = card.querySelector(`.comment-item[data-comment-ts="${commentTs}"]`);
    if(commentEl){
      clearScrollState();
      scrollToEl(commentEl);
      return;
    }

    // 게시글은 있는데 그 댓글/답글만 안 보이면, 0.4초 뒤 서버에서 진짜 있는지 확인
    // (게시글은 이미 있으니 훨씬 짧게 기다려도 됨)
    if(!pendingScrollTarget.commentCheckScheduled){
      pendingScrollTarget.commentCheckScheduled = true;
      setTimeout(() => verifyMissingCommentTarget({ tab, itemId, commentTs }), 400);
    }
    // 못 찾았으면 pendingScrollTarget은 그대로 둬서 다음 기회(렌더/이벤트/폴링)에 다시 시도
  }

  // 비동기로 서버 확인하는 동안, 사용자가 다른 알림을 눌러서 다른 대상으로 이동했을 수 있음
  // -> 그 사이 확인 결과가 나와도 화면에 띄우면 안 되므로, 지금 목표가 여전히 같은지 검사
  function isSamePendingTarget(target){
    const current = pendingScrollTarget;
    if(!current) return false;
    return current.tab === target.tab && current.itemId === target.itemId
      && String(current.commentTs||'') === String(target.commentTs||'');
  }

  async function verifyDeletedPostTarget(target){
    const col = TAB_TO_COLLECTION[target.tab];
    if(!col) return;
    try{
      const snap = await db.collection(col).doc(target.itemId).get({ source: 'server' });
      if(!isSamePendingTarget(target)) return;
      if(!snap.exists){
        clearScrollState();
        showPushToast('삭제된 게시물이야', null, null, null, null, true);
      }
      // 문서가 있으면 단순 로딩 지연이므로 계속 기다림 (아무것도 안 함)
    }catch(e){ /* 네트워크 문제 등 - 계속 폴링에 맡김 */ }
  }

  async function verifyMissingCommentTarget(target){
    const col = TAB_TO_COLLECTION[target.tab];
    if(!col) return;
    try{
      const snap = await db.collection(col).doc(target.itemId).get({ source: 'server' });
      if(!isSamePendingTarget(target)) return;
      if(!snap.exists){
        clearScrollState();
        showPushToast('삭제된 게시물이야', null, null, null, null, true);
        return;
      }
      const comments = (snap.data().comments || []);
      // 답글이 달린 댓글을 지운 경우 톰스톤(deleted:true)으로 남기 때문에, ts로는 여전히 찾아짐
      // -> 정상적으로 그 자리로 스크롤됨. 진짜 안내가 필요한 건 "완전히 사라진" 경우뿐.
      const targetComment = comments.find(c => String(c.ts) === String(target.commentTs));
      if(!targetComment){
        clearScrollState();
        // 게시물 자체는 있으니, 댓글 대신 게시물 위치로는 스크롤해줌
        const card = document.querySelector(`[data-item-id="${target.itemId}"]`);
        if(card) scrollToEl(card);
        showPushToast('해당 댓글은 삭제됐어', null, null, null, null, true);
      }
      // 찾아지면 Firestore엔 있는데 DOM에 아직 안 나타난 것 -> 렌더 지연이므로 계속 재시도
    }catch(e){ /* 무시 */ }
  }

  // 화면이 실제로 "보이게 되는" 시점들을 최대한 포착
  document.addEventListener('visibilitychange', tryConsumePendingScroll);
  window.addEventListener('focus', tryConsumePendingScroll);
  window.addEventListener('pageshow', tryConsumePendingScroll);

  // ---- 화면 꺼진 채로(또는 잠긴 채로) 알림 눌렀을 때 대응 ----
  // 아이폰과 안드로이드(삼성인터넷)는 원인이 서로 완전히 달라서 따로 처리함:
  // - 아이폰: WebKit 버그(#7309)로 notificationclick 자체가 안 터질 수 있음
  // - 삼성인터넷: notificationclick은 터지지만, postMessage 직후 focus()가
  //   안드로이드 자체의 작업(task) 복원과 충돌해서 이동 결과가 덮어써짐
  // 둘 다 서비스워커가 IndexedDB에 저장해둔 정보를 "복귀 시점"에 확인하는 방식으로 대응
  const USER_AGENT = navigator.userAgent || '';
  const IS_SAMSUNG_INTERNET = /Android/i.test(USER_AGENT) && /SamsungBrowser/i.test(USER_AGENT);
  let lastHandledPushKey = ''; // 같은 알림이 여러 번 재확인되면서 중복 적용되는 것 방지

  // 로그아웃 시, 알림 이동과 관련된 임시 상태(복귀 타이머/스크롤 폴링/서비스워커의
  // pending/화면에 떠있던 토스트)를 한 번에 정리. 로그인 대기 중 상태에서는 절대 호출하면
  // 안 됨 - 아이폰에서 알림으로 앱을 여는 도중 필요한 pending 정보까지 지워질 수 있음
  function clearTransientNavigationState(){
    if(pendingClearTimer){ clearTimeout(pendingClearTimer); pendingClearTimer = null; }
    resumeRetryTimers.forEach(t => clearTimeout(t));
    resumeRetryTimers = [];
    deferredNavigateMessage = null;
    lastHandledPushKey = '';
    clearScrollState();

    clearTimeout(pushToastTimer);
    pushToastTab = null;
    pushToastItemId = null;
    pushToastCommentTs = null;
    pushToastNotifId = null;
    const toast = document.getElementById('pushToast');
    if(toast) toast.classList.add('hidden');

    postToActiveServiceWorker({ type: 'CLEAR_PENDING_NOTIF' });
  }
  let pendingClearTimer = null;
  let resumeRetryTimers = [];

  // 서비스워커에 메시지 보내는 공용 함수. controller가 아직 없는 경계상황
  // (서비스워커가 막 교체됐거나, 등록 자체가 아직 안 된 경우)에도 최대한 안전하게 시도함.
  // ready는 등록 자체가 없으면 영원히 안 풀릴 수 있어서, 일상적인 메시지 전송에는
  // getRegistration()이 더 안전함 (등록 없으면 그냥 undefined로 즉시 끝남)
  async function postToActiveServiceWorker(message){
    if(!('serviceWorker' in navigator)) return false;
    try{
      const registration = await navigator.serviceWorker.getRegistration();
      const worker = navigator.serviceWorker.controller || (registration && registration.active);
      if(!worker) return false;
      worker.postMessage(message);
      return true;
    }catch(e){ return false; }
  }

  function runResumeCheck(){
    postToActiveServiceWorker({ type: 'CHECK_PENDING_NOTIF' });
  }
  function scheduleResumeChecks(){
    resumeRetryTimers.forEach(t => clearTimeout(t));
    resumeRetryTimers = [];
    if(IS_SAMSUNG_INTERNET){
      // 안드로이드의 작업 복원이 끝날 시간을 벌어주기 위해 살짝 늦춰서 확인
      resumeRetryTimers.push(
        setTimeout(runResumeCheck, 700),
        setTimeout(runResumeCheck, 1500),
        setTimeout(runResumeCheck, 2600)
      );
    } else {
      runResumeCheck();
      resumeRetryTimers.push(
        setTimeout(runResumeCheck, 300),
        setTimeout(runResumeCheck, 1000),
        setTimeout(runResumeCheck, 2000)
      );
    }
  }
  function handleAppResume(){
    if(document.visibilityState !== 'visible') return;
    scheduleResumeChecks();
  }
  // visibilitychange 하나에만 의존하면, 삼성인터넷이 화면 복귀 시 이 이벤트를 놓치고
  // focus나 pageshow만 발생시키는 경우 pending 알림을 확인하지 못할 수 있음 -> 다 연결해둠
  document.addEventListener('visibilitychange', handleAppResume);
  window.addEventListener('focus', handleAppResume);
  window.addEventListener('pageshow', handleAppResume);
  window.addEventListener('load', handleAppResume);

  // 타이머 자체가 멈췄다가 다시 도는지도 감지 (기기가 완전히 절전 상태였다가 깨어난 경우,
  // visibilitychange/focus 이벤트 자체가 안 오고 그냥 스크립트만 재개되는 경우가 있어서 안전망 추가)
  let lastResumeTick = Date.now();
  setInterval(() => {
    const now = Date.now();
    const timerWasSuspended = now - lastResumeTick > 2500;
    lastResumeTick = now;
    if(timerWasSuspended && document.visibilityState === 'visible') scheduleResumeChecks();
  }, 1000);

  scheduleResumeChecks(); // 페이지가 막 열린 시점에도 한 번 확인 (콜드 스타트 안전망)

  function localDateStr(d){
    d = d || new Date();
    const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,'0'), day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function isLetterLocked(item){
    if(!item.unlockDate) return false;
    if(item.author === identity) return false; // 본인이 쓴 편지는 잠기지 않음
    const unlockTs = new Date(`${item.unlockDate}T${item.unlockTime || '00:00'}:00`).getTime();
    return unlockTs > Date.now();
  }
  function fmtDate(d){
    if(!d) return {day:'-', mon:''};
    const dt = new Date(d + 'T00:00:00');
    return { day: dt.getDate(), mon: (dt.getMonth()+1) + '월' };
  }
  function fmtShortDate(d){
    if(!d) return '';
    const dt = new Date(d + 'T00:00:00');
    return `${dt.getMonth()+1}.${dt.getDate()}`;
  }
  function isPast(item){
    const d = item && item.endDate ? item.endDate : (item && item.date);
    if(!d) return false;
    const today = new Date(); today.setHours(0,0,0,0);
    return new Date(d + 'T00:00:00') < today;
  }
  function itemCoversDate(item, dateStr){
    const end = item.endDate || item.date;
    return dateStr >= item.date && dateStr <= end;
  }
  function formatTimeKR(t){
    if(!t) return '';
    const [h,m] = t.split(':').map(Number);
    const period = h < 12 ? '오전' : '오후';
    let h12 = h % 12; if(h12 === 0) h12 = 12;
    return `${period} ${h12}:${String(m).padStart(2,'0')}`;
  }
  function formatScheduleRange(item){
    const startLabel = fmtShortDate(item.date) + (item.time ? ` ${formatTimeKR(item.time)}` : '');
    if(item.endDate && item.endDate !== item.date){
      const endLabel = fmtShortDate(item.endDate) + (item.endTime ? ` ${formatTimeKR(item.endTime)}` : '');
      return `${startLabel} ~ ${endLabel}`;
    }
    if(item.endTime && item.endTime !== item.time){
      return `${startLabel} ~ ${formatTimeKR(item.endTime)}`;
    }
    return startLabel;
  }
  function formatDateTimeKR(ts){
    const dt = new Date(ts);
    const y = dt.getFullYear(), m = String(dt.getMonth()+1).padStart(2,'0'), d = String(dt.getDate()).padStart(2,'0');
    let h = dt.getHours(); const mm = String(dt.getMinutes()).padStart(2,'0');
    const period = h < 12 ? '오전' : '오후'; let h12 = h % 12; if(h12 === 0) h12 = 12;
    return `${y}.${m}.${d} ${period} ${h12}:${mm}`;
  }
  function authorTagHTML(author){
    if(author === '소정') return '<span class="author-tag author-sojeong">소정</span>';
    if(author === '선호') return '<span class="author-tag author-seonho">선호</span>';
    return '';
  }
  function escapeHTML(s){
    return (s||'').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  }
  function pixelHeartSVG(filled, size, colorOverride){
    size = size || 15;
    const c = colorOverride || (filled ? '#FF5C7A' : '#D8C7CE');
    return `<svg viewBox="0 0 7 6" width="${size}" height="${size*6/7}" shape-rendering="crispEdges" style="display:inline-block;vertical-align:middle;"><rect x="1" y="0" width="2" height="1" fill="${c}"/><rect x="4" y="0" width="2" height="1" fill="${c}"/><rect x="0" y="1" width="7" height="1" fill="${c}"/><rect x="0" y="2" width="7" height="1" fill="${c}"/><rect x="1" y="3" width="5" height="1" fill="${c}"/><rect x="2" y="4" width="3" height="1" fill="${c}"/><rect x="3" y="5" width="1" height="1" fill="${c}"/></svg>`;
  }
  function pixelChatSVG(){
    return `<svg viewBox="0 0 7 6" width="15" height="13" shape-rendering="crispEdges" style="display:inline-block;vertical-align:middle;"><rect x="1" y="0" width="5" height="1" fill="currentColor"/><rect x="0" y="1" width="1" height="1" fill="currentColor"/><rect x="6" y="1" width="1" height="1" fill="currentColor"/><rect x="0" y="2" width="1" height="1" fill="currentColor"/><rect x="2" y="2" width="1" height="1" fill="currentColor"/><rect x="4" y="2" width="1" height="1" fill="currentColor"/><rect x="6" y="2" width="1" height="1" fill="currentColor"/><rect x="0" y="3" width="1" height="1" fill="currentColor"/><rect x="6" y="3" width="1" height="1" fill="currentColor"/><rect x="1" y="4" width="5" height="1" fill="currentColor"/><rect x="2" y="5" width="1" height="1" fill="currentColor"/></svg>`;
  }
  function pixelEditSVG(){
    return `<svg viewBox="0 0 7 7" width="15" height="15" shape-rendering="crispEdges" style="display:inline-block;vertical-align:middle;"><rect x="5" y="0" width="2" height="1" fill="#FFB3C6"/><rect x="4" y="1" width="2" height="1" fill="#4A3548"/><rect x="3" y="2" width="2" height="1" fill="#FFC94C"/><rect x="2" y="3" width="2" height="1" fill="#FFC94C"/><rect x="1" y="4" width="2" height="1" fill="#FFC94C"/><rect x="0" y="5" width="2" height="1" fill="#4A3548"/><rect x="0" y="6" width="1" height="1" fill="#4A3548"/></svg>`;
  }
  function linkHost(url){
    try{ return new URL(url).hostname.replace('www.',''); }catch(e){ return url; }
  }
  function otherPerson(author){
    if(author === '소정') return '선호';
    if(author === '선호') return '소정';
    return '상대방';
  }
  function isMine(item){
    if(item.author === undefined || item.author === null) return true;
    return item.author === identity;
  }
  // 삭제는 수정과 다르게, 소정은 모든 글을 지울 수 있음 (선호는 기존처럼 본인 글만)
  function canDeletePost(item){
    if(identity === '소정') return true;
    return isMine(item);
  }
  function getItemPhotos(item){
    if(item.photos && item.photos.length) return item.photos;
    if(item.photo) return [item.photo];
    return [];
  }
  function cardPhotosHTML(item){
    const photos = getItemPhotos(item);
    if(photos.length === 0) return '';
    return `<div class="card-photos">${photos.map(p=>`<img src="${p}" loading="lazy">`).join('')}</div>`;
  }

// 열려 있는 댓글창 ID를 기억하는 공간 (새로고침 시 닫힘 방지)
  let openCommentSections = new Set();
  let replyingToMap = new Map(); // key: `${colName}-${itemId}`, value: 답글 다는 중인 댓글의 ts (없으면 미설정)

  function singleCommentHTML(c, colName, itemId, isReply){
    if(c.deleted){
      // 삭제된 댓글: 답글이 있어서 자리는 남기되, 내용은 안 보이게
      return `
        <div class="comment-item comment-deleted ${isReply ? 'comment-reply' : ''}" data-comment-ts="${c.ts}">
          <span class="c-text c-deleted-text">삭제된 댓글이야</span>
        </div>
      `;
    }
    return `
      <div class="comment-item ${isReply ? 'comment-reply' : ''}" data-comment-ts="${c.ts}">
        <span class="c-author ${c.author === '소정' ? '소정' : '선호'}">${c.author}</span>
        <span class="c-text">${escapeHTML(c.text)}</span>
        ${canDeletePost(c) ? `<button class="c-del" data-comment-col="${colName}" data-comment-id="${itemId}" data-comment-ts="${c.ts}">✕</button>` : ''}
        <div class="c-time-row">
          <span class="c-time">${formatDateTimeKR(c.ts)}</span>
          ${!isReply ? `<button class="c-reply-btn" data-reply-col="${colName}" data-reply-id="${itemId}" data-reply-ts="${c.ts}">답글 달기</button>` : ''}
        </div>
      </div>
    `;
  }

  // 댓글창 HTML을 그려주는 공통 함수
  function renderCommentsHTML(item, colName) {
    const comments = item.comments || [];
    const sectionKey = `${colName}-${item.id}`;
    const isOpen = openCommentSections.has(sectionKey);
    const replyingToTs = replyingToMap.get(sectionKey);

    const topLevel = comments.filter(c => !c.parentTs);
    const repliesByParent = {};
    comments.filter(c => c.parentTs).forEach(c => {
      (repliesByParent[c.parentTs] = repliesByParent[c.parentTs] || []).push(c);
    });

    const commentListHTML = topLevel.map(c => {
      const replies = (repliesByParent[c.ts] || []).sort((a,b)=>a.ts-b.ts);
      const repliesHTML = replies.map(r => singleCommentHTML(r, colName, item.id, true)).join('');
      const isReplyingHere = replyingToTs === c.ts;
      const replyInputHTML = isReplyingHere ? `
        <div class="comment-input-row comment-reply-input-row">
          <input type="text" placeholder="${c.author}에게 답글 달기" id="cr-input-${colName}-${item.id}-${c.ts}" onkeypress="if(event.key==='Enter') document.getElementById('cr-btn-${colName}-${item.id}-${c.ts}').click();">
          <button id="cr-btn-${colName}-${item.id}-${c.ts}" class="c-submit" data-reply-submit-col="${colName}" data-reply-submit-id="${item.id}" data-reply-submit-parent="${c.ts}">작성</button>
        </div>
      ` : '';
      return singleCommentHTML(c, colName, item.id, false) + `<div class="comment-replies">${repliesHTML}${replyInputHTML}</div>`;
    }).join('');

    return `
      <div class="comment-section ${isOpen ? 'active' : ''}" id="comments-${colName}-${item.id}">
        <div class="comment-list">
          ${topLevel.length > 0 ? commentListHTML : '<div style="font-size:11px; color:#8A7A86; text-align:center; padding: 4px 0;">첫 번째 댓글을 남겨봐! 🐶</div>'}
        </div>
        <div class="comment-input-row">
          <input type="text" placeholder="댓글을 입력해 봐" id="c-input-${colName}-${item.id}" onkeypress="if(event.key==='Enter') document.getElementById('c-btn-${colName}-${item.id}').click();">
          <button id="c-btn-${colName}-${item.id}" class="c-submit" data-comment-submit-col="${colName}" data-comment-submit-id="${item.id}">작성</button>
        </div>
      </div>
    `;
  }
  
  // ---- 연/월별 그룹 정리 (데이트기록/편지/스탬프 공용) ----
  function renderGroupedByTime(containerId, items, getTs, cardRenderer, expandedSet, emptyHTML){
    const container = document.getElementById(containerId);
    if(items.length === 0){
      container.innerHTML = emptyHTML;
      return;
    }
    const now = new Date();
    const curYear = now.getFullYear(), curMonth = now.getMonth();
    const currentMonthItems = [];
    const monthGroups = {};
    const yearGroups = {};

    items.forEach(item=>{
      const d = new Date(getTs(item));
      const y = d.getFullYear(), m = d.getMonth();
      if(y === curYear){
        if(m === curMonth) currentMonthItems.push(item);
        else { (monthGroups[m] = monthGroups[m] || []).push(item); }
      } else {
        (yearGroups[y] = yearGroups[y] || []).push(item);
      }
    });

    let html = currentMonthItems.map(cardRenderer).join('');

    Object.keys(monthGroups).map(Number).sort((a,b)=>b-a).forEach(m=>{
      const key = `month-${m}`;
      const isOpen = expandedSet.has(key);
      html += `<button class="group-toggle" data-group-key="${key}" data-container="${containerId}">${m+1}월 <span class="group-count">${monthGroups[m].length}개</span> ${isOpen?'▲':'▼'}</button>`;
      html += `<div class="group-content ${isOpen?'':'hidden'}" data-group-content="${key}">${monthGroups[m].map(cardRenderer).join('')}</div>`;
    });

    Object.keys(yearGroups).map(Number).sort((a,b)=>b-a).forEach(y=>{
      const key = `year-${y}`;
      const isOpen = expandedSet.has(key);
      html += `<button class="group-toggle" data-group-key="${key}" data-container="${containerId}">${y}년 <span class="group-count">${yearGroups[y].length}개</span> ${isOpen?'▲':'▼'}</button>`;
      html += `<div class="group-content ${isOpen?'':'hidden'}" data-group-content="${key}">${yearGroups[y].map(cardRenderer).join('')}</div>`;
    });

    container.innerHTML = html;

    container.querySelectorAll('[data-group-key]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const key = btn.dataset.groupKey;
        const content = container.querySelector(`[data-group-content="${key}"]`);
        const isOpen = expandedSet.has(key);
        if(isOpen){ expandedSet.delete(key); content.classList.add('hidden'); }
        else { expandedSet.add(key); content.classList.remove('hidden'); }
        btn.innerHTML = btn.innerHTML.replace(isOpen ? '▲' : '▼', isOpen ? '▼' : '▲');
      });
    });
    reapplyExpandedState(containerId);
  }
  let dateLogExpandedGroups = new Set();
  let letterExpandedGroups = new Set();
  let stampExpandedGroups = new Set();

  // ---- 사진 확대뷰 (핀치줌 / 팬 / 스와이프 넘기기 / 더블탭) ----
  (function(){
    const lightbox = document.getElementById('photoLightbox');
    const stage = document.getElementById('lightboxStage');
    const img = document.getElementById('lightboxImg');
    const closeBtn = document.getElementById('lightboxClose');
    const prevBtn = document.getElementById('lightboxPrev');
    const nextBtn = document.getElementById('lightboxNext');
    const counter = document.getElementById('lightboxCounter');

    let scale = 1, panX = 0, panY = 0;
    let startScale = 1, startDist = 0;
    let startTouchX = 0, startTouchY = 0;
    let isPanning = false, isPinching = false;
    let lastTapTime = 0;
    let swipeStartX = 0, swipeStartY = 0, swipeActive = false;

    let currentPhotos = [];
    let currentIndex = 0;

    function applyTransform(){
      img.style.transform = `translate(${panX}px, ${panY}px) scale(${scale})`;
    }
    function resetTransform(){
      scale = 1; panX = 0; panY = 0; applyTransform();
    }
    function updateNav(){
      const multi = currentPhotos.length > 1;
      prevBtn.classList.toggle('hidden', !multi || currentIndex === 0);
      nextBtn.classList.toggle('hidden', !multi || currentIndex === currentPhotos.length - 1);
      counter.classList.toggle('hidden', !multi);
      if(multi) counter.textContent = `${currentIndex + 1} / ${currentPhotos.length}`;
    }
    function showCurrentPhoto(){
      img.src = currentPhotos[currentIndex];
      resetTransform();
      updateNav();
    }
    function goNext(){
      if(currentIndex < currentPhotos.length - 1){ currentIndex++; showCurrentPhoto(); }
    }
    function goPrev(){
      if(currentIndex > 0){ currentIndex--; showCurrentPhoto(); }
    }
    function openLightbox(photos, index){
      currentPhotos = photos;
      currentIndex = index;
      showCurrentPhoto();
      lightbox.classList.remove('hidden');
    }
    function closeLightbox(){
      lightbox.classList.add('hidden');
      img.src = '';
    }
    closeBtn.addEventListener('click', closeLightbox);
    prevBtn.addEventListener('click', goPrev);
    nextBtn.addEventListener('click', goNext);
    stage.addEventListener('click', (e)=>{
      if(e.target === stage) closeLightbox();
    });

    function touchDist(touches){
      const dx = touches[0].clientX - touches[1].clientX;
      const dy = touches[0].clientY - touches[1].clientY;
      return Math.sqrt(dx*dx + dy*dy);
    }

    stage.addEventListener('touchstart', (e)=>{
      if(e.touches.length === 2){
        isPinching = true; isPanning = false; swipeActive = false;
        startDist = touchDist(e.touches);
        startScale = scale;
      } else if(e.touches.length === 1){
        const now = Date.now();
        if(now - lastTapTime < 300){
          if(scale > 1){ resetTransform(); } else { scale = 2.5; applyTransform(); }
          lastTapTime = 0;
          swipeActive = false;
          return;
        }
        lastTapTime = now;
        isPinching = false;
        if(scale > 1){
          isPanning = true; swipeActive = false;
          startTouchX = e.touches[0].clientX - panX;
          startTouchY = e.touches[0].clientY - panY;
        } else {
          isPanning = false; swipeActive = true;
          swipeStartX = e.touches[0].clientX;
          swipeStartY = e.touches[0].clientY;
        }
      }
    }, {passive:true});

    stage.addEventListener('touchmove', (e)=>{
      if(isPinching && e.touches.length === 2){
        e.preventDefault();
        const newDist = touchDist(e.touches);
        scale = Math.min(4, Math.max(1, startScale * (newDist / startDist)));
        applyTransform();
      } else if(isPanning && e.touches.length === 1){
        e.preventDefault();
        panX = e.touches[0].clientX - startTouchX;
        panY = e.touches[0].clientY - startTouchY;
        applyTransform();
      } else if(swipeActive && e.touches.length === 1){
        e.preventDefault();
      }
    }, {passive:false});

    stage.addEventListener('touchend', (e)=>{
      if(e.touches.length === 0){
        if(isPanning){
          isPanning = false;
          if(scale <= 1) resetTransform();
        } else if(isPinching){
          isPinching = false;
          if(scale <= 1) resetTransform();
        } else if(swipeActive){
          const t = e.changedTouches[0];
          const dx = t.clientX - swipeStartX;
          const dy = t.clientY - swipeStartY;
          if(Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)){
            if(dx < 0) goNext(); else goPrev();
          }
        }
        swipeActive = false;
      }
    });

    document.addEventListener('click', (e)=>{
      const target = e.target.closest('.card-photos img');
      if(target){
        const container = target.closest('.card-photos');
        const imgs = Array.from(container.querySelectorAll('img'));
        openLightbox(imgs.map(i=>i.src), imgs.indexOf(target));
      }
    });
  })();

  // ---- 데이트기록 지도 ----
  let dateLogMapInstance = null;
  let dateLogMarkersLayer = null;
  function heartMarkerIcon(){
    return L.divIcon({
      className: '',
      html: `<div style="font-size:26px;line-height:1;filter:drop-shadow(0 2px 3px rgba(74,53,72,0.45));">❤️</div>`,
      iconSize: [26, 26],
      iconAnchor: [13, 24],
      popupAnchor: [0, -22]
    });
  }
  function openDateMap(){
    document.getElementById('dateMapModal').classList.remove('hidden');
    setTimeout(()=>{
      if(!dateLogMapInstance){
        dateLogMapInstance = L.map('dateMapContainer', { attributionControl: true });
        L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
          attribution: '&copy; OpenStreetMap &copy; CARTO',
          maxZoom: 20,
          subdomains: 'abcd'
        }).addTo(dateLogMapInstance);
      }
      const pts = dateLogs.filter(d => typeof d.lat === 'number' && typeof d.lng === 'number');
      if(dateLogMarkersLayer) dateLogMapInstance.removeLayer(dateLogMarkersLayer);
      dateLogMarkersLayer = L.layerGroup();
      pts.forEach(item=>{
        const photo = getItemPhotos(item)[0];
        const marker = L.marker([item.lat, item.lng], { icon: heartMarkerIcon() });
        marker.bindPopup(
          `<b>${escapeHTML(item.title)}</b><br><span style="color:#8A7A86;font-size:11px;">${fmtShortDate(item.date)} · ${item.author||''}</span>` +
          (photo ? `<br><img src="${photo}" style="width:110px;border-radius:8px;margin-top:4px;">` : '')
        );
        marker.addTo(dateLogMarkersLayer);
      });
      dateLogMarkersLayer.addTo(dateLogMapInstance);
      dateLogMapInstance.invalidateSize();
      if(pts.length > 0){
        const bounds = L.latLngBounds(pts.map(p=>[p.lat, p.lng]));
        dateLogMapInstance.fitBounds(bounds, { padding:[40,40], maxZoom:15 });
      } else {
        dateLogMapInstance.setView([37.5665, 126.9780], 11);
      }
    }, 50);
  }
  document.getElementById('dateMapOpenBtn').addEventListener('click', openDateMap);
  document.getElementById('dateMapClose').addEventListener('click', ()=>{
    document.getElementById('dateMapModal').classList.add('hidden');
  });


  function scheduleCardHTML(item){
    const d = fmtDate(item.date);
    const extraLabel = formatScheduleRange(item);
    const hasExtra = extraLabel !== fmtShortDate(item.date);
    return `<div class="item-card ${isPast(item)?'past':''} ${item.isDate?'date-plan-card':''}" data-item-id="${item.id}">
      <div class="date-badge ${item.isDate?'date-plan-badge':''}"><div class="day">${d.day}</div><div class="mon">${d.mon}</div></div>
      <div class="item-body">
        <div class="item-title">${escapeHTML(item.title)}${item.isDate ? ' ' + pixelHeartSVG(true, 16) : ''}</div>
        ${hasExtra ? `<div class="item-memo">${extraLabel}</div>` : ''}
        ${item.memo ? `<div class="item-memo">${escapeHTML(item.memo)}</div>` : ''}
        ${item.isDate ? '' : `<div class="item-meta">${authorTagHTML(item.author)}</div>`}
      </div>
      ${isMine(item) ? `<button class="edit-btn" data-edit-schedule="${item.id}">${pixelEditSVG()}</button>` : ''}
      ${canDeletePost(item) ? `<button class="del-btn" data-del-schedule="${item.id}">✕</button>` : ''}
    </div>`;
  }
  let showPastSchedule = false;
  let calendarMonth = new Date();
  let calendarFilterDate = null;

function renderCalendar(){
    const y = calendarMonth.getFullYear(), m = calendarMonth.getMonth();
    const firstDay = new Date(y, m, 1);
    const startWeekday = firstDay.getDay();
    const daysInMonth = new Date(y, m+1, 0).getDate();
    const todayStr = localDateStr();

    // 이번 달 달력에 표시되는 날짜 범위 (1일 ~ 말일)
    const startDateStr = `${y}-${String(m+1).padStart(2,'0')}-01`;
    const endDateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(daysInMonth).padStart(2,'0')}`;

    // 화면에 그릴 일정만 필터링하고 정렬 (시작일이 빠른 순 -> 기간이 긴 순)
    const monthEvents = schedule.filter(item => {
      const itemStart = item.date;
      const itemEnd = item.endDate || item.date;
      return itemStart <= endDateStr && itemEnd >= startDateStr;
    }).sort((a, b) => {
      if (a.date !== b.date) return a.date.localeCompare(b.date);
      const aEnd = a.endDate || a.date;
      const bEnd = b.endDate || b.date;
      return bEnd.localeCompare(aEnd); 
    });

    // 다일 일정이 단차 없이 한 줄로 이어지게 '슬롯(slot)'을 배정
    const slotOccupied = {};
    monthEvents.forEach(ev => {
      const start = ev.date;
      const end = ev.endDate || ev.date;
      let slot = 0;
      
      while (true) { // 빈 층(슬롯) 찾기
        let isFree = true;
        let curr = new Date(start + 'T00:00:00');
        const endDt = new Date(end + 'T00:00:00');
        while (curr <= endDt) {
          const dStr = localDateStr(curr);
          if (slotOccupied[dStr] && slotOccupied[dStr][slot]) {
            isFree = false;
            break;
          }
          curr.setDate(curr.getDate() + 1);
        }
        if (isFree) break;
        slot++;
      }
      
      // 빈 슬롯에 해당 일정 점유시키기
      let curr = new Date(start + 'T00:00:00');
      const endDt = new Date(end + 'T00:00:00');
      while (curr <= endDt) {
        const dStr = localDateStr(curr);
        if (!slotOccupied[dStr]) slotOccupied[dStr] = [];
        slotOccupied[dStr][slot] = ev;
        curr.setDate(curr.getDate() + 1);
      }
    });

    let cells = '';
    for(let i=0;i<startWeekday;i++) cells += `<div class="calendar-day empty"></div>`;
    
    // 1일부터 말일까지 달력 셀 그리기
    for(let day=1; day<=daysInMonth; day++){
      const dateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
      const dayOfWeek = new Date(y, m, day - 1).getDay() + 1 === 7 ? 0 : new Date(y, m, day).getDay();
      const classes = ['calendar-day'];
      if(dateStr === todayStr) classes.push('today');
      if(dateStr === calendarFilterDate) classes.push('selected');

      let eventsHTML = '';
      const slotsForDay = slotOccupied[dateStr] || [];
      const MAX_SLOTS = 2; // 각 날짜 칸에 표시할 최대 일정 줄 수
      
      for (let i = 0; i < MAX_SLOTS; i++) {
        const ev = slotsForDay[i];
        if (ev) {
          const personClass = ev.isDate ? 'date-plan-event' : (ev.author === '소정' ? 'person-sojeong' : 'person-seonho');
          const isActualStart = ev.date === dateStr;
          const evEnd = ev.endDate || ev.date;

          // 이 날짜가 '띠'를 새로 그리기 시작하는 지점인지 판단:
          // 실제 시작일이거나 / 이번 달 보기의 1일(지난달에서 이어짐)이거나 / 이번 주의 첫 날(일요일, 지난 주에서 이어짐)
          const isMonthContinuation = dateStr === startDateStr && ev.date < startDateStr;
          const isWeekContinuation = dayOfWeek === 0 && ev.date < dateStr;
          const isSegmentStart = isActualStart || isMonthContinuation || isWeekContinuation;
          // 글자는 실제 시작일 / 달이 바뀌며 이어질 때만 다시 써주고, 그냥 주만 넘어갈 땐 색만 이어감
          const shouldShowLabel = isActualStart || isMonthContinuation;

          if (isSegmentStart) {
            // 이번 주(토요일까지) / 이번 달 말일까지 / 일정 종료일까지 중 가장 빨리 끝나는 지점까지 span 계산
            const daysLeftInRow = 6 - dayOfWeek;
            const daysLeftInMonth = daysInMonth - day;
            let span = 1;
            while (span <= daysLeftInRow && span <= daysLeftInMonth) {
              const nextDateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day+span).padStart(2,'0')}`;
              if (nextDateStr > evEnd) break;
              span++;
            }
            const segEndDateStr = `${y}-${String(m+1).padStart(2,'0')}-${String(day+span-1).padStart(2,'0')}`;
            const isSegEnd = evEnd <= segEndDateStr;

            const shapeClass = [];
            if (isActualStart) shapeClass.push('ev-start'); else shapeClass.push('ev-mid-left');
            if (isSegEnd && evEnd === segEndDateStr) shapeClass.push('ev-end');

            const label = shouldShowLabel ? `${ev.isDate ? pixelHeartSVG(true, 13, '#ffffff') + ' ' : ''}${escapeHTML(ev.title)}` : '';
            // span이 1이어도 항상 너비를 명시해야 함 (안 그러면 절대위치 특성상 글자 길이만큼 밖으로 튀어나감)
            const widthCss = `width:calc(${span * 100}% + ${Math.max(0, span - 1) * 3}px);`;

            eventsHTML += `<div class="cal-slot-row"><div class="cal-event-pill ${personClass} ${shapeClass.join(' ')}" style="position:absolute;left:0;top:0;height:100%;${widthCss}">${label}</div></div>`;
          } else {
            // 띠가 이어지는 중간 날짜: 이미 시작점에서 그려진 띠가 이 칸까지 덮어주므로, 자리만 확보(투명)
            eventsHTML += `<div class="cal-slot-row"></div>`;
          }
        } else {
          // 일정이 없지만 위쪽 슬롯의 단차를 유지하기 위한 투명한 빈 공간
          if (i < slotsForDay.length) { 
            eventsHTML += `<div class="cal-slot-row"></div>`;
          }
        }
      }
      
      // 가려진 일정 개수 (+N) 표시
      let moreCount = 0;
      for (let i = MAX_SLOTS; i < slotsForDay.length; i++) {
        if (slotsForDay[i]) moreCount++;
      }
      if (moreCount > 0) eventsHTML += `<div class="cal-event-more">+${moreCount}</div>`;

      cells += `<div class="${classes.join(' ')}" data-cal-date="${dateStr}">
        <div class="cal-daynum">${day}</div>
        <div class="cal-events">${eventsHTML}</div>
      </div>`;
    }

    const cal = document.getElementById('scheduleCalendar');
    cal.innerHTML = `
      <div class="calendar-header">
        <button class="calendar-nav-btn" id="calPrevBtn" type="button">‹</button>
        <div class="calendar-month-label">${y}년 ${m+1}월</div>
        <button class="calendar-nav-btn" id="calNextBtn" type="button">›</button>
      </div>
      <div class="calendar-grid">
        <div class="calendar-weekday">일</div><div class="calendar-weekday">월</div><div class="calendar-weekday">화</div>
        <div class="calendar-weekday">수</div><div class="calendar-weekday">목</div><div class="calendar-weekday">금</div>
        <div class="calendar-weekday">토</div>
        ${cells}
      </div>`;
      
    document.getElementById('calPrevBtn').addEventListener('click', ()=>{ calendarMonth = new Date(y, m-1, 1); renderCalendar(); });
    document.getElementById('calNextBtn').addEventListener('click', ()=>{ calendarMonth = new Date(y, m+1, 1); renderCalendar(); });
    cal.querySelectorAll('[data-cal-date]').forEach(cell=>{
      cell.addEventListener('click', ()=>{
        const d = cell.dataset.calDate;
        calendarFilterDate = (calendarFilterDate === d) ? null : d;
        renderCalendar();
        renderSchedule();
      });
    });
  }

  function renderSchedule(){
    const list = document.getElementById('scheduleList');
    const toggleBtn = document.getElementById('togglePastBtn');
    const pastSection = document.getElementById('pastScheduleSection');
    const filterNotice = document.getElementById('scheduleFilterNotice');

    if(calendarFilterDate){
      const filtered = schedule.filter(item => itemCoversDate(item, calendarFilterDate));
      filterNotice.classList.remove('hidden');
      filterNotice.querySelector('span').textContent = `${fmtShortDate(calendarFilterDate)} 일정만 보는 중`;
      list.innerHTML = filtered.length
        ? filtered.map(scheduleCardHTML).join('')
        : '<div class="empty-state">이 날짜엔 일정이 없어.</div>';
      toggleBtn.classList.add('hidden');
      pastSection.classList.add('hidden');
      return;
    }
    filterNotice.classList.add('hidden');

    if(schedule.length === 0){
      list.innerHTML = '<div class="empty-state"><span class="empty-emoji">🗓️</span>아직 등록된 일정이 없어.<br>첫 일정을 추가해볼까?</div>';
      toggleBtn.classList.add('hidden');
      pastSection.classList.add('hidden');
      return;
    }

    const upcoming = schedule.filter(item => !isPast(item));
    const past = [...schedule.filter(item => isPast(item))].reverse();

    list.innerHTML = upcoming.length === 0
      ? '<div class="empty-state"><span class="empty-emoji">✅</span>다가오는 일정이 없어.</div>'
      : upcoming.map(scheduleCardHTML).join('');

    if(past.length > 0){
      toggleBtn.classList.remove('hidden');
      toggleBtn.textContent = showPastSchedule ? '지난 일정 숨기기' : `지난 일정 ${past.length}개 보기`;
      pastSection.classList.toggle('hidden', !showPastSchedule);
      pastSection.innerHTML = past.map(scheduleCardHTML).join('');
    } else {
      toggleBtn.classList.add('hidden');
      pastSection.classList.add('hidden');
    }
  }


  function wishCardHTML(item){
    const dt = new Date(item.createdAt || Date.now());
    const dateStr = `${dt.getFullYear()}.${String(dt.getMonth()+1).padStart(2,'0')}.${String(dt.getDate()).padStart(2,'0')}`;
    return `<div class="wish-card ${item.done?'wish-done':''}" data-item-id="${item.id}">
      <div class="wish-content">
        <div class="post-summary" data-post-toggle="${item.id}">
          <div class="post-summary-title">${escapeHTML(item.title)}</div>
          <div class="post-summary-meta">${authorTagHTML(item.author)}<span>${dateStr}</span><span class="post-summary-arrow">▾</span></div>
        </div>
        <div class="post-detail hidden">
          ${item.body ? `<div class="wish-body">${escapeHTML(item.body)}</div>` : ''}
          ${cardPhotosHTML(item)}
          ${item.link ? `<a class="wish-link" href="${escapeHTML(item.link)}" target="_blank" rel="noopener">🔗 ${escapeHTML(linkHost(item.link))}</a>` : ''}
          <div class="wish-footer">
            <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;width:100%;">
              <button class="wish-check ${item.done?'checked':''}" data-check-wish="${item.id}">${item.done ? '✓ 완료함' : '완료로 표시'}</button>
              ${isMine(item) ? `<button class="edit-btn" data-edit-wish="${item.id}">${pixelEditSVG()}</button>` : ''}
              ${canDeletePost(item) ? `<button class="del-btn" data-del-wish="${item.id}">✕</button>` : ''}
            </div>
          </div>
        </div>
      </div>
    </div>`;
  }
  function renderWish(){
    const list = document.getElementById('wishList');
    const toggleBtn = document.getElementById('toggleDoneWishBtn');
    const doneSection = document.getElementById('doneWishSection');

    if(wishes.length === 0){
      list.innerHTML = '<div class="empty-state"><span class="empty-emoji">💭</span>아직 하고 싶은 일이 없어.<br>버킷리스트를 적어볼까?</div>';
      toggleBtn.classList.add('hidden');
      doneSection.classList.add('hidden');
      return;
    }
    const filteredWishes = wishFilterTarget === 'all' ? wishes : wishes.filter(w => w.author === wishFilterTarget);
    const active = filteredWishes.filter(w=>!w.done);
    const done = filteredWishes.filter(w=>w.done);

    list.innerHTML = active.length === 0
      ? '<div class="empty-state"><span class="empty-emoji">🎉</span>다 완료했어! 새로운 위시를 적어볼까?</div>'
      : active.map(wishCardHTML).join('');

    if(done.length > 0){
      toggleBtn.classList.remove('hidden');
      toggleBtn.textContent = showDoneWishes ? '완료한 위시 숨기기' : `완료한 위시 ${done.length}개 보기`;
      doneSection.classList.toggle('hidden', !showDoneWishes);
      doneSection.innerHTML = done.map(wishCardHTML).join('');
    } else {
      toggleBtn.classList.add('hidden');
      doneSection.classList.add('hidden');
    }
    reapplyExpandedState('wishList');
    reapplyExpandedState('doneWishSection');
  }

// 1. 데이트 기록
  function dateLogCardHTML(item){
    const d = fmtDate(item.date);
    const extraLabel = formatScheduleRange(item);
    const hasExtra = extraLabel !== fmtShortDate(item.date);
    
    const likes = item.likes || [];
    const isLiked = likes.includes(identity);
    const likeIcon = pixelHeartSVG(isLiked);
    const commentCount = (item.comments || []).filter(c => !c.deleted).length;

    return `<div class="item-card" data-item-id="${item.id}">
      <div class="date-badge" style="background:var(--yellow-soft);"><div class="day">${d.day}</div><div class="mon">${d.mon}</div></div>
      <div class="item-body">
        <div class="post-summary" data-post-toggle="${item.id}">
          <div class="post-summary-title">${escapeHTML(item.title)}</div>
          <div class="post-summary-meta">${authorTagHTML(item.author)}<span>${(item.endDate && item.endDate !== item.date) ? `${fmtShortDate(item.date)}~${fmtShortDate(item.endDate)}` : fmtShortDate(item.date)} 데이트</span><span class="post-summary-arrow">▾</span></div>
          <div class="post-summary-sub">올린 날짜 · ${item.createdAt ? formatDateTimeKR(item.createdAt) : '-'}</div>
        </div>
        <div class="post-detail hidden">
          ${item.location ? `<div class="item-location">📍 ${escapeHTML(item.location)}</div>` : ''}
          ${hasExtra ? `<div class="item-memo">${extraLabel}</div>` : ''}
          ${item.memo ? `<div class="item-memo">${escapeHTML(item.memo)}</div>` : ''}
          ${cardPhotosHTML(item)}

          <div class="reaction-row">
            <div style="display:flex; gap:10px;">
              <button class="like-btn ${isLiked ? 'liked' : ''}" data-like-col="datelog" data-like-id="${item.id}">
                <span class="heart-icon">${likeIcon}</span> ${likes.length > 0 ? likes.length : ''}
              </button>
              <button class="comment-btn" data-toggle-comment="datelog" data-toggle-id="${item.id}">
                <span class="chat-icon">${pixelChatSVG()}</span> ${commentCount > 0 ? commentCount : ''}
              </button>
            </div>
            <div class="reaction-row-right">
              ${isMine(item) ? `<button class="edit-btn" data-edit-datelog="${item.id}">${pixelEditSVG()}</button>` : ''}
              ${canDeletePost(item) ? `<button class="del-btn" data-del-datelog="${item.id}">✕</button>` : ''}
            </div>
          </div>
          ${renderCommentsHTML(item, 'datelog')}
        </div>
      </div>
    </div>`;
  }
function renderDateLog() {
  const filteredDateLogs = dateLogFilterTarget === 'all' ? dateLogs : dateLogs.filter(item => item.author === dateLogFilterTarget);
  renderGroupedByTime(
    'dateLogList',
    filteredDateLogs,
    item => item.date + 'T00:00:00',
    dateLogCardHTML,
    dateLogExpandedGroups,
    '<div class="empty-state"><span class="empty-emoji">💛</span>우리의 첫 데이트를<br>기록해봐.</div>'
  );
}

// 2. 스탬프
  function stampCardHTML(item, popId){
    const badgeSrc = item.person === '소정' ? 'stamp-sojeong.png' : 'stamp-seonho.png';
    const dt = new Date(item.createdAt || Date.now());
    const dateStr = `${dt.getMonth()+1}월 ${dt.getDate()}일`;
    const toClass = item.person === '소정' ? 'to-sojeong' : 'to-seonho';
    const fromClass = item.author === '소정' ? 'from-sojeong' : 'from-seonho';
    
    const likes = item.likes || [];
    const isLiked = likes.includes(identity);
    const likeIcon = pixelHeartSVG(isLiked);
    const commentCount = (item.comments || []).filter(c => !c.deleted).length;

    return `<div class="stamp-card" data-item-id="${item.id}">
      <img class="stamp-badge-img ${item.id===popId?'stamp-pop':''}" src="${badgeSrc}" alt="${item.person} 스탬프">
      <div class="stamp-body">
        <div class="letter-to ${toClass}" style="margin-bottom:6px;padding:3px 9px;">🏅 To. ${item.person}</div>
        <div class="stamp-text">${escapeHTML(item.text)}</div>
        ${cardPhotosHTML(item)}
        <div class="stamp-date">${item.author ? `<span class="letter-from ${fromClass}">From. ${item.author}</span> · ` : ''}${dateStr}</div>
        
        <div class="reaction-row">
          <div style="display:flex; gap:10px;">
            <button class="like-btn ${isLiked ? 'liked' : ''}" data-like-col="stamps" data-like-id="${item.id}">
              <span class="heart-icon">${likeIcon}</span> ${likes.length > 0 ? likes.length : ''}
            </button>
            <button class="comment-btn" data-toggle-comment="stamps" data-toggle-id="${item.id}">
              <span class="chat-icon">${pixelChatSVG()}</span> ${commentCount > 0 ? commentCount : ''}
            </button>
          </div>
          <div class="reaction-row-right">
            ${isMine(item) ? `<button class="edit-btn" data-edit-stamp="${item.id}">${pixelEditSVG()}</button>` : ''}
            ${canDeletePost(item) ? `<button class="del-btn" data-del-stamp="${item.id}">✕</button>` : ''}
          </div>
        </div>
        ${renderCommentsHTML(item, 'stamps')}
      </div>
    </div>`;
  }
let stampFilterTarget = 'all';
let wishFilterTarget = 'all';
let dateLogFilterTarget = 'all';
function renderStamp(popId) {
  // 통계는 전체 데이터 기준으로!
  const sojeongCount = stamps.filter(s=>s.person==='소정').length;
  const seonhoCount = stamps.filter(s=>s.person==='선호').length;
  document.getElementById('statSojeong').textContent = sojeongCount;
  document.getElementById('statSeonho').textContent = seonhoCount;

  document.getElementById('pickSojeong').classList.toggle('selected-sojeong', stampPerson==='소정');
  document.getElementById('pickSeonho').classList.toggle('selected-seonho', stampPerson==='선호');

  const filteredStamps = stampFilterTarget === 'all' ? stamps : stamps.filter(s => s.person === stampFilterTarget);

  renderGroupedByTime(
    'stampList',
    filteredStamps,
    item => item.createdAt || Date.now(),
    item => stampCardHTML(item, popId),
    stampExpandedGroups,
    stampFilterTarget === 'all'
      ? '<div class="empty-state"><span class="empty-emoji">🏅</span>잘한 순간을<br>도장으로 남겨봐!</div>'
      : '<div class="empty-state"><span class="empty-emoji">🏅</span>해당하는 스탬프가 없어.</div>'
  );
}

// 3. 편지
  function letterCardHTML(item){
    const dateStr = formatDateTimeKR(item.createdAt || Date.now());
    const to = otherPerson(item.author);
    const toClass = to === '소정' ? 'to-sojeong' : 'to-seonho';
    const fromClass = item.author === '소정' ? 'from-sojeong' : 'from-seonho';

    // 잠긴 편지: 받는 사람한테는 해제일까지 내용을 안 보여줌 (쓴 사람 본인은 그대로 볼 수 있음)
    if(isLetterLocked(item)){
      const unlockTs = new Date(`${item.unlockDate}T${item.unlockTime || '00:00'}:00`).getTime();
      const dDay = Math.ceil((unlockTs - Date.now()) / 86400000);
      const timeLabel = item.unlockTime ? ` ${formatTimeKR(item.unlockTime)}` : '';
      return `<div class="wish-card letter-locked-card" data-item-id="${item.id}">
        <div class="wish-content letter-locked-body">
          <div class="letter-locked-icon">🔒</div>
          <div class="letter-locked-text">
            <span class="letter-from ${fromClass}">From. ${item.author||''}</span>
            <div class="letter-locked-sub">잠긴 편지가 있어<br>${fmtShortDate(item.unlockDate)}${timeLabel}에 열려 (D-${dDay})</div>
          </div>
        </div>
      </div>`;
    }
    
    const likes = item.likes || [];
    const isLiked = likes.includes(identity);
    const likeIcon = pixelHeartSVG(isLiked);
    const commentCount = (item.comments || []).filter(c => !c.deleted).length;

    return `<div class="wish-card" data-item-id="${item.id}">
      <div class="wish-content">
        <div class="post-summary" data-post-toggle="${item.id}">
          <div class="post-summary-title">${escapeHTML(item.title)}</div>
          <div class="post-summary-meta"><span class="letter-from ${fromClass}">From. ${item.author||''}</span><span>${dateStr}</span><span class="post-summary-arrow">▾</span></div>
        </div>
        <div class="post-detail hidden">
          <div class="letter-to ${toClass}">💌 To. ${to}</div>
          ${item.unlockDate ? `<div class="letter-unlock-badge">🔓 ${fmtShortDate(item.unlockDate)}에 잠금 해제된 편지야</div>` : ''}
          <div class="wish-body">${escapeHTML(item.body)}</div>
          ${cardPhotosHTML(item)}
          <div class="wish-footer">
            <div style="display:flex; align-items:center; gap:8px; justify-content:flex-end; width:100%;">
              ${isMine(item) ? `<button class="edit-btn" data-edit-letter="${item.id}">${pixelEditSVG()}</button>` : ''}
              ${canDeletePost(item) ? `<button class="del-btn" data-del-letter="${item.id}">✕</button>` : ''}
            </div>
          </div>

          <div class="reaction-row">
            <div style="display:flex; gap:10px;">
              <button class="like-btn ${isLiked ? 'liked' : ''}" data-like-col="letters" data-like-id="${item.id}">
                <span class="heart-icon">${likeIcon}</span> ${likes.length > 0 ? likes.length : ''}
              </button>
              <button class="comment-btn" data-toggle-comment="letters" data-toggle-id="${item.id}">
                <span class="chat-icon">${pixelChatSVG()}</span> ${commentCount > 0 ? commentCount : ''}
              </button>
            </div>
          </div>
          ${renderCommentsHTML(item, 'letters')}
        </div>
      </div>
    </div>`;
  }
let letterFilterTarget = 'all';
function renderLetters() {
  const filteredLetters = letterFilterTarget === 'all' ? letters : letters.filter(item => otherPerson(item.author) === letterFilterTarget);
  renderGroupedByTime(
    'letterList',
    filteredLetters,
    item => item.createdAt || Date.now(),
    letterCardHTML,
    letterExpandedGroups,
    letterFilterTarget === 'all'
      ? '<div class="empty-state"><span class="empty-emoji">💌</span>아직 편지가 없어.<br>짧은 편지 한 통 써볼까?</div>'
      : '<div class="empty-state"><span class="empty-emoji">💌</span>해당하는 편지가 없어.</div>'
  );
}

  function renderDday(){
    const anniv = new Date(ANNIV + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    const diffDays = Math.floor((today - anniv) / 86400000) + 1;
    document.getElementById('ddayPill').innerHTML = `2026.02.02부터 &nbsp;<b>D+${diffDays}</b>일째`;
  }

  function findNextSchedule(){
    const upcoming = schedule.filter(item => !isPast(item)).sort((a,b)=> a.date.localeCompare(b.date));
    return upcoming[0] || null;
  }
  function findNextDatePlan(){
    const upcoming = schedule.filter(item => item.isDate && !isPast(item)).sort((a,b)=> a.date.localeCompare(b.date));
    return upcoming[0] || null;
  }
  function formatTodayKR(){
    const days = ['일','월','화','수','목','금','토'];
    const d = new Date();
    return `${d.getFullYear()}년 ${d.getMonth()+1}월 ${d.getDate()}일 ${days[d.getDay()]}요일`;
  }
  function nextAnniversary(){
    const anniv = new Date(ANNIV + 'T00:00:00');
    const today = new Date(); today.setHours(0,0,0,0);
    let n = 1;
    let candidate = new Date(anniv.getFullYear()+n, anniv.getMonth(), anniv.getDate());
    while(candidate < today){
      n++;
      candidate = new Date(anniv.getFullYear()+n, anniv.getMonth(), anniv.getDate());
    }
    const diffDays = Math.round((candidate - today) / 86400000);
    return { n, diffDays };
  }

  const DAILY_MESSAGES = [
    '뭐야... 귀여워 ㅋ', '사랑해!', '나 보고싶어서 왔어?',
    '나랑 눈 마주쳤으면 한 번 웃기!!!', '안아줘~', '힘들면 나한테 전화해~',
    '오늘 뭐했어?', '뽀뽀가 적다~~~!', '보고싶어!!!',
    '굿모닝! 굿애프터눈! 굿나잇!', '노올자아~', '나를 따르라~',
    '힘내는구야!', '전화하까? 헤헤~', '보고싶지? 히히',
    '내 생각 중이야~?', '오늘 뭐 먹었어?', '내가 더 사랑해!!!',
    '나만 믿어!!!', '알러뷰', '배고파~', '날 예뻐해라!',
    '아이 예쁘다~', '신난다!!!', '뽀뽀해줘~', '넌 존재 자체가 사랑이야!', '넌 내 자랑이야!'
  ];
  function todayMessage(){
    const start = new Date(2026,0,1);
    const today = new Date(); today.setHours(0,0,0,0);
    const dayOfYear = Math.floor((today - start) / 86400000);
    const idx = ((dayOfYear % DAILY_MESSAGES.length) + DAILY_MESSAGES.length) % DAILY_MESSAGES.length;
    return DAILY_MESSAGES[idx];
  }

  function findThrowback(){
    const today = new Date();
    const mm = today.getMonth(), dd = today.getDate(), curYear = today.getFullYear();
    const candidates = [];
    dateLogs.forEach(item=>{
      if(!item.date) return;
      const d = new Date(item.date + 'T00:00:00');
      if(d.getMonth() === mm && d.getDate() === dd && d.getFullYear() < curYear){
        candidates.push({ type:'datelog', yearsAgo: curYear - d.getFullYear(), item });
      }
    });
    letters.forEach(item=>{
      const d = new Date(item.createdAt || 0);
      if(d.getMonth() === mm && d.getDate() === dd && d.getFullYear() < curYear && d.getFullYear() > 2000){
        candidates.push({ type:'letter', yearsAgo: curYear - d.getFullYear(), item });
      }
    });
    if(candidates.length === 0) return null;
    candidates.sort((a,b)=> a.yearsAgo - b.yearsAgo);
    return candidates[0];
  }

  function relativeTimeKR(ts){
    if(!ts) return '';
    const diffMs = Date.now() - ts;
    const diffMin = Math.floor(diffMs / 60000);
    if(diffMin < 1) return '방금 전';
    if(diffMin < 60) return `${diffMin}분 전`;
    const diffHour = Math.floor(diffMin / 60);
    if(diffHour < 24) return `${diffHour}시간 전`;
    const diffDay = Math.floor(diffHour / 24);
    if(diffDay < 7) return `${diffDay}일 전`;
    const d = new Date(ts);
    return `${d.getMonth()+1}.${d.getDate()}`;
  }

  function buildActivityFeed(){
    const items = [];
    schedule.forEach(it=>{
      if(!it.createdAt) return;
      items.push({ id: it.id, ts: it.createdAt, author: it.author, label:'일정', text: it.title, tab:'schedule' });
    });
    wishes.forEach(it=>{
      items.push({ id: it.id, ts: it.createdAt || 0, author: it.author, label:'위시', text: it.title, tab:'wish' });
    });
    dateLogs.forEach(it=>{
      if(!it.createdAt) return;
      items.push({ id: it.id, ts: it.createdAt, author: it.author, label:'데이트기록', text: it.title, tab:'datelog' });
    });
    stamps.forEach(it=>{
      items.push({ id: it.id, ts: it.createdAt || 0, author: it.author || it.person, label:'스탬프', text: it.text, tab:'stamp' });
    });
    letters.forEach(it=>{
      const text = isLetterLocked(it) ? '🔒 잠긴 편지' : (it.title || it.body);
      items.push({ id: it.id, ts: it.createdAt || 0, author: it.author, label:'편지', text, tab:'letter' });
    });
    return items.sort((a,b)=> b.ts - a.ts).slice(0, 2);
  }

  let renderHomeDebounceTimer = null;
  function renderHome(){
    clearTimeout(renderHomeDebounceTimer);
    renderHomeDebounceTimer = setTimeout(renderHomeImmediate, 120);
  }
  function renderHomeImmediate(){
    const todayEl = document.getElementById('homeToday');
    if(todayEl) todayEl.textContent = formatTodayKR();

    const bubble = document.getElementById('homeSpeechBubble');
    if(bubble) bubble.textContent = todayMessage();

    const annivMini = document.getElementById('homeAnnivMini');
    if(annivMini){
      const anv = nextAnniversary();
      annivMini.innerHTML = anv.diffDays === 0
        ? `🎉 오늘은 <b>${anv.n}주년</b>이야!`
        : `${anv.n}주년까지 <b>D-${anv.diffDays}</b>`;
    }

    const nextDateCard = document.getElementById('homeNextDateCard');
    if(nextDateCard){
      const nextDate = findNextDatePlan();
      const today = new Date(); today.setHours(0,0,0,0);
      if(nextDate){
        const dDiff = Math.round((new Date(nextDate.date+'T00:00:00') - today) / 86400000);
        nextDateCard.innerHTML = `
          <div class="home-next-label">💛 다음 데이트</div>
          <div class="home-next-title">${dDiff === 0 ? '오늘이야!' : 'D-' + dDiff} · ${escapeHTML(nextDate.title)}</div>
        `;
      } else {
        nextDateCard.innerHTML = `<div class="home-next-label">💛 다음 데이트</div><div class="home-next-sub">예정된 데이트가 없어</div>`;
      }
    }

    const feedCard = document.getElementById('homeFeedCard');
    if(feedCard){
      const feed = buildActivityFeed();
      if(feed.length === 0){
        feedCard.innerHTML = `<div class="home-next-label">🕓 최근 활동</div><div class="home-next-sub">아직 활동이 없어</div>`;
      } else {
        const authorClass = a => a === '소정' ? 'author-sojeong' : 'author-seonho';
        feedCard.innerHTML = `
          <div class="home-next-label">🕓 최근 활동</div>
          ${feed.map(f => `<div class="home-feed-item" data-tab-target="${f.tab}" data-item-target="${f.id||''}">
            <span class="home-feed-author ${authorClass(f.author)}">${f.author||''}</span>
            <span class="home-feed-text">${f.label} · ${escapeHTML((f.text||'').slice(0,24))}</span>
            <span class="home-feed-time">${relativeTimeKR(f.ts)}</span>
          </div>`).join('')}
        `;
        feedCard.querySelectorAll('.home-feed-item').forEach(el=>{
          el.addEventListener('click', ()=>{
            const itemId = el.dataset.itemTarget;
            if(itemId) navigateToItem(el.dataset.tabTarget, itemId);
            else activateTab(el.dataset.tabTarget);
          });
        });
      }
    }

    const throwbackCard = document.getElementById('homeThrowbackCard');
    if(throwbackCard){
      const tb = findThrowback();
      if(tb){
        const photo = getItemPhotos(tb.item)[0];
        const title = tb.type === 'datelog' ? tb.item.title : (tb.item.title || tb.item.body.slice(0,20));
        throwbackCard.classList.remove('hidden');
        throwbackCard.dataset.tabTarget = tb.type === 'datelog' ? 'datelog' : 'letter';
        throwbackCard.innerHTML = `
          ${photo ? `<img class="home-throwback-photo" src="${photo}" loading="lazy">` : '<div style="font-size:28px;">💭</div>'}
          <div>
            <div class="home-throwback-label">${tb.yearsAgo}년 전 오늘</div>
            <div class="home-throwback-title">${escapeHTML(title)}</div>
          </div>
        `;
      } else {
        throwbackCard.classList.add('hidden');
      }
    }
  }

  function getCurrentActiveTab(){
    const activePanel = document.querySelector('.tab-panel.active');
    return activePanel ? activePanel.id.replace('panel-','') : null;
  }
  function hasUnsavedDraft(tabName){
    switch(tabName){
      case 'schedule': return document.getElementById('schedTitle').value.trim() !== '';
      case 'wish': return document.getElementById('wishTitle').value.trim() !== '' || document.getElementById('wishBody').value.trim() !== '';
      case 'datelog': return document.getElementById('dateLogTitle').value.trim() !== '';
      case 'letter': return document.getElementById('letterBody').value.trim() !== '';
      case 'stamp': return document.getElementById('stampText').value.trim() !== '';
      default: return false;
    }
  }
  function resetDraftForTab(tabName){
    switch(tabName){
      case 'schedule': resetScheduleForm(); break;
      case 'wish': resetWishForm(); break;
      case 'datelog': resetDatelogForm(); break;
      case 'letter': resetLetterForm(); break;
      case 'stamp': resetStampForm(); break;
    }
  }
  function activateTab(tabName){
    const panel = document.getElementById('panel-'+tabName);
    if(!panel) return false;
    const currentTab = getCurrentActiveTab();
    if(currentTab && currentTab !== tabName && hasUnsavedDraft(currentTab)){
      const proceed = confirm('작성 중인 내용이 있어.\n다른 탭으로 이동하면 지금 쓴 내용이 사라져.\n\n그래도 이동할까?');
      if(!proceed) return false;
      resetDraftForTab(currentTab);
    }
    // 떠나는 탭에서 펼쳐뒀던 게시물은 접어둬서, 다음에 다시 왔을 때 깔끔하게 시작하도록 함
    if(currentTab && currentTab !== tabName){
      const oldPanel = document.getElementById('panel-'+currentTab);
      if(oldPanel){
        oldPanel.querySelectorAll('[data-item-id]').forEach(card => {
          const itemId = card.dataset.itemId;
          expandedPostIds.delete(itemId);
          // 게시물뿐 아니라 그 안의 댓글창/답글창 상태도 같이 초기화
          Object.values(tabToColName).forEach(colName=>{
            const key = `${colName}-${itemId}`;
            openCommentSections.delete(key);
            replyingToMap.delete(key);
          });
        });
        oldPanel.querySelectorAll('.post-detail:not(.hidden)').forEach(d => d.classList.add('hidden'));
        oldPanel.querySelectorAll('.comment-section.active').forEach(s => s.classList.remove('active'));
        oldPanel.querySelectorAll('.comment-reply-input-row').forEach(r => r.remove());
      }
      // 편지/스탬프/위시/데이트기록 탭을 나가면 필터도 "전체"로 되돌림 (새로고침한 느낌으로)
      if(currentTab === 'letter' && letterFilterTarget !== 'all'){
        letterFilterTarget = 'all';
        document.querySelectorAll('#letterFilterRow .filter-chip').forEach(b=>{
          b.classList.toggle('active', b.dataset.letterFilter === 'all');
        });
        renderLetters();
      }
      if(currentTab === 'stamp' && stampFilterTarget !== 'all'){
        stampFilterTarget = 'all';
        document.querySelectorAll('#stampFilterRow .filter-chip').forEach(b=>{
          b.classList.toggle('active', b.dataset.stampFilter === 'all');
        });
        renderStamp();
      }
      if(currentTab === 'wish' && wishFilterTarget !== 'all'){
        wishFilterTarget = 'all';
        document.querySelectorAll('#wishFilterRow .filter-chip').forEach(b=>{
          b.classList.toggle('active', b.dataset.wishFilter === 'all');
        });
        renderWish();
      }
      if(currentTab === 'datelog' && dateLogFilterTarget !== 'all'){
        dateLogFilterTarget = 'all';
        document.querySelectorAll('#dateLogFilterRow .filter-chip').forEach(b=>{
          b.classList.toggle('active', b.dataset.datelogFilter === 'all');
        });
        renderDateLog();
      }
      // 편지 탭을 나가면 "특정 날짜까지 잠그기" 토글도 눌리지 않은 상태로 되돌림
      if(currentTab === 'letter'){
        const lockRow = document.getElementById('letterUnlockDateRow');
        if(lockRow && !lockRow.classList.contains('hidden')){
          lockRow.classList.add('hidden');
          document.getElementById('letterUnlockDate').value = '';
          document.getElementById('letterUnlockTime').value = '';
          document.getElementById('letterLockToggleBtn').textContent = '+ 특정 날짜까지 잠그기 (선택)';
        }
      }
    }
    document.querySelectorAll('.tab-panel').forEach(p=>p.classList.remove('active'));
    panel.classList.add('active');
    window.scrollTo(0, 0);
    document.querySelectorAll('.tab-btn').forEach(b=>{
      b.classList.toggle('active', b.dataset.tab === tabName);
    });
    if(typeof startCollectionWatcher === 'function') startCollectionWatcher(tabName);
    return true;
  }
  function activateTabFromHash(){
    const hash = window.location.hash.replace('#','');
    // 알림 목적지는 변수(hash 파싱 결과)에 먼저 담아두므로, 주소에서는 바로 지워도 됨.
    // 안 지우면 삼성인터넷 등이 나중에 "시작 주소"를 복원할 때 예전 알림이 다시 실행될 수 있음.
    if(hash){
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
    if(!hash) return;
    const [tab, itemId, extra] = hash.split(':');
    if(!tab) return;
    const commentTs = (extra && extra.startsWith('c')) ? extra.slice(1) : null;
    if(itemId) navigateToItem(tab, itemId, commentTs);
    else activateTab(tab);
  }
  document.querySelectorAll('.tab-btn').forEach(btn=>{
    btn.addEventListener('click', ()=> activateTab(btn.dataset.tab));
  });
  document.getElementById('homeThrowbackCard').addEventListener('click', ()=>{
    const target = document.getElementById('homeThrowbackCard').dataset.tabTarget;
    if(target) activateTab(target);
  });
  document.getElementById('homeNextDateCard').addEventListener('click', ()=>{
    const nextDate = findNextDatePlan();
    if(nextDate) navigateToItem('schedule', nextDate.id);
    else activateTab('schedule');
  });
  window.addEventListener('hashchange', activateTabFromHash);

  function updateIdentityChip(){
    document.getElementById('identityChip').textContent = identity ? `나는 ${identity}` : '나는 ...';
  }
  document.getElementById('identityChip').addEventListener('click', ()=>{
    document.getElementById('identityPopupTitle').textContent = identity ? `나는 ${identity}` : '나는 ...';
    document.getElementById('identityPopup').classList.remove('hidden');
  });
  document.getElementById('identityPopupCloseBtn').addEventListener('click', ()=>{
    document.getElementById('identityPopup').classList.add('hidden');
  });
  async function logoutCurrentUser(){
    const oldIdentity = identity;
    const deviceId = getOrCreateDeviceId();

    try{
      // 같은 기기에서 나중에 다른 사람 계정으로 로그인해도 이 기기가 예전 사람 알림까지
      // 계속 받는 일이 없도록, 로그아웃 전에 이 기기의 토큰 문서를 지워둠
      if(oldIdentity){
        await db.collection('fcmTokens').doc(oldIdentity).collection('devices').doc(deviceId)
          .delete().catch(err => console.warn('푸시 기기 등록 삭제 실패', err));
      }
    } finally {
      if(foregroundMessageUnsubscribe){
        foregroundMessageUnsubscribe();
        foregroundMessageUnsubscribe = null;
      }
      clearTransientNavigationState();

      stopAllWatchers();

      identity = null;
      updateIdentityChip();

      await firebase.auth().signOut();
    }
  }
  document.getElementById('logoutBtn').addEventListener('click', async ()=>{
    document.getElementById('identityPopup').classList.add('hidden');
    if(!confirm('로그아웃할까?')) return;
    await logoutCurrentUser();
  });

  // ---- 나의 활동 (내가 쓴 글 + 댓글/답글 모아보기) ----
  function buildMyActivityIndex(){
    const items = [];
    schedule.forEach(it => { if(it.author === identity) items.push({ type:'post', tab:'schedule', label:'일정', ts: it.createdAt||0, title: it.title, sub:'', itemId: it.id }); });
    wishes.forEach(it => { if(it.author === identity) items.push({ type:'post', tab:'wish', label:'위시', ts: it.createdAt||0, title: it.title, sub:'', itemId: it.id }); });
    dateLogs.forEach(it => { if(it.author === identity) items.push({ type:'post', tab:'datelog', label:'데이트기록', ts: it.createdAt||0, title: it.title, sub:'', itemId: it.id }); });
    stamps.forEach(it => { if((it.author||it.person) === identity) items.push({ type:'post', tab:'stamp', label:'스탬프', ts: it.createdAt||0, title: it.text, sub:'', itemId: it.id }); });
    letters.forEach(it => { if(it.author === identity) items.push({ type:'post', tab:'letter', label:'편지', ts: it.createdAt||0, title: it.title, sub:'', itemId: it.id }); });

    // 다른 사람 글에 단 것까지 포함해서, 내가 쓴 댓글/답글 전부 모으기
    const commentSources = [
      { list: dateLogs, tab:'datelog', label:'데이트기록' },
      { list: stamps, tab:'stamp', label:'스탬프' },
      { list: letters, tab:'letter', label:'편지' }
    ];
    commentSources.forEach(({list, tab, label}) => {
      list.forEach(it => {
        (it.comments||[]).forEach(c => {
          if(c.author === identity && !c.deleted){
            items.push({
              type:'comment', tab, label: c.parentTs ? '답글' : '댓글',
              ts: c.ts, title: `${label} · ${escapeHTML((it.title || it.text || '').slice(0,20))}`,
              sub: c.text, itemId: it.id, commentTs: c.ts
            });
          }
        });
      });
    });

    return items.sort((a,b)=> b.ts - a.ts);
  }

  let myActivityCategory = 'all';
  function renderMyActivity(){
    const container = document.getElementById('myActivityResults');
    let items = buildMyActivityIndex();
    if(myActivityCategory !== 'all') items = items.filter(r => r.type === myActivityCategory);
    if(items.length === 0){
      container.innerHTML = '<div class="empty-state" style="padding:30px 10px;">아직 활동이 없어.</div>';
      return;
    }
    container.innerHTML = items.map((r,i) => `
      <div class="search-result-item" data-my-idx="${i}">
        <span class="search-result-label">${r.label}</span>
        <div>
          <div class="search-result-title">${r.title || ''}</div>
          ${r.sub ? `<div class="search-result-sub">${escapeHTML(r.sub.slice(0,44))}</div>` : ''}
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.search-result-item').forEach((el,i)=>{
      el.addEventListener('click', ()=>{
        closeMyActivityOverlay();
        navigateToItem(items[i].tab, items[i].itemId, items[i].commentTs);
      });
    });
  }
  function openMyActivityOverlay(){
    document.getElementById('identityPopup').classList.add('hidden');
    document.getElementById('myActivityOverlay').classList.remove('hidden');
    renderMyActivity();
  }
  function closeMyActivityOverlay(){
    document.getElementById('myActivityOverlay').classList.add('hidden');
  }
  document.getElementById('myActivityBtn').addEventListener('click', openMyActivityOverlay);
  document.getElementById('myActivityCloseBtn').addEventListener('click', closeMyActivityOverlay);
  document.querySelectorAll('#myActivityCategoryRow .search-cat-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('#myActivityCategoryRow .search-cat-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      myActivityCategory = btn.dataset.mycat;
      renderMyActivity();
    });
  });

  // ---- 알림함 (벨) + 배지 ----
  let unreadNotifications = [];

  function updateAppBadge(count){
    // 홈 화면 앱 아이콘 배지 (Badging API - 지원 안 하는 브라우저는 조용히 무시됨)
    if('setAppBadge' in navigator){
      if(count > 0) navigator.setAppBadge(count).catch(()=>{});
      else if('clearAppBadge' in navigator) navigator.clearAppBadge().catch(()=>{});
    }
  }
  function updateNotifBadge(){
    const count = unreadNotifications.length;
    const dot = document.getElementById('notifBadgeCount');
    if(dot){
      if(count > 0){ dot.textContent = count > 99 ? '99+' : String(count); dot.classList.remove('hidden'); }
      else dot.classList.add('hidden');
    }
    updateAppBadge(count);
  }
  function watchNotifications(){
    if(!identity) return;
    const unsubscribe = db.collection('notifications').doc(identity).collection('items')
      .where('read', '==', false)
      .onSnapshot(snap => {
        unreadNotifications = [];
        snap.forEach(doc => unreadNotifications.push({ id: doc.id, ...doc.data() }));
        unreadNotifications.sort((a,b) => (b.createdAt||0) - (a.createdAt||0));
        updateNotifBadge();
        renderNotifResults();
      }, err => console.error('알림함 구독 실패', err));
    rememberUnsubscribe(unsubscribe);
  }
  function markNotifRead(notifId){
    if(!identity || !notifId) return;
    db.collection('notifications').doc(identity).collection('items').doc(notifId)
      .update({ read: true }).catch(()=>{});
    // 보낼 때 같은 ID를 시스템 알림의 "태그"로 심어뒀어서, 그 태그로 콕 집어서 지울 수 있음
    postToActiveServiceWorker({ type: 'CLOSE_NOTIFICATION', tag: notifId });
  }
  function renderNotifResults(){
    const container = document.getElementById('notifResults');
    const clearBtn = document.getElementById('notifClearAllBtn');
    if(!container) return;
    clearBtn.classList.toggle('hidden', unreadNotifications.length === 0);
    if(unreadNotifications.length === 0){
      container.innerHTML = '<div class="empty-state" style="padding:30px 10px;">읽지 않은 알림이 없어.</div>';
      return;
    }
    container.innerHTML = unreadNotifications.map((n,i) => `
      <div class="search-result-item notif-item" data-notif-idx="${i}">
        <div>
          <div class="search-result-title">${escapeHTML(n.title || '')}</div>
          ${n.body ? `<div class="search-result-sub">${escapeHTML((n.body||'').slice(0,44))}</div>` : ''}
        </div>
        <button class="notif-item-dismiss" data-notif-dismiss="${n.id}">✕</button>
      </div>
    `).join('');
    container.querySelectorAll('.notif-item').forEach((el,i)=>{
      el.addEventListener('click', (e)=>{
        if(e.target.closest('.notif-item-dismiss')) return; // ✕ 버튼은 아래에서 따로 처리
        const n = unreadNotifications[i];
        const moved = n.itemId ? navigateToItem(n.tab, n.itemId, n.commentTs || undefined) : activateTab(n.tab);
        if(!moved) return; // 작성 중인 내용 때문에 이동을 취소했으면, 읽음 처리도 하지 않음
        markNotifRead(n.id);
        closeNotifOverlay();
      });
    });
    container.querySelectorAll('.notif-item-dismiss').forEach(btn=>{
      btn.addEventListener('click', (e)=>{
        e.stopPropagation();
        markNotifRead(btn.dataset.notifDismiss); // 이동은 안 하고 읽음 처리만
      });
    });
  }
  function openNotifOverlay(){
    document.getElementById('notifOverlay').classList.remove('hidden');
    renderNotifResults();
  }
  function closeNotifOverlay(){
    document.getElementById('notifOverlay').classList.add('hidden');
  }
  document.getElementById('notifBellBtn').addEventListener('click', openNotifOverlay);
  document.getElementById('notifCloseBtn').addEventListener('click', closeNotifOverlay);
  document.getElementById('notifClearAllBtn').addEventListener('click', async ()=>{
    if(!confirm(`안 읽은 알림 ${unreadNotifications.length}개를 전부 지울까?`)) return;
    const batch = db.batch();
    unreadNotifications.forEach(n => batch.delete(db.collection('notifications').doc(identity).collection('items').doc(n.id)));
    try{
      await batch.commit();
      // Firestore 삭제가 실제로 성공한 뒤에만 시스템 알림을 닫음 - 동시에 시작하면
      // Firestore가 네트워크 문제로 실패해도 시스템 알림은 먼저 사라져서
      // "알림함엔 남아있는데 잠금화면 알림만 없어지는" 불일치가 생길 수 있음
      await postToActiveServiceWorker({ type: 'CLEAR_ALL_NOTIFICATIONS' });
    }catch(err){
      console.error('알림 전체 삭제 실패', err);
      alert('알림을 지우지 못했어. 잠시 후 다시 시도해줘.');
    }
  });

  // 앱이 완전히 꺼져있다가 알림 링크(콜드 스타트)로 열렸을 때, 주소의 ?notif= 쿼리로 읽음 처리
  function handleNotifQueryParam(){
    const params = new URLSearchParams(window.location.search);
    const notifId = params.get('notif');
    if(notifId){
      markNotifRead(notifId);
      params.delete('notif');
      const newSearch = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (newSearch ? `?${newSearch}` : '') + window.location.hash);
    }
  }

  let signInInProgress = false;
  document.getElementById('googleLoginBtn').addEventListener('click', ()=>{
    signInInProgress = true;
    const msgEl = document.getElementById('loginGateMsg');
    const btnEl = document.getElementById('googleLoginBtn');
    if(msgEl) msgEl.innerHTML = '로그인 중이야...';
    if(btnEl) btnEl.classList.add('hidden');
    const provider = new firebase.auth.GoogleAuthProvider();
    firebase.auth().signInWithPopup(provider).catch(err=>{
      signInInProgress = false;
      console.error('로그인 실패', err);
      if(btnEl) btnEl.classList.remove('hidden');
      if(err.code !== 'auth/popup-closed-by-user'){
        alert('로그인에 실패했어. 다시 시도해줘.');
      } else if(msgEl){
        // 팝업을 직접 닫아서 취소한 경우엔 원래 문구로 되돌림
        msgEl.innerHTML = '소정, 선호만 쓸 수 있는 앱이야.<br>구글 계정으로 로그인해줘.';
      }
    });
  });

  // ---- 삭제 확인 모달 ----
  let pendingDeleteAction = null;
  function askDeleteConfirm(action){
    pendingDeleteAction = action;
    document.getElementById('confirmModal').classList.remove('hidden');
  }
  document.getElementById('confirmCancelBtn').addEventListener('click', ()=>{
    pendingDeleteAction = null;
    document.getElementById('confirmModal').classList.add('hidden');
  });
  document.getElementById('confirmDeleteBtn').addEventListener('click', async ()=>{
    const action = pendingDeleteAction;
    pendingDeleteAction = null;
    document.getElementById('confirmModal').classList.add('hidden');
    if(action){ try{ await action(); }catch(err){ console.error(err); } }
  });

  // ---- 저장 실패시 쓴 내용을 지키면서 사진 없이 재시도 ----
  function showLoadingOverlay(message){
    document.querySelector('#loadingOverlay .loading-text').innerHTML = message || '게시 중이야...<br>사진이 있으면 조금 걸릴 수 있어';
    document.getElementById('loadingOverlay').classList.remove('hidden');
  }
  function hideLoadingOverlay(){
    document.getElementById('loadingOverlay').classList.add('hidden');
  }
  async function saveWithPhotoFallback(doSave, onSuccess){
    showLoadingOverlay();
    try{
      try{
        await doSave(true);
        onSuccess();
      }catch(e){
        console.error('저장 실패', e);
        hideLoadingOverlay();
        const retry = confirm('저장에 실패했어. 사진이 너무 크면 실패할 수 있어.\n\n사진 없이 다시 저장할까? (쓴 내용은 그대로 남아있어)');
        if(retry){
          showLoadingOverlay();
          try{
            await doSave(false);
            onSuccess();
            alert('사진 없이 저장했어. 사진은 조금 작은 걸로 다시 추가해봐도 좋아.');
          }catch(e2){
            console.error('재시도도 실패', e2);
            alert('다시 시도했는데도 실패했어. 인터넷 연결을 확인해줘. 쓴 내용은 그대로 남아있어.');
          }
        }
      }
    } finally {
      hideLoadingOverlay();
    }
  }

  // ---- 일정 ----
  let editingScheduleId = null;
  let schedIsDatePlan = false;
  function setDatePlanToggle(v){
    schedIsDatePlan = v;
    document.getElementById('schedDatePlanToggle').classList.toggle('active', v);
  }
  document.getElementById('schedDatePlanToggle').addEventListener('click', ()=>{
    setDatePlanToggle(!schedIsDatePlan);
  });
  function setRangeToggleState(rowId, btnId, show){
    document.getElementById(rowId).classList.toggle('hidden', !show);
    document.getElementById(btnId).textContent = show ? '- 종료일 제거' : '+ 종료일 추가 (선택)';
  }
  document.getElementById('schedRangeToggleBtn').addEventListener('click', ()=>{
    const row = document.getElementById('schedEndDateRow');
    const willShow = row.classList.contains('hidden');
    setRangeToggleState('schedEndDateRow', 'schedRangeToggleBtn', willShow);
    if(willShow){
      if(!document.getElementById('schedEndDate').value){
        document.getElementById('schedEndDate').value = document.getElementById('schedDate').value;
      }
    } else {
      document.getElementById('schedEndDate').value = '';
      document.getElementById('schedEndTime').value = '';
    }
  });
  function startEditSchedule(item){
    editingScheduleId = item.id;
    document.getElementById('schedDate').value = item.date;
    document.getElementById('schedTime').value = item.time || '';
    document.getElementById('schedTitle').value = item.title;
    document.getElementById('schedMemo').value = item.memo || '';
    setDatePlanToggle(!!item.isDate);
    if(item.endDate && item.endDate !== item.date){
      document.getElementById('schedEndDate').value = item.endDate;
      document.getElementById('schedEndTime').value = item.endTime || '';
      setRangeToggleState('schedEndDateRow', 'schedRangeToggleBtn', true);
    } else {
      document.getElementById('schedEndDate').value = '';
      document.getElementById('schedEndTime').value = '';
      setRangeToggleState('schedEndDateRow', 'schedRangeToggleBtn', false);
    }
    document.getElementById('schedAddBtn').textContent = '수정 완료';
    document.getElementById('schedCancelBtn').classList.remove('hidden');
    document.getElementById('schedAddBtn').closest('.add-card').scrollIntoView({behavior:'smooth', block:'start'});
  }
  function resetScheduleForm(){
    editingScheduleId = null;
    document.getElementById('schedTitle').value='';
    document.getElementById('schedMemo').value='';
    document.getElementById('schedTime').value='';
    document.getElementById('schedEndDate').value='';
    document.getElementById('schedEndTime').value='';
    setRangeToggleState('schedEndDateRow', 'schedRangeToggleBtn', false);
    setDatePlanToggle(false);
    document.getElementById('schedDate').value = localDateStr();
    document.getElementById('schedAddBtn').textContent = '추가하기';
    document.getElementById('schedCancelBtn').classList.add('hidden');
  }
  document.getElementById('schedCancelBtn').addEventListener('click', resetScheduleForm);
  document.getElementById('schedAddBtn').addEventListener('click', async ()=>{
    const date = document.getElementById('schedDate').value;
    const title = document.getElementById('schedTitle').value.trim();
    if(!date || !title) return;
    const memo = document.getElementById('schedMemo').value.trim();
    const time = document.getElementById('schedTime').value || null;
    let endDate = document.getElementById('schedEndDate').value || null;
    if(endDate && endDate < date) endDate = date;
    const endTime = endDate ? (document.getElementById('schedEndTime').value || null) : null;
    const isDate = schedIsDatePlan;
    try{
      if(editingScheduleId){
        await db.collection('schedule').doc(editingScheduleId).update({ date, endDate, time, endTime, title, memo, isDate });
        resetScheduleForm();
      } else {
        await db.collection('schedule').doc(genId()).set({ date, endDate, time, endTime, title, memo, isDate, author: identity, createdAt: Date.now() });
        document.getElementById('schedTitle').value='';
        document.getElementById('schedMemo').value='';
        document.getElementById('schedTime').value='';
        document.getElementById('schedEndDate').value='';
        document.getElementById('schedEndTime').value='';
        setRangeToggleState('schedEndDateRow', 'schedRangeToggleBtn', false);
        setDatePlanToggle(false);
      }
    }catch(e){ console.error('일정 저장 실패', e); alert('저장에 실패했어. 인터넷 연결을 확인해줘.'); }
  });
  function handleScheduleClick(e){
    const editBtn = e.target.closest('[data-edit-schedule]');
    const delBtn = e.target.closest('[data-del-schedule]');
    const editId = editBtn && editBtn.dataset.editSchedule;
    const delId = delBtn && delBtn.dataset.delSchedule;
    if(editId){
      const item = schedule.find(s=>s.id===editId);
      if(item) startEditSchedule(item);
    } else if(delId){
      askDeleteConfirm(async ()=>{ await db.collection('schedule').doc(delId).delete(); });
    }
  }
  document.getElementById('scheduleList').addEventListener('click', handleScheduleClick);
  document.getElementById('pastScheduleSection').addEventListener('click', handleScheduleClick);
  document.getElementById('togglePastBtn').addEventListener('click', ()=>{
    showPastSchedule = !showPastSchedule;
    renderSchedule();
  });
  document.getElementById('clearCalFilterBtn').addEventListener('click', ()=>{
    calendarFilterDate = null;
    renderCalendar();
    renderSchedule();
  });


  // ---- 하고 싶은 일 ----
  let editingWishId = null;
  let showDoneWishes = false;
  setupPhotoPicker('wishPhotoInput','wishPhotoBtn','wishPhotoPreviewWrap', ()=>pendingWishPhotos, (v)=>{ pendingWishPhotos = v; });
  function startEditWish(item){
    editingWishId = item.id;
    document.getElementById('wishTitle').value = item.title;
    document.getElementById('wishBody').value = item.body || '';
    document.getElementById('wishLink').value = item.link || '';
    if(document.getElementById('wishBody')._autoGrowResize) document.getElementById('wishBody')._autoGrowResize();
    pendingWishPhotos = getItemPhotos(item).slice();
    renderPhotoPreviewGrid('wishPhotoPreviewWrap', ()=>pendingWishPhotos, (v)=>{ pendingWishPhotos = v; });
// 게시하기 / 수정 완료 버튼
    document.getElementById('wishAddBtn').textContent = '수정 완료';
    document.getElementById('wishCancelBtn').classList.remove('hidden');
    document.getElementById('wishAddBtn').closest('.add-card').scrollIntoView({behavior:'smooth', block:'start'});
  }
  function resetWishForm(){
    editingWishId = null;
    document.getElementById('wishTitle').value = '';
    document.getElementById('wishBody').value = '';
    document.getElementById('wishLink').value = '';
    if(document.getElementById('wishBody')._autoGrowResize) document.getElementById('wishBody')._autoGrowResize();
    revokePendingPhotoUrls(pendingWishPhotos);
    pendingWishPhotos = [];
    renderPhotoPreviewGrid('wishPhotoPreviewWrap', ()=>pendingWishPhotos, (v)=>{ pendingWishPhotos = v; });
    document.getElementById('wishAddBtn').textContent = '게시하기';
    document.getElementById('wishCancelBtn').classList.add('hidden');
    clearDraftAutosave(STORAGE_PREFIX + 'draft_wish');
  }
  document.getElementById('wishCancelBtn').addEventListener('click', resetWishForm);
    document.getElementById('wishAddBtn').addEventListener('click', async () => {
      const title = document.getElementById('wishTitle').value.trim();
      if (!title) return;
    
      await saveItem(
        'wishlist',
        !!editingWishId,
        editingWishId,
        { 
          title, 
          body: document.getElementById('wishBody').value.trim(), 
          link: document.getElementById('wishLink').value.trim(), 
          done: false 
        },
        pendingWishPhotos,
        resetWishForm
      );
    });

  // 클릭 이벤트 (수정/삭제/체크)
  function handleWishListClick(e) {
    const editBtn = e.target.closest('[data-edit-wish]');
    const delBtn = e.target.closest('[data-del-wish]');
    const checkBtn = e.target.closest('[data-check-wish]');
    const editId = editBtn && editBtn.dataset.editWish;
    const delId = delBtn && delBtn.dataset.delWish;
    const checkId = checkBtn && checkBtn.dataset.checkWish;

    if (editId) startEditWish(wishes.find(s => s.id === editId));
    else if (delId) deleteItem('wishlist', delId, wishes.find(s => s.id === delId));
    else if (checkId) {
      const wishItem = wishes.find(s => s.id === checkId);
      if(!wishItem) return;
      const willBeDone = !wishItem.done;
      if(willBeDone && !confirm('이 위시를 완료로 표시할까?')) return;
      db.collection('wishlist').doc(checkId).update({ done: willBeDone }).catch(err=>console.error(err));
    }
  }
  document.getElementById('wishList').addEventListener('click', handleWishListClick);
  document.getElementById('doneWishSection').addEventListener('click', handleWishListClick);
  document.getElementById('toggleDoneWishBtn').addEventListener('click', ()=>{
    showDoneWishes = !showDoneWishes;
    renderWish();
  });

  // ---- 데이트 기록 ----
  let editingDatelogId = null;
  setupPhotoPicker('dateLogPhotoInput','dateLogPhotoBtn','dateLogPhotoPreviewWrap', ()=>pendingDateLogPhotos, (v)=>{ pendingDateLogPhotos = v; });
  document.getElementById('dateLogRangeToggleBtn').addEventListener('click', ()=>{
    const row = document.getElementById('dateLogEndDateRow');
    const willShow = row.classList.contains('hidden');
    setRangeToggleState('dateLogEndDateRow', 'dateLogRangeToggleBtn', willShow);
    if(willShow){
      if(!document.getElementById('dateLogEndDate').value){
        document.getElementById('dateLogEndDate').value = document.getElementById('dateLogDate').value;
      }
    } else {
      document.getElementById('dateLogEndDate').value = '';
      document.getElementById('dateLogEndTime').value = '';
    }
  });
  function startEditDatelog(item){
    editingDatelogId = item.id;
    document.getElementById('dateLogDate').value = item.date;
    document.getElementById('dateLogTime').value = item.time || '';
    document.getElementById('dateLogTitle').value = item.title;
    document.getElementById('dateLogLocation').value = item.location || '';
    document.getElementById('dateLogLocationResults').classList.add('hidden');
    const statusEl0 = document.getElementById('dateLogLocationStatus');
    if(typeof item.lat === 'number' && typeof item.lng === 'number'){
      pendingDateLogGeo = { lat: item.lat, lng: item.lng };
      statusEl0.classList.remove('hidden');
      statusEl0.textContent = '✅ 저장된 위치가 있어';
      statusEl0.style.color = '#4A9B6E';
    } else {
      pendingDateLogGeo = null;
      statusEl0.classList.add('hidden');
    }
    document.getElementById('dateLogMemo').value = item.memo || '';
    if(document.getElementById('dateLogMemo')._autoGrowResize) document.getElementById('dateLogMemo')._autoGrowResize();
    if(item.endDate && item.endDate !== item.date){
      document.getElementById('dateLogEndDate').value = item.endDate;
      document.getElementById('dateLogEndTime').value = item.endTime || '';
      setRangeToggleState('dateLogEndDateRow', 'dateLogRangeToggleBtn', true);
    } else {
      document.getElementById('dateLogEndDate').value = '';
      document.getElementById('dateLogEndTime').value = '';
      setRangeToggleState('dateLogEndDateRow', 'dateLogRangeToggleBtn', false);
    }
    pendingDateLogPhotos = getItemPhotos(item).slice();
    renderPhotoPreviewGrid('dateLogPhotoPreviewWrap', ()=>pendingDateLogPhotos, (v)=>{ pendingDateLogPhotos = v; });
    document.getElementById('dateLogAddBtn').textContent = '수정 완료';
    document.getElementById('dateLogCancelBtn').classList.remove('hidden');
    document.getElementById('dateLogAddBtn').closest('.add-card').scrollIntoView({behavior:'smooth', block:'start'});
  }
  function resetDatelogForm(){
    editingDatelogId = null;
    document.getElementById('dateLogTitle').value='';
    document.getElementById('dateLogLocation').value='';
    document.getElementById('dateLogLocationStatus').classList.add('hidden');
    document.getElementById('dateLogLocationResults').classList.add('hidden');
    pendingDateLogGeo = null;
    document.getElementById('dateLogMemo').value='';
    if(document.getElementById('dateLogMemo')._autoGrowResize) document.getElementById('dateLogMemo')._autoGrowResize();
    document.getElementById('dateLogTime').value='';
    document.getElementById('dateLogEndDate').value='';
    document.getElementById('dateLogEndTime').value='';
    setRangeToggleState('dateLogEndDateRow', 'dateLogRangeToggleBtn', false);
    document.getElementById('dateLogDate').value = localDateStr();
    revokePendingPhotoUrls(pendingDateLogPhotos);
    pendingDateLogPhotos = [];
    renderPhotoPreviewGrid('dateLogPhotoPreviewWrap', ()=>pendingDateLogPhotos, (v)=>{ pendingDateLogPhotos = v; });
    document.getElementById('dateLogAddBtn').textContent = '기록하기';
    document.getElementById('dateLogCancelBtn').classList.add('hidden');
    clearDraftAutosave(STORAGE_PREFIX + 'draft_datelog');
  }
  document.getElementById('dateLogLocation').addEventListener('input', ()=>{
    pendingDateLogGeo = null;
    document.getElementById('dateLogLocationStatus').classList.add('hidden');
  });
  document.getElementById('dateLogLocation').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      e.target.blur();
      setTimeout(()=>{ document.activeElement && document.activeElement.blur(); }, 0);
      document.getElementById('dateLogLocationSearchBtn').click();
    }
  });
  document.getElementById('dateLogLocationSearchBtn').addEventListener('click', async ()=>{
    const query = document.getElementById('dateLogLocation').value.trim();
    if(!query) return;
    const resultsEl = document.getElementById('dateLogLocationResults');
    document.getElementById('dateLogLocationStatus').classList.add('hidden');
    resultsEl.classList.remove('hidden');
    resultsEl.innerHTML = '';
    showLoadingOverlay('위치 찾는 중이야...');
    let results;
    try{
      results = await searchLocations(query);
    } finally {
      hideLoadingOverlay();
    }
    if(results.length === 0){
      resultsEl.innerHTML = `
        <div class="location-result-item">검색 결과가 없어. 다른 이름으로 시도해봐.</div>
        <button type="button" class="location-cancel-btn" id="dateLogLocationCancelBtn">✕ 취소</button>
      `;
      document.getElementById('dateLogLocationCancelBtn').addEventListener('click', ()=>{
        resultsEl.classList.add('hidden');
        resultsEl.innerHTML = '';
        document.getElementById('dateLogLocation').value = '';
      });
      return;
    }
    resultsEl.innerHTML = results.map((r,i)=>`
      <div class="location-result-item" data-idx="${i}">
        <div class="location-result-name">${escapeHTML(r.name)}</div>
        <div class="location-result-addr">${escapeHTML(r.address || '')}</div>
      </div>
    `).join('') + `<button type="button" class="location-cancel-btn" id="dateLogLocationCancelBtn">✕ 취소</button>`;
    document.getElementById('dateLogLocationCancelBtn').addEventListener('click', ()=>{
      resultsEl.classList.add('hidden');
      resultsEl.innerHTML = '';
      document.getElementById('dateLogLocation').value = '';
    });
    resultsEl.querySelectorAll('.location-result-item[data-idx]').forEach(el=>{
      el.addEventListener('click', ()=>{
        const r = results[Number(el.dataset.idx)];
        pendingDateLogGeo = { lat: r.lat, lng: r.lng };
        document.getElementById('dateLogLocation').value = r.name;
        resultsEl.classList.add('hidden');
        resultsEl.innerHTML = '';
        const statusEl = document.getElementById('dateLogLocationStatus');
        statusEl.classList.remove('hidden');
        statusEl.textContent = `✅ 이 위치로 선택했어: ${r.name}`;
        statusEl.style.color = '#4A9B6E';
      });
    });
  });
  document.getElementById('dateLogCancelBtn').addEventListener('click', resetDatelogForm);
// 1. 기록하기 / 수정 완료 버튼
  document.getElementById('dateLogAddBtn').addEventListener('click', async () => {
    const title = document.getElementById('dateLogTitle').value.trim();
    const date = document.getElementById('dateLogDate').value;
    const location = document.getElementById('dateLogLocation').value.trim();
    
    if (!title || !date) return;

    // 위치 검색 로직 (기존 거 그대로!)
    let geo = pendingDateLogGeo;
    if (!geo && location) {
      showLoadingOverlay('위치 확인 중이야...');
      try{
        const results = await searchLocations(location);
        geo = results[0] ? { lat: results[0].lat, lng: results[0].lng } : null;
      } finally {
        hideLoadingOverlay();
      }
    }
    
    // 이제 saveItem 하나로 끝!
    await saveItem(
      'datelog',
      !!editingDatelogId,
      editingDatelogId,
      { 
        title, 
        date,
        memo: document.getElementById('dateLogMemo').value.trim(),
        location: location,
        time: document.getElementById('dateLogTime').value || null,
        endDate: document.getElementById('dateLogEndDate').value || null,
        endTime: document.getElementById('dateLogEndTime').value || null,
        lat: geo ? geo.lat : null,
        lng: geo ? geo.lng : null
      },
      pendingDateLogPhotos,
      resetDatelogForm
    );
  });
  
// 2. 클릭 이벤트 (수정/삭제)
  document.getElementById('dateLogList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-datelog]');
    const delBtn = e.target.closest('[data-del-datelog]');
    const editId = editBtn && editBtn.dataset.editDatelog;
    const delId = delBtn && delBtn.dataset.delDatelog;

    if (editId) startEditDatelog(dateLogs.find(s => s.id === editId));
    else if (delId) deleteItem('datelog', delId, dateLogs.find(s => s.id === delId));
  });

  // ---- 스탬프 ----
  let editingStampId = null;
  setupPhotoPicker('stampPhotoInput','stampPhotoBtn','stampPhotoPreviewWrap', ()=>pendingStampPhotos, (v)=>{ pendingStampPhotos = v; });
  document.getElementById('pickSojeong').addEventListener('click', ()=>{ stampPerson='소정'; renderStamp(); });
  document.getElementById('pickSeonho').addEventListener('click', ()=>{ stampPerson='선호'; renderStamp(); });

  function startEditStamp(item){
    editingStampId = item.id;
    stampPerson = item.person;
    document.getElementById('stampText').value = item.text;
    if(document.getElementById('stampText')._autoGrowResize) document.getElementById('stampText')._autoGrowResize();
    pendingStampPhotos = getItemPhotos(item).slice();
    renderPhotoPreviewGrid('stampPhotoPreviewWrap', ()=>pendingStampPhotos, (v)=>{ pendingStampPhotos = v; });
    renderStamp();

    document.getElementById('stampAddBtn').textContent = '수정 완료';
    document.getElementById('stampCancelBtn').classList.remove('hidden');
    document.getElementById('stampAddBtn').closest('.add-card').scrollIntoView({behavior:'smooth', block:'start'});
  }
  function resetStampForm(){
    editingStampId = null;
    stampPerson = null;
    document.getElementById('stampText').value = '';
    if(document.getElementById('stampText')._autoGrowResize) document.getElementById('stampText')._autoGrowResize();
    revokePendingPhotoUrls(pendingStampPhotos);
    pendingStampPhotos = [];
    renderPhotoPreviewGrid('stampPhotoPreviewWrap', ()=>pendingStampPhotos, (v)=>{ pendingStampPhotos = v; });
    renderStamp();
    document.getElementById('stampAddBtn').textContent = '도장 쾅! 찍기';
    document.getElementById('stampCancelBtn').classList.add('hidden');
    clearDraftAutosave(STORAGE_PREFIX + 'draft_stamp');
  }
  document.getElementById('stampCancelBtn').addEventListener('click', resetStampForm);
    
 // 버튼 이벤트는 함수 바깥에 딱 한 번만 정의해!
  document.getElementById('stampAddBtn').addEventListener('click', async () => {
    const text = document.getElementById('stampText').value.trim();
    if (!text || !stampPerson) return;
    await saveItem('stamps', !!editingStampId, editingStampId, { person: stampPerson, text }, pendingStampPhotos, resetStampForm);
  });

  document.getElementById('stampList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-stamp]');
    const delBtn = e.target.closest('[data-del-stamp]');
    const editId = editBtn && editBtn.dataset.editStamp;
    const delId = delBtn && delBtn.dataset.delStamp;
    if (editId) startEditStamp(stamps.find(s => s.id === editId));
    else if (delId) deleteItem('stamps', delId, stamps.find(s => s.id === delId));
  });


  // ---- 편지 ----
  let editingLetterId = null;
  setupPhotoPicker('letterPhotoInput','letterPhotoBtn','letterPhotoPreviewWrap', ()=>pendingLetterPhotos, (v)=>{ pendingLetterPhotos = v; });
 
  function startEditLetter(item){
    editingLetterId = item.id;
    document.getElementById('letterTitle').value = item.title || '';
    document.getElementById('letterBody').value = item.body || '';
    if(document.getElementById('letterBody')._autoGrowResize) document.getElementById('letterBody')._autoGrowResize();
    pendingLetterPhotos = getItemPhotos(item).slice();
    renderPhotoPreviewGrid('letterPhotoPreviewWrap', ()=>pendingLetterPhotos, (v)=>{ pendingLetterPhotos = v; });

    if(item.unlockDate){
      document.getElementById('letterUnlockDate').value = item.unlockDate;
      document.getElementById('letterUnlockTime').value = item.unlockTime || '';
      document.getElementById('letterUnlockDateRow').classList.remove('hidden');
      document.getElementById('letterLockToggleBtn').textContent = '- 잠금 해제일 제거';
    } else {
      document.getElementById('letterUnlockDate').value = '';
      document.getElementById('letterUnlockTime').value = '';
      document.getElementById('letterUnlockDateRow').classList.add('hidden');
      document.getElementById('letterLockToggleBtn').textContent = '+ 특정 날짜까지 잠그기 (선택)';
    }

    document.getElementById('letterAddBtn').textContent = '수정 완료';
    document.getElementById('letterCancelBtn').classList.remove('hidden');
    document.getElementById('letterAddBtn').closest('.add-card').scrollIntoView({behavior:'smooth', block:'start'});
  }
  function resetLetterForm(){
    editingLetterId = null;
    document.getElementById('letterTitle').value = '';
    document.getElementById('letterBody').value = '';
    if(document.getElementById('letterBody')._autoGrowResize) document.getElementById('letterBody')._autoGrowResize();
    revokePendingPhotoUrls(pendingLetterPhotos);
    pendingLetterPhotos = [];
    renderPhotoPreviewGrid('letterPhotoPreviewWrap', ()=>pendingLetterPhotos, (v)=>{ pendingLetterPhotos = v; });
    document.getElementById('letterUnlockDate').value = '';
    document.getElementById('letterUnlockTime').value = '';
    document.getElementById('letterUnlockDateRow').classList.add('hidden');
    document.getElementById('letterLockToggleBtn').textContent = '+ 특정 날짜까지 잠그기 (선택)';
    document.getElementById('letterAddBtn').textContent = '편지 보내기';
    document.getElementById('letterCancelBtn').classList.add('hidden');
    clearDraftAutosave(STORAGE_PREFIX + 'draft_letter');
  }
  document.getElementById('letterCancelBtn').addEventListener('click', resetLetterForm);
  document.getElementById('letterLockToggleBtn').addEventListener('click', ()=>{
    const row = document.getElementById('letterUnlockDateRow');
    const willShow = row.classList.contains('hidden');
    row.classList.toggle('hidden', !willShow);
    document.getElementById('letterLockToggleBtn').textContent = willShow ? '- 잠금 해제일 제거' : '+ 특정 날짜까지 잠그기 (선택)';
    if(!willShow){
      document.getElementById('letterUnlockDate').value = '';
      document.getElementById('letterUnlockTime').value = '';
    } else if(!document.getElementById('letterUnlockDate').value){
      const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate()+1);
      document.getElementById('letterUnlockDate').value = localDateStr(tomorrow);
      document.getElementById('letterUnlockTime').value = '09:00';
    }
  });
    
// 버튼 이벤트는 함수 바깥에!
  document.getElementById('letterAddBtn').addEventListener('click', async () => {
    const title = document.getElementById('letterTitle').value.trim();
    const body = document.getElementById('letterBody').value.trim();
    if (!title || !body) return;
    const lockOn = !document.getElementById('letterUnlockDateRow').classList.contains('hidden');
    const unlockDateRaw = lockOn ? document.getElementById('letterUnlockDate').value : '';
    const unlockTimeRaw = lockOn ? document.getElementById('letterUnlockTime').value : '';
    const payload = { title, body };
    if(unlockDateRaw){
      payload.unlockDate = unlockDateRaw;
      payload.unlockTime = unlockTimeRaw || '00:00';
      payload.unlockNotified = false;
    } else if(editingLetterId){
      payload.unlockDate = firebase.firestore.FieldValue.delete();
      payload.unlockTime = firebase.firestore.FieldValue.delete();
      payload.unlockNotified = firebase.firestore.FieldValue.delete();
    }
    await saveItem('letters', !!editingLetterId, editingLetterId, payload, pendingLetterPhotos, resetLetterForm);
  });

  document.getElementById('letterList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-letter]');
    const delBtn = e.target.closest('[data-del-letter]');
    const editId = editBtn && editBtn.dataset.editLetter;
    const delId = delBtn && delBtn.dataset.delLetter;
    if (editId) startEditLetter(letters.find(s => s.id === editId));
    else if (delId) deleteItem('letters', delId, letters.find(s => s.id === delId));
  });


let unsubscribeFns = [];
function rememberUnsubscribe(unsubscribe){
  if(typeof unsubscribe === 'function') unsubscribeFns.push(unsubscribe);
  return unsubscribe;
}

function watch(query, collectionName, onData){
    const unsubscribe = query.onSnapshot(snap=>{
      const items = [];
      snap.forEach(doc=> items.push({ id: doc.id, ...doc.data() }));
      onData(items);
    }, err=>{ console.error(collectionName+' 구독 오류', err); });
    return rememberUnsubscribe(unsubscribe);
  }

  let watchersStarted = false;

  const EMAIL_MAP = {
    'sjsj980415@gmail.com': '소정',
    'kkang59405@gmail.com': '선호'
  };


  function showGate(message){
    document.getElementById('loginGateMsg').innerHTML = message;
    document.getElementById('loginGate').classList.remove('hidden');
    document.getElementById('googleLoginBtn').classList.remove('hidden');
    document.querySelector('.app-shell').style.visibility = 'hidden';
  }
  function hideGate(){
    document.getElementById('loginGate').classList.add('hidden');
    document.querySelector('.app-shell').style.visibility = 'visible';
  }

  const VAPID_KEY = 'BCfNXpOJT8bk0T6vQTI5PJsFW4PjVzTpKoxyOIV1tWvy6qfpeG0-7TOb0htBeAHwzzsZh_Xm4wkN-bf4XXh-2lQ';
  let pushToastTimer = null;
  let pushToastTab = null;
  let pushToastItemId = null;
  let pushToastCommentTs = null;
  let pushToastNotifId = null;
  function showPushToast(title, tab, itemId, commentTs, notifId, centered){
    pushToastTab = tab || null;
    pushToastItemId = itemId || null;
    pushToastCommentTs = commentTs || null;
    pushToastNotifId = notifId || null;
    document.getElementById('pushToastTitle').textContent = title || '';
    document.getElementById('pushToastBody').textContent = '';
    const toast = document.getElementById('pushToast');
    toast.classList.toggle('centered', !!centered);
    toast.classList.remove('hidden');
    clearTimeout(pushToastTimer);
    pushToastTimer = setTimeout(()=>{ toast.classList.add('hidden'); }, 5000);
  }
  document.getElementById('pushToast').addEventListener('click', ()=>{
    document.getElementById('pushToast').classList.add('hidden');
    clearTimeout(pushToastTimer);
    const notifId = pushToastNotifId;
    pushToastNotifId = null;
    let moved = false;
    if(pushToastItemId && pushToastTab) moved = navigateToItem(pushToastTab, pushToastItemId, pushToastCommentTs);
    else if(pushToastTab) moved = activateTab(pushToastTab);
    if(moved && notifId) markNotifRead(notifId); // 작성 중 내용 때문에 이동을 취소했으면 읽음 처리 안 함
  });

  // 앱이 이미 열려있을 때, 알림 클릭 시 서비스워커가 보내는 이동 명령을 받아서 처리
  let deferredNavigateMessage = null; // 로그인 완료 전에 메시지가 먼저 도착한 경우 대비
  function handleNavigateMessage(msg){
    if(!identity){
      // identity가 아직 없으면(로그인 확정 전) 여기서 처리하면 markNotifRead 등이
      // 조용히 실패하고 끝나버릴 수 있어서, 나중에 로그인 확정된 뒤 다시 처리하도록 미뤄둠
      deferredNavigateMessage = msg;
      return;
    }
    const pushKey = [msg.notifId||'', msg.tab||'', msg.itemId||'', msg.commentTs||''].join('|');
    // 이제 모든 플랫폼에서 postMessage와 별개로 pending 저장도 같이 하기 때문에
    // (서비스워커 쪽 변경), 중복 판별도 삼성인터넷만이 아니라 전체에 적용해야 안전함
    const isDuplicate = pushKey === lastHandledPushKey;

    if(!isDuplicate){
      lastHandledPushKey = pushKey;
      const moved = msg.itemId ? navigateToItem(msg.tab, msg.itemId, msg.commentTs) : activateTab(msg.tab);
      // 작성 중인 내용 때문에 이동을 취소했으면 읽음 처리 안 함 - 안 읽은 상태로 알림함에
      // 남아있으니 나중에 다시 열어볼 수 있음
      if(moved && msg.notifId) markNotifRead(msg.notifId);
    }

    const clearInSW = () => {
      postToActiveServiceWorker({ type: 'CLEAR_PENDING_NOTIF' });
      pendingClearTimer = null;
    };
    if(IS_SAMSUNG_INTERNET){
      // 세 번의 재확인 기회(0.7/1.5/2.6초)를 다 주기 위해 바로 안 지우고 유지.
      // 새 알림이 올 때마다 타이머를 항상 새로 시작해야 함 - 기존 타이머를 그대로 두면
      // 방금 온 알림의 재확인 기회가 다 지나기 전에 먼저 온 알림의 타이머가 지워버릴 수 있음
      if(pendingClearTimer) clearTimeout(pendingClearTimer);
      pendingClearTimer = setTimeout(clearInSW, 3500);
    } else {
      clearInSW(); // 다른 브라우저는 기존처럼 즉시 정리
    }
  }
  if('serviceWorker' in navigator){
    navigator.serviceWorker.addEventListener('message', (event)=>{
      const msg = event.data;
      if(msg && msg.type === 'navigate' && msg.tab){
        handleNavigateMessage(msg);
      } else if(msg && msg.type === 'sw_version'){
        // app.js 버전만으론 서비스워커가 최신인지 알 수 없어서, 따로 물어봐서 같이 표시함
        const tag = document.getElementById('appVersionTag');
        if(tag) tag.textContent = `v${APP_VERSION} · SW ${msg.version}`;
      }
    });

    function requestSWVersion(){
      postToActiveServiceWorker({ type: 'CHECK_SW_VERSION' });
    }
    requestSWVersion(); // 페이지 열릴 때 한 번 확인
    navigator.serviceWorker.addEventListener('controllerchange', requestSWVersion); // 새 버전으로 갱신될 때도 다시 확인
  }

  // 기기마다 안정적인 ID를 하나 만들어서 계속 재사용 (같은 기기에서 여러 번 등록해도 새 항목 안 생김)
  function getOrCreateDeviceId(){
    const newKey = STORAGE_PREFIX + 'deviceId';
    let id = localStorage.getItem(newKey);
    if(!id){
      // 접두사 붙이기 전 예전 버전에서 이미 등록된 기기라면, 새 ID를 만들지 않고 그대로 이어받음
      // (안 그러면 같은 기기가 예전 ID/새 ID 양쪽으로 등록되어 알림이 두 번 올 수 있음)
      id = localStorage.getItem('deviceId') || ('dev_' + Date.now() + '_' + Math.random().toString(36).slice(2, 10));
      localStorage.setItem(newKey, id);
    }
    return id;
  }

  let foregroundMessageUnsubscribe = null;

  async function setupPushNotifications(){
    try{
      if(!identity) return;
      if(!('serviceWorker' in navigator) || !('Notification' in window)) return;
      // 먼저 등록을 요청하고, 설치·활성화까지 확실히 끝난 registration을 따로 받아서 사용
      // (register()가 반환하는 시점엔 아직 installing 상태일 수 있어서, 새로 설치한
      // 기기에서 최초 알림 설정이 간헐적으로 실패할 여지가 있음)
      await navigator.serviceWorker.register('firebase-messaging-sw.js');
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if(permission !== 'granted') return;
      const messaging = firebase.messaging();
      const token = await messaging.getToken({ vapidKey: VAPID_KEY, serviceWorkerRegistration: registration });
      if(token){
        const deviceId = getOrCreateDeviceId();
        const devicesRef = db.collection('fcmTokens').doc(identity).collection('devices');
        // 같은 토큰으로 남아있는 예전 기기 문서(예: 접두사 마이그레이션 이전 기록)가 있으면 정리
        const sameTokenSnap = await devicesRef.where('token', '==', token).get();
        const batch = db.batch();
        sameTokenSnap.forEach(doc => { if(doc.id !== deviceId) batch.delete(doc.ref); });
        batch.set(devicesRef.doc(deviceId), { token, updatedAt: Date.now(), userAgent: navigator.userAgent || '' }, { merge: true });
        await batch.commit();
      }
      // setupPushNotifications가 여러 번 불려도(재로그인, 알림권한 재요청 등) 구독이 안 쌓이게 정리
      if(foregroundMessageUnsubscribe){
        foregroundMessageUnsubscribe();
        foregroundMessageUnsubscribe = null;
      }
      foregroundMessageUnsubscribe = messaging.onMessage((payload)=>{
        showPushToast(
          payload.data && payload.data.title,
          payload.data && payload.data.tab,
          payload.data && payload.data.itemId,
          payload.data && payload.data.commentTs,
          payload.data && payload.data.notifId
        );
        // 앱이 켜져있을 때 온 알림도 배지 개수를 서버가 계산해둔 값으로 갱신
        const unreadCount = Number(payload.data && payload.data.unreadCount);
        if(Number.isFinite(unreadCount)) updateAppBadge(unreadCount);
      });
    }catch(e){
      console.error('푸시 알림 설정 실패', e);
    }
  }
  function maybeShowNotifPrompt(){
    if('Notification' in window && Notification.permission === 'default'){
      document.getElementById('notifPrompt').classList.remove('hidden');
    }
  }
  document.getElementById('notifEnableBtn').addEventListener('click', async ()=>{
    document.getElementById('notifPrompt').classList.add('hidden');
    showLoadingOverlay('알림 설정 중이야...');
    try{
      await setupPushNotifications();
    } finally {
      hideLoadingOverlay();
    }
  });
  document.getElementById('notifDismissBtn').addEventListener('click', ()=>{
    document.getElementById('notifPrompt').classList.add('hidden');
  });

function startWatchers(){
    if(watchersStarted) return;
    watchersStarted = true;

    watchNotifications();

    // [일정] 홈 화면(디데이/캘린더/다음 일정)에 바로 필요해서 즉시 불러옴
    // 성능을 위해 3개월 전 ~ 미래 일정만 불러오기 (너무 옛날 달력은 안 봐도 되니까!)
    startCollectionWatcher('schedule');

    // [나머지 4개] 앱을 처음 켤 때 다 같이 무겁게 불러오지 않고,
    // 그 탭을 처음 열 때 그때 불러오도록 지연시킴 (아래 startCollectionWatcher 참고).
    // 다만 홈 화면의 "최근 활동/1년 전 오늘" 기능을 위해, 잠깐 쉬는 시간(유휴시간)에
    // 백그라운드로 조용히 불러와 두기는 함 (탭을 누르면 그 즉시 당겨서 불러옴).
    const lazyCollections = ['wish', 'datelog', 'stamp', 'letter'];
    const loadRestInBackground = () => {
      if(!identity) return;
      lazyCollections.forEach(startCollectionWatcher);
    };
    if('requestIdleCallback' in window){
      requestIdleCallback(loadRestInBackground, {timeout: 2000});
    } else {
      setTimeout(loadRestInBackground, 1200);
    }
  }

  const collectionWatchersStarted = { schedule:false, wish:false, datelog:false, stamp:false, letter:false };

  // 로그아웃(또는 다른 계정으로 전환) 시 이전 사용자의 실시간 구독이 계속 살아있지 않도록 전부 정리
  function stopAllWatchers(){
    const currentFns = unsubscribeFns.splice(0);
    currentFns.forEach(unsubscribe => {
      try{ unsubscribe(); }catch(e){ /* 이미 해제된 구독은 무시 */ }
    });

    watchersStarted = false;
    visitWatchStarted = false;
    Object.keys(collectionWatchersStarted).forEach(key => { collectionWatchersStarted[key] = false; });

    unreadNotifications = [];
    updateNotifBadge();

    schedule = [];
    wishes = [];
    dateLogs = [];
    stamps = [];
    letters = [];
  }

  function startCollectionWatcher(tabName){
    if(collectionWatchersStarted[tabName]) return;
    collectionWatchersStarted[tabName] = true;

    if(tabName === 'schedule'){
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      const pastDateStr = localDateStr(threeMonthsAgo);
      const scheduleQuery = db.collection('schedule')
                              .where('date', '>=', pastDateStr)
                              .orderBy('date', 'asc');
      watch(scheduleQuery, 'schedule', items=>{ schedule = items; renderSchedule(); renderCalendar(); renderHome(); });
    } else if(tabName === 'wish'){
      const wishQuery = db.collection('wishlist').orderBy('createdAt', 'desc').limit(100);
      watch(wishQuery, 'wishlist', items=>{ wishes = items; renderWish(); renderHome(); });
    } else if(tabName === 'datelog'){
      const dateLogQuery = db.collection('datelog').orderBy('date', 'desc').limit(100);
      watch(dateLogQuery, 'datelog', items=>{ dateLogs = items; renderDateLog(); renderHome(); });
    } else if(tabName === 'stamp'){
      const stampQuery = db.collection('stamps').orderBy('createdAt', 'desc').limit(100);
      watch(stampQuery, 'stamps', items=>{ stamps = items; renderStamp(); renderHome(); });
    } else if(tabName === 'letter'){
      const letterQuery = db.collection('letters').orderBy('createdAt', 'desc').limit(100);
      watch(letterQuery, 'letters', items=>{ letters = items; renderLetters(); renderHome(); });
    }
  }
  
// ---- 좋아요 버튼 클릭 이벤트 ----
  // ---- 게시물 요약 탭하면 펼치기/접기 ----
  let expandedPostIds = new Set();
  function reapplyExpandedState(containerId){
    const container = document.getElementById(containerId);
    if(!container) return;
    container.querySelectorAll('[data-item-id]').forEach(card=>{
      if(expandedPostIds.has(card.dataset.itemId)){
        const detail = card.querySelector('.post-detail');
        if(detail) detail.classList.remove('hidden');
      }
    });
  }
  document.querySelector('main').addEventListener('click', (e) => {
    const summary = e.target.closest('.post-summary');
    if (!summary) return;
    const card = summary.closest('[data-item-id]');
    const detail = card ? card.querySelector('.post-detail') : null;
    if (detail) {
      detail.classList.toggle('hidden');
      const itemId = card.dataset.itemId;
      if (detail.classList.contains('hidden')) {
        expandedPostIds.delete(itemId);
        // 게시물을 접으면 그 안의 댓글창/답글창 상태도 같이 초기화 (다음에 펼치면 깔끔하게 시작)
        Object.values(tabToColName).forEach(colName=>{
          const key = `${colName}-${itemId}`;
          openCommentSections.delete(key);
          replyingToMap.delete(key);
        });
        // 재렌더링을 기다리지 않고 화면에도 바로 반영
        const commentSection = card.querySelector('.comment-section');
        if(commentSection) commentSection.classList.remove('active');
        const replyRow = card.querySelector('.comment-reply-input-row');
        if(replyRow) replyRow.remove();
      }
      else expandedPostIds.add(itemId);
    }
  });

  document.querySelector('main').addEventListener('click', (e) => {
    const likeBtn = e.target.closest('.like-btn');
    if (!likeBtn) return;
    
    // 눌린 버튼의 컬렉션(datelog, stamps, letters)과 문서 ID 가져오기
    const col = likeBtn.dataset.likeCol;
    const id = likeBtn.dataset.likeId;
    
    // 현재 눌린 게시물 데이터 찾기
    let list = [];
    if (col === 'datelog') list = dateLogs;
    else if (col === 'letters') list = letters;
    else if (col === 'stamps') list = stamps;
    
    const item = list.find(x => x.id === id);
    if (!item || !identity) return; // 로그인 안 되어 있으면 무시
    
    const currentLikes = item.likes || [];
    const hasLiked = currentLikes.includes(identity);
    
    // 1. 화면상에서 먼저 하트를 칠하고 통통 튀게 만들기 (미리 보여주기)
    likeBtn.classList.add('like-pop');
    if (!hasLiked) {
      likeBtn.classList.add('liked');
      likeBtn.querySelector('.heart-icon').innerHTML = pixelHeartSVG(true);
    }
    
    // 2. 0.3초(300ms) 동안 애니메이션이 끝나길 기다렸다가 DB에 저장!
    setTimeout(async () => {
      likeBtn.classList.remove('like-pop');
      try {
        if (hasLiked) {
          // 이미 눌렀으면 '내 이름' 빼기 (좋아요 취소)
          await db.collection(col).doc(id).update({ 
            likes: firebase.firestore.FieldValue.arrayRemove(identity) 
          });
        } else {
          // 안 눌렀으면 '내 이름' 추가 (좋아요)
          await db.collection(col).doc(id).update({ 
            likes: firebase.firestore.FieldValue.arrayUnion(identity) 
          });
        }
      } catch(err) {
        console.error('좋아요 업데이트 실패:', err);
      }
    }, 300);
  });

  // 컬렉션 이름(colName) -> 렌더 함수 매핑 (댓글/답글 UI 상태만 바뀔 때 수동으로 다시 그리기 위함)
  const colNameToRenderFn = { datelog: renderDateLog, stamps: renderStamp, letters: renderLetters };

  // ---- 댓글 버튼 이벤트 (열기 / 작성 / 삭제 / 답글) ----
  document.querySelector('main').addEventListener('click', (e) => {
    // 1. 댓글창 열기/닫기 토글
    const toggleBtn = e.target.closest('.comment-btn');
    if (toggleBtn) {
      const col = toggleBtn.dataset.toggleComment;
      const id = toggleBtn.dataset.toggleId;
      const sectionKey = `${col}-${id}`;
      
      const section = document.getElementById(`comments-${sectionKey}`);

      if (openCommentSections.has(sectionKey)) {
        openCommentSections.delete(sectionKey);
        replyingToMap.delete(sectionKey); // 댓글창을 닫으면 열려있던 답글창도 같이 닫음
        if(section){
          const replyRow = section.querySelector('.comment-reply-input-row');
          if(replyRow) replyRow.remove();
        }
      } else {
        openCommentSections.add(sectionKey);
      }
      
      if (section) section.classList.toggle('active');
      return;
    }

    // 2. 답글 달기 토글 (같은 댓글 다시 누르면 닫힘, 다른 댓글 누르면 그쪽으로 전환)
    const replyBtn = e.target.closest('.c-reply-btn');
    if (replyBtn) {
      const col = replyBtn.dataset.replyCol;
      const id = replyBtn.dataset.replyId;
      const parentTs = Number(replyBtn.dataset.replyTs);
      const sectionKey = `${col}-${id}`;
      const current = replyingToMap.get(sectionKey);
      if (current === parentTs) replyingToMap.delete(sectionKey);
      else replyingToMap.set(sectionKey, parentTs);
      if (colNameToRenderFn[col]) colNameToRenderFn[col]();
      return;
    }

    // 3. 댓글/답글 작성
    const submitBtn = e.target.closest('.c-submit');
    if (submitBtn) {
      // 답글 작성인 경우 (data-reply-submit-*)
      const replyCol = submitBtn.dataset.replySubmitCol;
      if (replyCol) {
        const id = submitBtn.dataset.replySubmitId;
        const parentTs = Number(submitBtn.dataset.replySubmitParent);
        const input = document.getElementById(`cr-input-${replyCol}-${id}-${parentTs}`);
        const text = input.value.trim();
        if (!text || !identity) return;

        const newReply = {
          author: identity,
          text: text,
          ts: Date.now(),
          parentTs: parentTs
        };

        db.collection(replyCol).doc(id).update({
          comments: firebase.firestore.FieldValue.arrayUnion(newReply)
        }).then(()=>{
          replyingToMap.delete(`${replyCol}-${id}`); // 작성 끝나면 답글창 자동으로 닫기
        }).catch(err => console.error('답글 작성 실패:', err));
        return;
      }

      // 일반 댓글 작성
      const col = submitBtn.dataset.commentSubmitCol;
      const id = submitBtn.dataset.commentSubmitId;
      const input = document.getElementById(`c-input-${col}-${id}`);
      const text = input.value.trim();
      if (!text || !identity) return;
      
      const newComment = {
        author: identity,
        text: text,
        ts: Date.now() // 고유 ID 역할
      };
      
      db.collection(col).doc(id).update({
        comments: firebase.firestore.FieldValue.arrayUnion(newComment)
      }).catch(err => console.error('댓글 작성 실패:', err));
      return;
    }

    // 4. 내 댓글/답글 삭제
    const delBtn = e.target.closest('.c-del');
    if (delBtn) {
      const col = delBtn.dataset.commentCol;
      const id = delBtn.dataset.commentId;
      const ts = Number(delBtn.dataset.commentTs);
      
      // 어느 리스트에 있는지 찾기
      let list = [];
      if (col === 'datelog') list = dateLogs;
      else if (col === 'letters') list = letters;
      else if (col === 'stamps') list = stamps;
      
      const item = list.find(x => x.id === id);
      if (!item) return;
      
      const allComments = item.comments || [];
      // 삭제할 정확한 댓글 객체 찾기 (시간이 동일하고, 삭제 권한이 있는 것)
      const targetComment = allComments.find(c => c.ts === ts && canDeletePost(c));
      if (!targetComment) return;

      // 이 댓글에 (삭제되지 않은) 답글이 달려있는지 확인
      const childReplies = allComments.filter(c => c.parentTs === ts && !c.deleted);

      if (childReplies.length > 0) {
        // 답글이 있으면: 완전히 지우지 않고 "삭제된 댓글이야"로만 남김 (답글은 그대로 유지)
        if (!confirm('답글은 삭제되지 않아. 이 댓글을 지울까?')) return;

        const tombstoned = { ts: targetComment.ts, deleted: true };
        const newComments = allComments.map(c => (c === targetComment) ? tombstoned : c);
        db.collection(col).doc(id).update({ comments: newComments })
          .catch(err => console.error('댓글 삭제 실패:', err));
      } else {
        // 답글이 없으면: 완전히 삭제.
        if (!confirm('이 댓글을 지울까?')) return;

        const toRemove = [targetComment];
        // 지금 지우는 게 "답글"이고, 그 원댓글이 이미 "삭제된 댓글이야" 상태이며,
        // 이게 마지막 남은 답글이었다면 -> 그 톰스톤도 이제 필요없으니 같이 정리
        if (targetComment.parentTs) {
          const parent = allComments.find(c => c.ts === targetComment.parentTs);
          if (parent && parent.deleted) {
            const remainingSiblings = allComments.filter(c =>
              c.parentTs === targetComment.parentTs && c.ts !== ts && !c.deleted
            );
            if (remainingSiblings.length === 0) toRemove.push(parent);
          }
        }

        db.collection(col).doc(id).update({
          comments: firebase.firestore.FieldValue.arrayRemove(...toRemove)
        }).catch(err => console.error('댓글 삭제 실패:', err));
      }
    }
  });

  // ---- 검색 (헤더 버튼 → 전체화면 오버레이) ----
  let searchCategory = 'all';


  function groupKeyForTimestamp(ts){
    const now = new Date();
    const curYear = now.getFullYear(), curMonth = now.getMonth();
    const d = new Date(ts);
    const y = d.getFullYear(), m = d.getMonth();
    if(y === curYear){
      if(m === curMonth) return null;
      return `month-${m}`;
    }
    return `year-${y}`;
  }

  function buildSearchIndex(){
    const items = [];
    schedule.forEach(it => items.push({
      tab:'schedule', label:'일정', ts: it.createdAt || new Date(it.date+'T00:00:00').getTime(),
      title: it.title, sub: it.memo || fmtShortDate(it.date), item: it,
      match: `${it.title||''} ${it.memo||''}`.toLowerCase()
    }));
    wishes.forEach(it => items.push({
      tab:'wish', label:'위시', ts: it.createdAt || 0,
      title: it.title, sub: it.body || '', item: it,
      match: `${it.title||''} ${it.body||''}`.toLowerCase()
    }));
    dateLogs.forEach(it => items.push({
      tab:'datelog', label:'데이트기록', ts: it.createdAt || new Date(it.date+'T00:00:00').getTime(),
      title: it.title, sub: it.memo || it.location || '', item: it,
      match: `${it.title||''} ${it.memo||''} ${it.location||''}`.toLowerCase()
    }));
    stamps.forEach(it => items.push({
      tab:'stamp', label:'스탬프', ts: it.createdAt || 0,
      title: it.text, sub: `${it.person} 스탬프`, item: it,
      match: `${it.text||''} ${it.person||''}`.toLowerCase()
    }));
    letters.forEach(it => {
      if(isLetterLocked(it)) return; // 잠긴 편지는 검색에서도 제외
      items.push({
        tab:'letter', label:'편지', ts: it.createdAt || 0,
        title: it.title || (it.body||'').slice(0,20), sub: it.body || '', item: it,
        match: `${it.title||''} ${it.body||''}`.toLowerCase()
      });
    });
    return items;
  }

  function renderSearchResults(){
    const container = document.getElementById('searchResults');
    const q = searchQuery.trim();
    if(!q){
      container.innerHTML = '<div class="empty-state" style="padding:30px 10px;">검색어를 입력해봐</div>';
      return;
    }
    let index = buildSearchIndex();
    if(searchCategory !== 'all') index = index.filter(r => r.tab === searchCategory);
    const results = index.filter(r => r.match.includes(q)).sort((a,b)=> b.ts - a.ts);
    if(results.length === 0){
      container.innerHTML = '<div class="empty-state" style="padding:30px 10px;">검색 결과가 없어.</div>';
      return;
    }
    container.innerHTML = results.map((r,i) => `
      <div class="search-result-item" data-result-idx="${i}">
        <span class="search-result-label">${r.label}</span>
        <div>
          <div class="search-result-title">${escapeHTML(r.title || '')}</div>
          ${r.sub ? `<div class="search-result-sub">${escapeHTML(r.sub.slice(0,44))}</div>` : ''}
        </div>
      </div>
    `).join('');
    container.querySelectorAll('.search-result-item').forEach((el,i)=>{
      el.addEventListener('click', ()=> navigateToSearchResult(results[i]));
    });
  }

  function navigateToItem(tab, itemId, commentTs){
    if(!activateTab(tab)) return false; // 작성 중 내용 있어서 이동을 취소한 경우, 여기서도 멈춤

    // 일정 탭인데 날짜 필터가 걸려있으면 전체 일정으로 복원 (안 그러면 필터에 안 걸리는
    // 날짜의 일정은 화면에 안 그려져서 알림이 가리키는 카드를 영영 못 찾게 됨)
    if(tab === 'schedule' && calendarFilterDate){
      calendarFilterDate = null;
      renderCalendar();
    }

    // 이동하려는 탭에 필터가 걸려있으면 먼저 강제로 "전체"로 풀어줌.
    // 안 그러면 필터에 안 걸리는 게시글은 화면(DOM)에 아예 안 그려져서
    // 스크롤할 대상을 영영 못 찾게 됨.
    if(tab === 'letter' && letterFilterTarget !== 'all'){
      letterFilterTarget = 'all';
      document.querySelectorAll('#letterFilterRow .filter-chip').forEach(b=>{
        b.classList.toggle('active', b.dataset.letterFilter === 'all');
      });
    } else if(tab === 'stamp' && stampFilterTarget !== 'all'){
      stampFilterTarget = 'all';
      document.querySelectorAll('#stampFilterRow .filter-chip').forEach(b=>{
        b.classList.toggle('active', b.dataset.stampFilter === 'all');
      });
    } else if(tab === 'wish' && wishFilterTarget !== 'all'){
      wishFilterTarget = 'all';
      document.querySelectorAll('#wishFilterRow .filter-chip').forEach(b=>{
        b.classList.toggle('active', b.dataset.wishFilter === 'all');
      });
    } else if(tab === 'datelog' && dateLogFilterTarget !== 'all'){
      dateLogFilterTarget = 'all';
      document.querySelectorAll('#dateLogFilterRow .filter-chip').forEach(b=>{
        b.classList.toggle('active', b.dataset.datelogFilter === 'all');
      });
    }

    // 데이터가 아직 안 왔어도, 나중에 렌더링될 때 펼쳐지도록 미리 예약해둠
    if(itemId) expandedPostIds.add(itemId);

    // 댓글 알림으로 들어온 경우, 댓글창도 미리 펼쳐놓도록 예약
    if(commentTs && tabToColName[tab]){
      openCommentSections.add(`${tabToColName[tab]}-${itemId}`);
    }

    let item = null;
    if(tab === 'schedule') item = schedule.find(x=>x.id===itemId);
    else if(tab === 'wish') item = wishes.find(x=>x.id===itemId);
    else if(tab === 'datelog') item = dateLogs.find(x=>x.id===itemId);
    else if(tab === 'stamp') item = stamps.find(x=>x.id===itemId);
    else if(tab === 'letter') item = letters.find(x=>x.id===itemId);

    if(item){
      if(tab === 'datelog'){
        const key = groupKeyForTimestamp(new Date(item.date + 'T00:00:00').getTime());
        if(key) dateLogExpandedGroups.add(key);
      } else if(tab === 'letter'){
        const key = groupKeyForTimestamp(item.createdAt || Date.now());
        if(key) letterExpandedGroups.add(key);
      } else if(tab === 'stamp'){
        const key = groupKeyForTimestamp(item.createdAt || Date.now());
        if(key) stampExpandedGroups.add(key);
      } else if(tab === 'wish' && item.done){
        showDoneWishes = true;
      }
    }

    const renderMap = {
      schedule: renderSchedule,
      wish: renderWish,
      datelog: renderDateLog,
      stamp: renderStamp,
      letter: renderLetters
    };
    if(renderMap[tab]) renderMap[tab]();

    // 목표를 전역 상태로 기억해두고, 즉시 1회 시도 + 이후 렌더/이벤트/폴링에서 계속 확인
    if(scrollPollInterval) clearInterval(scrollPollInterval); // 이전 목표용 폴링이 남아있으면 정리
    pendingScrollTarget = { tab, itemId, commentTs, setAt: Date.now() };
    tryConsumePendingScroll();

    let pollCount = 0;
    scrollPollInterval = setInterval(() => {
      pollCount++;
      if(!pendingScrollTarget){ clearScrollState(); return; }
      if(pollCount > 20){
        clearScrollState();
        showPushToast('게시글을 불러오지 못했어. 잠시 후 다시 시도해줘', null, null, null, null, true);
        return;
      }
      tryConsumePendingScroll();
    }, 500);
    return true;
  }
  function navigateToSearchResult(result){
    closeSearchOverlay();
    navigateToItem(result.tab, result.item.id);
  }

  function openSearchOverlay(){
    document.getElementById('searchOverlay').classList.remove('hidden');
    document.getElementById('searchInput').value = '';
    searchQuery = '';
    searchCategory = 'all';
    document.querySelectorAll('.search-cat-btn').forEach(b=> b.classList.toggle('active', b.dataset.cat === 'all'));
    renderSearchResults();
    setTimeout(()=> document.getElementById('searchInput').focus(), 50);
  }
  function closeSearchOverlay(){
    document.getElementById('searchOverlay').classList.add('hidden');
  }
  document.getElementById('searchOpenBtn').addEventListener('click', openSearchOverlay);
  document.getElementById('searchCloseBtn').addEventListener('click', closeSearchOverlay);
  let searchDebounceTimer = null;
  document.getElementById('searchInput').addEventListener('input', (e)=>{
    const value = e.target.value.toLowerCase();
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(()=>{
      searchQuery = value;
      renderSearchResults();
    }, 150);
  });
  document.getElementById('searchInput').addEventListener('keydown', (e)=>{
    if(e.key === 'Enter'){
      e.preventDefault();
      e.target.blur();
    }
  });
  document.querySelectorAll('.search-cat-btn').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      document.querySelectorAll('.search-cat-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      searchCategory = btn.dataset.cat;
      renderSearchResults();
    });
  });

  
  let visitTracked = false;
  let visitWatchStarted = false;
  async function trackVisit(){
    if(visitTracked) return;
    visitTracked = true;
    try{
      const todayStr = localDateStr();
      const visitRef = db.collection('stats').doc('visits');
      await db.runTransaction(async (t)=>{
        const doc = await t.get(visitRef);
        if(!doc.exists){
          t.set(visitRef, { total: 1, todayCount: 1, todayDate: todayStr });
        } else {
          const data = doc.data();
          const newTotal = (data.total || 0) + 1;
          const newTodayCount = data.todayDate === todayStr ? (data.todayCount || 0) + 1 : 1;
          t.update(visitRef, { total: newTotal, todayCount: newTodayCount, todayDate: todayStr });
        }
      });
    }catch(e){ console.error('방문 기록 실패', e); }
  }
  function watchVisitCounter(){
    if(visitWatchStarted) return;
    visitWatchStarted = true;
    const unsubscribe = db.collection('stats').doc('visits').onSnapshot(doc=>{
      const todayEl = document.getElementById('visitToday');
      const totalEl = document.getElementById('visitTotal');
      if(!todayEl || !totalEl) return;
      const todayStr = localDateStr();
      if(doc.exists){
        const data = doc.data();
        const todayCount = (data.todayDate === todayStr) ? (data.todayCount || 0) : 0;
        todayEl.textContent = `Today ${todayCount}`;
        totalEl.textContent = `Total ${data.total || 0}`;
      } else {
        todayEl.textContent = 'Today 0';
        totalEl.textContent = 'Total 0';
      }
    }, err=>console.error('방문자 수 구독 실패', err));
    rememberUnsubscribe(unsubscribe);
  }

  // 필터칩 공용 동작: 눌린 걸 다시 누르면 "전체"로 해제됨 (아무것도 안 눌린 상태 없음)
  function setupToggleFilterRow(containerId, datasetProp, onChange){
    const chips = document.querySelectorAll(`#${containerId} .filter-chip`);
    chips.forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const value = btn.dataset[datasetProp];
        const wasActive = btn.classList.contains('active');
        chips.forEach(b=>b.classList.remove('active'));
        if(wasActive && value !== 'all'){
          const allBtn = Array.from(chips).find(b=>b.dataset[datasetProp] === 'all');
          if(allBtn) allBtn.classList.add('active');
          onChange('all');
        } else {
          btn.classList.add('active');
          onChange(value);
        }
      });
    });
  }
  setupToggleFilterRow('letterFilterRow', 'letterFilter', (val)=>{ letterFilterTarget = val; renderLetters(); });
  setupToggleFilterRow('stampFilterRow', 'stampFilter', (val)=>{ stampFilterTarget = val; renderStamp(); });
  setupToggleFilterRow('wishFilterRow', 'wishFilter', (val)=>{ wishFilterTarget = val; renderWish(); });
  setupToggleFilterRow('dateLogFilterRow', 'datelogFilter', (val)=>{ dateLogFilterTarget = val; renderDateLog(); });

  function init(){
    renderDday();
    renderHome();
    renderCalendar();
    document.getElementById('schedDate').value = localDateStr();
    document.getElementById('dateLogDate').value = localDateStr();
    setupAutoGrow('wishBody', 240);
    setupAutoGrow('dateLogMemo', 240);
    setupAutoGrow('letterBody', 280);
    setupAutoGrow('stampText', 200);
    setupDraftAutosave(STORAGE_PREFIX + 'draft_wish', ['wishTitle','wishBody']);
    setupDraftAutosave(STORAGE_PREFIX + 'draft_datelog', ['dateLogTitle','dateLogMemo']);
    setupDraftAutosave(STORAGE_PREFIX + 'draft_letter', ['letterTitle','letterBody']);
    setupDraftAutosave(STORAGE_PREFIX + 'draft_stamp', ['stampText']);
    document.getElementById('appVersionTag').textContent = `v${APP_VERSION}`;
    document.querySelector('.app-shell').style.visibility = 'hidden';

    // 안전장치: 무슨 이유로든 인증 확인이 너무 오래 걸리면, 스플래시가 영원히 안 사라지는 일은 없게 함
    setTimeout(()=>{
      const splash = document.getElementById('initialSplash');
      if(splash) splash.remove();
    }, 8000);

    firebase.auth().onAuthStateChanged(user=>{
      // 로그인 상태를 확인하자마자(로그인 화면이든 홈 화면이든 뭐가 뜨든) 초기 스플래시부터 치움
      const splash = document.getElementById('initialSplash');
      if(splash) splash.remove();

      if(user && EMAIL_MAP[user.email]){
        signInInProgress = false;
        identity = EMAIL_MAP[user.email];
        updateIdentityChip();
        hideGate();
        startWatchers();
        activateTabFromHash();
        handleNotifQueryParam();
        if(deferredNavigateMessage){
          const msg = deferredNavigateMessage;
          deferredNavigateMessage = null;
          handleNavigateMessage(msg);
        }
        trackVisit();
        watchVisitCounter();
        if('Notification' in window && Notification.permission === 'granted'){
          setupPushNotifications();
        } else {
          maybeShowNotifPrompt();
        }
      } else if(user && !EMAIL_MAP[user.email]){
        signInInProgress = false;
        stopAllWatchers();
        clearTransientNavigationState();
        identity = null;
        updateIdentityChip();
        firebase.auth().signOut();
        showGate('이 구글 계정은 사용할 수 없어.<br>소정, 선호 계정으로만 로그인해줘.');
      } else if(!signInInProgress){
        // 로그인 처리가 진행 중일 때 onAuthStateChanged가 중간에 한 번 더 불려도
        // "로그인해줘" 기본 문구로 다시 덮어쓰지 않도록 함 (그게 화면 깜빡임의 원인이었음)
        // 주의: 여기서는 clearTransientNavigationState()를 부르지 않음 - 아이폰에서
        // 알림으로 앱을 콜드스타트할 때, 아직 로그인 전이라도 pending 정보가 보존되어야 함
        stopAllWatchers();
        identity = null;
        updateIdentityChip();
        showGate('소정, 선호만 쓸 수 있는 앱이야.<br>구글 계정으로 로그인해줘.');
      }
    });
  }
    // [삭제 도우미]
  async function deleteItem(col, id, item) {
    askDeleteConfirm(async () => {
      showLoadingOverlay('삭제 중이야...<br>사진이 있으면 조금 걸릴 수 있어');
      try {
        if (item.photos) await deletePhotosFromStorage(item.photos);
        await db.collection(col).doc(id).delete();
        // 게시글 자체를 지우면 좋아요/댓글 필드도 문서와 함께 자동으로 통째로 사라짐 (별도 정리 불필요).
        // 여기선 화면에 남아있을 수 있는 사소한 UI 기억(펼침/댓글창/답글창 상태)만 같이 정리해줌
        expandedPostIds.delete(id);
        Object.values(tabToColName).forEach(colName=>{
          const key = `${colName}-${id}`;
          openCommentSections.delete(key);
          replyingToMap.delete(key);
        });
      } catch (err) {
        console.error('삭제 실패:', err);
        alert('삭제 중 오류가 발생했어.');
      } finally {
        hideLoadingOverlay();
      }
    });
  }

  // [저장 도우미]
  async function saveItem(col, isEditing, id, data, pendingPhotos, onReset) {
    await saveWithPhotoFallback(
      async (withPhotos) => {
        const photos = withPhotos
          ? await uploadPhotos(pendingPhotos, (pct) => showLoadingOverlay(`게시 중이야... ${pct}%<br>사진 업로드 중이야`))
          : pendingPhotos.filter(p => typeof p === 'string');
        const payload = { ...data, photos };
        if (isEditing) payload.photo = firebase.firestore.FieldValue.delete();
        else payload.createdAt = Date.now();
        
        if (isEditing) await db.collection(col).doc(id).update(payload);
        else await db.collection(col).doc(genId()).set({ ...payload, author: identity });
      },
      onReset
    );
  }
  // 각 탭의 렌더 함수가 (어떤 경로로 끝나든) 끝날 때마다, 대기 중인 스크롤 목표가 있는지 자동으로 확인.
  // 데이터가 늦게 도착해서 방금 막 화면에 그려진 순간을 안정적으로 포착하기 위한 핵심 지점.
  [renderSchedule, renderWish, renderDateLog, renderStamp, renderLetters].forEach((fn, i) => {
    const names = ['renderSchedule','renderWish','renderDateLog','renderStamp','renderLetters'];
    const wrapped = function(...args){
      const result = fn.apply(this, args);
      tryConsumePendingScroll();
      return result;
    };
    if(names[i] === 'renderSchedule') renderSchedule = wrapped;
    else if(names[i] === 'renderWish') renderWish = wrapped;
    else if(names[i] === 'renderDateLog') renderDateLog = wrapped;
    else if(names[i] === 'renderStamp') renderStamp = wrapped;
    else if(names[i] === 'renderLetters') renderLetters = wrapped;
  });

  init();
})();
