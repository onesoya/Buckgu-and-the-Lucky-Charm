(function(){
  const APP_VERSION = '2026.07.15-12'; // 코드를 새로 줄 때마다 이 값을 올림 (배포 확인용)
  // 백씨스터즈 앱도 같은 출처(onesoya.github.io)를 써서, localStorage/IndexedDB가 출처 단위로
  // 공유됨 -> 이름이 겹치면 임시저장 내용 등이 서로 섞일 수 있어서 이 앱 전용 접두사를 붙임
  const STORAGE_PREFIX = 'buckgu_lucky_';
  // iOS 사파리는 이게 없으면 버튼 :active(눌림) CSS가 탭 했을 때 거의 안 켜짐
  document.addEventListener('touchstart', function(){}, {passive:true});

  const genId = () => Date.now().toString(36) + Math.random().toString(36).slice(2,7);
  const ANNIV = '2026-02-02';

  // ---- 오늘의 질문 100개 (가벼운 일상·취향 60 / 데이트와 추억 20 / 애정 표현 15 / 관계 돌아보기 5) ----
  const DAILY_QUESTIONS = [
    '오늘 가장 먹고 싶은 것은?', '요즘 가장 자주 듣는 노래는?', '지금 당장 가장 하고 싶은 일은?',
    '오늘 하루 컨디션을 색깔로 표현한다면?', '요즘 제일 자주 보는 콘텐츠는?', '아침형 인간이야, 저녁형 인간이야?',
    '오늘 점심 메뉴는 뭐였어?', '요즘 꽂힌 취미가 있어?', '지금 제일 먹고 싶은 디저트는?',
    '오늘 날씨에 어울리는 음악 장르는?', '라면 먹을 때 계란 넣어 안 넣어?', '요즘 자주 가는 SNS는 어디야?',
    '좋아하는 계절은?', '아이스아메리카노 vs 따뜻한 아메리카노?', '요즘 제일 편한 옷차림은?',
    '오늘 하루 한 단어로 표현한다면?', '최근에 산 물건 중 제일 만족스러운 건?', '좋아하는 향(냄새)이 있어?',
    '지금 핸드폰 배터리는 몇 %야?', '요즘 자기 전에 하는 루틴이 있어?', '좋아하는 과일은?',
    '오늘 몇 시에 일어났어?', '최근에 웃겼던 일이 있어?', '여름 vs 겨울, 뭐가 더 좋아?',
    '요즘 자주 가는 곳이 있어?', '매운 음식 잘 먹어?', '오늘 걸음 수는 얼마나 될 것 같아?',
    '좋아하는 색깔은?', '최근에 본 영화나 드라마는?', '커피 하루에 몇 잔 마셔?',
    '집순이/집돌이야, 밖순이/밖돌이야?', '요즘 관심 있는 주제가 있어?', '오늘 저녁엔 뭐 먹을까?',
    '좋아하는 동물은?', '최근에 갖고 싶은 물건이 있어?', '아침 먹었어?',
    '요즘 자주 듣는 팟캐스트나 라디오 있어?', '좋아하는 계절 향은?', '오늘 컨디션 1~10점 중 몇 점이야?',
    '최근에 재밌게 한 게임 있어?', '물 하루에 얼마나 마셔?', '좋아하는 빵 종류는?',
    '요즘 자주 입는 색은?', '오늘 하늘 색은 어땠어?', '좋아하는 야식 메뉴는?',
    '최근에 산 옷이 있어?', '아이스크림 좋아하는 맛은?', '오늘 제일 기억에 남는 순간은?',
    '요즘 자주 하는 생각이 있어?', '좋아하는 계절 음식은?', '최근에 배우고 싶어진 게 있어?',
    '집에 있을 때 뭐 하면서 시간 보내?', '좋아하는 인테리어 스타일은?', '오늘 몇 시간 잤어?',
    '최근에 산책한 적 있어?', '좋아하는 국은?', '요즘 자주 쓰는 이모티콘 있어?',
    '오늘 옷 고를 때 뭘 기준으로 골랐어?', '좋아하는 향수나 섬유유연제 향 있어?', '오늘 하루 제일 잘한 일은?',
    '우리가 처음 만난 날 기억나?', '다음 데이트 때 가장 하고 싶은 것은?', '우리 데이트 중 다시 가고 싶은 곳은?',
    '같이 가보고 싶은 여행지는?', '기억에 남는 데이트 음식은?', '처음 손 잡았던 순간 기억나?',
    '같이 해보고 싶은 액티비티가 있어?', '우리 첫 데이트 장소 기억나?', '같이 가고 싶은 맛집이 있어?',
    '가장 웃겼던 데이트 에피소드는?', '같이 보고 싶은 영화나 공연이 있어?', '우리만의 아지트가 있다면 어디야?',
    '다음 여행 가고 싶은 계절은?', '같이 찍은 사진 중 제일 마음에 드는 건?', '기억에 남는 선물이 있어?',
    '같이 만들어보고 싶은 추억이 있어?', '우리가 자주 가는 장소는 어디야?', '데이트할 때 제일 좋아하는 코스는?',
    '같이 배워보고 싶은 게 있어?', '다음에 같이 가고 싶은 계절 축제 있어?',
    '요즘 나의 어떤 점이 제일 좋아?', '오늘 나한테 하고 싶은 말 있어?', '나 없을 때 제일 보고 싶은 순간은 언제야?',
    '나한테 고마웠던 순간이 있어?', '요즘 나 때문에 웃었던 적 있어?', '나의 습관 중에 귀엽다고 생각하는 게 있어?',
    '오늘 나에게 칭찬 한마디 해줘!', '우리 사이에서 제일 소중한 게 뭐야?', '나랑 있을 때 제일 편한 순간은 언제야?',
    '오늘 나한테 하트 하나 준다면 왜?', '나의 목소리 중 좋아하는 톤이 있어?', '나랑 같이 있고 싶은 순간이 언제야?',
    '오늘 나 보고 싶었어?', '나에게 어울리는 단어 하나를 고른다면?', '요즘 나한테 제일 하고 싶은 말은?',
    '요즘 우리 사이는 어때?', '우리가 서로에게 더 해주면 좋을 게 있을까?', '우리 관계에서 가장 든든한 부분은?',
    '요즘 서로에게 부족했던 부분이 있을까?', '1년 후 우리는 어떤 모습일 것 같아?'
  ];
  // 날짜를 기준으로 질문을 고름 (Math.random 금지 - 두 기기에서 항상 같은 질문이 나와야 하고,
  // 자정마다 자동으로 바뀌어야 함)
  function dailyQuestionIndexForDate(dateStr){
    const [year, month, day] = dateStr.split('-').map(Number);
    const dayNumber = Math.floor(Date.UTC(year, month - 1, day) / 86400000);
    return ((dayNumber % DAILY_QUESTIONS.length) + DAILY_QUESTIONS.length) % DAILY_QUESTIONS.length;
  }

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
  // 예전 "참 잘했어요 스탬프"의 stampPerson(누가 잘했는지)은 "우리의 순간"에서
  // selectedMomentType(오늘 어떤 순간이었는지)으로 완전히 대체됨
  let selectedMomentType = null;
  let pendingWishPhotos = [], pendingDateLogPhotos = [], pendingStampPhotos = [], pendingLetterPhotos = [];
  let pendingDateLogGeo = null;
  // ---- 추억 다시 보기 (매일 하나씩 오래된 데이트기록/편지를 홈에 보여줌) ----
  let dailyMemoryPick = null;      // { type, item, reason }
  let dailyMemoryLoadKey = null;   // 오늘 날짜 - 하루에 한 번만 다시 고르기 위함
  let openedMemoryDoc = null;      // 최신 100개 밖에 있는 추억을 열었을 때, 그 문서 하나만 별도로 구독 중인 상태
  let openedMemoryUnsubscribe = null;
  // 최신 100개 구독이 실제로 갖고 있는 ID 목록 - 이게 있어야 "원래 100개 안에 있던 기록"과
  // "추억 보기 때문에 임시로 넣어둔 100개 밖 기록"을 정확히 구분해서, 후자만 안전하게 뺄 수 있음
  let recentDateLogIds = new Set();
  let recentLetterIds = new Set();
  let searchQuery = '';

  // ---- 우리의 순간 (예전 "참 잘했어요 스탬프"를 대체) ----
  const MOMENT_DEFS = {
    kindness: { emoji:'💗', label:'오늘의 다정함', summary:'다정했던 날' },
    laugh: { emoji:'😂', label:'오늘의 웃음', summary:'함께 웃은 날' },
    hug: { emoji:'🫂', label:'오늘의 포옹', summary:'포옹한 날' },
    meal: { emoji:'🍽️', label:'맛있는 것 함께 먹음', summary:'함께 맛있는 걸 먹은 날' },
    talk: { emoji:'📞', label:'오래 이야기함', summary:'오래 이야기한 날' },
    walk: { emoji:'🚶', label:'같이 걸음', summary:'같이 걸은 날' },
    newExperience: { emoji:'✨', label:'새로운 경험', summary:'새로운 경험' },
    support: { emoji:'💪', label:'서로 응원함', summary:'서로 응원한 날' },
    cozy: { emoji:'🏠', label:'편안하게 함께함', summary:'편안하게 함께한 날' },
    anniversary: { emoji:'🎉', label:'작은 기념일', summary:'작은 기념일' }
  };
  
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
    renderTodayStatusCard();
    if(identity) watchDailyQuestion();
    recheckDateLogLockOnResume();
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
    if(timerWasSuspended && document.visibilityState === 'visible'){
      scheduleResumeChecks();
      recheckDateLogLockOnResume();
    }
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
  // "지난 일정" 분류(isPast)와는 별개 기준: 데이트 당일부터(끝나기를 기다리지 않고) 추억 남기기 버튼을 보여줌
  function canLeaveDateMemory(item){
    if(!item || !item.isDate || !item.date) return false;
    return item.date <= localDateStr();
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
  // 주격조사(이/가): 받침 있으면 "이가", 없으면 "가" -> 소정이가 / 선호가
  function particleFor(name){
    return name === '소정' ? '이가' : '가';
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
  document.getElementById('dateMapOpenBtn').addEventListener('click', ()=>{
    // 우리의 순간 탭 등 다른 곳에서 바로 지도를 열어도 데이트 기록 데이터가 준비되게 함
    startCollectionWatcher('datelog');
    document.querySelectorAll('#memorySubtabs button').forEach(button => button.classList.remove('active'));
    document.getElementById('dateMapOpenBtn').classList.add('active');
    openDateMap();
  });
  document.getElementById('dateMapClose').addEventListener('click', ()=>{
    document.getElementById('dateMapModal').classList.add('hidden');
    syncSectionNavigation(getCurrentActiveTab());
  });


  function scheduleCardHTML(item){
    const d = fmtDate(item.date);
    const extraLabel = formatScheduleRange(item);
    const hasExtra = extraLabel !== fmtShortDate(item.date);
    // 데이트 당일부터 버튼을 보여줌 (데이트 끝나고 바로, 또는 집에 돌아가는 길에 기록하고 싶을 수 있어서.
    // isPast()는 "지난 일정" 분류(past 스타일/지난일정 접기)에 계속 쓰이므로 그대로 두고, 이 버튼에만 별도 기준 사용)
    const linkedDateLog = canLeaveDateMemory(item) ? findDateLogForSchedule(item.id) : null;
    const memoryButtonHTML = canLeaveDateMemory(item)
      ? `<button type="button" class="schedule-memory-btn ${linkedDateLog ? 'completed' : ''}" data-schedule-memory="${item.id}">${linkedDateLog ? '💛 추억을 남겼어' : '✍️ 추억 남기기'}</button>`
      : '';
    return `<div class="item-card ${isPast(item)?'past':''} ${item.isDate?'date-plan-card':''}" data-item-id="${item.id}">
      <div class="date-badge ${item.isDate?'date-plan-badge':''}"><div class="day">${d.day}</div><div class="mon">${d.mon}</div></div>
      <div class="item-body">
        <div class="item-title">${escapeHTML(item.title)}${item.isDate ? ' ' + pixelHeartSVG(true, 16) : ''}</div>
        ${hasExtra ? `<div class="item-memo">${extraLabel}</div>` : ''}
        ${item.location ? `<div class="item-memo">📍 ${escapeHTML(item.location)}</div>` : ''}
        ${item.memo ? `<div class="item-memo">${escapeHTML(item.memo)}</div>` : ''}
        ${item.isDate ? '' : `<div class="item-meta">${authorTagHTML(item.author)}</div>`}
        ${item.sourceWishId ? `<button type="button" class="schedule-source-link" data-open-source-wish="${item.sourceWishId}">💫 ${escapeHTML((wishes.find(w => w.id === item.sourceWishId) || {}).title || item.sourceWishTitle || '관련 위시')}</button>` : ''}
        ${memoryButtonHTML}
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
    const linkedSchedule = findScheduleForWish(item.id);
    const wishStatus = item.done ? '다녀왔어' : linkedSchedule ? `날짜를 정했어 · ${formatScheduleRange(linkedSchedule)}` : '언젠가 하고 싶어';
    return `<div class="wish-card ${item.done?'wish-done':''}" data-item-id="${item.id}">
      <div class="wish-content">
        <div class="post-summary" data-post-toggle="${item.id}">
          <div class="post-summary-title">${escapeHTML(item.title)}</div>
          <div class="post-summary-meta">${authorTagHTML(item.author)}<span>${dateStr}</span><span class="post-summary-arrow">▾</span></div>
          <div class="wish-schedule-status ${item.done ? 'done' : linkedSchedule ? 'scheduled' : ''}">${item.done ? '💖' : linkedSchedule ? '📅' : '💭'} ${escapeHTML(wishStatus)}</div>
        </div>
        <div class="post-detail hidden">
          ${item.body ? `<div class="wish-body">${escapeHTML(item.body)}</div>` : ''}
          ${cardPhotosHTML(item)}
          ${item.link ? `<a class="wish-link" href="${escapeHTML(item.link)}" target="_blank" rel="noopener">🔗 ${escapeHTML(linkHost(item.link))}</a>` : ''}
          <div class="wish-footer">
            <div style="display:flex;align-items:center;gap:6px;justify-content:flex-end;width:100%;flex-wrap:wrap;">
              ${!item.done ? (linkedSchedule
                ? `<button type="button" class="wish-plan-btn linked" data-view-wish-schedule="${linkedSchedule.id}">📅 일정 보기</button>`
                : `<button type="button" class="wish-plan-btn" data-plan-wish="${item.id}">📅 날짜 잡기</button>`) : ''}
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
    if(item.entryMode === 'quick') return quickDateLogCardHTML(item);
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
          ${item.sourceScheduleId ? `<button type="button" class="schedule-source-link" data-open-source-schedule="${item.sourceScheduleId}">🗓️ ${escapeHTML((schedule.find(s => s.id === item.sourceScheduleId) || {}).title || item.sourceScheduleTitle || '관련 일정')}</button>` : ''}
          ${item.sourceWishId ? `<button type="button" class="schedule-source-link" data-open-source-wish="${item.sourceWishId}">💫 관련 위시 보기</button>` : ''}

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

  // 빠른 기록 카드는 상세 기록과 달리, 접었다 펼치는 구조 없이 처음부터 기분과 한 줄이 다 보임
  // (가볍게 보고 바로 반응하는 게 목적이라, 굳이 또 눌러서 펼치게 만들 필요가 없음)
  function quickDateLogCardHTML(item){
    const likes = item.likes || [];
    const isLiked = likes.includes(identity);
    const likeIcon = pixelHeartSVG(isLiked);
    const commentCount = (item.comments || []).filter(c => !c.deleted).length;
    return `<div class="item-card quick-datelog-card" data-item-id="${item.id}">
      <div class="date-badge" style="background:var(--yellow-soft);"><div class="day">${fmtDate(item.date).day}</div><div class="mon">${fmtDate(item.date).mon}</div></div>
      <div class="item-body">
        <div class="post-summary-meta">${authorTagHTML(item.author)}<span>${fmtShortDate(item.date)} 데이트</span></div>
        <div class="daily-question-text" style="font-size:15px; margin:6px 0;">${item.mood || ''} ${escapeHTML(item.body || item.memo || '')}</div>
        ${cardPhotosHTML(item)}
        ${item.sourceScheduleId ? `<button type="button" class="schedule-source-link" data-open-source-schedule="${item.sourceScheduleId}">🗓️ ${escapeHTML((schedule.find(s => s.id === item.sourceScheduleId) || {}).title || item.sourceScheduleTitle || '관련 일정')}</button>` : ''}
        ${item.sourceWishId ? `<button type="button" class="schedule-source-link" data-open-source-wish="${item.sourceWishId}">💫 관련 위시 보기</button>` : ''}
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
        ${isMine(item) ? `<button type="button" class="daily-question-edit-link" data-convert-quick-datelog="${item.id}">✍️ 정성껏 기록으로 바꾸기</button>` : ''}
        ${renderCommentsHTML(item, 'datelog')}
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
  // momentType 필드 유무로 예전 스탬프/새 순간을 구분함 (기존 데이터는 일괄 변환하지 않고 그대로 둠)
  function stampCardHTML(item, popId){
    if(!item.momentType) return legacyStampCardHTML(item, popId);
    return momentCardHTML(item, popId);
  }

  // 예전 "참 잘했어요 스탬프" 카드 (기존 문서는 계속 이 모습 그대로 보여줌)
  function legacyStampCardHTML(item, popId){
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

  // 새 "우리의 순간" 카드 - 누가 받았는지(To/From)가 아니라 둘이 함께한 순간을 보여줌
  // 한마디(text)는 선택사항이라 비어있을 수 있음 - 그 경우 홈/검색/활동 목록에
  // 빈칸으로 나오지 않도록, 순간 종류 이모지+라벨로 대신 보여주는 공통 함수
  function stampPreviewText(item){
    const text = (item.text || '').trim();
    if(text) return text;
    if(item.momentType){
      const def = MOMENT_DEFS[item.momentType] || {};
      return `${def.emoji || item.momentEmoji || '✨'} ${def.label || item.momentLabel || '우리의 순간'}`;
    }
    return `${item.person || ''}에게 남긴 예전 스탬프`;
  }

  function momentCardHTML(item, popId){
    const def = MOMENT_DEFS[item.momentType] || {};
    const dt = new Date(item.createdAt || Date.now());
    const dateStr = `${dt.getMonth()+1}월 ${dt.getDate()}일`;

    const likes = item.likes || [];
    const isLiked = likes.includes(identity);
    const likeIcon = pixelHeartSVG(isLiked);
    const commentCount = (item.comments || []).filter(c => !c.deleted).length;

    return `<div class="stamp-card moment-card" data-item-id="${item.id}">
      <div class="stamp-body">
        <div class="moment-category">${def.emoji || '✨'} ${escapeHTML(def.label || item.momentLabel || '우리의 순간')}</div>
        ${item.text ? `<div class="stamp-text moment-card-title">${escapeHTML(item.text)}</div>` : ''}
        ${cardPhotosHTML(item)}
        <div class="stamp-date moment-card-author">${item.author ? `작성자 ${escapeHTML(item.author)} · ` : ''}${dateStr}</div>

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

  // 이번 달의 새 순간을 종류별로 집계 (사람별 집계는 하지 않음 - 평가가 아니므로)
  function renderMomentMonthSummary(){
    const now = new Date();
    const monthMoments = stamps.filter(item => {
      if(!item.momentType || !item.createdAt) return false;
      const date = new Date(item.createdAt);
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth();
    });
    const counts = {};
    monthMoments.forEach(item => { counts[item.momentType] = (counts[item.momentType] || 0) + 1; });
    const rows = Object.entries(counts).map(([type, count]) => {
      const def = MOMENT_DEFS[type];
      if(!def) return '';
      return `<div class="moment-summary-row"><span>${def.emoji} ${def.summary}</span><strong>${count}번</strong></div>`;
    }).filter(Boolean).join('');
    const el = document.getElementById('momentMonthSummary');
    el.innerHTML = `
      <div class="moment-summary-title">${now.getMonth() + 1}월의 우리</div>
      ${rows || '<div class="moment-summary-empty">이번 달의 첫 순간을 남겨볼까?</div>'}
    `;
  }

  let wishFilterTarget = 'all';
  let dateLogFilterTarget = 'all';
  function renderStamp(popId) {
    renderMomentMonthSummary();
    renderGroupedByTime(
      'stampList',
      stamps,
      item => item.createdAt || Date.now(),
      item => stampCardHTML(item, popId),
      stampExpandedGroups,
      '<div class="empty-state"><span class="empty-emoji">🏅</span>오늘 우리에게 있었던<br>순간을 남겨봐!</div>'
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
    document.getElementById('ddayPill').innerHTML = `26.02.02~ &nbsp;<b>D+${diffDays}</b>일째`;
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

  // 잠금 편지는 작성자에게는 화면상 안 잠긴 것처럼 보이지만(isLetterLocked가 false 반환),
  // 추억 추천에서는 "정말로 개봉일이 지났는지"만 따져야 함 - 안 그러면 작성자 자신에게
  // 아직 안 열린 자기 편지가 추천될 수 있음
  function isLetterActuallyUnlocked(item){
    if(!item || !item.unlockDate) return true;
    const time = item.unlockTime || '00:00';
    const unlockTs = new Date(`${item.unlockDate}T${time}:00`).getTime();
    return Number.isFinite(unlockTs) && unlockTs <= Date.now();
  }

  // 날짜 문자열을 시드로 써서, 기기가 달라도 같은 날엔 항상 같은 결과가 나오게 함 (Math.random 금지)
  function dailyMemoryIndex(length, seed){
    if(length <= 0) return -1;
    let hash = 0;
    for(const char of seed){ hash = ((hash * 31) + char.charCodeAt(0)) >>> 0; }
    return hash % length;
  }

  function memoryDateValue(item, type){
    if(type === 'datelog') return item.date || '';
    if(type === 'letter'){
      // 편지는 unlockDate(있으면)를 기준으로 삼고, 없으면(잠금 없는 일반 편지) 작성일을 기준으로 함.
      // createdAt만 있고 문자열 날짜가 없는 경우가 많아서 로컬 날짜 문자열로 변환해줌
      return item.unlockDate || (item.createdAt ? localDateStr(new Date(item.createdAt)) : '');
    }
    return '';
  }

  function dateFromLocalKey(dateKey){
    if(!dateKey) return null;
    const parsed = new Date(`${dateKey}T00:00:00`);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // 오늘 보여줄 추억 하나를 고름: 1)같은 월일(기념일) 2)정확히 100일 전 3)그 외 카테고리 중 하나
  function chooseDailyMemory(allDateLogs, allLetters, todayKey){
    const today = dateFromLocalKey(todayKey);
    if(!today) return null;

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const hundredDaysAgo = new Date(today);
    hundredDaysAgo.setDate(hundredDaysAgo.getDate() - 100);

    const oldDateLogs = (allDateLogs || [])
      .map(item => ({ type:'datelog', item, date: dateFromLocalKey(item.date) }))
      .filter(entry => entry.date && entry.date < thirtyDaysAgo);

    const unlockedLetters = (allLetters || [])
      .filter(isLetterActuallyUnlocked)
      .map(item => ({ type:'letter', item, date: dateFromLocalKey(memoryDateValue(item, 'letter')) }))
      .filter(entry => entry.date && entry.date < thirtyDaysAgo);

    // 1. 같은 월·일의 과거 기록 (기념일)을 가장 먼저 - 데이트기록만 대상 (편지는 "매년 이맘때"라는 개념이 약함)
    const anniversaries = oldDateLogs.filter(entry =>
      entry.date.getMonth() === today.getMonth() && entry.date.getDate() === today.getDate()
    );
    if(anniversaries.length > 0){
      const index = dailyMemoryIndex(anniversaries.length, `${todayKey}:anniversary`);
      const selected = anniversaries[index];
      const yearsAgo = today.getFullYear() - selected.date.getFullYear();
      return {
        type: selected.type, item: selected.item,
        reason: yearsAgo === 1 ? '1년 전 오늘의 우리' : `${yearsAgo}년 전 오늘의 우리`
      };
    }

    // 2. 정확히 100일 전 기록
    const hundredDayKey = localDateStr(hundredDaysAgo);
    const hundredDayMemories = oldDateLogs.filter(entry => entry.item.date === hundredDayKey);
    if(hundredDayMemories.length > 0){
      const index = dailyMemoryIndex(hundredDayMemories.length, `${todayKey}:hundred`);
      return { type:'datelog', item: hundredDayMemories[index].item, reason:'100일 전의 우리' };
    }

    // 3. 그 외에는 날짜 기준으로 카테고리 하나, 그 안에서 항목 하나를 선택
    const categories = [];

    const firstPlace = [...oldDateLogs]
      .filter(entry => entry.item.location || entry.item.place || entry.item.address)
      .sort((a,b) => a.date - b.date)[0];
    if(firstPlace) categories.push({ reason:'처음 함께 간 장소', entries:[firstPlace] });

    const currentSeason = Math.floor(today.getMonth() / 3);
    const sameSeason = oldDateLogs.filter(entry => Math.floor(entry.date.getMonth() / 3) === currentSeason);
    if(sameSeason.length > 0) categories.push({ reason:'이맘때의 추억', entries: sameSeason });

    if(unlockedLetters.length > 0) categories.push({ reason:'다시 읽는 편지', entries: unlockedLetters });
    if(oldDateLogs.length > 0) categories.push({ reason:'오늘 다시 보는 데이트', entries: oldDateLogs });

    if(categories.length === 0) return null;

    const category = categories[dailyMemoryIndex(categories.length, `${todayKey}:category`)];
    const selected = category.entries[dailyMemoryIndex(category.entries.length, `${todayKey}:${category.reason}`)];
    return { type: selected.type, item: selected.item, reason: category.reason };
  }

  // 화면에 불러온 최신 100개 안에 없을 수도 있으니, 하루 한 번은 전체 컬렉션을 확인해서 추억을 고름
  // (두 사람만 쓰는 앱이라 기록 수가 적으므로 이 정도 전체조회는 현실적으로 괜찮음)
  async function loadDailyMemory(){
    if(!identity) return;
    const todayKey = localDateStr(new Date());
    if(dailyMemoryLoadKey === todayKey) return; // 오늘 이미 골랐으면 다시 안 함
    dailyMemoryLoadKey = todayKey;

    const cacheKey = `${STORAGE_PREFIX}daily_memory_${todayKey}`;
    try{
      const cached = JSON.parse(localStorage.getItem(cacheKey) || 'null');
      if(cached && cached.type && cached.id){
        const collectionName = cached.type === 'datelog' ? 'datelog' : 'letters';
        const cachedSnap = await db.collection(collectionName).doc(cached.id).get();
        if(cachedSnap.exists){
          const cachedItem = { id: cachedSnap.id, ...cachedSnap.data() };
          if(cached.type !== 'letter' || isLetterActuallyUnlocked(cachedItem)){
            dailyMemoryPick = { type: cached.type, reason: cached.reason, item: cachedItem };
            renderHome();
            return;
          }
        }
        localStorage.removeItem(cacheKey);
      }

      const [datelogSnap, letterSnap] = await Promise.all([
        db.collection('datelog').get(),
        db.collection('letters').get()
      ]);
      const allDateLogs = datelogSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      const allLetters = letterSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      dailyMemoryPick = chooseDailyMemory(allDateLogs, allLetters, todayKey);
      if(dailyMemoryPick){
        localStorage.setItem(cacheKey, JSON.stringify({ type: dailyMemoryPick.type, id: dailyMemoryPick.item.id, reason: dailyMemoryPick.reason }));
      }
      renderHome();
    }catch(e){
      console.warn('오늘의 추억 불러오기 실패', e);
      // 네트워크 오류시엔 이미 불러온 최근 100개 안에서라도 찾아봄 (완전히 없는 것보단 나으니까)
      dailyMemoryPick = chooseDailyMemory(dateLogs, letters.filter(isLetterActuallyUnlocked), todayKey);
      // 아직 일반 목록도 안 불러와져 후보가 없었다면, 다음 구독·복귀 시 다시 시도할 수 있게 함
      if(!dailyMemoryPick) dailyMemoryLoadKey = null;
      renderHome();
    }
  }

  // ---- 최신 100개 밖에 있는 추억을 열었을 때, 그 문서 하나만 별도로 실시간 구독 ----
  // removeTemporaryItem=false: 구독만 해제하고 배열은 그대로 둠 (로그아웃 등 어차피 배열 전체를 비우는 상황에 사용)
  function clearOpenedMemory(removeTemporaryItem = true){
    const closing = openedMemoryDoc;
    if(openedMemoryUnsubscribe){ openedMemoryUnsubscribe(); openedMemoryUnsubscribe = null; }
    openedMemoryDoc = null;
    if(!removeTemporaryItem || !closing) return;

    // 원래 최신 100개 구독 안에 있던 기록이면 그대로 두고(중복 없이 이미 정상 배열에 있음),
    // 추억 보기 때문에 임시로 넣어둔 100개 밖 기록일 때만 안전하게 뺌
    const recentIds = closing.type === 'datelog' ? recentDateLogIds : recentLetterIds;
    if(recentIds.has(closing.id)) return;

    if(closing.type === 'datelog'){
      dateLogs = dateLogs.filter(item => item.id !== closing.id);
      renderDateLog();
    } else {
      letters = letters.filter(item => item.id !== closing.id);
      renderLetters();
    }
  }
  function upsertMemoryItem(type, item){
    const list = type === 'datelog' ? dateLogs : letters;
    const index = list.findIndex(entry => entry.id === item.id);
    if(index >= 0) list[index] = item; else list.push(item);
  }
  async function watchOpenedMemory(type, id){
    clearOpenedMemory();
    const collectionName = type === 'datelog' ? 'datelog' : 'letters';
    const ref = db.collection(collectionName).doc(id);
    const firstSnap = await ref.get();
    if(!firstSnap.exists) throw new Error('삭제된 추억이야');

    const firstItem = { id: firstSnap.id, ...firstSnap.data() };
    openedMemoryDoc = { type, id, item: firstItem };
    upsertMemoryItem(type, firstItem);

    openedMemoryUnsubscribe = ref.onSnapshot(snapshot => {
      if(!snapshot.exists){
        if(type === 'datelog'){
          dateLogs = dateLogs.filter(item => item.id !== id);
          renderDateLog();
        } else {
          letters = letters.filter(item => item.id !== id);
          renderLetters();
        }

        const todayKey = localDateStr();
        localStorage.removeItem(`${STORAGE_PREFIX}daily_memory_${todayKey}`);

        if(dailyMemoryPick && dailyMemoryPick.item.id === id) dailyMemoryPick = null;
        dailyMemoryLoadKey = null;

        clearOpenedMemory(false); // 배열은 이미 위에서 직접 정리했으니 구독 해제만
        renderHome();

        // 삭제된 추억 대신 오늘의 다른 후보를 고름
        loadDailyMemory();
        return;
      }
      const updatedItem = { id: snapshot.id, ...snapshot.data() };
      openedMemoryDoc = { type, id, item: updatedItem };
      upsertMemoryItem(type, updatedItem);
      if(dailyMemoryPick && dailyMemoryPick.item.id === id){
        // 오늘의 추억으로 선택된 편지가 다시 미래로 잠겼다면 홈 카드와 하루 캐시에서 즉시 제외
        if(type === 'letter' && !isLetterActuallyUnlocked(updatedItem)){
          const todayKey = localDateStr();
          localStorage.removeItem(`${STORAGE_PREFIX}daily_memory_${todayKey}`);
          dailyMemoryPick = null;
          dailyMemoryLoadKey = null;
          renderHome();
          loadDailyMemory(); // 잠긴 편지 대신 다른 추억을 다시 선택
        } else {
          // 제목·본문·사진을 수정한 경우 홈 카드에도 즉시 반영
          dailyMemoryPick.item = updatedItem;
          renderDailyMemoryCard();
        }
      }
      if(type === 'datelog') renderDateLog(); else renderLetters();
    }, err => console.warn('추억 문서 구독 실패', err));
  }

  async function openDailyMemory(openComments = false){
    if(!dailyMemoryPick) return;
    const { type, item } = dailyMemoryPick;
    const tab = type === 'datelog' ? 'datelog' : 'letter';
    // 작성 중인 내용 때문에 탭 이동을 취소하면 추억 구독도 시작하지 않음
    if(!activateTab(tab)) return;
    try{
      await watchOpenedMemory(type, item.id);
      if(openComments){
        const collectionName = type === 'datelog' ? 'datelog' : 'letters';
        openCommentSections.add(`${collectionName}-${item.id}`);
      }
      navigateToItem(tab, item.id);
    }catch(e){
      console.warn('추억 열기 실패', e);
      alert('이 추억을 찾을 수 없어. 삭제됐을 수도 있어.');
    }
  }

  function renderDailyMemoryCard(){
    const card = document.getElementById('homeThrowbackCard');
    if(!card) return;
    if(!dailyMemoryPick){
      card.classList.add('hidden');
      card.innerHTML = '';
      return;
    }
    const { type, item, reason } = dailyMemoryPick;
    const photos = getItemPhotos(item);
    const firstPhoto = photos[0] || '';
    const title = item.title || item.body || item.text || (type === 'letter' ? '다시 읽는 편지' : '우리의 데이트 기록');
    const dateText = memoryDateValue(item, type);

    card.classList.remove('hidden');
    card.innerHTML = `
      <div class="home-memory-heading">
        <span class="home-memory-icon">🕰️</span>
        <div>
          <div class="home-throwback-label">${escapeHTML(reason)}</div>
          <div class="home-throwback-title">${escapeHTML(String(title).slice(0, 45))}</div>
          ${dateText ? `<div class="home-memory-date">${escapeHTML(dateText)}</div>` : ''}
        </div>
      </div>
      ${firstPhoto ? `<img class="home-memory-photo" src="${escapeHTML(firstPhoto)}" alt="">` : ''}
      <div class="home-memory-actions">
        <button type="button" class="home-memory-open-btn" data-open-daily-memory>추억 열어보기</button>
        <button type="button" class="home-memory-comment-btn" data-comment-daily-memory>한마디 남기기</button>
      </div>
    `;
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

  // 9단계: 여러 종류를 섞은 "최근 활동" 대신, 오늘 남긴 "우리의 순간" 하나만 홈에 보여줌
  function findTodayMoment(){
    const todayKey = localDateStr();
    return [...stamps]
      .filter(item => {
        const createdAt = Number(item.createdAt || 0);
        return createdAt > 0 && localDateStr(new Date(createdAt)) === todayKey;
      })
      .sort((a, b) => Number(b.createdAt || 0) - Number(a.createdAt || 0))[0] || null;
  }

  let renderHomeDebounceTimer = null;
  // ---- 애정 신호 (마음 보내기) ----
  const LOVE_SIGNAL_TYPES = [
    { type:'missYou', emoji:'❤️', label:'보고 싶어' },
    { type:'hug',     emoji:'🫂', label:'안아주기' },
    { type:'thought', emoji:'🐶', label:'생각났어' },
    { type:'cheer',   emoji:'💪', label:'힘내' },
    { type:'rest',    emoji:'☕', label:'쉬었다 해' },
    { type:'love',    emoji:'😘', label:'사랑해' }
  ];
  let loveSignals = [];
  let pendingSignalTimer = null;
  let pendingSignalInterval = null;
  let pendingSignalType = null;
  const localSignalSentAt = {};

  function watchLoveSignals(){
    if(!identity) return;
    // 두 사람만 쓰는 앱이라, receiver==... 같은 복합 인덱스 쿼리보다
    // 최근 100개를 통째로 불러온 뒤 앱에서 걸러 쓰는 게 더 단순하고 안전함
    const unsubscribe = db.collection('loveSignals')
      .orderBy('createdAt', 'desc')
      .limit(100)
      .onSnapshot(snap => {
        loveSignals = [];
        snap.forEach(doc => loveSignals.push({ id: doc.id, ...doc.data() }));
        renderLoveSignalCard();
      }, err => console.error('애정 신호 구독 실패', err));
    rememberUnsubscribe(unsubscribe);
  }

  function renderLoveSignalCard(){
    const grid = document.getElementById('loveSignalGrid');
    const titleEl = document.getElementById('loveSignalTitle');
    if(!grid || !identity) return;
    const otherName = otherPerson(identity);
    titleEl.textContent = `${otherName}에게 마음 보내기`;

    grid.innerHTML = LOVE_SIGNAL_TYPES.map(s => `
      <button class="love-signal-btn" data-signal-type="${s.type}" ${pendingSignalType ? 'disabled' : ''}>${s.emoji} ${s.label}</button>
    `).join('');
    grid.querySelectorAll('.love-signal-btn').forEach(btn=>{
      btn.addEventListener('click', ()=> startSendSignal(btn.dataset.signalType));
    });

    // 최근 받은 신호 하나만 표시
    const received = document.getElementById('loveSignalReceived');
    const lastReceived = loveSignals.find(s => s.receiver === identity);
    if(lastReceived){
      received.classList.remove('hidden');
      const def = LOVE_SIGNAL_TYPES.find(s => s.type === lastReceived.type) || {};
      received.innerHTML = `
        <div>
          <span class="love-signal-received-text">${lastReceived.sender}${particleFor(lastReceived.sender)} ${def.label || ''}(${def.emoji || ''}) 신호를 보냈어</span>
          <span class="love-signal-received-time">${relativeTimeKR(lastReceived.createdAt)}</span>
        </div>
        <div class="love-signal-received-actions">
          <button id="loveSignalReturnBtn" data-signal-type="${lastReceived.type}">같은 신호 보내기</button>
        </div>
      `;
      document.getElementById('loveSignalReturnBtn').addEventListener('click', (e)=> startSendSignal(e.target.dataset.signalType));
    } else {
      received.classList.add('hidden');
      received.innerHTML = '';
    }
  }

  function startSendSignal(type){
    if(!identity || pendingSignalType) return; // 이미 대기 중이면 무시 (버튼도 비활성화되어 있음)

    const def = LOVE_SIGNAL_TYPES.find(s => s.type === type);
    if(!def) return;

    const now = Date.now();
    // 같은 신호는 마지막 전송 후 60초 동안 다시 못 보내게 제한
    // (서버에 이미 저장된 기록 + 아직 서버에 반영 안 됐을 수 있는 방금 보낸 기록 둘 다 확인)
    const recentSame = loveSignals.find(s => s.sender === identity && s.type === type && now - Number(s.createdAt || 0) < 60000);
    const recentlySentLocally = now - Number(localSignalSentAt[type] || 0) < 60000;
    if(recentSame || recentlySentLocally){
      alert('같은 신호는 1분 뒤에 다시 보낼 수 있어.');
      return;
    }

    const senderAtStart = identity; // 대기 중 로그아웃/계정전환 대비, 시작 시점 신원을 고정해둠

    pendingSignalType = type;
    renderLoveSignalCard();

    const pendingRow = document.getElementById('loveSignalPending');
    const pendingText = document.getElementById('loveSignalPendingText');
    pendingRow.classList.remove('hidden');
    let secondsLeft = 4;
    pendingText.textContent = `${def.emoji} ${def.label}를 보낼게 · ${secondsLeft}초`;

    // 타이머(setTimeout)와 초읽기(setInterval)를 각각 별도 변수로 관리함 - 브라우저의
    // setTimeout()은 (Node.js와 달리) 객체가 아니라 숫자를 반환해서, 그 반환값에
    // 프로퍼티를 붙여서 참조를 보관하는 방식은 브라우저에서 조용히 실패함
    pendingSignalInterval = setInterval(()=>{
      secondsLeft--;
      if(secondsLeft > 0) pendingText.textContent = `${def.emoji} ${def.label}를 보낼게 · ${secondsLeft}초`;
    }, 1000);

    pendingSignalTimer = setTimeout(async ()=>{
      clearInterval(pendingSignalInterval);
      pendingSignalInterval = null;
      pendingRow.classList.add('hidden');
      const sentType = pendingSignalType;
      pendingSignalType = null;
      pendingSignalTimer = null;
      renderLoveSignalCard();

      // 기다리는 동안 로그아웃했거나 계정이 바뀌었다면 전송하지 않음
      if(!sentType || identity !== senderAtStart) return;

      const sentAt = Date.now();
      localSignalSentAt[sentType] = sentAt;
      // 대기 시간이 끝난 뒤에만 실제로 저장 (그래야 취소가 "진짜 취소"가 됨 -
      // 먼저 저장해두면 Functions가 바로 푸시를 보내버려서 나중에 지워도 알림은 이미 감)
      try{
        await db.collection('loveSignals').add({
          sender: senderAtStart,
          receiver: otherPerson(senderAtStart),
          type: sentType,
          emoji: def.emoji,
          label: def.label,
          createdAt: sentAt
        });
      }catch(e){
        delete localSignalSentAt[sentType];
        console.error('애정 신호 전송 실패', e);
        alert('마음을 보내지 못했어. 인터넷 연결을 확인하고 다시 시도해줘.');
      }
    }, 4000);
  }

  function cancelPendingSignal(){
    if(pendingSignalTimer) clearTimeout(pendingSignalTimer);
    if(pendingSignalInterval) clearInterval(pendingSignalInterval);
    pendingSignalTimer = null;
    pendingSignalInterval = null;
    pendingSignalType = null;
    const pendingRow = document.getElementById('loveSignalPending');
    if(pendingRow) pendingRow.classList.add('hidden');
    renderLoveSignalCard();
  }
  document.getElementById('loveSignalCancelBtn').addEventListener('click', cancelPendingSignal);

  function renderLoveSignalHistory(){
    const container = document.getElementById('loveSignalHistoryResults');
    if(loveSignals.length === 0){
      container.innerHTML = '<div class="empty-state" style="padding:30px 10px;">아직 주고받은 신호가 없어.</div>';
      return;
    }
    container.innerHTML = loveSignals.map(s => {
      const def = LOVE_SIGNAL_TYPES.find(d => d.type === s.type) || {};
      return `
        <div class="search-result-item love-signal-history-item">
          <div>
            <div class="search-result-title">${s.sender} → ${s.receiver} · ${def.emoji || ''} ${def.label || s.type}</div>
            <div class="search-result-sub">${formatDateTimeKR(s.createdAt)}</div>
          </div>
        </div>
      `;
    }).join('');
  }
  function openLoveSignalHistory(){
    document.getElementById('loveSignalHistoryOverlay').classList.remove('hidden');
    renderLoveSignalHistory();
  }
  document.getElementById('loveSignalHistoryBtn').addEventListener('click', openLoveSignalHistory);
  document.getElementById('loveSignalHistoryCloseBtn').addEventListener('click', ()=>{
    document.getElementById('loveSignalHistoryOverlay').classList.add('hidden');
  });

  // ---- 오늘의 상태 ----
  const TODAY_STATUS_TYPES = [
    { type:'good',      emoji:'😊', label:'기분 좋아' },
    { type:'focus',     emoji:'📚', label:'집중 중' },
    { type:'busy',      emoji:'🔥', label:'바쁜 중' },
    { type:'tired',     emoji:'😴', label:'피곤해' },
    { type:'rest',      emoji:'🏠', label:'쉬는 중' },
    { type:'talk',      emoji:'💬', label:'이야기하고 싶어' },
    { type:'restAlone', emoji:'🌿', label:'혼자 쉬는 중' },
    { type:'missYou',   emoji:'❤️', label:'보고 싶어' }
  ];
  // 이 두 종류를 선택했을 때만 "알림으로 알려주기" 체크박스가 나타남
  const NOTIFIABLE_STATUS_TYPES = new Set(['talk', 'missYou']);
  const STATUS_STALE_MS = 24 * 60 * 60 * 1000;

  let todayStatuses = {};
  let selectedTodayStatusType = null;
  let todayStatusAgeTimer = null;

  function watchTodayStatuses(){
    if(!identity) return;
    const unsubscribe = db.collection('todayStatuses').onSnapshot(snap => {
      todayStatuses = {};
      snap.forEach(doc => { todayStatuses[doc.id] = doc.data(); });
      renderTodayStatusCard();
    }, err => console.error('오늘의 상태 구독 실패', err));
    rememberUnsubscribe(unsubscribe);

    // 시간이 지날수록 "24시간 지남" 흐림 표시가 바뀌어야 하니 1분마다 다시 그림.
    // startWatchers()가 여러 번 불려도 타이머가 중복 생기지 않게 기존 것부터 정리
    if(todayStatusAgeTimer) clearInterval(todayStatusAgeTimer);
    todayStatusAgeTimer = setInterval(renderTodayStatusCard, 60000);
  }

  function renderTodayStatusCard(){
    const list = document.getElementById('todayStatusList');
    if(!list || !identity) return;
    const names = ['소정', '선호'];
    const now = Date.now();

    list.innerHTML = names.map(name => {
      const status = todayStatuses[name];
      if(!status){
        return `
          <div class="today-status-person">
            <div>
              <div class="today-status-name">${name}</div>
              <div class="today-status-empty">아직 오늘 상태를 안 남겼어</div>
            </div>
          </div>
        `;
      }
      const def = TODAY_STATUS_TYPES.find(t => t.type === status.type) || {};
      const age = now - Number(status.updatedAt || 0);
      const isStale = age >= STATUS_STALE_MS;
      const isMe = name === identity;
      // 오래된(24시간 지난) 상태에는 반응 버튼을 안 보여줌 - 이미 바뀌었을 수 있는
      // 상황에 뒤늦게 반응하는 것을 막기 위함
      const showReactions = !isMe && !isStale;

      return `
        <div class="today-status-person ${isStale ? 'stale' : ''}">
          <div>
            <div class="today-status-name">${name}</div>
            <div class="today-status-emoji-label">${def.emoji || ''} ${def.label || status.type}</div>
            ${status.memo ? `<div class="today-status-memo">${escapeHTML(status.memo)}</div>` : ''}
            ${isStale
              ? `<span class="today-status-stale-label">24시간이 지난 상태야</span>`
              : `<span class="today-status-time">${relativeTimeKR(status.updatedAt)}</span>`}
          </div>
          ${showReactions ? `
            <div class="today-status-reactions">
              <button data-status-reaction="cheer">힘내 보내기</button>
              <button data-status-reaction="hug">안아주기</button>
            </div>
          ` : ''}
        </div>
      `;
    }).join('');

    list.querySelectorAll('[data-status-reaction]').forEach(btn=>{
      // 상태에 대한 반응은 별도 기능이 아니라 1단계 애정 신호를 그대로 재사용함
      // (4초 취소, 60초 제한, 알림, 지난 기록까지 전부 동일하게 적용됨)
      btn.addEventListener('click', ()=>{
        startSendSignal(btn.dataset.statusReaction);
        // 오늘의 상태 카드에서 눌렀는데 취소 안내는 애정 신호 카드에 나타나서
        // 화면 밖에 있으면 안 보일 수 있어서, 실제로 대기가 시작된 경우에만 스크롤해줌
        // (60초 제한에 걸려서 대기가 시작 안 됐으면 스크롤도 하지 않음)
        const pendingRow = document.getElementById('loveSignalPending');
        if(pendingRow && !pendingRow.classList.contains('hidden')){
          pendingRow.scrollIntoView({behavior:'smooth', block:'center'});
        }
      });
    });
  }

  function openTodayStatusModal(){
    const myStatus = todayStatuses[identity];
    selectedTodayStatusType = myStatus ? myStatus.type : null;
    document.getElementById('todayStatusMemo').value = myStatus ? (myStatus.memo || '') : '';
    document.getElementById('todayStatusNotifyCheck').checked = false;
    renderTodayStatusGrid();
    updateTodayStatusNotifyRow();
    document.getElementById('todayStatusModal').classList.remove('hidden');
  }
  function renderTodayStatusGrid(){
    const grid = document.getElementById('todayStatusGrid');
    grid.innerHTML = TODAY_STATUS_TYPES.map(s => `
      <button type="button" class="${s.type === selectedTodayStatusType ? 'selected' : ''}" data-status-type="${s.type}">${s.emoji} ${s.label}</button>
    `).join('');
    grid.querySelectorAll('button').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        selectedTodayStatusType = btn.dataset.statusType;
        renderTodayStatusGrid();
        updateTodayStatusNotifyRow();
      });
    });
  }
  function updateTodayStatusNotifyRow(){
    const row = document.getElementById('todayStatusNotifyRow');
    const label = document.getElementById('todayStatusNotifyLabel');
    const otherName = identity ? otherPerson(identity) : '상대방';
    if(NOTIFIABLE_STATUS_TYPES.has(selectedTodayStatusType)){
      row.classList.remove('hidden');
      label.textContent = `${otherName}에게 알림으로 알려주기`;
    } else {
      // 다른 상태를 고르면 체크박스 자체를 숨기고 체크도 반드시 해제함
      row.classList.add('hidden');
      document.getElementById('todayStatusNotifyCheck').checked = false;
    }
  }
  document.getElementById('todayStatusEditBtn').addEventListener('click', openTodayStatusModal);
  document.getElementById('todayStatusCancelBtn').addEventListener('click', ()=>{
    document.getElementById('todayStatusModal').classList.add('hidden');
  });
  document.getElementById('todayStatusSaveBtn').addEventListener('click', async ()=>{
    if(!selectedTodayStatusType){
      alert('상태를 하나 골라줘.');
      return;
    }
    if(!identity) return;
    const def = TODAY_STATUS_TYPES.find(s => s.type === selectedTodayStatusType);
    if(!def) return;

    const saveBtn = document.getElementById('todayStatusSaveBtn');
    if(saveBtn.disabled) return; // 저장 중 중복 클릭 방지
    saveBtn.disabled = true;

    const memo = document.getElementById('todayStatusMemo').value.trim().slice(0, 50);
    const wantsNotify = NOTIFIABLE_STATUS_TYPES.has(selectedTodayStatusType)
      && document.getElementById('todayStatusNotifyCheck').checked;

    try{
      await db.collection('todayStatuses').doc(identity).set({
        owner: identity,
        type: selectedTodayStatusType,
        emoji: def.emoji,
        label: def.label,
        memo,
        updatedAt: Date.now(),
        // 매번 true/false로만 두면, 나중에 메모만 고쳐도 "새 알림 요청"인지 구분이 안 돼서
        // 알림이 중복되거나 반대로 안 갈 수 있음 -> 요청할 때마다 고유한 값을 새로 넣음
        notifyRequestId: wantsNotify ? `${Date.now()}_${Math.random().toString(36).slice(2, 8)}` : null
      });
      // 저장에 성공한 뒤에만 닫음 - 실패했는데 먼저 닫아버리면 사용자가
      // 방금 고른 상태/메모를 다시 입력해야 하는 불편함이 생김
      document.getElementById('todayStatusModal').classList.add('hidden');
    }catch(e){
      console.error('오늘의 상태 저장 실패', e);
      // 창을 그대로 유지하므로 상태와 메모를 다시 입력하지 않아도 됨
      alert('상태를 저장하지 못했어. 인터넷 연결을 확인하고 다시 시도해줘.');
    }finally{
      saveBtn.disabled = false;
    }
  });

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
      const moment = findTodayMoment();
      const authorClass = a => a === '소정' ? 'author-sojeong' : 'author-seonho';
      if(moment){
        feedCard.innerHTML = `
          <div class="home-next-label">✨ 오늘의 우리</div>
          <div class="home-feed-item" data-tab-target="stamp" data-item-target="${moment.id}">
            <span class="home-feed-author ${authorClass(moment.author)}">${escapeHTML(moment.author || '')}</span>
            <span class="home-feed-text">${escapeHTML(stampPreviewText(moment))}</span>
            <span class="home-feed-time">${relativeTimeKR(moment.createdAt)}</span>
          </div>
        `;
      } else {
        feedCard.innerHTML = `
          <div class="home-next-label">✨ 오늘의 우리</div>
          <div class="home-feed-item" data-tab-target="stamp" data-item-target="">
            <span class="home-feed-text">오늘의 순간을 가볍게 남겨볼까?</span>
          </div>
        `;
      }
      feedCard.querySelectorAll('.home-feed-item').forEach(el=>{
        el.addEventListener('click', ()=>{
          const itemId = el.dataset.itemTarget;
          if(itemId) navigateToItem(el.dataset.tabTarget, itemId);
          else activateTab(el.dataset.tabTarget);
        });
      });
    }

    renderDailyMemoryCard();
  }

  function getCurrentActiveTab(){
    const activePanel = document.querySelector('.tab-panel.active');
    return activePanel ? activePanel.id.replace('panel-','') : null;
  }

  // ---- 하단 4개 메뉴(우리/약속/추억/편지)와 내부 탭 매핑 ----
  // 내부 탭 이름(schedule/wish/datelog/stamp/letter)과 panel-* ID는 그대로 유지해야
  // 기존 알림·검색·해시 딥링크가 계속 작동함 - 여기서는 "어느 그룹 버튼을 눌렀을 때 보여줄지"만 관리
  const TAB_TO_SECTION = {
    home: 'home', schedule: 'promise', wish: 'promise',
    datelog: 'memory', stamp: 'memory', letter: 'letter'
  };
  // 그룹 버튼을 눌렀을 때 마지막으로 보던 내부 탭으로 복귀하기 위한 기억
  const lastTabBySection = { home: 'home', promise: 'schedule', memory: 'datelog', letter: 'letter' };

  function sectionForTab(tabName){
    return TAB_TO_SECTION[tabName] || tabName;
  }

  function syncSectionNavigation(tabName){
    const section = sectionForTab(tabName);
    const promiseSubtabs = document.getElementById('promiseSubtabs');
    const memorySubtabs = document.getElementById('memorySubtabs');
    if(promiseSubtabs) promiseSubtabs.classList.toggle('hidden', section !== 'promise');
    if(memorySubtabs) memorySubtabs.classList.toggle('hidden', section !== 'memory');
    document.querySelectorAll('[data-inner-tab]').forEach(button=>{
      button.classList.toggle('active', button.dataset.innerTab === tabName);
    });
    document.querySelectorAll('.tab-btn').forEach(button=>{
      button.classList.toggle('active', button.dataset.section === section);
    });
  }

  function openMainSection(section){
    const targetTab = lastTabBySection[section]
      || { home:'home', promise:'schedule', memory:'datelog', letter:'letter' }[section];
    if(targetTab) activateTab(targetTab);
  }

  function hasUnsavedDraft(tabName){
    switch(tabName){
      case 'schedule': return document.getElementById('schedTitle').value.trim() !== ''
        || document.getElementById('schedLocation').value.trim() !== ''
        || document.getElementById('schedMemo').value.trim() !== '';
      case 'wish': return document.getElementById('wishTitle').value.trim() !== '' || document.getElementById('wishBody').value.trim() !== '';
      case 'datelog': return document.getElementById('dateLogTitle').value.trim() !== ''
        || document.getElementById('dateLogLocation').value.trim() !== ''
        || document.getElementById('dateLogMemo').value.trim() !== ''
        || pendingDateLogPhotos.length > 0
        || document.getElementById('dateLogQuickBody').value.trim() !== ''
        || selectedQuickDateLogMood !== ''
        || pendingQuickDateLogPhotos.length > 0;
      case 'letter': return document.getElementById('letterBody').value.trim() !== '';
      case 'stamp': return selectedMomentType !== null
        || document.getElementById('stampText').value.trim() !== ''
        || pendingStampPhotos.length > 0;
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
    // 아무것도 안 쓴 채로(hasUnsavedDraft는 false) 데이트 기록 작성 잠금만 쥐고 있는 상태로
    // 다른 탭으로 나가면, 확인창을 안 거치니 위 분기를 안 타서 잠금이 안 풀릴 수 있음 -> 별도 처리
    if(currentTab === 'datelog' && currentTab !== tabName && activeDateLogLockScheduleId){
      resetDatelogForm();
    }
    // 오래된 추억을 열어서 임시로 목록에 넣어둔 채로 그 탭을 떠나면, 다음에 다른 추억을
    // 또 열었을 때 예전 임시 기록이 계속 쌓일 수 있어서 탭을 벗어나는 시점에 정리함
    if(openedMemoryDoc && currentTab && currentTab !== tabName){
      const openedTab = openedMemoryDoc.type === 'datelog' ? 'datelog' : 'letter';
      if(currentTab === openedTab) clearOpenedMemory();
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

    const section = sectionForTab(tabName);
    // 약속/추억 그룹 안에서는 "마지막으로 보던 내부 탭"을 기억해둬서, 그룹 버튼을
    // 다시 눌렀을 때 항상 같은 서브탭(예: schedule)이 아니라 방금 보던 탭으로 복귀함
    if(section === 'promise' || section === 'memory') lastTabBySection[section] = tabName;
    syncSectionNavigation(tabName);

    window.scrollTo(0, 0);
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
    btn.addEventListener('click', ()=> openMainSection(btn.dataset.section));
  });
  document.querySelectorAll('[data-inner-tab]').forEach(btn=>{
    btn.addEventListener('click', ()=> activateTab(btn.dataset.innerTab));
  });
  document.getElementById('homeThrowbackCard').addEventListener('click', (e)=>{
    if(e.target.closest('[data-comment-daily-memory]')){
      openDailyMemory(true);
      return;
    }
    if(e.target.closest('[data-open-daily-memory]')){
      openDailyMemory(false);
    }
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

    // 서버 통신(기기 토큰 삭제)을 기다리는 동안 4초 대기가 끝나서 신호가 전송되는 것을 방지
    cancelPendingSignal();

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
    stamps.forEach(it => { if((it.author||it.person) === identity) items.push({ type:'post', tab:'stamp', label:'우리의 순간', ts: it.createdAt||0, title: stampPreviewText(it), sub:'', itemId: it.id }); });
    letters.forEach(it => { if(it.author === identity) items.push({ type:'post', tab:'letter', label:'편지', ts: it.createdAt||0, title: it.title, sub:'', itemId: it.id }); });

    // 다른 사람 글에 단 것까지 포함해서, 내가 쓴 댓글/답글 전부 모으기
    const commentSources = [
      { list: dateLogs, tab:'datelog', label:'데이트기록' },
      { list: stamps, tab:'stamp', label:'우리의 순간' },
      { list: letters, tab:'letter', label:'편지' }
    ];
    commentSources.forEach(({list, tab, label}) => {
      list.forEach(it => {
        (it.comments||[]).forEach(c => {
          if(c.author === identity && !c.deleted){
            const postPreview = tab === 'stamp' ? stampPreviewText(it) : (it.title || it.text || '');
            items.push({
              type:'comment', tab, label: c.parentTs ? '답글' : '댓글',
              ts: c.ts, title: `${label} · ${escapeHTML(postPreview.slice(0,20))}`,
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
  // 현재 일정 입력창과 연결된 위시 (일정 문서에 sourceWishId로 저장됨 - 위시 쪽엔 아무것도 안 남김.
  // 이렇게 단방향으로 연결해야 일정을 지워도 위시에 낡은 연결 정보가 안 남음)
  let scheduleSourceWish = null;

  function findScheduleForWish(wishId){
    return schedule.filter(item => item.sourceWishId === wishId)
      .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))[0] || null;
  }
  function setScheduleSourceWish(wish){
    scheduleSourceWish = wish ? { id: wish.id, title: wish.title || '하고 싶은 일' } : null;
    const row = document.getElementById('schedSourceWishRow');
    const title = document.getElementById('schedSourceWishTitle');
    row.classList.toggle('hidden', !scheduleSourceWish);
    title.textContent = scheduleSourceWish ? scheduleSourceWish.title : '';
  }
  document.getElementById('schedSourceWishClearBtn').addEventListener('click', ()=>{
    setScheduleSourceWish(null);
  });
  function startScheduleFromWish(wish){
    if(!wish) return;
    // 이미 이 위시로 만든 일정이 있으면 새로 만들지 않고 기존 일정으로 이동
    const linkedSchedule = findScheduleForWish(wish.id);
    if(linkedSchedule){
      if(isPast(linkedSchedule)) showPastSchedule = true;
      navigateToItem('schedule', linkedSchedule.id);
      return;
    }
    if(!activateTab('schedule')) return;
    resetScheduleForm();
    setScheduleSourceWish(wish);
    document.getElementById('schedTitle').value = wish.title || '';
    document.getElementById('schedMemo').value = wish.body || '';
    setDatePlanToggle(true); // 위시에서 만든 일정은 데이트 일정으로 자동 설정
    document.getElementById('schedAddBtn').closest('.add-card').scrollIntoView({behavior:'smooth', block:'start'});
  }
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
    document.getElementById('schedLocation').value = item.location || '';
    document.getElementById('schedMemo').value = item.memo || '';
    setDatePlanToggle(!!item.isDate);
    setScheduleSourceWish(item.sourceWishId
      ? { id: item.sourceWishId, title: (wishes.find(w => w.id === item.sourceWishId) || {}).title || item.sourceWishTitle || '하고 싶은 일' }
      : null);
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
    setScheduleSourceWish(null);
    document.getElementById('schedTitle').value='';
    document.getElementById('schedLocation').value='';
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
    const location = document.getElementById('schedLocation').value.trim();
    const memo = document.getElementById('schedMemo').value.trim();
    const time = document.getElementById('schedTime').value || null;
    let endDate = document.getElementById('schedEndDate').value || null;
    if(endDate && endDate < date) endDate = date;
    const endTime = endDate ? (document.getElementById('schedEndTime').value || null) : null;
    const isDate = schedIsDatePlan;
    const scheduleData = {
      date, endDate, time, endTime, title, location, memo, isDate,
      sourceWishId: scheduleSourceWish ? scheduleSourceWish.id : null,
      sourceWishTitle: scheduleSourceWish ? scheduleSourceWish.title : null
    };
    try{
      if(editingScheduleId){
        await db.collection('schedule').doc(editingScheduleId).update(scheduleData);
      } else {
        await db.collection('schedule').doc(genId()).set({ ...scheduleData, author: identity, createdAt: Date.now() });
      }
      resetScheduleForm();
    }catch(e){ console.error('일정 저장 실패', e); alert('저장에 실패했어. 인터넷 연결을 확인해줘.'); }
  });
  function handleScheduleClick(e){
    const editBtn = e.target.closest('[data-edit-schedule]');
    const delBtn = e.target.closest('[data-del-schedule]');
    const sourceWishBtn = e.target.closest('[data-open-source-wish]');
    const memoryBtn = e.target.closest('[data-schedule-memory]');
    const editId = editBtn && editBtn.dataset.editSchedule;
    const delId = delBtn && delBtn.dataset.delSchedule;
    if(memoryBtn){
      // 문구(추억 남기기 / 추억을 남겼어)와 무관하게 항상 같은 함수: 기록 없으면 작성 시작, 있으면 기존 기록으로 이동
      startDateLogFromSchedule(schedule.find(item => item.id === memoryBtn.dataset.scheduleMemory));
    } else if(sourceWishBtn){
      navigateToItem('wish', sourceWishBtn.dataset.openSourceWish);
    } else if(editId){
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

      // 완료된 위시를 수정할 때, 항상 done:false를 보내면 수정할 때마다
      // 완료 상태가 풀려버려서 기존 값을 유지해야 함
      const existingWish = editingWishId ? wishes.find(item => item.id === editingWishId) : null;

      await saveItem(
        'wishlist',
        !!editingWishId,
        editingWishId,
        { 
          title, 
          body: document.getElementById('wishBody').value.trim(), 
          link: document.getElementById('wishLink').value.trim(), 
          done: existingWish ? !!existingWish.done : false
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
    const planBtn = e.target.closest('[data-plan-wish]');
    const viewScheduleBtn = e.target.closest('[data-view-wish-schedule]');
    const editId = editBtn && editBtn.dataset.editWish;
    const delId = delBtn && delBtn.dataset.delWish;
    const checkId = checkBtn && checkBtn.dataset.checkWish;

    if(planBtn){
      startScheduleFromWish(wishes.find(item => item.id === planBtn.dataset.planWish));
      return;
    }
    if(viewScheduleBtn){
      const scheduleId = viewScheduleBtn.dataset.viewWishSchedule;
      const linkedSchedule = schedule.find(item => item.id === scheduleId);
      if(linkedSchedule && isPast(linkedSchedule)) showPastSchedule = true;
      navigateToItem('schedule', scheduleId);
      return;
    }
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
  let dateLogEntryMode = null; // 'quick' | 'detail' | null(아직 선택 안 함)
  let selectedQuickDateLogMood = '';
  let pendingQuickDateLogPhotos = [];

  // 수정 중에는 "빠르게/정성껏" 모드 버튼을 잠가서, 다른 방식으로 잘못 전환해
  // 빈 입력창이 열리거나 내용이 덮어써지는 것을 방지함 (전환은 명시적인 "정성껏 기록으로 바꾸기" 버튼으로만)
  function lockDateLogModeButtons(locked){
    document.querySelectorAll('[data-datelog-mode]').forEach(btn=>{ btn.disabled = locked; });
  }

  function setDateLogEntryMode(mode){
    dateLogEntryMode = mode;
    if(mode === 'quick'){
      const quickDate = document.getElementById('dateLogQuickDate');
      if(!quickDate.value) quickDate.value = localDateStr();
    }
    document.getElementById('dateLogQuickForm').classList.toggle('hidden', mode !== 'quick');
    document.getElementById('dateLogDetailForm').classList.toggle('hidden', mode !== 'detail');
    document.querySelectorAll('[data-datelog-mode]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.datelogMode === mode);
    });
  }
  document.querySelectorAll('[data-datelog-mode]').forEach(btn=>{
    btn.addEventListener('click', ()=> setDateLogEntryMode(btn.dataset.datelogMode));
  });
  document.querySelectorAll('[data-quick-mood]').forEach(btn=>{
    btn.addEventListener('click', ()=>{
      selectedQuickDateLogMood = btn.dataset.quickMood;
      document.querySelectorAll('[data-quick-mood]').forEach(moodBtn=>{
        moodBtn.classList.toggle('active', moodBtn === btn);
      });
    });
  });
  // 빠른 기록 사진은 여러 장을 누적하는 기존 setupPhotoPicker 대신, 최대 1장만 허용하는 별도 로직 사용
  document.getElementById('dateLogQuickPhotoBtn').addEventListener('click', ()=>{
    document.getElementById('dateLogQuickPhotoInput').click();
  });
  document.getElementById('dateLogQuickPhotoInput').addEventListener('change', async (e)=>{
    const file = e.target.files && e.target.files[0];
    e.target.value = '';
    if(!file) return;
    showLoadingOverlay('사진 처리 중이야...');
    try{
      const resized = await resizeImage(file);
      revokePendingPhotoUrls(pendingQuickDateLogPhotos);
      pendingQuickDateLogPhotos = [resized];
      renderPhotoPreviewGrid('dateLogQuickPhotoPreview', ()=>pendingQuickDateLogPhotos, (v)=>{ pendingQuickDateLogPhotos = v; });
    }catch(err){ console.error('사진 처리 실패', err); }
    finally{ hideLoadingOverlay(); }
  });
  // 현재 데이트 기록 입력창과 연결된 일정 (4단계의 위시-일정 연결과 같은 단방향 방식:
  // 데이트 기록 문서에 sourceScheduleId를 저장하고, 일정 쪽엔 아무것도 안 남김)
  let dateLogSourceSchedule = null;

  function findDateLogForSchedule(scheduleId){
    return dateLogs.find(item => item.sourceScheduleId === scheduleId) || null;
  }
  function setDateLogSourceSchedule(item){
    dateLogSourceSchedule = item
      ? {
          id: item.id, title: item.title || '데이트 일정', sourceWishId: item.sourceWishId || null,
          date: item.date || '', time: item.time || '', endDate: item.endDate || '', endTime: item.endTime || '',
          location: item.location || ''
        }
      : null;
    const row = document.getElementById('dateLogSourceScheduleRow');
    const title = document.getElementById('dateLogSourceScheduleTitle');
    row.classList.toggle('hidden', !dateLogSourceSchedule);
    title.textContent = dateLogSourceSchedule ? dateLogSourceSchedule.title : '';
  }

  // 로컬에 불러온 최근 100개만 검사하면 아주 오래된 기록을 놓칠 수 있어서,
  // 버튼을 누른 시점에 Firestore에서도 한 번 더 확인함 (단일 필드 검색이라 복합 색인 불필요)
  async function getDateLogForSchedule(scheduleId){
    const localItem = findDateLogForSchedule(scheduleId);
    if(localItem) return localItem;
    // 캐시에 없다는 이유로 기록이 없다고 단정하지 않고 서버에서 확실하게 확인
    // (여기서 실패를 삼키고 null을 반환하면, 호출부가 "기록 없음"으로 오해해서
    // 실제로는 있는 기록인데 새로 또 작성하는 중복이 생길 수 있음 -> 에러는 그대로 던짐)
    const snap = await db.collection('datelog').where('sourceScheduleId', '==', scheduleId).limit(1).get({ source: 'server' });
    if(snap.empty) return null;
    const doc = snap.docs[0];
    const item = { id: doc.id, ...doc.data() };
    if(!dateLogs.some(log => log.id === item.id)) dateLogs.unshift(item);
    return item;
  }

  // 일정과 연결된 신규 빠른 기록 전용 저장 함수. 작성화면 진입 잠금(1차 방어)이 있지만,
  // 잠금 만료나 네트워크 예외 등으로 혹시 우회되더라도 문서가 두 개 생기지 않도록,
  // 일정ID를 그대로 문서ID로 써서(schedule_{일정ID}) 트랜잭션으로 "존재하면 중단"을 보장함
  // 일정 연결된 신규 데이트 기록 저장 (빠른/정성 기록 공통 사용).
  // 문서ID를 일정ID 기반으로 고정 + 트랜잭션 안에서 "기록 존재 여부"뿐 아니라
  // "지금 이 잠금이 정말 내 것인지"까지 함께 확인해야, 잠금이 만료된 사이에
  // 상대가 새로 잠금을 얻어 작성 중인데 내가 뒤늦게 저장해버리는 상황을 막을 수 있음
  async function saveNewDateLogForSchedule(scheduleId, data, pendingPhotos){
    showLoadingOverlay('저장 중이야...');
    let uploadedPhotos = [];
    try{
      uploadedPhotos = await uploadPhotos(pendingPhotos, (pct) => showLoadingOverlay(`저장 중이야... ${pct}%`));
      const recordRef = db.collection('datelog').doc(`schedule_${scheduleId}`);
      const lockRef = db.collection('datelogDraftLocks').doc(scheduleId);
      const deviceId = getOrCreateDeviceId();
      const myToken = activeDateLogLockToken;

      const result = await db.runTransaction(async (t)=>{
        // 모든 읽기를 먼저 수행 (Firestore 트랜잭션 규칙)
        const lockSnap = await t.get(lockRef);
        const recordSnap = await t.get(recordRef);

        const lock = lockSnap.exists ? lockSnap.data() : null;
        const ownsLock = lock && lock.owner === identity && lock.deviceId === deviceId && lock.lockToken === myToken;

        if(recordSnap.exists){
          if(ownsLock) t.delete(lockRef); // 내 잠금이 남아있다면 같이 정리
          return 'exists';
        }
        if(!ownsLock) return 'lost';

        t.set(recordRef, { ...data, photos: uploadedPhotos, author: identity, createdAt: Date.now() });
        t.delete(lockRef); // 기록 생성과 잠금 해제를 한 번에 처리
        return 'created';
      });

      if(result === 'lost'){
        await deletePhotosFromStorage(uploadedPhotos);
        stopDateLogLockHeartbeat();
        activeDateLogLockScheduleId = null;
        activeDateLogLockToken = null;
        alert('작성 잠금을 잃어서 저장하지 않았어.\n쓴 내용은 그대로 두었으니 기존 기록을 확인해줘.');
        return false;
      }
      if(result === 'exists'){
        await deletePhotosFromStorage(uploadedPhotos);
        stopDateLogLockHeartbeat();
        activeDateLogLockScheduleId = null;
        activeDateLogLockToken = null;
        resetDatelogForm();
        alert('그 사이에 이미 추억이 남겨졌어!\n완성된 기록으로 이동할게.');
        navigateToItem('datelog', `schedule_${scheduleId}`);
        return false;
      }
      // 'created' - 잠금은 트랜잭션에서 이미 삭제됨
      stopDateLogLockHeartbeat();
      activeDateLogLockScheduleId = null;
      activeDateLogLockToken = null;
      resetDatelogForm();
      return true;
    }catch(e){
      console.error('일정 연결 기록 저장 실패', e);
      if(uploadedPhotos.length > 0) await deletePhotosFromStorage(uploadedPhotos);
      alert('기록을 저장하지 못했어.\n쓴 내용은 그대로 남겨뒀어.');
      return false;
    }finally{
      hideLoadingOverlay();
    }
  }

  // ---- 데이트 기록 작성 잠금 (같은 일정에 두 사람이 동시에 기록을 남기는 것 방지) ----
  // 1차 방어: 작성 화면 진입 자체를 막음 (상대가 이미 쓰고 있으면 진입 불가)
  // 2차 방어: 저장 시 일정ID 기반 고정 문서ID + 트랜잭션으로, 혹시 잠금을 우회해도 문서가 두 개 생기지 않게 함
  let activeDateLogLockScheduleId = null;
  let activeDateLogLockToken = null; // 같은 사람+같은 기기라도 "이번 작성 시도"인지 정확히 구분하기 위한 고유값
  let dateLogLockHeartbeat = null;
  const DATELOG_LOCK_DURATION_MS = 10 * 60 * 1000; // 10분 - "무조건 10분 뒤 만료"가 아니라, 갱신할 때마다 뒤로 밀리는 만료시간

  async function acquireDateLogDraftLock(scheduleId){
    const lockRef = db.collection('datelogDraftLocks').doc(scheduleId);
    const recordRef = db.collection('datelog').doc(`schedule_${scheduleId}`);
    const deviceId = getOrCreateDeviceId();
    const lockToken = genId();
    const now = Date.now();
    return db.runTransaction(async (t)=>{
      // 이미 완성된 고정ID 기록이 있는지도 함께 확인 (취소 없이 사이에 저장이 끝난 경우 대비)
      const recordSnap = await t.get(recordRef);
      if(recordSnap.exists) return { acquired: false, existingId: recordRef.id };

      const snap = await t.get(lockRef);
      if(snap.exists){
        const lock = snap.data();
        const isExpired = !lock.expiresAt || lock.expiresAt <= now;
        const isMyLock = lock.owner === identity && lock.deviceId === deviceId;
        if(!isExpired && !isMyLock){
          return { acquired: false, owner: lock.owner };
        }
      }
      t.set(lockRef, { owner: identity, deviceId, lockToken, acquiredAt: now, expiresAt: now + DATELOG_LOCK_DURATION_MS });
      return { acquired: true, owner: identity, lockToken };
    });
  }

  // false는 "잠금 문서가 없거나 실제로 내 것이 아닐 때"만 반환함. 네트워크 등 일시적인 오류는
  // 여기서 삼켜서 false로 바꾸면 안 됨 - 그러면 진짜 잠금 상실과 구분이 안 돼서, 호출부가
  // 일시적인 오류일 뿐인데도 "잠금을 잃었다"고 오판해 알림을 띄우거나 작업을 중단할 수 있음
  async function renewDateLogDraftLock(scheduleId){
    const lockRef = db.collection('datelogDraftLocks').doc(scheduleId);
    const deviceId = getOrCreateDeviceId();
    const myToken = activeDateLogLockToken;
    return await db.runTransaction(async (t)=>{
      const snap = await t.get(lockRef);
      if(!snap.exists) return false;
      const lock = snap.data();
      if(lock.owner !== identity || lock.deviceId !== deviceId || lock.lockToken !== myToken) return false;
      t.update(lockRef, { expiresAt: Date.now() + DATELOG_LOCK_DURATION_MS });
      return true;
    });
  }

  // 하트비트 갱신이 "실패"(진짜로 잠금을 잃음)로 확인됐을 때만 호출 - 네트워크 오류로는 호출 안 됨
  async function handleLostDateLogLock(scheduleId){
    if(activeDateLogLockScheduleId !== scheduleId) return;
    stopDateLogLockHeartbeat();
    activeDateLogLockScheduleId = null;
    activeDateLogLockToken = null;
    alert('작성 잠금이 만료됐거나 상대방이 작성을 시작했어.\n쓴 내용은 지우지 않았어.');
  }

  function startDateLogLockHeartbeat(scheduleId){
    stopDateLogLockHeartbeat();
    dateLogLockHeartbeat = setInterval(async ()=>{
      if(activeDateLogLockScheduleId !== scheduleId) return;
      try{
        const renewed = await renewDateLogDraftLock(scheduleId);
        if(!renewed) await handleLostDateLogLock(scheduleId);
      }catch(e){
        // 일시적인 네트워크 오류는 잠금 상실로 단정하지 않고, 다음 갱신 시도에 맡김
        console.warn('잠금 갱신 상태를 확인하지 못했어', e);
      }
    }, 60000);
  }
  function stopDateLogLockHeartbeat(){
    if(dateLogLockHeartbeat){ clearInterval(dateLogLockHeartbeat); dateLogLockHeartbeat = null; }
  }

  async function releaseDateLogDraftLock(){
    stopDateLogLockHeartbeat();
    const scheduleId = activeDateLogLockScheduleId;
    const lockToken = activeDateLogLockToken; // 토큰을 먼저 복사해둠 (아래에서 전역변수를 바로 비우니까)
    activeDateLogLockScheduleId = null;
    activeDateLogLockToken = null;
    if(!scheduleId || !lockToken) return;
    const lockRef = db.collection('datelogDraftLocks').doc(scheduleId);
    const deviceId = getOrCreateDeviceId();
    try{
      // 읽기와 삭제를 트랜잭션으로 묶어야, "확인한 직후 잠금이 만료되고 상대방이
      // 가져간" 그 짧은 틈에 상대방의 새 잠금을 실수로 지워버리는 것을 막을 수 있음.
      // owner+deviceId만으로는 "같은 기기에서 취소 직후 바로 재작성한 경우"를
      // 구분 못 해서, 이 잠금 해제 시도가 정확히 "이번에 내가 받았던 그 잠금"인지까지
      // lockToken으로 확인함 (재시도 중 최신 상태를 다시 읽었을 때도 안전하도록)
      await db.runTransaction(async (t)=>{
        const snap = await t.get(lockRef);
        if(!snap.exists) return;
        const lock = snap.data();
        const isExactLock = lock.owner === identity && lock.deviceId === deviceId && lock.lockToken === lockToken;
        if(isExactLock) t.delete(lockRef);
      });
    }catch(e){ console.warn('데이트 기록 잠금 해제 실패', e); }
  }

  // 화면이 다시 보일 때(잠깐 사진 찍거나 화면을 껐다 켠 경우 등), 잠금이 여전히 내 것인지 즉시 재확인.
  // 브라우저 타이머가 멈춰있던 동안 1분 하트비트가 밀렸을 수 있어서, 복귀 즉시 확인하는 안전장치
  async function recheckDateLogLockOnResume(){
    if(!activeDateLogLockScheduleId) return;
    const scheduleId = activeDateLogLockScheduleId;
    try{
      const renewed = await renewDateLogDraftLock(scheduleId);
      if(!renewed) await handleLostDateLogLock(scheduleId);
    }catch(e){
      // 일시적인 네트워크 오류는 잠금 상실로 단정하지 않음
      console.warn('잠금 재확인 중 오류', e);
    }
  }

  async function startDateLogFromSchedule(item){
    if(!item) return;
    // 이미 기록했다면 새로 만들지 않고 기존 기록으로 이동
    let existingLog;
    try{
      existingLog = await getDateLogForSchedule(item.id);
    }catch(e){
      console.error('연결된 데이트 기록 확인 실패', e);
      alert('기존 추억이 있는지 확인하지 못했어.\n인터넷 연결을 확인하고 다시 눌러줘.');
      return;
    }
    if(existingLog){
      navigateToItem('datelog', existingLog.id);
      return;
    }
    // 상대방이 이미 이 일정의 추억을 작성 중인지 확인 (동시 작성 방지 1차 방어)
    let lockResult;
    try{
      lockResult = await acquireDateLogDraftLock(item.id);
    }catch(e){
      console.error('작성 잠금 확인 실패', e);
      alert('작성 가능한 상태인지 확인하지 못했어.\n인터넷 연결을 확인하고 다시 눌러줘.');
      return;
    }
    if(lockResult.existingId){
      // 위에서 확인한 이후, 잠금 확인 직전 그 짧은 사이에 상대가 이미 저장을 끝낸 경우
      navigateToItem('datelog', lockResult.existingId);
      return;
    }
    if(!lockResult.acquired){
      alert(`${lockResult.owner}${particleFor(lockResult.owner)} 이 데이트의 추억을 작성 중이야 💛\n완성되면 여기서 바로 볼 수 있어.`);
      return;
    }
    if(!activateTab('datelog')){
      // 작성 중 내용이 있어서 탭 이동 자체가 취소된 경우, 방금 얻은 잠금도 바로 반납
      activeDateLogLockScheduleId = item.id;
      activeDateLogLockToken = lockResult.lockToken;
      await releaseDateLogDraftLock();
      return;
    }
    resetDatelogForm();
    activeDateLogLockScheduleId = item.id;
    activeDateLogLockToken = lockResult.lockToken;
    startDateLogLockHeartbeat(item.id);
    setDateLogEntryMode('quick');
    setDateLogSourceSchedule(item);
    document.getElementById('dateLogQuickDate').value = item.date || localDateStr();
    document.getElementById('dateLogQuickForm').scrollIntoView({behavior:'smooth', block:'start'});
  }

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
    if(item.entryMode === 'quick'){
      startEditQuickDatelog(item);
    } else {
      startEditDetailDatelog(item);
    }
  }
  function startEditQuickDatelog(item){
    editingDatelogId = item.id;
    lockDateLogModeButtons(true);
    setDateLogEntryMode('quick');
    document.getElementById('dateLogQuickDate').value = item.date || '';
    document.getElementById('dateLogQuickBody').value = item.body || item.memo || '';
    selectedQuickDateLogMood = item.mood || '';
    document.querySelectorAll('[data-quick-mood]').forEach(btn=>{
      btn.classList.toggle('active', btn.dataset.quickMood === selectedQuickDateLogMood);
    });
    pendingQuickDateLogPhotos = getItemPhotos(item).slice(0, 1);
    renderPhotoPreviewGrid('dateLogQuickPhotoPreview', ()=>pendingQuickDateLogPhotos, (v)=>{ pendingQuickDateLogPhotos = v; });
    const linkedSchedule = item.sourceScheduleId ? schedule.find(s => s.id === item.sourceScheduleId) : null;
    setDateLogSourceSchedule(item.sourceScheduleId
      ? { id: item.sourceScheduleId, title: (linkedSchedule && linkedSchedule.title) || item.sourceScheduleTitle || '데이트 일정',
          sourceWishId: item.sourceWishId || (linkedSchedule && linkedSchedule.sourceWishId) || null,
          // 일정이 아직 로딩 전이거나 오래돼서 로컬 schedule 배열에 없을 수 있어서,
          // 그 경우엔 빈 값으로 덮어쓰지 않고 이 기록 자체에 이미 저장된 값으로 폴백함
          date: (linkedSchedule && linkedSchedule.date) || item.date || '', time: (linkedSchedule && linkedSchedule.time) || item.time || '',
          endDate: (linkedSchedule && linkedSchedule.endDate) || item.endDate || '', endTime: (linkedSchedule && linkedSchedule.endTime) || item.endTime || '',
          location: (linkedSchedule && linkedSchedule.location) || item.location || '' }
      : null);
    document.getElementById('dateLogQuickSaveBtn').textContent = '수정 완료';
    document.getElementById('dateLogQuickCancelBtn').classList.remove('hidden');
    document.getElementById('dateLogQuickForm').scrollIntoView({behavior:'smooth', block:'start'});
  }
  function startEditDetailDatelog(item){
    editingDatelogId = item.id;
    lockDateLogModeButtons(true);
    setDateLogEntryMode('detail');
    document.getElementById('dateLogDate').value = item.date;
    document.getElementById('dateLogTime').value = item.time || '';
    document.getElementById('dateLogTitle').value = item.title;
    document.getElementById('dateLogLocation').value = item.location || '';
    document.getElementById('dateLogLocationResults').classList.add('hidden');
    const linkedSchedule = item.sourceScheduleId ? schedule.find(s => s.id === item.sourceScheduleId) : null;
    setDateLogSourceSchedule(item.sourceScheduleId
      ? { id: item.sourceScheduleId, title: (linkedSchedule && linkedSchedule.title) || item.sourceScheduleTitle || '데이트 일정',
          sourceWishId: item.sourceWishId || (linkedSchedule && linkedSchedule.sourceWishId) || null,
          date: (linkedSchedule && linkedSchedule.date) || item.date || '', time: (linkedSchedule && linkedSchedule.time) || item.time || '',
          endDate: (linkedSchedule && linkedSchedule.endDate) || item.endDate || '', endTime: (linkedSchedule && linkedSchedule.endTime) || item.endTime || '',
          location: (linkedSchedule && linkedSchedule.location) || item.location || '' }
      : null);
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
    // 저장 성공/취소/탭 전환 등 폼이 초기화되는 모든 경우에 잠금도 같이 반납함.
    // UI 초기화 자체를 기다리게 하면 안 되므로 await 없이 백그라운드로 처리(실패해도 최악의 경우
    // 10분 뒤 자동 만료되니 크게 문제 없음)
    releaseDateLogDraftLock();
    editingDatelogId = null;
    lockDateLogModeButtons(false);
    setDateLogSourceSchedule(null);
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

    // 빠른 기록 쪽 상태/입력도 같이 초기화
    selectedQuickDateLogMood = '';
    revokePendingPhotoUrls(pendingQuickDateLogPhotos);
    pendingQuickDateLogPhotos = [];
    document.getElementById('dateLogQuickDate').value = '';
    document.getElementById('dateLogQuickBody').value = '';
    document.getElementById('dateLogQuickSaveBtn').textContent = '추억 남기기';
    document.getElementById('dateLogQuickCancelBtn').classList.add('hidden');
    renderPhotoPreviewGrid('dateLogQuickPhotoPreview', ()=>pendingQuickDateLogPhotos, (v)=>{ pendingQuickDateLogPhotos = v; });
    document.querySelectorAll('[data-quick-mood]').forEach(btn => btn.classList.remove('active'));
    setDateLogEntryMode(null); // 다시 "빠르게/정성껏" 선택 화면으로 돌아감
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
    const detailData = {
      title, 
      date,
      memo: document.getElementById('dateLogMemo').value.trim(),
      location: location,
      time: document.getElementById('dateLogTime').value || null,
      endDate: document.getElementById('dateLogEndDate').value || null,
      endTime: document.getElementById('dateLogEndTime').value || null,
      lat: geo ? geo.lat : null,
      lng: geo ? geo.lng : null,
      sourceScheduleId: dateLogSourceSchedule ? dateLogSourceSchedule.id : null,
      sourceScheduleTitle: dateLogSourceSchedule ? dateLogSourceSchedule.title : null,
      sourceWishId: dateLogSourceSchedule ? dateLogSourceSchedule.sourceWishId : null,
      entryMode: 'detail'
    };
    // 빠른 기록에서 정성 기록으로 바꾸는 경우에만 예전 mood/body 필드를 정리함.
    // 신규 작성(set())에는 delete()가 포함되면 Firestore가 오류를 내므로, 수정(update()) 중일 때만 넣음
    if(editingDatelogId){
      detailData.mood = firebase.firestore.FieldValue.delete();
      detailData.body = firebase.firestore.FieldValue.delete();
    }
    if(!editingDatelogId && dateLogSourceSchedule){
      // 신규 작성 + 일정 연결 -> 빠른 기록과 동일하게 고정 문서ID + 트랜잭션으로 저장해야
      // 두 사람이 거의 동시에 "정성껏 기록하기"로 작성해도 중복 문서가 안 생김
      await saveNewDateLogForSchedule(dateLogSourceSchedule.id, detailData, pendingDateLogPhotos);
    } else {
      await saveItem('datelog', !!editingDatelogId, editingDatelogId, detailData, pendingDateLogPhotos, resetDatelogForm);
    }
  });

  // ---- 빠른 기록 저장 ----
  document.getElementById('dateLogQuickSaveBtn').addEventListener('click', async ()=>{
    const date = document.getElementById('dateLogQuickDate').value;
    const body = document.getElementById('dateLogQuickBody').value.trim();
    if(!date){ alert('날짜를 골라줘!'); return; }
    if(!selectedQuickDateLogMood){ alert('오늘의 기분을 골라줘!'); return; }
    if(!body){ alert('오늘을 한 줄로 남겨줘!'); return; }

    // title/memo에도 한 줄 내용을 같이 넣어둠 - 검색·알림·나의 활동 등 기존 기능이
    // 전부 title/memo 필드를 기준으로 동작하므로, 새 필드(mood/body)만 쓰면 그 기능들과 안 맞음
    const compatibleTitle = (dateLogSourceSchedule && dateLogSourceSchedule.title) || body.slice(0, 30) || '빠른 데이트 기록';
    const data = {
      entryMode: 'quick',
      date,
      mood: selectedQuickDateLogMood,
      body,
      title: compatibleTitle,
      memo: body,
      location: (dateLogSourceSchedule && dateLogSourceSchedule.location) || '',
      time: (dateLogSourceSchedule && dateLogSourceSchedule.time) || null,
      endDate: (dateLogSourceSchedule && dateLogSourceSchedule.endDate) || null,
      endTime: (dateLogSourceSchedule && dateLogSourceSchedule.endTime) || null,
      sourceScheduleId: dateLogSourceSchedule ? dateLogSourceSchedule.id : null,
      sourceScheduleTitle: dateLogSourceSchedule ? dateLogSourceSchedule.title : null,
      sourceWishId: dateLogSourceSchedule ? dateLogSourceSchedule.sourceWishId : null
    };

    if(!editingDatelogId && dateLogSourceSchedule){
      // 신규 작성 + 일정 연결 -> 잠금을 우회한 극히 드문 동시저장까지 막기 위해
      // 일정ID 기반 고정 문서ID + 트랜잭션으로 저장 (최종 방어선)
      await saveNewDateLogForSchedule(dateLogSourceSchedule.id, data, pendingQuickDateLogPhotos);
    } else {
      try{
        await saveItem('datelog', !!editingDatelogId, editingDatelogId, data, pendingQuickDateLogPhotos, resetDatelogForm);
      }catch(e){
        console.error('빠른 기록 저장 실패', e);
        alert('기록을 저장하지 못했어. 다시 시도해줘!');
      }
    }
  });
  document.getElementById('dateLogQuickCancelBtn').addEventListener('click', resetDatelogForm);


// 2. 클릭 이벤트 (수정/삭제)
  document.getElementById('dateLogList').addEventListener('click', (e) => {
    const editBtn = e.target.closest('[data-edit-datelog]');
    const delBtn = e.target.closest('[data-del-datelog]');
    const sourceScheduleBtn = e.target.closest('[data-open-source-schedule]');
    const sourceWishBtn = e.target.closest('[data-open-source-wish]');
    const convertBtn = e.target.closest('[data-convert-quick-datelog]');
    const editId = editBtn && editBtn.dataset.editDatelog;
    const delId = delBtn && delBtn.dataset.delDatelog;

    if(convertBtn){
      // 새 문서를 만들지 않고 같은 문서를 detail 모드로 편집 시작 -> 좋아요/댓글/일정연결이 그대로 보존됨
      const item = dateLogs.find(log => log.id === convertBtn.dataset.convertQuickDatelog);
      if(item) startEditDetailDatelog(item);
    } else if(sourceScheduleBtn){
      navigateToItem('schedule', sourceScheduleBtn.dataset.openSourceSchedule);
    } else if(sourceWishBtn){
      navigateToItem('wish', sourceWishBtn.dataset.openSourceWish);
    } else if (editId) startEditDatelog(dateLogs.find(s => s.id === editId));
    else if (delId) deleteItem('datelog', delId, dateLogs.find(s => s.id === delId));
  });

  // ---- 스탬프 ----
  let editingStampId = null;
  setupPhotoPicker('stampPhotoInput','stampPhotoBtn','stampPhotoPreviewWrap', ()=>pendingStampPhotos, (v)=>{ pendingStampPhotos = v; });
  document.getElementById('momentTypeOptions').addEventListener('click', (e)=>{
    const btn = e.target.closest('[data-moment-type]');
    if(!btn) return;
    selectedMomentType = btn.dataset.momentType;
    document.querySelectorAll('[data-moment-type]').forEach(el=>{
      el.classList.toggle('active', el.dataset.momentType === selectedMomentType);
    });
  });

  function startEditStamp(item){
    editingStampId = item.id;
    // 예전 스탬프(momentType 없음)를 수정하는 경우는 종류 선택이 없으므로 selectedMomentType은 그대로 null
    selectedMomentType = item.momentType || null;
    document.querySelectorAll('[data-moment-type]').forEach(el=>{
      el.classList.toggle('active', el.dataset.momentType === selectedMomentType);
    });
    document.getElementById('stampText').value = item.text || '';
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
    selectedMomentType = null;
    document.querySelectorAll('[data-moment-type]').forEach(btn => btn.classList.remove('active'));
    document.getElementById('stampText').value = '';
    if(document.getElementById('stampText')._autoGrowResize) document.getElementById('stampText')._autoGrowResize();
    revokePendingPhotoUrls(pendingStampPhotos);
    pendingStampPhotos = [];
    renderPhotoPreviewGrid('stampPhotoPreviewWrap', ()=>pendingStampPhotos, (v)=>{ pendingStampPhotos = v; });
    renderStamp();
    document.getElementById('stampAddBtn').textContent = '우리의 순간 남기기';
    document.getElementById('stampCancelBtn').classList.add('hidden');
    clearDraftAutosave(STORAGE_PREFIX + 'draft_stamp');
  }
  document.getElementById('stampCancelBtn').addEventListener('click', resetStampForm);
    
 // 버튼 이벤트는 함수 바깥에 딱 한 번만 정의해!
  document.getElementById('stampAddBtn').addEventListener('click', async () => {
    const text = document.getElementById('stampText').value.trim();
    const def = MOMENT_DEFS[selectedMomentType];
    // 새로 작성할 때만 종류 선택이 필수 (예전 스탬프를 수정하는 경우는 애초에 종류 개념이 없었으니 요구 안 함)
    if(!editingStampId && !def){
      alert('오늘의 순간을 하나 골라줘!');
      return;
    }
    const data = { text };
    if(def){
      data.momentType = selectedMomentType;
      data.momentEmoji = def.emoji;
      data.momentLabel = def.label;
    }
    await saveItem('stamps', !!editingStampId, editingStampId, data, pendingStampPhotos, resetStampForm);
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
      const initialRegistration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
      // navigator.serviceWorker.ready는 활성화가 어떤 이유로든 안 끝나면 영원히 안 풀릴 수 있어서
      // (실제로 "알림 설정 중..." 화면이 끝없이 떠있던 원인으로 추정됨), 6초 넘게 걸리면
      // 그냥 register()가 준 registration으로라도 진행하도록 타임아웃을 둠
      const registration = await Promise.race([
        navigator.serviceWorker.ready,
        new Promise(resolve => setTimeout(() => resolve(initialRegistration), 6000))
      ]);
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
      // 혹시 어딘가에서 예상 못하게 멈추더라도, 로딩 화면 자체가 무한정 안 사라지는
      // 일은 없도록 최대 대기시간(10초)을 둠
      await Promise.race([
        setupPushNotifications(),
        new Promise(resolve => setTimeout(resolve, 10000))
      ]);
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
    watchLoveSignals();
    watchTodayStatuses();
    watchDailyQuestion();
    loadDailyMemory();

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
    // 작성 중이던 데이트 기록 잠금이 있으면 로그아웃 시 같이 반납함
    releaseDateLogDraftLock();

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

    // 취소 버튼·로그아웃·인증 변경이 모두 같은 정리 함수를 사용
    cancelPendingSignal();

    loveSignals = [];

    // 같은 브라우저에서 다른 계정으로 로그인했을 때
    // 이전 사용자의 60초 제한이 이어지지 않도록 초기화
    Object.keys(localSignalSentAt).forEach(type => {
      delete localSignalSentAt[type];
    });

    const historyOverlay = document.getElementById('loveSignalHistoryOverlay');
    if(historyOverlay){
      historyOverlay.classList.add('hidden');
    }

    // 오늘의 상태: 구독 데이터와 선택 상태, 1분 재렌더 타이머까지 정리
    todayStatuses = {};
    selectedTodayStatusType = null;
    if(todayStatusAgeTimer){
      clearInterval(todayStatusAgeTimer);
      todayStatusAgeTimer = null;
    }
    const statusModal = document.getElementById('todayStatusModal');
    if(statusModal){
      statusModal.classList.add('hidden');
    }

    stopDailyQuestionWatch();

    // 오늘의 추억 관련 상태도 정리 (다음 계정으로 로그인했을 때 이전 계정 것이 안 남도록)
    dailyMemoryPick = null;
    dailyMemoryLoadKey = null;
    clearOpenedMemory(false); // 배열은 이 함수 위쪽에서 이미 통째로 비웠으니 구독 해제만 하면 됨
    recentDateLogIds.clear();
    recentLetterIds.clear();
  }

  // ---- 오늘의 질문 ----
  let todayQuestionData = null;
  let dailyQuestionWatchedDate = null;
  let dailyQuestionUnsubscribe = null;
  let dailyQuestionRolloverTimer = null;
  let dailyQuestionEditMode = false;
  let dailyQuestionDraft = '';

  // 소정과 선호가 거의 동시에 앱을 열어도 질문 문서가 하나만 생기도록 트랜잭션으로 생성
  async function ensureDailyQuestion(dateStr){
    const ref = db.collection('dailyQuestions').doc(dateStr);
    try{
      await db.runTransaction(async (t)=>{
        const snap = await t.get(ref);
        if(snap.exists) return;
        const questionId = dailyQuestionIndexForDate(dateStr);
        t.set(ref, {
          questionId,
          question: DAILY_QUESTIONS[questionId],
          answers: {},
          createdAt: Date.now()
        });
      });
    }catch(e){ console.error('오늘의 질문 준비 실패', e); }
  }

  async function watchDailyQuestion(){
    if(!identity) return;
    const dateStr = localDateStr();
    if(dailyQuestionWatchedDate === dateStr) return; // 이미 오늘 날짜를 구독 중이면 아무것도 안 함

    if(dailyQuestionUnsubscribe){
      dailyQuestionUnsubscribe();
      dailyQuestionUnsubscribe = null;
    }

    dailyQuestionWatchedDate = dateStr;
    todayQuestionData = null;
    dailyQuestionEditMode = false;
    dailyQuestionDraft = '';
    renderDailyQuestionCard();

    await ensureDailyQuestion(dateStr);

    dailyQuestionUnsubscribe = db.collection('dailyQuestions').doc(dateStr).onSnapshot(snap => {
      todayQuestionData = snap.exists ? snap.data() : null;
      renderDailyQuestionCard();
    }, err => console.error('오늘의 질문 구독 실패', err));

    // 화면을 켜둔 채로 자정을 넘기는 경우를 위해 1분마다 날짜가 바뀌었는지 확인
    if(!dailyQuestionRolloverTimer){
      dailyQuestionRolloverTimer = setInterval(() => {
        if(!identity) return;
        watchDailyQuestion();
        loadDailyMemory();
      }, 60000);
    }
  }

  function stopDailyQuestionWatch(){
    if(dailyQuestionUnsubscribe){
      dailyQuestionUnsubscribe();
      dailyQuestionUnsubscribe = null;
    }
    dailyQuestionWatchedDate = null;
    todayQuestionData = null;
    dailyQuestionEditMode = false;
    dailyQuestionDraft = '';
    if(dailyQuestionRolloverTimer){
      clearInterval(dailyQuestionRolloverTimer);
      dailyQuestionRolloverTimer = null;
    }
    const archiveModal = document.getElementById('dailyQuestionArchiveModal');
    if(archiveModal) archiveModal.classList.add('hidden');
  }

  function renderDailyQuestionCard(){
    const body = document.getElementById('dailyQuestionBody');
    if(!body || !identity) return;

    if(!todayQuestionData){
      body.innerHTML = `<div class="home-next-sub">질문을 불러오는 중이야...</div>`;
      return;
    }
    body.innerHTML = renderQuestionBlock(todayQuestionData, dailyQuestionWatchedDate, true);
    wireQuestionBlockEvents(body, dailyQuestionWatchedDate, todayQuestionData);
  }

  // 오늘의 질문 카드와 지난 질문 아카이브 항목이 구조가 같아서 공통 렌더 함수로 뺌
  function renderQuestionBlock(qData, dateStr, isToday){
    const myAnswer = (qData.answers || {})[identity];
    const otherName = otherPerson(identity);
    const otherAnswer = (qData.answers || {})[otherName];
    const editing = isToday && dailyQuestionEditMode;

    let answersHtml;
    if(editing || !myAnswer){
      // 내가 아직 안 답했으면(또는 수정 중이면) 입력창을 보여줌 - 이 시점엔 상대 답도 가려둠.
      // ||로 빈 문자열 폴백하면, 수정 중 글자를 전부 지웠을 때 저장된 예전 답변으로 되돌아가버리는
      // 문제가 있어서, 상황별로 명확하게 분기함
      let draftValue = '';
      if(isToday){
        draftValue = editing ? dailyQuestionDraft : (myAnswer ? (myAnswer.text || '') : dailyQuestionDraft);
      } else {
        draftValue = myAnswer ? (myAnswer.text || '') : '';
      }
      answersHtml = `
        ${otherAnswer
          ? `<div class="daily-question-hidden-answer">${otherName}가 먼저 답했어 · 내 답을 남기면 확인할 수 있어</div>`
          : `<div class="daily-question-hidden-answer">${otherName}는 아직 답하지 않았어</div>`}
        <div class="daily-question-input-row">
          <input type="text" maxlength="100" placeholder="한 줄로 답해줘" value="${escapeHTML(draftValue)}" data-question-input="${dateStr}">
          <button class="btn" data-question-save="${dateStr}">저장</button>
        </div>
      `;
    } else {
      // 나도 답했으면 둘 다 공개
      answersHtml = `
        <div class="daily-question-answer-row">
          <span class="daily-question-name">${identity}</span>
          <span class="daily-question-answer">${escapeHTML(myAnswer.text)}</span>
        </div>
        <div class="daily-question-answer-row">
          <span class="daily-question-name">${otherName}</span>
          <span class="daily-question-answer">${otherAnswer ? escapeHTML(otherAnswer.text) : '아직 답하지 않았어'}</span>
        </div>
        ${isToday ? `<button type="button" class="daily-question-edit-link" data-question-edit="${dateStr}">내 답 수정하기</button>` : ''}
      `;
    }

    return `
      <div class="daily-question-text">${escapeHTML(qData.question)}</div>
      ${answersHtml}
    `;
  }

  function wireQuestionBlockEvents(container, dateStr, qData){
    const input = container.querySelector(`[data-question-input="${dateStr}"]`);
    if(input){
      input.addEventListener('input', ()=>{
        // 입력 도중 상대방 답이 도착해서 구독 콜백이 다시 그리더라도, 이 변수 덕분에
        // 작성 중이던 내용이 사라지지 않음 (오늘 질문일 때만 - 아카이브는 열려있는 동안 안 닫히니 상관없음)
        if(dateStr === dailyQuestionWatchedDate) dailyQuestionDraft = input.value;
      });
    }
    const saveBtn = container.querySelector(`[data-question-save="${dateStr}"]`);
    if(saveBtn){
      saveBtn.addEventListener('click', ()=> saveDailyQuestionAnswer(dateStr, input));
    }
    // 과거 질문에는 수정 버튼 자체가 없으므로(위에서 isToday일 때만 렌더링), 여기선 오늘 질문만 해당됨
    const editLink = container.querySelector(`[data-question-edit="${dateStr}"]`);
    if(editLink){
      editLink.addEventListener('click', ()=>{
        dailyQuestionEditMode = true;
        dailyQuestionDraft = ((qData.answers || {})[identity] || {}).text || '';
        renderDailyQuestionCard();
        const newInput = document.querySelector(`[data-question-input="${dateStr}"]`);
        if(newInput) newInput.focus();
      });
    }
  }

  async function saveDailyQuestionAnswer(dateStr, input){
    if(!identity) return;
    const text = (input?.value || '').trim().slice(0, 100);
    if(!text){
      alert('답변을 한 줄 남겨줘!');
      return;
    }
    // 날짜가 바뀐 채로 예전 질문 입력창에 대고 저장하려는 경우 방지
    if(dateStr === dailyQuestionWatchedDate && dailyQuestionWatchedDate !== localDateStr()){
      watchDailyQuestion();
      alert('날짜가 바뀌어서 오늘 질문을 새로 불러왔어. 다시 답해줘!');
      return;
    }

    const saveBtn = input?.parentElement?.querySelector(`[data-question-save="${dateStr}"]`);
    if(saveBtn){
      if(saveBtn.disabled) return;
      saveBtn.disabled = true;
    }

    try{
      // answers 전체를 덮어쓰면 안 됨 - 두 사람이 거의 동시에 답하면 한쪽이 사라질 수 있어서
      // 반드시 내 이름 필드만 콕 집어서 업데이트함
      const field = `answers.${identity}`;
      await db.collection('dailyQuestions').doc(dateStr).update({
        [field]: { text, updatedAt: Date.now() }
      });
      if(dateStr === dailyQuestionWatchedDate){
        dailyQuestionEditMode = false;
        dailyQuestionDraft = '';
        // 구독이 다시 그려줄 가능성이 크지만, 저장 직후 입력창이 확실히 닫히도록 직접 그림
        renderDailyQuestionCard();
      } else {
        // 지난 질문 목록은 실시간 구독이 아니라 창을 열 때 한 번만 불러온 스냅샷이라서,
        // 저장 후 목록만 다시 그리면 저장 전 데이터가 그대로 남아있게 됨 -> 새로 불러와야 함
        await openDailyQuestionArchive();
      }
    }catch(e){
      console.error('오늘의 질문 답변 저장 실패', e);
      alert('답변을 저장하지 못했어. 인터넷 연결을 확인하고 다시 시도해줘.');
    }finally{
      if(saveBtn) saveBtn.disabled = false;
    }
  }

  // ---- 지난 질문 아카이브 ----
  let dailyQuestionArchiveData = [];
  async function openDailyQuestionArchive(targetDate = ''){
    document.getElementById('dailyQuestionArchiveModal').classList.remove('hidden');
    const list = document.getElementById('dailyQuestionArchiveList');
    list.innerHTML = '<div class="empty-state" style="padding:20px 10px;">불러오는 중...</div>';
    try{
      const snap = await db.collection('dailyQuestions')
        .orderBy(firebase.firestore.FieldPath.documentId(), 'desc')
        .get();
      dailyQuestionArchiveData = [];
      snap.forEach(doc => {
        if(doc.id === dailyQuestionWatchedDate) return; // 오늘 질문은 홈 카드에 이미 보이니 제외
        dailyQuestionArchiveData.push({ date: doc.id, ...doc.data() });
      });
      renderDailyQuestionArchiveList(targetDate);
    }catch(e){
      console.error('지난 질문 불러오기 실패', e);
      list.innerHTML = '<div class="empty-state" style="padding:20px 10px;">불러오지 못했어.</div>';
    }
  }
  function renderDailyQuestionArchiveList(targetDate = ''){
    const list = document.getElementById('dailyQuestionArchiveList');
    if(dailyQuestionArchiveData.length === 0){
      list.innerHTML = '<div class="empty-state" style="padding:20px 10px;">아직 지난 질문이 없어.</div>';
      return;
    }
    list.innerHTML = dailyQuestionArchiveData.map(q => `
      <div class="daily-question-archive-item" data-question-date="${q.date}">
        <div class="daily-question-archive-date">${q.date}</div>
        ${renderQuestionBlock(q, q.date, false)}
      </div>
    `).join('');
    dailyQuestionArchiveData.forEach(q => {
      const item = Array.from(list.querySelectorAll('.daily-question-archive-item')).find(el => el.dataset.questionDate === q.date);
      if(item) wireQuestionBlockEvents(item, q.date, q);
    });
    // 알림을 통해 특정 날짜로 들어온 경우, 그 항목으로 자동 스크롤
    if(targetDate){
      setTimeout(() => {
        const target = Array.from(list.querySelectorAll('.daily-question-archive-item')).find(el => el.dataset.questionDate === targetDate);
        if(target) target.scrollIntoView({behavior:'smooth', block:'center'});
      }, 0);
    }
  }
  document.getElementById('dailyQuestionArchiveBtn').addEventListener('click', () => openDailyQuestionArchive());
  document.getElementById('dailyQuestionArchiveCloseBtn').addEventListener('click', ()=>{
    document.getElementById('dailyQuestionArchiveModal').classList.add('hidden');
  });

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
      watch(scheduleQuery, 'schedule', items=>{
        schedule = items;
        renderSchedule();
        renderCalendar();
        renderHome();
        // 위시의 "날짜를 정했어/언젠가 하고 싶어" 상태도 일정 데이터를 기준으로 표시하므로
        // 위시 탭을 이미 열어본 적 있다면(구독 중이면) 같이 다시 그림
        if(collectionWatchersStarted.wish) renderWish();
      });
    } else if(tabName === 'wish'){
      const wishQuery = db.collection('wishlist').orderBy('createdAt', 'desc').limit(100);
      watch(wishQuery, 'wishlist', items=>{
        wishes = items;
        renderWish();
        renderHome();
        // 위시 제목을 수정하면 연결된 일정 카드의 "💫 관련 위시" 표시도 갱신되어야 함
        if(collectionWatchersStarted.schedule) renderSchedule();
      });
    } else if(tabName === 'datelog'){
      const dateLogQuery = db.collection('datelog').orderBy('date', 'desc').limit(100);
      watch(dateLogQuery, 'datelog', items=>{
        // 이 목록에 실제로 있는 ID만 기록해둬야, 나중에 clearOpenedMemory()가
        // "원래 100개 안에 있던 기록"과 "추억 보기 때문에 임시로 넣은 것"을 정확히 구분할 수 있음
        recentDateLogIds = new Set(items.map(item => item.id));
        dateLogs = items;
        // 오래된 추억(최신 100개 밖)을 열어서 별도 구독 중이라면, 이 배열 교체로 사라지지 않게 다시 넣어줌
        if(openedMemoryDoc && openedMemoryDoc.type === 'datelog' && !dateLogs.some(item => item.id === openedMemoryDoc.id)){
          dateLogs.push(openedMemoryDoc.item);
        }
        renderDateLog();
        renderHome();
        // 데이트 기록 생성·삭제 결과를 지난 일정의 "추억 남기기" 버튼에 바로 반영
        if(collectionWatchersStarted.schedule) renderSchedule();
        // 오늘의 추억을 아직 못 골랐다면(첫 로드 시 조회 실패 등) 여기서 재시도
        if(!dailyMemoryPick && dailyMemoryLoadKey === null) loadDailyMemory();

        const mapModal = document.getElementById('dateMapModal');
        if(mapModal && !mapModal.classList.contains('hidden')) openDateMap();
      });
    } else if(tabName === 'stamp'){
      const stampQuery = db.collection('stamps').orderBy('createdAt', 'desc').limit(100);
      watch(stampQuery, 'stamps', items=>{ stamps = items; renderStamp(); renderHome(); });
    } else if(tabName === 'letter'){
      const letterQuery = db.collection('letters').orderBy('createdAt', 'desc').limit(100);
      watch(letterQuery, 'letters', items=>{
        recentLetterIds = new Set(items.map(item => item.id));
        letters = items;
        if(openedMemoryDoc && openedMemoryDoc.type === 'letter' && !letters.some(item => item.id === openedMemoryDoc.id)){
          letters.push(openedMemoryDoc.item);
        }
        renderLetters();
        renderHome();
        if(!dailyMemoryPick && dailyMemoryLoadKey === null) loadDailyMemory();
      });
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
      tab:'stamp', label:'우리의 순간', ts: it.createdAt || 0,
      title: stampPreviewText(it), item: it,
      sub: it.momentType
        ? `${it.momentEmoji || '✨'} ${it.momentLabel || '우리의 순간'}`
        : `${it.person || ''}에게 남긴 예전 스탬프`,
      match: `${it.text||''} ${it.person||''} ${it.momentLabel||''}`.toLowerCase()
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

    // 애정 신호/오늘의 상태 알림은 실제 "게시물"이 아니라 홈 화면의 카드일 뿐이라서,
    // 일반 게시물 탐색 로직(카드를 못 찾으면 삭제됐다고 간주하는 등)을 타면 안 됨
    if(tab === 'home'){
      // 지난 날짜의 질문 알림(다음날 늦게 눌렀을 때 등)은 오늘 카드가 아니라 그날의 아카이브로 이동
      if(itemId === 'dailyQuestion' && commentTs && String(commentTs) !== localDateStr()){
        openDailyQuestionArchive(String(commentTs));
        return true;
      }
      const homeTargetIds = { loveSignal: 'loveSignalCard', todayStatus: 'todayStatusCard', dailyQuestion: 'dailyQuestionCard' };
      const targetId = homeTargetIds[itemId];
      if(targetId){
        const card = document.getElementById(targetId);
        if(card) card.scrollIntoView({behavior:'smooth', block:'center'});
        return true;
      }
    }

    // 일정 탭인데 날짜 필터가 걸려있으면 전체 일정으로 복원 (안 그러면 필터에 안 걸리는
    // 날짜의 일정은 화면에 안 그려져서 알림이 가리키는 카드를 영영 못 찾게 됨)
    if(tab === 'schedule' && calendarFilterDate){
      calendarFilterDate = null;
      renderCalendar();
    }
    // 이동하려는 일정이 지난 일정이면, 접혀있는 지난 일정 영역도 미리 펼쳐둠
    // (안 그러면 지난 일정 카드가 화면(DOM)에 안 그려져서 스크롤할 대상을 못 찾음)
    if(tab === 'schedule' && itemId){
      const targetSchedule = schedule.find(s => s.id === itemId);
      if(targetSchedule && isPast(targetSchedule)) showPastSchedule = true;
    }

    // 이동하려는 탭에 필터가 걸려있으면 먼저 강제로 "전체"로 풀어줌.
    // 안 그러면 필터에 안 걸리는 게시글은 화면(DOM)에 아예 안 그려져서
    // 스크롤할 대상을 영영 못 찾게 됨.
    if(tab === 'letter' && letterFilterTarget !== 'all'){
      letterFilterTarget = 'all';
      document.querySelectorAll('#letterFilterRow .filter-chip').forEach(b=>{
        b.classList.toggle('active', b.dataset.letterFilter === 'all');
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
    setupDraftAutosave(STORAGE_PREFIX + 'draft_datelog', ['dateLogTitle','dateLogMemo','dateLogQuickDate','dateLogQuickBody']);
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
