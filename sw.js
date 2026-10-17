// Guarda os arquivos do aplicativo para ele abrir mesmo sem internet
// e mostra o aviso na tela bloqueada quando um timer termina.
const CACHE = "tempo-dos-projetos-v8";
const ARQUIVOS = ["./", "index.html", "config.js", "manifest.json", "icon-192.png", "icon-512.png", "apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ARQUIVOS)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
// Busca primeiro a versão nova na internet e usa a guardada quando estiver sem conexão.
self.addEventListener("fetch", e => {
  const url = new URL(e.request.url);
  if (e.request.method !== "GET" || url.origin !== location.origin || url.pathname.startsWith("/__/")) return;
  e.respondWith(
    fetch(e.request).then(r => { const copia = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copia)); return r; })
      .catch(() => caches.match(e.request).then(r => r || caches.match("index.html")))
  );
});

// Aviso enviado pelo Firebase quando o timer chega a zero.
self.addEventListener("push", e => {
  let dados = {};
  try { const j = e.data ? e.data.json() : {}; dados = j.data || (j.notification ? { titulo: j.notification.title, texto: j.notification.body } : j); } catch (er) {}
  const titulo = dados.titulo || "Timer concluído";
  e.waitUntil(self.registration.showNotification(titulo, {
    body: dados.texto || "Um dos seus timers chegou ao fim.",
    icon: "icon-192.png",
    badge: "icon-192.png",
    tag: dados.projeto || "timer",
    data: { url: "./" }
  }));
});
self.addEventListener("notificationclick", e => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: "window", includeUncontrolled: true }).then(cs => {
    for (const c of cs) if ("focus" in c) return c.focus();
    return self.clients.openWindow("./");
  }));
});
