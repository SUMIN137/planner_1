// 앱 파일을 기기에 저장해 두어 오프라인에서도 열리게 하는 서비스워커
// 앱 파일(index.html 등)을 수정해서 다시 올릴 때는 아래 버전 숫자를 올려주세요.
const CACHE = "planner-v2";
const SHELL = ["./", "./index.html", "./manifest.json", "./icon-192.png", "./icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (e) => {
  if (e.request.method !== "GET") return;
  const u = new URL(e.request.url);

  // 우리 앱 파일: 인터넷이 되면 항상 최신 파일, 안 되거나 3초 넘게 느리면 저장된 파일
  if (u.origin === location.origin) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request, { ignoreSearch: true });
        const net = fetch(e.request).then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; });
        if (!hit) return net;
        return Promise.race([net, new Promise((res) => setTimeout(() => res(hit), 3000))]).catch(() => hit);
      })
    );
    return;
  }

  // Firebase 라이브러리: 저장된 것을 먼저 쓰고 뒤에서 갱신
  if (u.hostname === "www.gstatic.com" && u.pathname.startsWith("/firebasejs/")) {
    e.respondWith(
      caches.open(CACHE).then(async (c) => {
        const hit = await c.match(e.request);
        const net = fetch(e.request).then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit);
        return hit || net;
      })
    );
  }
});
