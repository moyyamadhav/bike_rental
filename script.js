/* ================= HELPERS ================= */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const money = n => '₹' + Math.round(n).toLocaleString('en-IN');
const load = (k, d) => {
  try { const v = JSON.parse(localStorage.getItem(k)); return v ?? d; }
  catch { return d; }
};
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const uid = () => Math.random().toString(36).slice(2, 8).toUpperCase();
const fmt = v => new Date(v).toLocaleString('en-IN', { dateStyle: 'medium', timeStyle: 'short' });
const daysBetween = (a, b) => Math.max(1, Math.ceil((new Date(b) - new Date(a)) / 864e5));

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 2600);
}

function openModal(id) {
  $('#' + id).classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeModal(id) {
  $('#' + id).classList.remove('open');
  document.body.style.overflow = '';
}

/* Simple inline bike illustration (SVG) */
function bikeSVG(color) {
  return `
<svg class="bike-svg" viewBox="0 0 200 120" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
  <circle cx="45" cy="85" r="26" fill="none" stroke="currentColor" stroke-width="6"/>
  <circle cx="155" cy="85" r="26" fill="none" stroke="currentColor" stroke-width="6"/>
  <circle cx="45" cy="85" r="5" fill="currentColor"/>
  <circle cx="155" cy="85" r="5" fill="currentColor"/>
  <path d="M45 85 L85 55 L125 85 M85 55 L70 85 L125 85 M85 55 L100 40 L120 40 L155 85"
        fill="none" stroke="${color}" stroke-width="7" stroke-linejoin="round" stroke-linecap="round"/>
  <path d="M74 38 L96 38" stroke="currentColor" stroke-width="7" stroke-linecap="round"/>
  <path d="M112 26 L130 26" stroke="currentColor" stroke-width="6" stroke-linecap="round"/>
</svg>`;
}

/* Photo if images/<bike-name>.jpg exists, otherwise the SVG shows through */
const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function bikeArt(item) {
  const name = item.name || item.bike;
  return bikeSVG(item.color) +
    `<img class="bike-photo" src="images/${slugify(name)}.jpg" alt="${name}" onerror="if(this.src.endsWith('.jpg')){this.src=this.src.replace('.jpg','.svg')}else{this.remove()}">`;
}

/* ================= DATA ================= */
const bikes = [
  { id: 1, name: 'Honda Activa 6G', brand: 'Honda',         type: 'Scooty',   transmission: 'Gearless', fuel: 'Petrol',   cc: 110, seats: 2, price: 250, color: '#ef4444', year: 2024 },
  { id: 2, name: 'Royal Enfield Classic 350', brand: 'Royal Enfield', type: 'Geared', transmission: 'Gear', fuel: 'Petrol', cc: 350, seats: 2, price: 800, color: '#111827', year: 2023 },
  { id: 3, name: 'Ather 450X',      brand: 'Ather',         type: 'Electric', transmission: 'Gearless', fuel: 'Electric', cc: 0,   seats: 2, price: 400, color: '#22c55e', year: 2024 },
  { id: 4, name: 'KTM Duke 200',    brand: 'KTM',           type: 'Sport',    transmission: 'Gear',     fuel: 'Petrol',   cc: 200, seats: 2, price: 700, color: '#f97316', year: 2023 },
  { id: 5, name: 'TVS Jupiter',     brand: 'TVS',           type: 'Scooty',   transmission: 'Gearless', fuel: 'Petrol',   cc: 110, seats: 2, price: 220, color: '#3b82f6', year: 2023 },
  { id: 6, name: 'Bajaj Pulsar NS200', brand: 'Bajaj',      type: 'Sport',    transmission: 'Gear',     fuel: 'Petrol',   cc: 200, seats: 2, price: 600, color: '#eab308', year: 2024 },
  { id: 7, name: 'Ola S1 Pro',      brand: 'Ola',           type: 'Electric', transmission: 'Gearless', fuel: 'Electric', cc: 0,   seats: 2, price: 350, color: '#8b5cf6', year: 2024 },
  { id: 8, name: 'Yamaha FZ-S',     brand: 'Yamaha',        type: 'Geared',   transmission: 'Gear',     fuel: 'Petrol',   cc: 150, seats: 2, price: 500, color: '#0ea5e9', year: 2023 },
];

const CITIES = {
  Hyderabad: ['Secunderabad Railway Station', 'Hitech City', 'Banjara Hills', 'Gachibowli'],
  Bengaluru: ['Majestic Bus Stand', 'Koramangala', 'Whitefield', 'Indiranagar'],
  Chennai:   ['Central Railway Station', 'T. Nagar', 'Velachery', 'Anna Nagar'],
  Mumbai:    ['Dadar Station', 'Bandra', 'Andheri', 'Colaba'],
};
const COUPONS = { WELCOME10: 0.10 };
const SHIPPING = 50;

/* State */
let search = load('search', null);
let user = load('user', null);
let current = null;      // bike being booked
let coupon = 0;          // coupon discount rate
let authMode = 'signup';

/* ================= THEME ================= */
function setTheme(name) {
  document.documentElement.dataset.theme = name;
  $('#themeSelect').value = name;
  save('theme', name);
}
$('#themeSelect').addEventListener('change', e => setTheme(e.target.value));
setTheme(load('theme', matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'));

/* ================= SEARCH FORM ================= */
const cityEl = $('#district');
const pickEl = $('#pickupLoc');
const dropEl = $('#dropLoc');
const pickAtEl = $('#pickAt');
const dropAtEl = $('#dropAt');
const searchForm = $('#searchForm');

cityEl.innerHTML = '<option value="">Select district</option>' +
  Object.keys(CITIES).map(c => `<option>${c}</option>`).join('');

function fillLocations(sel, city) {
  sel.innerHTML = '<option value="">Select location</option>' +
    (CITIES[city] || []).map(l => `<option>${l}</option>`).join('');
}
cityEl.addEventListener('change', () => {
  fillLocations(pickEl, cityEl.value);
  fillLocations(dropEl, cityEl.value);
});

// Prevent picking dates in the past
const localNow = d => new Date(d - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
pickAtEl.min = dropAtEl.min = localNow(new Date());

// Restore last search
if (search) {
  cityEl.value = search.city;
  fillLocations(pickEl, search.city);
  fillLocations(dropEl, search.city);
  pickEl.value = search.pickup;
  dropEl.value = search.drop;
  pickAtEl.value = search.pickAt;
  dropAtEl.value = search.dropAt;
}

searchForm.addEventListener('submit', e => {
  e.preventDefault();
  const data = {
    city: cityEl.value,
    pickup: pickEl.value,
    drop: dropEl.value,
    pickAt: pickAtEl.value,
    dropAt: dropAtEl.value,
  };
  if (Object.values(data).some(v => !v)) return toast('Please fill all required fields');
  if (new Date(data.dropAt) <= new Date(data.pickAt)) return toast('Drop-off must be after pick-up');

  search = data;
  save('search', data);
  renderBikes();
  $('#bikes').scrollIntoView({ behavior: 'smooth' });
  toast(`Showing bikes for ${daysBetween(data.pickAt, data.dropAt)} day(s)`);
});

/* ================= BIKE CATALOG ================= */
const cardHTML = b => `
<article class="bike-card">
  <div class="bike-img" style="color:var(--text)">${bikeArt(b)}</div>
  <div class="bike-head">
    <div>
      <div class="bike-name">${b.name}</div>
      <small class="muted">${b.brand}</small>
    </div>
    <div class="price">${money(b.price)}<small>Per Day</small></div>
  </div>
  <div class="bike-meta">
    <span>${b.type}</span>
    <span>${b.fuel}</span>
    <span>${b.transmission}</span>
    <span>${b.cc ? b.cc + ' cc' : 'Battery'}</span>
  </div>
  <div class="card-actions">
    <button class="btn btn-primary btn-sm" data-book="${b.id}">Book Ride</button>
    <button class="btn btn-dark btn-sm" data-details="${b.id}">Details</button>
  </div>
</article>`;

function getFilters() {
  return {
    types: $$('input[name=type]:checked').map(i => i.value),
    trans: $$('input[name=trans]:checked').map(i => i.value),
  };
}

function renderBikes() {
  const f = getFilters();
  const sort = $('#sort').value;

  let list = bikes.filter(b =>
    (!f.types.length || f.types.includes(b.type)) &&
    (!f.trans.length || f.trans.includes(b.transmission))
  );

  list.sort((a, b) =>
    sort === 'high' ? b.price - a.price :
    sort === 'name' ? a.name.localeCompare(b.name) :
    a.price - b.price
  );

  $('#count').textContent = `${list.length} bike(s) available`;
  $('#bikeGrid').innerHTML = list.length
    ? list.map(cardHTML).join('')
    : '<p class="empty">No bikes match these filters.</p>';
}

$('#applyFilters').addEventListener('click', renderBikes);
$('#resetFilters').addEventListener('click', () => {
  $$('.filters input').forEach(i => (i.checked = false));
  $('#sort').value = 'low';
  renderBikes();
});
$('#sort').addEventListener('change', renderBikes);

$('#bikeGrid').addEventListener('click', e => {
  const book = e.target.dataset.book;
  const det = e.target.dataset.details;
  if (book) openBooking(+book);
  if (det) showDetails(+det);
});

/* ================= DETAILS MODAL ================= */
function showDetails(id) {
  const b = bikes.find(x => x.id === id);
  $('#detailsBody').innerHTML = `
    <div class="details">
      <div class="bike-img" style="color:var(--text)">${bikeArt(b)}</div>
      <div>
        <h2>${b.name}</h2>
        <p class="muted">${b.brand} · ${b.type}</p>
        <p class="price-inline">${money(b.price)} / day</p>
        <ul class="spec">
          <li>Fuel: ${b.fuel}</li>
          <li>Transmission: ${b.transmission}</li>
          <li>Engine: ${b.cc ? b.cc + ' cc' : 'Electric'}</li>
          <li>Seats: ${b.seats}</li>
          <li>Model year: ${b.year}</li>
        </ul>
        <button class="btn btn-primary" data-book-from-details="${b.id}">Book Ride</button>
      </div>
    </div>`;
  openModal('detailsModal');
}

$('#detailsBody').addEventListener('click', e => {
  const id = e.target.dataset.bookFromDetails;
  if (id) {
    closeModal('detailsModal');
    openBooking(+id);
  }
});

/* ================= BOOKING ================= */
function bookingTotals() {
  const days = daysBetween(search.pickAt, search.dropAt);
  const rent = current.price * days;
  const discount = Math.round(rent * coupon);
  return { days, rent, discount, shipping: SHIPPING, total: rent - discount + SHIPPING };
}

function renderSummary() {
  const t = bookingTotals();

  $('#sumBike').innerHTML = `
    <div class="bike-img small" style="color:var(--text)">${bikeArt(current)}</div>
    <div>
      <h3>${current.name}</h3>
      <p class="muted small">${current.type} · ${current.transmission} · ${current.fuel}</p>
      <p class="price-inline">${money(current.price)} / day</p>
    </div>`;

  $('#sumPlaces').innerHTML = `
    <div>
      <h4>Pick up</h4>
      <p>${search.city}: ${search.pickup}</p>
      <p class="muted">${fmt(search.pickAt)}</p>
    </div>
    <div>
      <h4>Drop off</h4>
      <p>${search.city}: ${search.drop}</p>
      <p class="muted">${fmt(search.dropAt)}</p>
    </div>`;

  $('#sumRows').innerHTML = [
    ['Rent', money(current.price)],
    ['Days', t.days],
    ['Subtotal', money(t.rent)],
    ['Coupon', t.discount ? '- ' + money(t.discount) : '₹0'],
    ['Shipping', money(t.shipping)],
  ].map(([k, v]) => `<div class="summary-row"><span>${k}</span><span>${v}</span></div>`).join('') +
    `<div class="summary-row total"><span>Total</span><span>${money(t.total)}</span></div>`;
}

function openBooking(id) {
  if (!search) {
    toast('Pick your locations and dates first');
    $('#search').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  current = bikes.find(b => b.id === id);
  coupon = 0;
  $('#couponInput').value = '';

  // Prefill from logged-in user
  if (user) {
    $('#oName').value = user.name;
    $('#oEmail').value = user.email;
  }

  renderSummary();
  openModal('bookingModal');
}

$('#applyCoupon').addEventListener('click', () => {
  const code = $('#couponInput').value.trim().toUpperCase();
  if (COUPONS[code] !== undefined) {
    coupon = COUPONS[code];
    toast(`Coupon applied: ${coupon * 100}% off`);
  } else {
    coupon = 0;
    toast('Invalid coupon code');
  }
  renderSummary();
});
$('#couponInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    e.preventDefault();
    $('#applyCoupon').click();
  }
});

$('#orderForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));

  if (!f.name.trim()) return toast('Enter your name');
  if (!/^\d{10}$/.test(f.phone)) return toast('Enter a valid 10-digit phone number');
  if (!/^\S+@\S+\.\S+$/.test(f.email)) return toast('Enter a valid email');
  if (!f.address.trim()) return toast('Enter your address');

  const t = bookingTotals();
  const booking = {
    id: 'BK' + uid(),
    bikeId: current.id,
    bike: current.name,
    type: current.type,
    color: current.color,
    city: search.city,
    pickup: search.pickup,
    drop: search.drop,
    pickAt: search.pickAt,
    dropAt: search.dropAt,
    days: t.days,
    total: t.total,
    method: f.method,
    customer: f.name.trim(),
    email: f.email,
    status: 'Confirmed',
    createdAt: new Date().toISOString(),
  };

  const list = load('bookings', []);
  list.unshift(booking);
  save('bookings', list);

  closeModal('bookingModal');
  e.target.reset();
  renderBookings();
  toast('Booking confirmed! ID ' + booking.id);
  $('#bookings').scrollIntoView({ behavior: 'smooth' });
});

/* ================= MY BOOKINGS ================= */
function renderBookings() {
  const list = load('bookings', []);
  $('#bookingsList').innerHTML = list.length
    ? list.map(b => `
      <div class="booking-item">
        <div class="bike-img small" style="color:var(--text)">${bikeArt(b)}</div>
        <div>
          <h3>${b.bike} <span class="tag">${b.status}</span></h3>
          <p class="muted small">ID ${b.id} · ${b.city}: ${b.pickup} → ${b.drop}</p>
          <p class="muted small">${fmt(b.pickAt)} → ${fmt(b.dropAt)} · ${b.days} day(s)</p>
          <p><strong>${money(b.total)}</strong> · ${b.method.toUpperCase()}</p>
        </div>
        <button class="btn btn-danger btn-sm" data-cancel="${b.id}">Cancel</button>
      </div>`).join('')
    : '<p class="empty">No bookings yet. Book a ride to see it here.</p>';
}

$('#bookingsList').addEventListener('click', e => {
  const id = e.target.dataset.cancel;
  if (!id) return;
  if (!confirm('Cancel this booking?')) return;
  save('bookings', load('bookings', []).filter(b => b.id !== id));
  renderBookings();
  toast('Booking cancelled');
});

/* ================= AUTH ================= */
function renderAuth() {
  $('#signInBtn').hidden = !!user;
  $('#signUpBtn').textContent = user ? 'Sign Out' : 'Sign Up';
  if (user) $('#signUpBtn').title = `Signed in as ${user.name}`;
}

function setAuthMode(mode) {
  authMode = mode;
  $$('.auth-tab').forEach(t => t.classList.toggle('active', t.dataset.mode === mode));
  $('#nameField').hidden = mode === 'signin';
  $('#authTitle').textContent = mode === 'signup' ? 'Sign Up' : 'Sign In';
  $('#authSubmit').textContent = mode === 'signup' ? 'Register' : 'Sign In';
}

$$('.auth-tab').forEach(t => t.addEventListener('click', () => setAuthMode(t.dataset.mode)));

$('#signInBtn').addEventListener('click', () => {
  setAuthMode('signin');
  openModal('authModal');
});

$('#signUpBtn').addEventListener('click', () => {
  if (user) {
    user = null;
    save('user', null);
    renderAuth();
    toast('Signed out');
    return;
  }
  setAuthMode('signup');
  openModal('authModal');
});

$('#authForm').addEventListener('submit', e => {
  e.preventDefault();
  const f = Object.fromEntries(new FormData(e.target));
  const users = load('users', []);

  if (authMode === 'signup') {
    if (!f.name.trim() || !/^\S+@\S+\.\S+$/.test(f.email) || f.password.length < 6) {
      return toast('Fill all fields (password min 6 characters)');
    }
    if (users.some(u => u.email === f.email)) return toast('Email already registered');
    users.push({ name: f.name.trim(), email: f.email, password: f.password });
    save('users', users);
    user = { name: f.name.trim(), email: f.email };
  } else {
    const found = users.find(u => u.email === f.email && u.password === f.password);
    if (!found) return toast('Wrong email or password');
    user = { name: found.name, email: found.email };
  }

  save('user', user);
  e.target.reset();
  closeModal('authModal');
  renderAuth();
  toast(`Welcome, ${user.name}!`);
});

/* ================= CONTACT ================= */
$('#contactForm').addEventListener('submit', e => {
  e.preventDefault();
  e.target.reset();
  toast('Thanks! We will get back to you soon.');
});

/* ================= MODAL CLOSE HANDLERS ================= */
$$('[data-close]').forEach(b => b.addEventListener('click', () => closeModal(b.dataset.close)));
$$('.modal').forEach(m => m.addEventListener('click', e => {
  if (e.target === m) closeModal(m.id);
}));
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') $$('.modal.open').forEach(m => closeModal(m.id));
});

/* ================= INIT ================= */
$('#year').textContent = new Date().getFullYear();
$('#heroBike').innerHTML = bikeSVG('#22c55e');
renderAuth();
renderBikes();
renderBookings();