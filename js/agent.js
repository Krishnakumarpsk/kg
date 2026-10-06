// Kavisuga AI Agent — answers client questions from the group's own information
(() => {
  const PHONE = '+91 97880 17475 / +91 97880 24949';
  const WA = 'https://wa.me/919788017475';
  const CONTACT = `<div class="ka-ct">
    <a href="tel:+919788017475"><i class="fa-solid fa-phone"></i>+91 97880 17475</a>
    <a href="tel:+919788024949"><i class="fa-solid fa-phone"></i>+91 97880 24949</a>
    <a href="mailto:lingabhairavigraphics@gmail.com"><i class="fa-solid fa-envelope"></i>lingabhairavigraphics@gmail.com</a>
    <a href="mailto:kavisugafashions@gmail.com"><i class="fa-solid fa-envelope"></i>kavisugafashions@gmail.com</a>
    <a class="wa" href="${WA}" target="_blank" rel="noopener"><i class="fa-brands fa-whatsapp"></i>Chat on WhatsApp</a></div>`;

  // Each entry: keywords (weighted by match) and the answer
  const KB = [
    { k: ['hi', 'hello', 'hey', 'vanakkam', 'good morning', 'good evening'],
      a: 'Welcome to Kavisuga Group! I am the Kavisuga AI Agent. Ask me about our services, products, DTF printing, uniforms, design courses, founders or contact details.' },
    { k: ['kavisuga group', 'about', 'who are you', 'company', 'group', 'what do you do', 'ecosystem'],
      a: 'Kavisuga Group is a complete textile ecosystem from Tiruppur, India, built on three companies:<br>• <b>Linga Bhairavi Graphics</b> – textile graphic design (since 2017)<br>• <b>Kavisuga Fashions Pvt Ltd</b> – garment & DTF manufacturing (since 2025)<br>• <b>Adiyogi Design Academy</b> – design education<br><i>Design • Manufacture • Educate</i>' },
    { k: ['linga', 'bhairavi', 'lbg', 'graphic', 'graphics', 'design service', 'artwork'],
      a: '<b>Linga Bhairavi Graphics</b> (est. 2017) provides professional textile graphic design for the garment industry: textile graphic designing, screen print colour separation, digital artwork, photo print & CMYK separation, DTF artwork and production-ready garment designs.' },
    { k: ['service', 'services', 'offer', 'provide'],
      a: 'Our services:<br>• Textile Graphic Designing<br>• Screen Print Colour Separation<br>• Digital Artwork Creation<br>• Photo Print & CMYK Separation<br>• DTF Artwork<br>• Production-Ready Garment Designs<br>Plus manufacturing of DTF stickers, kidswear, uniforms and custom apparel.' },
    { k: ['separation', 'colour separation', 'color separation', 'screen print', 'spot colour', 'cmyk', 'photo print'],
      a: 'We do professional <b>screen print colour separation</b> with accurate spot colours, clean layers and registration-ready files, and <b>photo print / CMYK separation</b> with tonal control and colour balancing — print-ready for textile production.' },
    { k: ['dtf', 'sticker', 'transfer', 'heat transfer', 'oeko', 'ink'],
      a: '<b>DTF</b> is handled by Kavisuga Fashions: export-focused DTF sticker manufacturing using quality materials and <b>OEKO-TEX certified inks</b>, with attention to colour, detailing, adhesion and finishing. We also prepare DTF-optimised artwork with sharp details and correct sizing.' },
    { k: ['kavisuga fashions', 'manufacturing', 'manufacture', 'factory', 'production', 'caring for tomorrow'],
      a: '<b>Kavisuga Fashions Private Limited</b> — “Caring for Tomorrow” — started in 2025 to extend our design expertise into manufacturing. Focus areas: DTF sticker manufacturing, kids garments, corporate & school uniforms, custom apparel and promotional garments.' },
    { k: ['product', 'products', 'kids', 'kidswear', 'children', 'baby', 'garment', 'garments', 't-shirt', 'tshirt', 'printed'],
      a: 'Our products: <b>Kidswear</b>, <b>School Uniforms</b>, <b>Corporate Uniforms</b>, <b>Printed T-Shirts</b>, custom and promotional apparel — made comfortable for children and reliable for customers.' },
    { k: ['uniform', 'uniforms', 'school', 'corporate', 'office', 'promotional', 'custom', 'bulk'],
      a: 'Yes, we manufacture <b>school uniforms, corporate uniforms, custom and promotional garments</b>. Share your quantity, sizes and design, and our team will send you a quote:<br>' + CONTACT },
    { k: ['price', 'cost', 'rate', 'quote', 'quotation', 'charges', 'moq', 'minimum', 'order'],
      a: 'Pricing depends on design, quantity, fabric and printing method. Please share your requirement and we will send a quotation quickly:<br>' + CONTACT },
    { k: ['academy', 'adiyogi', 'course', 'courses', 'class', 'training', 'learn', 'student', 'fees', 'admission', 'join', 'coreldraw', 'photoshop', 'illustrator'],
      a: '<b>Adiyogi Design Academy</b> offers industry-oriented training (1000+ students trained):<br>• Textile Design • Fashion Design • Graphic Design<br>• CorelDRAW, Photoshop & Illustrator<br>• Pattern & Repeat Design • Garment Construction<br>• Colour separation & production<br>Click <b>“Start Learning Today”</b> on the website or contact us for fees and batch details.' },
    { k: ['founder', 'founders', 'owners', 'leadership', 'who runs', 'management'],
      a: 'Kavisuga Group is led by two founders:<br><br><b>Kaviyarasu Annadurai</b> — Textile Designer, Entrepreneur, Creative Professional & Coach with <b>22+ years</b> in textiles. He leads Linga Bhairavi Graphics, Kavisuga Fashions and Adiyogi Design Academy.<br><br><b>Suganya Kaviyarasu</b> (M.A., M.Ed.) — Managing Director of Kavisuga Fashions Pvt Ltd, leading strategic growth, people development and customer relationships.' },
    { k: ['owner', 'ceo', 'kaviyarasu', 'annadurai'],
      a: '<b>Kaviyarasu Annadurai</b> — Textile Designer, Entrepreneur, Creative Professional & Coach with <b>22+ years</b> in textiles. He leads Linga Bhairavi Graphics, Kavisuga Fashions and Adiyogi Design Academy. <i>Design. Manufacture. Educate. Empower.</i>' },
    { k: ['suganya', 'managing director', 'md', 'director'],
      a: '<b>Suganya Kaviyarasu</b> (M.A., M.Ed.) is the Managing Director of Kavisuga Fashions Pvt Ltd, leading strategic growth, people development and customer relationships. <i>“Leading with Purpose. Growing with People.”</i>' },
    { k: ['experience', 'years', 'how long', 'since', 'established'],
      a: 'We bring <b>22+ years</b> of textile industry experience. Linga Bhairavi Graphics was established in 2017 and Kavisuga Fashions in 2025, serving 100+ happy customers with 1 lakh+ designs delivered.' },
    { k: ['country', 'countries', 'export', 'international', 'global', 'abroad', 'ship', 'shipping', 'worldwide'],
      a: 'Yes! We serve customers across <b>20+ countries</b> from Tiruppur, India, with export-ready graphics and export-focused DTF output. We work with <b>40+ brands</b>.' },
    { k: ['brand', 'brands', 'clients', 'customers'],
      a: 'We work with <b>40+ brands</b> and 100+ happy customers across 20+ countries. See the “Brands We Work For” and “Testimonials” sections on our website.' },
    { k: ['vision', 'mission', 'goal', 'belief'],
      a: '<b>Vision:</b> 1000 professional designers, 10,000 families supported, and a Rs. 100 crore enterprise in the next decade.<br><b>Mission:</b> Production-ready design and dependable garment solutions, sharing industry knowledge and building sustainable opportunities.' },
    { k: ['address', 'location', 'where', 'located', 'office', 'tiruppur', 'visit', 'map'],
      a: '<i class="fa-solid fa-location-dot" style="color:var(--red,#dc2c1e)"></i> 37/15, Kumarasamy Layout 1st Street, Renganatha Puram, Tiruppur, Tamil Nadu 641607, India.' },
    { k: ['contact', 'phone', 'call', 'number', 'mobile', 'email', 'mail', 'whatsapp', 'reach', 'talk'],
      a: 'You can reach us here:' + CONTACT },
    { k: ['delivery', 'time', 'turnaround', 'how fast', 'days', 'urgent'],
      a: 'Turnaround depends on the job size. Design and separation work is usually quick, and bulk production timelines are confirmed with your quote. For urgent work please call or WhatsApp:<br>' + CONTACT },
    { k: ['quality', 'certified', 'certificate', 'safe'],
      a: 'Quality is at the heart of what we do — production-ready files, OEKO-TEX certified inks for DTF, and careful attention to colour, adhesion and finishing.' },
    { k: ['thank', 'thanks', 'ok', 'great', 'nice'],
      a: 'You are welcome! 😊 Anything else I can help you with?' },
  ];

  const norm = s => s.toLowerCase().replace(/[^a-z0-9\s-]/g, ' ');
  const answer = q => {
    const t = ' ' + norm(q) + ' ';
    // score every topic, then answer each topic the customer actually asked about (max 3)
    const hits = KB.map(e => {
      let s = 0;
      e.k.forEach(k => { if (t.includes(' ' + k + ' ') || (k.length > 4 && t.includes(k))) s += k.split(' ').length * 2 + (k.length > 5 ? 1 : 0); });
      return { e, s };
    }).filter(h => h.s > 0).sort((a, b) => b.s - a.s);
    if (!hits.length) return 'I’m not sure about that one. Our team will be happy to help you directly:' + CONTACT;
    const top = hits.filter(h => h.s >= hits[0].s * 0.6 && h.e !== KB[0]).slice(0, 3);
    if (!top.length) return hits[0].e.a;
    let out = top.map(h => h.e.a).join('<hr class="ka-hr">');
    // one contact block at most
    const parts = out.split(CONTACT); if (parts.length > 2) out = parts.join('') + CONTACT;
    return out;
  };

  const css = `
  .ka-btn{position:fixed;right:22px;bottom:22px;z-index:900;display:flex;align-items:center;gap:7px;padding:6px 14px 6px 6px;border:0;border-radius:30px;background:var(--red,#dc2c1e);color:#fff;font:700 14px Inter,Arial,sans-serif;letter-spacing:.5px;cursor:pointer;box-shadow:0 10px 26px rgba(220,44,30,.3);transition:transform .3s}
  .ka-btn img{width:32px!important;height:32px!important;border-radius:50%!important}
  .ka-hr{border:0;border-top:1px solid #eee;margin:10px 0}
  .ka-btn:hover{transform:translateY(-3px)}
  .ka-btn img,.ka-head .av img{width:100%;height:100%;object-fit:cover;border-radius:inherit}
  .ka-ct{display:flex;flex-direction:column;gap:7px;margin-top:8px}
  .ka-ct a{display:flex;align-items:center;gap:9px;color:var(--text,#222)!important;font-weight:500!important;text-decoration:none;white-space:nowrap;font-size:13.5px}
  .ka-ct a i{width:16px;text-align:center;color:var(--red,#dc2c1e)}
  .ka-ct a.wa{justify-content:center;margin-top:4px;padding:8px;border-radius:10px;background:var(--red,#dc2c1e);color:#fff!important;font-weight:600!important}
  .ka-ct a.wa i{color:#fff}
  .ka-box{position:fixed;right:22px;bottom:86px;z-index:900;width:360px;max-width:calc(100vw - 32px);height:520px;max-height:calc(100vh - 120px);display:flex;flex-direction:column;background:#fff;border-radius:20px;overflow:hidden;box-shadow:0 24px 60px rgba(0,0,0,.22);opacity:0;visibility:hidden;transform:translateY(20px) scale(.97);transition:opacity .35s,transform .35s,visibility .35s;font-family:Inter,Arial,sans-serif}
  .ka-box.show{opacity:1;visibility:visible;transform:none}
  .ka-head{background:var(--red,#dc2c1e);color:#fff;padding:14px 16px;display:flex;align-items:center;gap:10px}
  .ka-head .av{width:40px;height:40px;border-radius:10px;border:2px solid #fff;overflow:hidden}
  .ka-head b{display:block;font-size:15px}.ka-head small{opacity:.85;font-size:12px}
  .ka-head button{margin-left:auto;background:none;border:0;color:#fff;font-size:24px;cursor:pointer}
  .ka-head{background:var(--red,#dc2c1e)!important}
  .ka-brand{background:#fff;border-radius:10px;padding:6px 10px}
  .ka-brand img{height:36px;width:auto;display:block}
  .ka-brand small{display:flex;align-items:center;gap:6px;margin-top:5px;color:var(--muted,#555);font-size:11.5px;opacity:1}
  .ka-brand small i{width:7px;height:7px;border-radius:50%;background:var(--red,#dc2c1e)}
  .ka-head button{color:#fff!important}
  .ka-msgs{flex:1;overflow-y:auto;padding:16px;background:var(--grey,#f3f3f3);display:flex;flex-direction:column;gap:10px}
  .ka-m{max-width:85%;padding:10px 13px;border-radius:14px;font-size:14px;line-height:1.55;color:var(--text,#222);animation:kaIn .35s ease}
  .ka-m a{color:var(--red,#dc2c1e);font-weight:600}
  .ka-bot{background:#fff;align-self:flex-start;border-bottom-left-radius:4px}
  .ka-me{background:var(--red,#dc2c1e);color:#fff;align-self:flex-end;border-bottom-right-radius:4px}
  .ka-typing span{display:inline-block;width:7px;height:7px;margin:0 2px;border-radius:50%;background:var(--muted,#555);animation:kaDot 1s infinite}
  .ka-typing span:nth-child(2){animation-delay:.15s}.ka-typing span:nth-child(3){animation-delay:.3s}
  .ka-chips{display:flex;flex-wrap:wrap;gap:6px;padding:8px 12px;background:#fff;border-top:1px solid #eee}
  .ka-chips button{border:1px solid var(--red,#dc2c1e);background:#fff;color:var(--red,#dc2c1e);border-radius:20px;padding:5px 10px;font-size:12px;cursor:pointer}
  .ka-chips button:hover{background:var(--red,#dc2c1e);color:#fff}
  .ka-form{display:flex;gap:8px;padding:10px 12px;background:#fff;border-top:1px solid #eee}
  .ka-form input{flex:1;border:1px solid #ddd;border-radius:24px;padding:10px 14px;font-size:14px;outline:none}
  .ka-form input:focus{border-color:var(--red,#dc2c1e)}
  .ka-form button{width:42px;height:42px;border:0;border-radius:50%;background:var(--red,#dc2c1e);color:#fff;cursor:pointer}
  @keyframes kaIn{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
  @keyframes kaDot{0%,80%,100%{opacity:.3}40%{opacity:1}}
  @media(max-width:520px){.ka-box{right:16px;bottom:80px}}`;
  document.head.insertAdjacentHTML('beforeend', `<style>${css}</style>`);

  document.body.insertAdjacentHTML('beforeend', `
  <button class="ka-btn" aria-label="Open Kavisuga AI Agent"><img src="assets/logos/kavisuga-icon.png" alt="Kavisuga Group"><span>AI</span></button>
  <div class="ka-box" role="dialog" aria-label="Kavisuga AI Agent">
    <div class="ka-head"><div class="ka-brand"><img src="assets/logos/kavisuga-group.png" alt="Kavisuga Group"></div><button aria-label="Close">&times;</button></div>
    <div class="ka-msgs"></div>
    <div class="ka-chips">${['Services', 'DTF printing', 'Uniforms', 'Courses', 'Founders', 'Get a quote', 'Contact'].map(c => `<button>${c}</button>`).join('')}</div>
    <form class="ka-form"><input type="text" placeholder="Type your question..." aria-label="Your question"><button aria-label="Send"><i class="fa-solid fa-paper-plane"></i></button></form>
  </div>`);

  const box = document.querySelector('.ka-box'), msgs = box.querySelector('.ka-msgs'), input = box.querySelector('input');
  const add = (html, who) => { const d = document.createElement('div'); d.className = 'ka-m ka-' + who; d.innerHTML = html; msgs.appendChild(d); msgs.scrollTop = msgs.scrollHeight; return d; };
  const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const ask = q => {
    if (!q.trim()) return;
    add(esc(q), 'me');
    const t = add('<span class="ka-typing"><span></span><span></span><span></span></span>', 'bot');
    setTimeout(() => { t.innerHTML = answer(q); msgs.scrollTop = msgs.scrollHeight; }, 600);
  };
  let greeted = false;
  document.querySelector('.ka-btn').addEventListener('click', () => {
    box.classList.toggle('show');
    if (!greeted) { greeted = true; add(KB[0].a, 'bot'); }
    if (box.classList.contains('show')) input.focus();
  });
  box.querySelector('.ka-head button').addEventListener('click', () => box.classList.remove('show'));
  box.querySelector('.ka-form').addEventListener('submit', e => { e.preventDefault(); ask(input.value); input.value = ''; });
  box.querySelectorAll('.ka-chips button').forEach(b => b.addEventListener('click', () => ask(b.textContent)));
})();
