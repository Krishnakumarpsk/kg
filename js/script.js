// Mobile menu
const toggle = document.querySelector('.nav-toggle');
const nav = document.querySelector('.main-nav');
toggle.addEventListener('click', () => nav.classList.toggle('open'));
nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));

document.getElementById('yr').textContent = new Date().getFullYear();

// Duplicate marquee content for a seamless loop
document.querySelectorAll('[data-marquee]').forEach(track => {
  track.innerHTML += track.innerHTML;
});

// DTF machine slideshow ("GIF" effect)
document.querySelectorAll('[data-slideshow]').forEach(box => {
  const imgs = box.querySelectorAll('img');
  let i = 0;
  setInterval(() => {
    imgs[i].classList.remove('active');
    i = (i + 1) % imgs.length;
    imgs[i].classList.add('active');
  }, 3000);
});

// Reveal on scroll + counter
const io = new IntersectionObserver(entries => {
  entries.forEach(e => {
    if (!e.isIntersecting) return;
    e.target.classList.add('show');
    if (e.target.dataset.count) {
      const end = +e.target.dataset.count;
      let n = 0;
      const step = () => {
        n = Math.min(end, n + Math.ceil(end / 60));
        e.target.textContent = n;
        if (n < end) requestAnimationFrame(step);
      };
      step();
    }
    io.unobserve(e.target);
  });
}, { threshold: 0.2 });
document.querySelectorAll('.reveal, [data-count]').forEach(el => io.observe(el));

// Global reach map – light real map, flights from Tiruppur drawn progressively like a live flight tracker
(function flightMap() {
  const box = document.getElementById('world-map');
  if (!window.L) { box.innerHTML = '<p style="text-align:center;color:#888;padding:40px">Map needs an internet connection.</p>'; return; }

  const HUB = [11.1085, 77.3411]; // Tiruppur, Tamil Nadu
  // [name, lat, lng] – first entry is the first flight
  const DEST = [
    ['United Kingdom', 51.5074, -0.1278], ['Germany', 52.52, 13.405], ['France', 48.8566, 2.3522],
    ['UAE', 25.2048, 55.2708], ['USA', 40.7128, -74.006], ['Netherlands', 52.3676, 4.9041],
    ['Singapore', 1.3521, 103.8198], ['Italy', 41.9028, 12.4964], ['Saudi Arabia', 24.7136, 46.6753],
    ['Spain', 40.4168, -3.7038], ['Australia', -33.8688, 151.2093], ['Canada', 43.6532, -79.3832],
    ['Qatar', 25.2854, 51.531], ['Malaysia', 3.139, 101.6869], ['Japan', 35.6762, 139.6503],
    ['South Africa', -26.2041, 28.0473], ['Kenya', -1.2921, 36.8219], ['Sri Lanka', 6.9271, 79.8612],
    ['Bangladesh', 23.8103, 90.4125], ['Turkey', 41.0082, 28.9784], ['Poland', 52.2297, 21.0122]
  ].map(([name, lat, lng]) => ({ name, ll: [lat, lng] }));

  document.getElementById('reach-legend').innerHTML = DEST.map((d, i) => `<span data-i="${i}">${d.name}</span>`).join('');
  const info = document.getElementById('flight-to'), countEl = document.getElementById('flight-n');
  const overlay = document.getElementById('reach-overlay');

  const map = L.map(box, {
    zoomControl: false, scrollWheelZoom: false, dragging: false, doubleClickZoom: false, boxZoom: false,
    keyboard: false, touchZoom: false, zoomSnap: 0, inertia: false, worldCopyJump: false
  }).setView([22, 30], 1.6);
  // Google Maps road tiles (English labels)
  L.tileLayer('https://{s}.google.com/vt/lyrs=m&hl=en&x={x}&y={y}&z={z}', { subdomains: ['mt0', 'mt1', 'mt2', 'mt3'], maxZoom: 20, attribution: 'Map data &copy; Google' }).addTo(map);
  map.attributionControl.setPrefix(false);

  const routes = L.layerGroup().addTo(map);
  let hubMarker;

  // great-circle points, longitudes unwrapped so lines never jump across the map edge
  const rad = d => d * Math.PI / 180, deg = r => r * 180 / Math.PI;
  function greatCircle(a, b, n) {
    const [la1, lo1, la2, lo2] = [rad(a[0]), rad(a[1]), rad(b[0]), rad(b[1])];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
    const pts = [];
    for (let i = 0; i <= n; i++) {
      const f = i / n, A = Math.sin((1 - f) * d) / Math.sin(d), B = Math.sin(f * d) / Math.sin(d);
      const x = A * Math.cos(la1) * Math.cos(lo1) + B * Math.cos(la2) * Math.cos(lo2);
      const y = A * Math.cos(la1) * Math.sin(lo1) + B * Math.cos(la2) * Math.sin(lo2);
      const z = A * Math.sin(la1) + B * Math.sin(la2);
      let lng = deg(Math.atan2(y, x));
      if (pts.length) { const prev = pts[pts.length - 1][1]; while (lng - prev > 180) lng -= 360; while (lng - prev < -180) lng += 360; }
      pts.push([deg(Math.atan2(z, Math.hypot(x, y))), lng]);
    }
    return { pts, km: d * 6371 };
  }
  const ease = t => t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; // smooth take-off / landing

  const planeHTML = '<div class="plane-ico"><svg viewBox="-12 -12 24 24" width="26" height="26"><path d="M0,-11 C1.2,-11 1.6,-9 1.6,-7 L1.6,-2.5 L11,3 L11,5 L1.6,2.2 L1.4,7.5 L4.2,9.6 L4.2,11 L0,10 L-4.2,11 L-4.2,9.6 L-1.4,7.5 L-1.6,2.2 L-11,5 L-11,3 L-1.6,-2.5 L-1.6,-7 C-1.6,-9 -1.2,-11 0,-11 Z"/></svg></div>';

  let active = [], landed = 0;

  function launch(i, dur) {
    const dest = DEST[i];
    const { pts, km } = greatCircle(HUB, dest.ll, 400);
    const f = {
      dest, pts, start: performance.now(), dur: dur || Math.min(9000, 4200 + km * 0.42),
      glow: L.polyline([HUB], { color: '#ff4d4d', weight: 8, opacity: .2, lineCap: 'round', interactive: false }).addTo(routes),
      line: L.polyline([HUB], { color: '#e3121b', weight: 2.6, opacity: .95, lineCap: 'round', interactive: false }).addTo(routes),
      plane: L.marker(HUB, { icon: L.divIcon({ className: '', html: planeHTML, iconSize: [26, 26], iconAnchor: [13, 13] }), zIndexOffset: 1000, interactive: false }).addTo(map)
    };
    active.push(f);
    info.textContent = dest.name;
    document.querySelector(`#reach-legend span[data-i="${i}"]`).classList.add('on');
  }

  function tick(now) {
    active = active.filter(f => {
      const t = Math.min(1, (now - f.start) / f.dur);
      const last = f.pts.length - 1, fi = ease(t) * last, idx = Math.floor(fi), fr = fi - idx;
      const a = f.pts[idx], b = f.pts[Math.min(last, idx + 1)];
      const p = [a[0] + (b[0] - a[0]) * fr, a[1] + (b[1] - a[1]) * fr];
      const drawn = f.pts.slice(0, idx + 1).concat([p]);
      f.line.setLatLngs(drawn); f.glow.setLatLngs(drawn);
      f.plane.setLatLng(p);
      const pa = map.latLngToContainerPoint(f.pts[Math.max(0, idx - 2)]), pb = map.latLngToContainerPoint(f.pts[Math.min(last, idx + 3)]);
      const el = f.plane.getElement();
      if (el && (pa.x !== pb.x || pa.y !== pb.y)) el.firstChild.style.transform = `rotate(${Math.atan2(pb.y - pa.y, pb.x - pa.x) * 180 / Math.PI + 90}deg)`;
      if (t < 1) return true;
      // landed – keep route, mark destination
      map.removeLayer(f.plane);
      f.line.setStyle({ opacity: .8 });
      L.circleMarker(f.dest.ll, { radius: 4.5, color: '#fff', weight: 1.5, fillColor: '#e3121b', fillOpacity: 1, interactive: false }).addTo(routes)
        .bindTooltip(f.dest.name, { permanent: true, direction: 'top', offset: [0, -4], className: 'map-tip small' });
      countEl.textContent = ++landed;
      return false;
    });
    requestAnimationFrame(tick);
  }

  const wait = ms => new Promise(r => setTimeout(r, ms));
  const fly = (ll, z, s) => new Promise(r => { map.flyTo(ll, z, { duration: s, easeLinearity: .2 }); map.once('moveend', r); });

  async function tour() {
    overlay.classList.remove('show');
    routes.clearLayers(); landed = 0; countEl.textContent = 0;
    document.querySelectorAll('#reach-legend span').forEach(s => s.classList.remove('on'));
    if (hubMarker) hubMarker.remove();
    map.setView([22, 30], 1.6, { animate: false });
    await wait(600);

    // 0–2s: zoom toward South India
    await fly([12, 77], 5.2, 2);
    // 2–3s: highlight Tiruppur
    hubMarker = L.marker(HUB, { icon: L.divIcon({ className: '', html: '<div class="hub-pin"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }), zIndexOffset: 900, interactive: false })
      .addTo(map).bindTooltip('Tiruppur, India', { permanent: true, direction: 'right', offset: [12, 0], className: 'map-tip hub' });
    await wait(1100);

    // 3–8s: first aircraft (UK), camera eases out to follow the journey
    map.flyTo([30, 40], 3.3, { duration: 4.5, easeLinearity: .2 });
    launch(0, 6500);
    await wait(4200);

    // 8–15s+: further aircraft depart at different times
    map.flyTo([22, 40], 2.4, { duration: 5, easeLinearity: .2 });
    // one flight at a time: wait for each to land, then the next departs from Tiruppur
    while (active.length) await wait(200);
    for (let i = 1; i < DEST.length; i++) { await wait(400); launch(i); while (active.length) await wait(200); }

    // zoom out to reveal the complete network
    map.flyTo([18, 35], 1.9, { duration: 4, easeLinearity: .2 });
    // tour finished: keep all red routes on the map, no overlay, no restart
  }

  requestAnimationFrame(tick);
  new IntersectionObserver((en, obs) => {
    if (en[0].isIntersecting) { map.invalidateSize(); tour(); obs.disconnect(); }
  }, { threshold: 0.3 }).observe(box);
})();

// Service image slider – next image slides in from the right every 2 seconds
document.querySelectorAll('[data-slider]').forEach(slider => {
  const track = slider.querySelector('.slides');
  track.appendChild(track.children[0].cloneNode(true)); // clone first for seamless loop
  const total = track.children.length;
  let i = 0;
  setInterval(() => {
    i++;
    track.style.transition = 'transform .8s ease-in-out';
    track.style.transform = `translateX(-${i * 100}%)`;
    if (i === total - 1) {
      setTimeout(() => {
        track.style.transition = 'none';
        track.style.transform = 'translateX(0)';
        i = 0;
      }, 850);
    }
  }, 2800);
});

// Core services / focus areas: items slide in one by one when scrolled into view
document.querySelectorAll('.biz-list').forEach(list => {
  list.querySelectorAll('li').forEach((li, i) => { li.style.transitionDelay = `${0.2 + i * 0.12}s, ${0.2 + i * 0.12}s, 0s, 0s, 0s`;
    li.addEventListener('transitionend', () => li.style.transitionDelay = '0s', { once: true }); });
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) { list.classList.add('show'); obs.disconnect(); }
  }, { threshold: 0.3 }).observe(list);
});

// Academy enquiry popup – sends details to WhatsApp
const modal = document.getElementById('enquiry');
document.getElementById('open-enquiry').addEventListener('click', () => modal.classList.add('open'));
modal.addEventListener('click', e => { if (e.target === modal || e.target.classList.contains('modal-close')) modal.classList.remove('open'); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') modal.classList.remove('open'); });
const enquiryForm = document.getElementById('enquiry-form');
const success = document.getElementById('form-success');
const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
enquiryForm.addEventListener('submit', e => {
  e.preventDefault();
  const f = new FormData(enquiryForm);
  const d = { name: f.get('name'), email: f.get('email'), phone: f.get('phone'), city: f.get('city') };
  // send the details to WhatsApp
  const text = encodeURIComponent(`Hello, I want to join Adiyogi Design Academy.
Full Name: ${d.name}
Email: ${d.email}
Mobile: ${d.phone}
City: ${d.city}`);
  window.open(`https://wa.me/919788017475?text=${text}`, '_blank');
  // show the thank-you with the submitted details
  enquiryForm.querySelectorAll('.field, .send-btn').forEach(el => el.hidden = true);
  success.innerHTML = `<div class="tick"><i class="fa-solid fa-check"></i></div>
    <h4>Thank you, ${esc(d.name)}!</h4><p>We have received your details and will contact you soon.</p>
    <dl><dt>Full Name</dt><dd>${esc(d.name)}</dd><dt>Email</dt><dd>${esc(d.email)}</dd>
    <dt>Mobile</dt><dd>${esc(d.phone)}</dd><dt>City</dt><dd>${esc(d.city)}</dd></dl>`;
  success.hidden = false;
});
// reset form each time the popup opens
document.getElementById('open-enquiry').addEventListener('click', () => {
  enquiryForm.reset();
  enquiryForm.querySelectorAll('.field, .send-btn').forEach(el => el.hidden = false);
  success.hidden = true;
});

// Course section: image slides in, course items appear one by one
document.querySelectorAll('.ada-course').forEach(sec => {
  const items = sec.querySelectorAll('.course-list li');
  items.forEach((li, i) => {
    li.style.transitionDelay = `${0.3 + i * 0.12}s, ${0.3 + i * 0.12}s, 0s, 0s, 0s`;
    li.addEventListener('transitionend', () => li.style.transitionDelay = '0s', { once: true });
  });
  new IntersectionObserver((entries, obs) => {
    if (entries[0].isIntersecting) {
      sec.classList.add('show');
      sec.querySelector('.course-list').classList.add('show');
      obs.disconnect();
    }
  }, { threshold: 0.25 }).observe(sec);
});

// Light reveal for "More than software training" line
document.querySelectorAll('.ada-foot').forEach(el => new IntersectionObserver((en, obs) => {
  if (en[0].isIntersecting) { el.classList.add('show'); obs.disconnect(); }
}, { threshold: 0.4 }).observe(el));

// Vision section: slide in + count up numbers
document.querySelectorAll('.vision').forEach(sec => new IntersectionObserver((en, obs) => {
  if (!en[0].isIntersecting) return;
  sec.classList.add('show');
  sec.querySelectorAll('[data-vcount]').forEach((el, i) => {
    const end = +el.dataset.vcount, suffix = el.dataset.suffix || '';
    const start = performance.now() + i * 250, dur = 1600;
    const tick = now => {
      const p = Math.min(1, Math.max(0, (now - start) / dur));
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = Math.round(end * eased).toLocaleString('en-IN') + suffix;
      if (p < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  obs.disconnect();
}, { threshold: 0.3 }).observe(sec));

// Live network brand showcase: reveal, centre highlight, particles
(function liveNetwork() {
  const sec = document.querySelector('.live-net');
  if (!sec) return;
  new IntersectionObserver((en, obs) => { if (en[0].isIntersecting) { sec.classList.add('in'); obs.disconnect(); } }, { threshold: .2 }).observe(sec);

  // glow a logo as it passes through the centre
  const logos = [...sec.querySelectorAll('.ln-logo')];
  setInterval(() => {
    const mid = innerWidth / 2;
    logos.forEach(l => {
      const r = l.getBoundingClientRect();
      l.classList.toggle('hl', Math.abs(r.left + r.width / 2 - mid) < r.width * .55);
    });
  }, 120);

})();


// ---------------- CLIENT REVIEWS ----------------
// SAMPLE (dummy) reviews for layout only – replace with real client reviews before the site goes live.
const REVIEWS = [
  { name: 'Ravi Kumar', company: 'Chennai Apparel Co.', rating: 5, response: 98, quality: 97, delivery: 95, date: '2026-08-14',
    text: 'The DTF prints came out sharper than the samples we approved. Colours held up perfectly after washing and the delivery was two days early.' },
  { name: 'Priya Sundaram', company: 'Little Steps Kidswear', rating: 5, response: 96, quality: 98, delivery: 92, date: '2026-08-02',
    text: 'We ordered 1,200 printed kids tees. Stitching, sizing and packing were all consistent. This is our third repeat order with KaviSuga.' },
  { name: 'Mohammed Arif', company: 'Raj Enterprises', rating: 5, response: 94, quality: 96, delivery: 97, date: '2026-07-21',
    text: 'Our staff uniforms look genuinely professional. They matched our brand colours exactly and handled a rush order for 60 pieces.' },
  { name: 'Karthik Rajan', company: 'Textile Design Student', rating: 5, response: 95, quality: 94, delivery: 90, date: '2026-07-10',
    text: 'The academy taught me real industry workflow – colour separation and production files. I got placed in a garment export unit after the course.' },
  { name: 'Anita Joseph', company: 'Bloom Fashions', rating: 4, response: 90, quality: 92, delivery: 85, date: '2026-06-28',
    text: 'Very creative artwork team. Separations were print-ready on the first try. One revision took a little longer than expected.' },
  { name: 'Senthil Murugan', company: 'SM Knit Exports', rating: 5, response: 93, quality: 95, delivery: 91, date: '2026-06-15',
    text: 'Reliable partner for our export graphics. They understand buyer requirements and always deliver production-ready designs.' },
  { name: 'Divya Ramesh', company: 'Adiyogi Design Academy', rating: 4, response: 88, quality: 90, delivery: 86, date: '2026-05-30',
    text: 'Practical classes with real garment projects. Learned Photoshop, Illustrator and how designs actually go to production.' },
  { name: 'Joseph Daniel', company: 'St. Mary’s School', rating: 3, response: 85, quality: 88, delivery: 80, date: '2026-05-12',
    text: 'Good quality school uniforms and neat logo printing. Delivery was slightly delayed during the peak season.' },
  { name: 'Lakshmi Narayan', company: 'Trendz Promotions', rating: 5, response: 92, quality: 93, delivery: 94, date: '2026-04-25',
    text: 'Promotional T-shirts for our event were vibrant and well finished. Smooth communication from start to delivery.' }
];

(function reviews() {
  const list = document.getElementById('t-list');
  if (!list) return;
  const esc = v => String(v).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const starRow = n => [1, 2, 3, 4, 5].map(i => `<i class="fa-solid fa-star${i <= n ? '' : ' off'}"></i>`).join('');
  const initials = n => n.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join('');
  const fmtDate = d => new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  let all = REVIEWS.slice();
  try { all = all.concat(JSON.parse(localStorage.getItem('kg-reviews') || '[]')); } catch (e) {}

  function render() {
    const n = all.length;
    const avg = all.reduce((s, r) => s + r.rating, 0) / n;
    const pct = k => Math.round(all.reduce((s, r) => s + r[k], 0) / n);
    document.getElementById('rv-avg').textContent = avg.toFixed(1);
    document.getElementById('rv-avg-stars').innerHTML = starRow(Math.round(avg));
    document.getElementById('rv-count').textContent = n;
    document.getElementById('rv-rec').textContent = Math.round(all.filter(r => r.rating >= 4).length / n * 100) + '%';
    document.getElementById('rv-bars').innerHTML = [5, 4, 3, 2, 1].map(s => {
      const c = all.filter(r => r.rating === s).length, p = Math.round(c / n * 100);
      return `<div class="rv-bar"><span>${s} <i class="fa-solid fa-star"></i></span><div class="rv-track"><b style="--w:${p}%"></b></div><em><strong>${c}</strong> · ${p}%</em></div>`;
    }).join('');
    document.getElementById('rv-rings').innerHTML = [['response', 'Response'], ['quality', 'Quality'], ['delivery', 'Delivery']].map(([k, l]) => {
      const v = pct(k);
      return `<div class="rv-ring"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" class="bg"/><circle cx="50" cy="50" r="42" class="fg" style="--p:${v}"/></svg><b>${v}%</b><span>${l}</span></div>`;
    }).join('');

    const sorted = all.slice().sort((a, b) => b.date.localeCompare(a.date));
    const cards = sorted.map(r => `
      <article class="rv-card">
        <i class="fa-solid fa-quote-right rv-q"></i>
        <header><span class="rv-av">${esc(initials(r.name))}</span><div><b>${esc(r.name)}</b><small>${esc(r.company || '')}</small></div></header>
        <div class="rv-stars">${starRow(r.rating)}</div>
        <p>${esc(r.text)}</p>
        <footer><span>Response <b>${r.response}%</b></span><span>Quality <b>${r.quality}%</b></span><span>Delivery <b>${r.delivery}%</b></span><time>${fmtDate(r.date)}</time></footer>
      </article>`).join('');
    // duplicate the cards so the horizontal flow loops seamlessly
    list.innerHTML = `<div class="rv-flowtrack" style="--dur:${sorted.length * 8}s">${cards}${cards.replace(/<article /g, '<article aria-hidden="true" ')}</div>`;
  }
  render();

  // animate bars / rings when scrolled into view
  const sec = document.getElementById('testimonials');
  new IntersectionObserver((en, obs) => { if (en[0].isIntersecting) { sec.classList.add('rv-in'); obs.disconnect(); } }, { threshold: .25 }).observe(sec);

  // write-a-review modal
  const modal = document.getElementById('rv-modal'), form = document.getElementById('rv-form');
  const open = () => { modal.classList.add('open'); form.querySelector('input').focus(); };
  const close = () => modal.classList.remove('open');
  document.getElementById('rv-write').addEventListener('click', open);
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-close]')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });

  let rating = 5;
  const stars = [...form.querySelectorAll('.rv-pick button')];
  const paint = v => stars.forEach(b => b.classList.toggle('on', +b.dataset.v <= v));
  stars.forEach(b => {
    b.addEventListener('click', () => { rating = +b.dataset.v; paint(rating); });
    b.addEventListener('mouseenter', () => paint(+b.dataset.v));
    b.addEventListener('mouseleave', () => paint(rating));
  });
  paint(rating);
  form.querySelectorAll('input[type=range]').forEach(r => {
    const out = form.querySelector(`[data-out="${r.name}"]`);
    const upd = () => { out.textContent = r.value; r.style.setProperty('--v', (r.value - r.min) / (r.max - r.min) * 100 + '%'); };
    r.addEventListener('input', upd); upd();
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    const f = new FormData(form);
    const r = { name: f.get('name'), company: f.get('company'), rating, response: +f.get('response'), quality: +f.get('quality'),
      delivery: +f.get('delivery'), date: new Date().toISOString().slice(0, 10), text: f.get('review') };
    all.push(r);
    try { const mine = JSON.parse(localStorage.getItem('kg-reviews') || '[]'); mine.push(r); localStorage.setItem('kg-reviews', JSON.stringify(mine)); } catch (err) {}
    // also send the review to the business on WhatsApp
    const msg = `New website review\nName: ${r.name}\nCompany: ${r.company || '-'}\nRating: ${rating}/5\nResponse ${r.response}% · Quality ${r.quality}% · Delivery ${r.delivery}%\nReview: ${r.text}`;
    window.open('https://wa.me/919788017475?text=' + encodeURIComponent(msg), '_blank');
    form.reset(); rating = 5; paint(5); form.querySelectorAll('input[type=range]').forEach(x => x.dispatchEvent(new Event('input')));
    close(); render();
    sec.scrollIntoView({ behavior: 'smooth' });
  });
})();

// Sticky nav: show the header menu fixed at the top once the hero scrolls out of view
(function stickyNav() {
  const hero = document.querySelector('.hero');
  if (!hero) return;
  const onScroll = () => document.body.classList.toggle('nav-fixed', window.scrollY > hero.offsetHeight - 60);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


// Products dropdown: headings in the menu, clicking one opens an image gallery
(function productGallery() {
  const dd = document.querySelector('.nav-dd'), modal = document.getElementById('pg-modal');
  if (!dd || !modal) return;
  const CATS = {
    kids: ['Kidswear', 'assets/kids/kids', 6, 'jpeg'],
    school: ['School Uniforms', 'assets/school/school', 10, 'jpeg'],
    corporate: ['Corporate Uniforms', 'assets/corporate/corp', 3, 'jpeg'],
    tshirts: ['Printed T-Shirts', 'assets/tshirts/tee', 6, 'png']
  };
  const btn = dd.querySelector('.nav-dd-btn');
  const setOpen = on => { dd.classList.toggle('open', on); btn.setAttribute('aria-expanded', on); };
  btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); setOpen(!dd.classList.contains('open')); });
  document.addEventListener('click', e => { if (!dd.contains(e.target)) setOpen(false); });

  const grid = document.getElementById('pg-grid'), title = document.getElementById('pg-title');
  dd.querySelectorAll('[data-cat]').forEach(b => b.addEventListener('click', () => {
    const [name, base, n, ext] = CATS[b.dataset.cat];
    title.textContent = name;
    grid.innerHTML = Array.from({ length: n }, (_, i) =>
      `<button type="button" data-i="${i}"><img src="${base}${i + 1}.${ext}" alt="${name} ${i + 1}" loading="lazy"></button>`).join('');
    imgs = Array.from({ length: n }, (_, i) => `${base}${i + 1}.${ext}`);
    showGrid();
    setOpen(false);
    document.querySelector('.main-nav').classList.remove('open');
    modal.classList.add('open');
  }));
  // large viewer with previous / next
  const view = document.getElementById('pg-view'), big = document.getElementById('pg-big'), count = document.getElementById('pg-count');
  let imgs = [], cur = 0;
  const showGrid = () => { view.hidden = true; grid.hidden = false; };
  const show = i => {
    cur = (i + imgs.length) % imgs.length;
    big.classList.remove('in'); void big.offsetWidth;
    big.src = imgs[cur]; big.alt = `${title.textContent} ${cur + 1}`; big.classList.add('in');
    count.textContent = `${cur + 1} / ${imgs.length}`;
    grid.hidden = true; view.hidden = false;
  };
  grid.addEventListener('click', e => { const t = e.target.closest('[data-i]'); if (t) show(+t.dataset.i); });
  view.querySelector('.prev').addEventListener('click', () => show(cur - 1));
  view.querySelector('.next').addEventListener('click', () => show(cur + 1));
  document.getElementById('pg-back').addEventListener('click', showGrid);

  const close = () => modal.classList.remove('open');
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('[data-pg-close]')) close(); });
  document.addEventListener('keydown', e => {
    if (!modal.classList.contains('open')) return;
    if (e.key === 'Escape') close();
    if (!view.hidden && e.key === 'ArrowLeft') show(cur - 1);
    if (!view.hidden && e.key === 'ArrowRight') show(cur + 1);
  });
})();


// DTF box: play the GIF clips one by one (only the current + next clip are loaded)
document.querySelectorAll('[data-gifs]').forEach(box => {
  const n = +box.dataset.gifs, img = box.querySelector('img');
  const src = i => `gif/clip_${String(i + 1).padStart(2, '0')}.gif`;
  let i = 0, pre = new Image();
  pre.src = src(1);
  setInterval(() => {
    i = (i + 1) % n;
    img.classList.remove('active');
    setTimeout(() => { img.src = src(i); img.onload = () => img.classList.add('active'); }, 400);
    pre = new Image(); pre.src = src((i + 1) % n);
  }, 5000);
});
