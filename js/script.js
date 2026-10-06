/* always open the home page at the top (browsers restore the old scroll position on reload) */
if (!location.hash) {
  if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
  window.scrollTo(0, 0);
  addEventListener('load', () => window.scrollTo(0, 0));
}

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
document.querySelectorAll('.reveal, [data-count]:not(.exp-card [data-count])').forEach(el => io.observe(el));

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
  // straight route on the map (simple interpolation), km kept for flight duration
  function greatCircle(a, b, n) {
    const pts = [];
    const my = lat => Math.log(Math.tan(Math.PI / 4 + rad(lat) / 2)), iy = y => deg(2 * Math.atan(Math.exp(y)) - Math.PI / 2);
    const ya = my(a[0]), yb = my(b[0]);
    for (let i = 0; i <= n; i++) { const f = i / n; pts.push([iy(ya + (yb - ya) * f), a[1] + (b[1] - a[1]) * f]); }
    const [la1, lo1, la2, lo2] = [rad(a[0]), rad(a[1]), rad(b[0]), rad(b[1])];
    const d = 2 * Math.asin(Math.sqrt(Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2));
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

    // finish the camera move first (lines can't draw while the map is zooming), then fly one aircraft at a time
    await fly([22, 40], 2.4, 3);
    for (let i = 0; i < DEST.length; i++) { if (i) await wait(400); launch(i, i ? 0 : 6500); while (active.length) await wait(200); }

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
  const onScroll = () => document.body.classList.toggle('nav-fixed', window.scrollY > hero.offsetHeight - 140);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();
})();


// Products dropdown: headings in the menu, clicking one opens an image gallery
(function productGallery() {
  const dd = document.querySelector('.nav-dd'), modal = document.getElementById('pg-modal');
  if (!dd || !modal) return;
  const CATS = {
    kids: ['Kidswear', 'assets/kids/kids', 11, 'jpeg'],
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

/* hero border: 4cm moving line */
(function () {
  const r = document.querySelector('.hero-flow rect');
  if (!r) return;
  const size = () => {
    const per = r.getTotalLength();
    r.style.strokeDasharray = '4cm ' + per + 'px';
    r.style.setProperty('--per', per + 'px');
  };
  size();
  addEventListener('resize', size);
})();

/* hero intro: sentence fades in after the pillars, company names in bold */
(function () {
  const p = document.querySelector('.hero .hero-intro');
  if (!p) return;
  const names = ['Linga Bhairavi Graphics', 'Kavisuga Fashions Private Limited', 'Adiyogi Design Academy'];
  const words = p.textContent.trim().split(/\s+/);
  const bold = new Array(words.length).fill(false);
  names.forEach(name => {
    const nw = name.split(' ');
    for (let i = 0; i + nw.length <= words.length; i++) {
      if (nw.every((w, j) => words[i + j].replace(/,$/, '') === w)) nw.forEach((_, j) => { bold[i + j] = true; });
    }
  });
  // every letter is laid out up front (hidden) so the paragraph never jumps while typing
  const chars = w => w.split('').map(c => `<span class="tc">${c}</span>`).join('');
  p.innerHTML = words.map((w, i) => `<span class="tw">${bold[i] ? '<b>' + chars(w) + '</b>' : chars(w)}</span>`)
    .join('<span class="tc"> </span>');
  const all = p.querySelectorAll('.tc');
  const done = () => { window.heroDone = true; document.dispatchEvent(new Event('hero-done')); };
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) { all.forEach(c => c.classList.add('on')); done(); return; }
  // no typing: the whole sentence fades in right after the heading (~2s), together with the cards
  setTimeout(() => { p.classList.add('in'); all.forEach(c => c.classList.add('on')); done(); }, 2000);
})();

/* pillars: split DESIGN / MANUFACTURE / EDUCATE into letters, one word after another */
(function () {
  const words = document.querySelectorAll('.hero .pillars .pw');
  const dots = document.querySelectorAll('.hero .pillars > span');
  let t = 0.15;
  words.forEach((w, wi) => {
    const letters = w.textContent.split('');
    w.innerHTML = letters.map((c, i) =>
      `<i class="ch" style="--d:${(t + i * 0.03).toFixed(2)}s;--g:${(4 + wi * 0.5 + i * 0.05).toFixed(2)}s;animation-delay:${(t + i * 0.03).toFixed(2)}s">${c}</i>`
    ).join('');
    const end = t + letters.length * 0.03 + 0.35;
    w.style.setProperty('--ul', end.toFixed(2) + 's');
    w.classList.add('shine');
    if (dots[wi]) dots[wi].style.animationDelay = end.toFixed(2) + 's, ' + (end + 0.6).toFixed(2) + 's';
    t = end + 0.05;
  });
})();

/* companies section: replay its animations every time it scrolls into view */
document.querySelectorAll('.companies').forEach(sec => new IntersectionObserver(en => {
  if (!en[0].isIntersecting) sec.classList.remove('co-in'); // reset once fully off screen so it plays again next time
}, { threshold: 0 }).observe(sec));
/* on first load the cards wait for the home heading, then come in with the sentence */
if (!document.querySelector('.hero .hero-intro')) window.heroDone = true;
document.querySelectorAll('.companies').forEach(sec => {
  let seen = false;
  const count = () => sec.querySelectorAll('.exp-card [data-count]').forEach(el => {
    const end = +el.dataset.count, t0 = performance.now();
    const step = now => { const k = Math.min(1, (now - t0) / 1400); el.textContent = Math.round(end * (1 - Math.pow(1 - k, 3))); if (k < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  });
  const play = () => { if (seen && window.heroDone && !sec.classList.contains('co-in')) { sec.classList.add('co-in'); count(); } };
  document.addEventListener('hero-done', play);
  new IntersectionObserver(en => { seen = en[0].isIntersecting; play(); }, { threshold: .2 }).observe(sec);
});

/* company headers: put each logo in a card and replay the header animation every time it scrolls into view */
document.querySelectorAll('.biz-head').forEach(head => {
  const logo = head.querySelector('.biz-logo');
  if (logo && !logo.querySelector('.logo-card')) {
    const card = document.createElement('div');
    card.className = 'logo-card';
    card.append(...logo.childNodes);
    logo.append(card);
  }
  new IntersectionObserver(en => { if (en[0].isIntersecting) head.classList.add('bh-in'); }, { threshold: .3 }).observe(head);
  new IntersectionObserver(en => { if (!en[0].isIntersecting) head.classList.remove('bh-in'); }, { threshold: 0 }).observe(head);
});

/* services list: heading + big counter on the left, vertical wheel on the right (prev / current / next) */
document.querySelectorAll('.biz-list:not(.plain)').forEach(list => {
  const lis = [...list.querySelectorAll('li')];
  const items = lis.map(li => li.textContent.trim());
  if (!items.length) return;
  const imgs = lis.map(li => li.dataset.img).filter(Boolean);
  const pad = n => String(n).padStart(2, '0');
  const n = items.length;
  list.classList.add('sv-one');
  const left = document.createElement('div');
  left.className = 'sv-left';
  left.append(list.querySelector('h3'));
  left.insertAdjacentHTML('beforeend', `<div class="sv-num"><b>01</b><small>/ ${pad(n)}</small></div>
    <div class="sv-dots">${items.map(t => `<button type="button" aria-label="${t}"></button>`).join('')}</div>`);
  const wheel = document.createElement('div');
  wheel.className = 'sv-wheel';
  wheel.innerHTML = lis.map((li, i) => li.dataset.icon
    ? `<span><em class="sv-ic"><i class="fa-solid ${li.dataset.icon || 'fa-shirt'}"></i></em><em class="sv-tx"><b>${items[i]}</b>${li.dataset.sub ? `<small>${li.dataset.sub}</small>` : ''}</em><i class="sv-chev fa-solid fa-chevron-right"></i></span>`
    : `<span>${items[i]}</span>`).join('');
  list.prepend(left);
  list.append(wheel);
  let pics = [];
  if (imgs.length === n) {
    const wrap = document.createElement('div');
    wrap.className = 'sv-pic-wrap';
    wrap.innerHTML = `<div class="sv-pic"><div class="sv-pic-in">${lis.map((li, i) => `<img src="${encodeURI(li.dataset.img)}" alt="${items[i]}" decoding="async">`).join('')}</div></div>
      <button type="button" class="sv-arrow l" aria-label="Previous service"><i class="fa-solid fa-chevron-left"></i></button>
      <button type="button" class="sv-arrow r" aria-label="Next service"><i class="fa-solid fa-chevron-right"></i></button>`;
    list.append(wrap);
    list.classList.add('sv-img');
    left.insertAdjacentHTML('afterbegin', '<p class="sv-kicker">OUR CREATIVE SERVICES</p>');
    left.querySelector('.sv-num').insertAdjacentHTML('afterend', '<div class="sv-line"></div>');
    pics = wrap.querySelectorAll('img');
    wrap.querySelector('.l').addEventListener('click', () => show((cur - 1 + n) % n));
    wrap.querySelector('.r').addEventListener('click', () => show((cur + 1) % n));
    wheel.addEventListener('click', e => {
      const k = [...spans].indexOf(e.target.closest('span'));
      if (k >= 0 && k !== cur) show(k);
    });
  }
  const num = left.querySelector('.sv-num b'), spans = wheel.querySelectorAll('span'), dots = left.querySelectorAll('.sv-dots button');
  const STEP = imgs.length === n ? 3000 : 2600;
  let cur = 0, timer;
  const show = i => {
    cur = i;
    spans.forEach((s, k) => {
      s.className = k === cur ? 'on' : k === (cur - 1 + n) % n ? 'prev' : k === (cur + 1) % n ? 'next' : k === (cur - 2 + n) % n ? 'up' : '';
    });
    dots.forEach((d, k) => d.classList.toggle('on', k === cur));
    pics.forEach((p, k) => p.classList.toggle('on', k === cur));
    if (pics.length) { const box = pics[0].closest('.sv-pic'); box.classList.remove('sweep'); void box.offsetWidth; box.classList.add('sweep'); }
    num.textContent = pad(cur + 1);
    num.classList.remove('flip'); void num.offsetWidth; num.classList.add('flip');
    clearTimeout(timer);
    timer = setTimeout(() => show((cur + 1) % n), STEP);
  };
  dots.forEach((d, i) => d.addEventListener('click', () => i !== cur && show(i)));
  show(0);
});

/* LBG card: fade the whole company card in when it scrolls into view */
document.querySelectorAll('#lbg, #ksf').forEach(sec => new IntersectionObserver((en, obs) => {
  if (en[0].isIntersecting) { sec.classList.add('lbg-in'); obs.disconnect(); }
}, { threshold: .08 }).observe(sec));

/* services: one big frame, one picture at a time, slides to the next */
document.querySelectorAll('.svc-grid').forEach(grid => {
  const cards = [...grid.querySelectorAll('.svc-card')];
  if (!cards.length) return;
  grid.classList.add('svc-slider');
  grid.insertAdjacentHTML('beforeend', `<button type="button" class="svc-nav prev" aria-label="Previous"><i class="fa-solid fa-chevron-left"></i></button>
    <button type="button" class="svc-nav next" aria-label="Next"><i class="fa-solid fa-chevron-right"></i></button>
    <div class="svc-dots">${cards.map((c, i) => `<button type="button" aria-label="Service ${i + 1}"></button>`).join('')}</div>`);
  const dots = grid.querySelectorAll('.svc-dots button');
  let cur = -1, timer;
  const show = (i, dir = 1) => {
    if (i === cur) return;
    const old = cards[cur];
    if (old) { old.classList.remove('on', 'from-left'); old.classList.add(dir > 0 ? 'out-left' : 'out-right'); setTimeout(() => old.classList.remove('out-left', 'out-right'), 900); }
    cur = i;
    cards[cur].classList.toggle('from-left', dir < 0);
    cards[cur].classList.add('on');
    dots.forEach((d, k) => d.classList.toggle('on', k === cur));
    clearTimeout(timer);
    timer = setTimeout(() => show((cur + 1) % cards.length, 1), 6500);
  };
  grid.querySelector('.next').addEventListener('click', () => show((cur + 1) % cards.length, 1));
  grid.querySelector('.prev').addEventListener('click', () => show((cur - 1 + cards.length) % cards.length, -1));
  dots.forEach((d, i) => d.addEventListener('click', () => show(i, i > cur ? 1 : -1)));
  new IntersectionObserver((en, obs) => { if (en[0].isIntersecting) { show(0); obs.disconnect(); } }, { threshold: .2 }).observe(grid);
});

// LBG core services: slide images one by one and highlight the matching service
document.querySelectorAll('.lbg-slider').forEach(sl => {
  const track = sl.querySelector('.lbg-track'), n = track.children.length, introCount = 3, dotsBox = sl.querySelector('.lbg-dots');
  const items = [...sl.closest('.lbg-body').querySelectorAll('.biz-list li')];
  let cur = 0, timer;
  const dots = [...Array(n)].map((_, i) => { const b = document.createElement('button'); b.setAttribute('aria-label', 'Slide ' + (i + 1)); dotsBox.appendChild(b); return b; });
  const go = i => {
    cur = (i + n) % n;
    track.style.transform = `translateX(-${cur * 100}%)`;
    dots.forEach((d, k) => d.classList.toggle('on', k === cur));
    /* The first three slides are the LBG artwork intro. Details begin
       highlighting only when the service-image sequence starts. */
    items.forEach((li, k) => li.classList.toggle('on', cur >= introCount && k === cur - introCount));
  };
  const play = () => { clearInterval(timer); timer = setInterval(() => go(cur + 1), 2500); };
  dots.forEach((d, i) => d.addEventListener('click', () => { go(i); play(); }));
  items.forEach((li, i) => li.addEventListener('click', () => { go(introCount + i); play(); }));
  sl.addEventListener('mouseenter', () => clearInterval(timer));
  sl.addEventListener('mouseleave', play);
  go(0); play();
});

// LBG logo: glassmorphism shine on click
document.querySelectorAll('#lbg .biz-logo').forEach(el => el.addEventListener('click', () => {
  el.classList.remove('glass'); void el.offsetWidth; el.classList.add('glass');
}));

// KSF: cycle the DTF machine GIF clips (gif/clip_01..NN.gif)
document.querySelectorAll('.dtf-gif[data-gifs]').forEach(box => {
  const n = +box.dataset.gifs, first = box.querySelector('img');
  if (!n || !first) return;
  let i = 1;
  setInterval(() => {
    i = i % n + 1;
    const next = new Image();
    next.alt = first.alt;
    next.src = 'gif/clip_' + String(i).padStart(2, '0') + '.gif';
    next.onload = () => {
      box.appendChild(next);
      requestAnimationFrame(() => next.classList.add('active'));
      const old = [...box.querySelectorAll('img')].filter(im => im !== next);
      setTimeout(() => old.forEach(im => im.remove()), 900);
    };
  }, 7000);
});

// Company cards: replay the section entrance animation each time a card is clicked
document.querySelectorAll('.company-cards .c-card').forEach(card => card.addEventListener('click', () => {
  const sec = document.querySelector(card.getAttribute('href'));
  if (!sec || (sec.id !== 'ksf' && sec.id !== 'lbg')) return;
  sec.classList.remove('lbg-in'); void sec.offsetWidth;
  setTimeout(() => sec.classList.add('lbg-in'), 350);
}));

// Kavisuga section: entrance on scroll, replay when its company card is clicked
(() => {
  const sec = document.getElementById('kavisuga');
  if (!sec) return;
  new IntersectionObserver((en, obs) => { if (en[0].isIntersecting) { sec.classList.add('in'); obs.disconnect(); } }, { threshold: .2 }).observe(sec);
  document.querySelectorAll('a[href="#kavisuga"]').forEach(a => a.addEventListener('click', () => {
    sec.classList.remove('in'); void sec.offsetWidth; setTimeout(() => sec.classList.add('in'), 350);
  }));
})();

// Kavisuga intro: split tagline + description into words for a one-by-one reveal
document.querySelectorAll('#kavisuga .ksf2-lead, #kavisuga .ksf2-text').forEach((el, k) => {
  const base = k === 0 ? 0.9 : 1.3, step = k === 0 ? 0.12 : 0.06;
  el.innerHTML = el.textContent.trim().split(/\s+/)
    .map((w, i) => `<span class="ksf2-w" style="animation-delay:${(base + i * step).toFixed(2)}s">${w}</span>`).join(' ');
});

// Kavisuga: replay the entrance every time the section scrolls back into view,
// using a different text effect each time
(() => {
  const sec = document.getElementById('kavisuga');
  if (!sec) return;
  const variants = ['fx-rise', 'fx-slide', 'fx-zoom', 'fx-flip'];
  let n = 0;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && e.intersectionRatio >= .2 && !sec.classList.contains('in')) {
      sec.classList.remove(...variants);
      sec.classList.add(variants[n++ % variants.length]);
      void sec.offsetWidth;
      sec.classList.add('in');
    } else if (e.intersectionRatio === 0) {
      sec.classList.remove('in');
    }
  }, { threshold: [0, .2] }).observe(sec);
})();

// Kavisuga Focus Areas: auto-highlight items one by one (pauses while hovering)
(() => {
  const items = [...document.querySelectorAll('#kavisuga .ksf2-focus li')];
  if (!items.length) return;
  let i = 0, paused = false;
  const show = () => { items.forEach(li => li.classList.remove('on')); items[i].classList.add('on'); i = (i + 1) % items.length; };
  items.forEach(li => {
    li.addEventListener('mouseenter', () => { paused = true; items.forEach(x => x.classList.remove('on')); });
    li.addEventListener('mouseleave', () => { paused = false; });
  });
  show();
  setInterval(() => { if (!paused) show(); }, 2000);
})();

// LBG intro: word-by-word text reveal, replayed (with a new effect) every time the section returns to view
(() => {
  const sec = document.getElementById('lbg');
  if (!sec) return;
  sec.querySelectorAll('.biz-intro .lead, .biz-intro .big').forEach((el, k) => {
    const base = k === 0 ? 0.6 : 1.0, step = k === 0 ? 0.1 : 0.05;
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map((w, i) => `<span class="ksf2-w" style="animation-delay:${(base + i * step).toFixed(2)}s">${w}</span>`).join(' ');
  });
  const variants = ['fx-rise', 'fx-slide', 'fx-zoom', 'fx-flip'];
  let n = 0;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && e.intersectionRatio >= .2 && !sec.classList.contains('tx-in')) {
      sec.classList.remove(...variants);
      sec.classList.add(variants[n++ % variants.length]);
      void sec.offsetWidth;
      sec.classList.add('tx-in');
    } else if (e.intersectionRatio === 0) {
      sec.classList.remove('tx-in');
    }
  }, { threshold: [0, .2] }).observe(sec);
})();

// ADA intro: word-by-word reveal, replayed with a new effect each time the section returns
(() => {
  const sec = document.getElementById('ada');
  if (!sec) return;
  sec.querySelectorAll('.ada-head .lead, .ada-head .big').forEach((el, k) => {
    const base = k === 0 ? 0.6 : 1.2, step = k === 0 ? 0.1 : 0.025;
    el.innerHTML = el.textContent.trim().split(/\s+/)
      .map((w, i) => `<span class="ksf2-w" style="animation-delay:${(base + i * step).toFixed(2)}s">${w}</span>`).join(' ');
  });
  const variants = ['fx-rise', 'fx-slide', 'fx-zoom', 'fx-flip'];
  let n = 0;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && e.intersectionRatio >= .15 && !sec.classList.contains('tx-in')) {
      sec.classList.remove(...variants);
      sec.classList.add(variants[n++ % variants.length]);
      void sec.offsetWidth;
      sec.classList.add('tx-in');
    } else if (e.intersectionRatio === 0) {
      sec.classList.remove('tx-in');
    }
  }, { threshold: [0, .15] }).observe(sec);
  sec.querySelector('.ada-head .biz-logo')?.addEventListener('click', e => {
    const el = e.currentTarget; el.classList.remove('glass'); void el.offsetWidth; el.classList.add('glass');
  });
})();

// ADA course list: auto-highlight one item at a time (like LBG Core Services); pauses on hover
(() => {
  const items = [...document.querySelectorAll('#ada .course-list li')];
  if (!items.length) return;
  let i = 0, paused = false;
  const show = () => { items.forEach(li => li.classList.remove('on')); items[i].classList.add('on'); i = (i + 1) % items.length; };
  items.forEach((li, k) => {
    li.addEventListener('mouseenter', () => { paused = true; items.forEach(x => x.classList.remove('on')); });
    li.addEventListener('mouseleave', () => { paused = false; });
    li.addEventListener('click', () => { i = k; show(); });
  });
  show();
  setInterval(() => { if (!paused) show(); }, 2200);
})();

// Vision arrows: replay animation each time the section returns to view
(() => {
  const sec = document.querySelector('.vision');
  if (!sec) return;
  new IntersectionObserver(([e]) => {
    if (e.isIntersecting && e.intersectionRatio >= .2) sec.classList.add('vx-in');
    else if (e.intersectionRatio === 0) sec.classList.remove('vx-in');
  }, { threshold: [0, .2] }).observe(sec);
})();

// Services: left panel follows the active slide (text + colours)
document.querySelectorAll('#services .svs-panel').forEach(panel => {
  const sec = panel.closest('section'), cards = [...sec.querySelectorAll('.svc-card')];
  const title = panel.querySelector('.svs-ptitle'), desc = panel.querySelector('.svs-pdesc'), count = panel.querySelector('.svs-pcount');
  let last = -1;
  const sync = () => {
    const i = cards.findIndex(c => c.classList.contains('on'));
    if (i < 0 || i === last) return;
    last = i;
    const info = cards[i].querySelector('.svc-info');
    title.innerHTML = info.querySelector('h3').innerHTML;
    desc.innerHTML = info.querySelector('p').innerHTML;
    count.textContent = String(i + 1).padStart(2, '0') + ' / ' + String(cards.length).padStart(2, '0');
    sec.dataset.sv = i + 1;
    panel.classList.remove('in'); void panel.offsetWidth; panel.classList.add('in');
  };
  const mo = new MutationObserver(sync);
  cards.forEach(c => mo.observe(c, { attributes: true, attributeFilter: ['class'] }));
  const first = cards[0].querySelector('.svc-info');
  title.innerHTML = first.querySelector('h3').innerHTML; desc.innerHTML = first.querySelector('p').innerHTML;
  count.textContent = '01 / ' + String(cards.length).padStart(2, '0');
});

// Founders: click card to open detail overlay
(() => {
  const cards = document.querySelectorAll('.fd-card');
  if (!cards.length) return;
  const modal = document.createElement('div');
  modal.className = 'fd-modal';
  modal.innerHTML = '<div class="fd-panel" role="dialog" aria-modal="true"><button class="fd-close" aria-label="Close">&times;</button><img alt=""><div class="fd-body"></div></div>';
  document.body.appendChild(modal);
  const img = modal.querySelector('img'), body = modal.querySelector('.fd-body');
  let last;
  const close = () => { modal.classList.remove('show'); document.body.classList.remove('fd-lock'); last && last.focus(); };
  const open = card => {
    last = card;
    const src = card.querySelector('img');
    img.src = src.src; img.alt = src.alt;
    body.innerHTML = '';
    ['h3', '.fd-role', '.fd-bio'].forEach(s => body.appendChild(card.querySelector(s).cloneNode(true)));
    const h = body.querySelector('h3');
    h.innerHTML = [...h.textContent].map((c, i) => c === ' ' ? ' ' : `<span class="ch" style="transition-delay:${0.1 + i * 0.03}s">${c}</span>`).join('');
    body.querySelectorAll('.fd-bio > *').forEach((el, i) => el.style.transitionDelay = (0.7 + i * 0.15) + 's');
    modal.querySelector('.fd-panel').scrollTop = 0;
    document.body.classList.add('fd-lock');
    requestAnimationFrame(() => modal.classList.add('show'));
    modal.querySelector('.fd-close').focus();
  };
  cards.forEach(card => {
    card.addEventListener('click', () => open(card));
    card.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(card); } });
  });
  modal.addEventListener('click', e => { if (e.target === modal || e.target.closest('.fd-close')) close(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && modal.classList.contains('show')) close(); });
})();

// Stats: play text animations every time the section scrolls into view
document.querySelectorAll('.exp-stats').forEach(el => new IntersectionObserver((en, obs) => {
  el.classList.toggle('tx-in', en[0].isIntersecting); // replay each time it comes into view
}, { threshold: .3 }).observe(el));

// LBG intro text: slide in every time it comes into view
document.querySelectorAll('#lbg .biz-head').forEach(el => new IntersectionObserver(en => {
  if (en[0].isIntersecting) { el.classList.remove('sl-in'); void el.offsetWidth; el.classList.add('sl-in'); }
  else el.classList.remove('sl-in');
}, { threshold: .2 }).observe(el));

// Brands: clicking a logo stops its row (logo stays highlighted) while the other rows keep moving; click again to resume
document.querySelectorAll('.ln-stream .ln-logo').forEach(l => l.addEventListener('click', e => {
  e.stopPropagation();
  const row = l.closest('.ln-stream'), was = l.classList.contains('pick');
  document.querySelectorAll('.ln-logo.pick').forEach(x => x.classList.remove('pick'));
  document.querySelectorAll('.ln-stream.held').forEach(r => r.classList.remove('held'));
  if (!was) { l.classList.add('pick'); row.classList.add('held'); }
}));
document.addEventListener('click', () => {
  document.querySelectorAll('.ln-logo.pick').forEach(x => x.classList.remove('pick'));
  document.querySelectorAll('.ln-stream.held').forEach(r => r.classList.remove('held'));
});
