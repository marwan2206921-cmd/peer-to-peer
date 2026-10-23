import { api } from "./api.js";

import { CURRENCY } from "./data.js";

const app = document.querySelector("#app");
const modal = document.querySelector("#modal");

// Shared helpers used throughout the page renderers.
const esc = (value = "") =>
  String(value).replace(
    /[&<>"']/g,
    (character) =>
      ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;",
      })[character],
  );

const money = (amount) =>
  Number(amount) === 0
    ? "Free"
    : new Intl.NumberFormat(CURRENCY.locale, {
        style: "currency",
        currency: CURRENCY.code,
        maximumFractionDigits: CURRENCY.digits,
      }).format(amount);

const date = (value) =>
  new Intl.DateTimeFormat("en", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(new Date(value));

const current = () => JSON.parse(localStorage.getItem("cbe-user") || "null");

function setUser(user) {
  if (user) {
    localStorage.setItem("cbe-user", JSON.stringify(user));
  } else {
    localStorage.removeItem("cbe-user");
  }
}

const url = (path) => `#/${path}`;

function go(path) {
  location.hash = `/${path}`;
}

const icon = (name) =>
  ({
    bookmark:
      '<svg viewBox="0 0 26 32" aria-hidden="true"><path d="M4 2h18v27l-9-6-9 6z" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M8 8h10M8 12h7" stroke="currentColor" stroke-width="1.7"/></svg>',
    search:
      '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8" fill="none" stroke="currentColor" stroke-width="2"/><path d="m16 16 5 5" stroke="currentColor" stroke-width="2"/></svg>',
    arrow: "↗",
    close: "×",
  })[name] || "";

// Shared page frame and navigation.
function header() {
  const u = current();
  return `<header class="site-head"><a class="brand" href="${url("")}" aria-label="Campus Book Exchange home"><span class="bookmark">${icon("bookmark")}</span><span>Campus Book<br><b>Exchange</b></span></a><form class="header-search" id="quick-search"><label class="sr-only" for="q-head">Search books</label>${icon("search")}<input id="q-head" name="q" placeholder="Find a book, author, ISBN…"><button aria-label="Search">↵</button></form><button class="mobile-search" id="mobile-search" aria-label="Open search">${icon("search")}</button><nav class="main-nav" aria-label="Main navigation"><a href="${url("")}">Browse</a>${u?.role === "student" ? `<a href="${url("my-listings")}">My shelf</a><a href="${url("inbox")}">Inbox</a>` : ""}${u?.role === "admin" ? `<a href="${url("admin")}">Desk</a><a href="${url("admin/listings")}">Catalog</a><a href="${url("admin/accounts")}">Accounts</a><a href="${url("admin/inquiries")}">Inquiries</a>` : ""}</nav><div class="head-actions">${u ? `<a class="account-link" href="${url(u.role === "admin" ? "admin" : "profile")}">${esc(u.name.split(" ")[0])} <span>⌄</span></a><button class="text-button" id="signout">Sign out</button>` : `<a class="text-button" href="${url("signin")}">Sign in</a><a class="button small" href="${url("register")}">Join the shelf ${icon("arrow")}</a>`}</div></header>`;
}
function footer() {
  return `<footer class="site-foot"><div class="foot-brand">${icon("bookmark")}<span>Books find<br>new readers.</span></div><p>A student-powered shelf for good books and fresh starts.</p><label class="demo-switch" for="demo-role">Preview as <select id="demo-role" aria-label="Preview the site as a demo role"><option value="visitor">Visitor</option><option value="student">Student</option><option value="admin">Admin</option></select></label><small>Campus Book Exchange · A student-powered shelf</small></footer>`;
}
function shell(content, admin = false) {
  document.body.classList.toggle("admin-mode", admin);
  app.innerHTML = `<div class="site-shell ${admin ? "admin-shell" : ""}">${header()}<main id="main-content">${content}</main>${footer()}</div>`;
  const user = current();
  const roleSelect = document.querySelector("#demo-role");
  roleSelect.value = user?.role || "visitor";
  roleSelect.addEventListener("change", async () => {
    const role = roleSelect.value;
    if (role === "visitor") {
      setUser(null);
      go("");
      return;
    }
    const accounts = await api.getAccounts();
    const demoUser = accounts.find((account) =>
      role === "admin"
        ? account.role === "admin"
        : account.role === "student" && account.status === "Active",
    );
    setUser(demoUser);
    go(role === "admin" ? "admin" : "");
  });
  document.querySelector("#signout")?.addEventListener("click", () => {
    setUser(null);
    go("");
  });
  document.querySelector("#quick-search")?.addEventListener("submit", (e) => {
    e.preventDefault();
    go(`?q=${encodeURIComponent(e.currentTarget.q.value)}`);
  });
  document.querySelector("#mobile-search")?.addEventListener("click", () => {
    document.querySelector(".header-search")?.classList.toggle("search-open");
    document.querySelector("#q-head")?.focus();
  });
}
// Reusable book artwork and catalog-card pieces.
function placeholder(book) {
  const title = esc(book.title || "A good read");
  if (book.cover)
    return `<img class="cover-art uploaded-cover" src="${esc(book.cover)}" alt="Cover of ${title}" loading="lazy">`;
  const initials = esc(
    (book.title || "Book")
      .split(/\s+/)
      .slice(0, 2)
      .map((x) => x[0])
      .join(""),
  );
  return `<div class="cover-art" style="--cover:${esc(book.color || "#1F5A4A")}" role="img" aria-label="Cover art placeholder for ${title}"><span class="cover-top">CAMPUS<br>EDITION</span><strong>${initials}</strong><span class="cover-name">${title}</span><span class="cover-bottom">BOOK EXCHANGE · ${esc(book.course || "NEW CHAPTER")}</span></div>`;
}
function stamp(status) {
  return `<span class="stamp stamp-${status.toLowerCase()}">${esc(status)}</span>`;
}
function card(b, i) {
  return `<article class="book-card" style="--tilt:${((i % 5) - 2) * 0.42}deg"><a href="${url(`book/${encodeURIComponent(b.id)}`)}" class="card-link" aria-label="View ${esc(b.title)}">${placeholder(b)}<span class="punch" aria-hidden="true"></span><div class="card-body"><div class="card-course">${esc(b.course)} <span>·</span> ${esc(b.isbn || "ISBN not listed")}</div><h3>${esc(b.title)}</h3><p class="byline">${esc(b.author || "Author unknown")}</p><div class="card-meta"><span class="condition-stamp">${esc(b.condition)}</span><span class="price-tag ${b.price === 0 ? "free-tag" : ""}">${b.price === 0 ? "✳ FREE" : esc(money(b.price))}</span></div><div class="card-date">Filed ${esc(date(b.createdAt))}</div></div></a></article>`;
}
function hero() {
  return `<section class="hero"><div class="hero-copy"><p class="eyebrow"><span class="eyebrow-mark">✳</span> THE CAMPUS BOOKSHELF</p><h1>Good books.<br><em>New chapters.</em></h1><p class="hero-intro">Pass a great read forward. Find the course book you need, from a student who’s already turned the page.</p><form class="hero-search" id="hero-search"><label class="sr-only" for="hero-q">Search by title, author, or ISBN</label>${icon("search")}<input id="hero-q" name="q" placeholder="Title, author, or ISBN"><button class="button">Find your book ${icon("arrow")}</button></form><div class="hero-note"><span class="underline-scribble">Free books</span> live here too. Always student to student.</div></div><div class="hero-art" aria-hidden="true"><div class="sunburst"></div><div class="hero-stack stack-one"><i></i><b>THE<br>NEXT<br>CHAPTER</b><small>READ · PASS · REPEAT</small></div><div class="hero-stack stack-two"><i></i><b>FOUND<br>ON CAMPUS</b><small>LIBRARY COPY NO. 01</small></div><div class="hero-sticker">GOOD<br>BOOKS<br>LIVE HERE</div><span class="hero-spark">✳</span></div><div class="hero-index">01 / THE OPEN SHELF</div></section>`;
}
function filtersMarkup() {
  return `<details class="filter-drawer" id="filter-drawer"><summary>Filter the shelf <span>＋</span></summary><form id="filter-form" class="filters"><label>Course code<input name="course" placeholder="e.g. CS-301"></label><label>Condition<select name="condition"><option value="">Any condition</option>${["New", "Like new", "Good", "Fair", "Worn"].map((x) => `<option>${x}</option>`).join("")}</select></label><label>Min price<input name="min" type="number" min="0" placeholder="0"></label><label>Max price<input name="max" type="number" min="0" placeholder="Any"></label><button class="button filter-apply">Apply filters</button><button type="button" class="text-button clear-filters">Clear all</button></form></details>`;
}
// Visitor catalog and listing detail pages.
async function catalog() {
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  const state = {
    query: params.get("q") || "",
    course: "",
    condition: "",
    min: "",
    max: "",
    sort: "newest",
  };
  shell(
    `${hero()}<section class="catalog-section" id="catalog"><div class="section-heading"><div><p class="eyebrow">THE OPEN SHELF <span class="eyebrow-mark">✳</span></p><h2>Find your next <em>read.</em></h2></div><p class="section-aside">Every book has a story.<br>Here’s where its next one starts.</p></div><div class="catalog-tools"><div class="result-count" id="result-count" aria-live="polite">Checking the shelves…</div><div class="tool-right">${filtersMarkup()}<label class="sort-label">Sort <select id="sort-select"><option value="newest">Newest first</option><option value="price-low">Price: low to high</option><option value="price-high">Price: high to low</option></select></label></div></div><div class="active-search" id="active-search"></div><div class="book-grid" id="book-grid" aria-live="polite"></div></section>`,
  );
  const heroForm = document.querySelector("#hero-search"),
    headForm = document.querySelector("#quick-search"),
    filterForm = document.querySelector("#filter-form");
  if (state.query) {
    heroForm.q.value = state.query;
    document.querySelector("#q-head").value = state.query;
  }
  const update = async () => {
    const f = await api.getListings(state);
    document.querySelector("#result-count").textContent =
      `${f.length} ${f.length === 1 ? "book" : "books"} on the shelf`;
    document.querySelector("#active-search").innerHTML = state.query
      ? `<span>Searching for “${esc(state.query)}”</span><button class="text-button clear-query">Clear search ×</button>`
      : "";
    document.querySelector("#book-grid").innerHTML = f.length
      ? f.map(card).join("")
      : `<div class="empty-state"><span class="empty-doodle">⌕</span><h3>No books on this shelf yet.</h3><p>Try fewer filters, or give the search another go.</p><button class="button clear-all">Clear filters</button></div>`;
    document.querySelectorAll(".clear-query,.clear-all,.clear-filters").forEach(
      (x) =>
        (x.onclick = () => {
          Object.assign(state, {
            query: "",
            course: "",
            condition: "",
            min: "",
            max: "",
          });
          heroForm.reset();
          headForm.reset();
          filterForm.reset();
          history.replaceState(null, "", location.pathname + "#/");
          update();
        }),
    );
  };
  heroForm.onsubmit = (e) => {
    e.preventDefault();
    state.query = e.currentTarget.q.value.trim();
    update();
    document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
  };
  headForm.onsubmit = (e) => {
    e.preventDefault();
    state.query = e.currentTarget.q.value.trim();
    heroForm.q.value = state.query;
    update();
    document.querySelector("#catalog").scrollIntoView({ behavior: "smooth" });
  };
  filterForm.onsubmit = (e) => {
    e.preventDefault();
    Object.assign(state, Object.fromEntries(new FormData(filterForm)));
    update();
  };
  document.querySelector("#sort-select").onchange = (e) => {
    state.sort = e.target.value;
    update();
  };
  await update();
}
function pageTitle(kicker, title, desc = "") {
  return `<div class="page-title"><p class="eyebrow">${esc(kicker)}</p><h1>${title}</h1>${desc ? `<p>${desc}</p>` : ""}</div>`;
}
async function details(id) {
  const b = await api.getListing(id),
    u = current();
  if (!b) return notFound();
  const owner = (await api.getAccounts()).find((x) => x.id === b.ownerId);
  shell(
    `<section class="detail-page"><a class="back-link" href="${url("")}">← Back to the shelf</a><div class="detail-layout">${placeholder(b)}<article class="detail-copy"><div class="detail-top">${stamp(b.status)}<span class="condition-stamp">${esc(b.condition)}</span></div><p class="detail-course">${esc(b.course)} &nbsp;·&nbsp; ${esc(b.isbn || "ISBN not listed")}</p><h1>${esc(b.title)}</h1><p class="detail-author">by ${esc(b.author || "Author unknown")}</p><p class="detail-price">${esc(money(b.price))}</p><p class="detail-description">${esc(b.description)}</p><div class="seller-card"><span class="seller-mark">${
      owner?.avatar
        ? `<img src="${esc(owner.avatar)}" alt="">`
        : esc(
            (owner?.name || "?")
              .split(" ")
              .map((x) => x[0])
              .join("")
              .slice(0, 2),
          )
    }</span><div><small>ON THE OTHER SIDE OF THIS BOOK</small><b>${esc(owner?.name || "Campus student")}</b><span>Filed ${esc(date(b.createdAt))}</span></div></div>${b.status !== "Available" ? `<div class="notice">This book is ${esc(b.status.toLowerCase())} and can’t receive new inquiries.</div>` : !u ? `<div class="contact-prompt"><h3>Interested in this book?</h3><p>Sign in to say hello to the seller and arrange a handoff.</p><a class="button" href="${url("signin")}">Sign in to contact the seller ${icon("arrow")}</a></div>` : u.id === b.ownerId ? `<div class="notice">This is your listing. You can’t send an inquiry to yourself.</div>` : u.role !== "student" ? `<div class="notice">Only student accounts can send inquiries about available listings.</div>` : `<form class="inquiry-form" id="inquiry-form"><h3>Ask the seller</h3><label for="message">Your message</label><textarea id="message" name="message" rows="4" required maxlength="1000" placeholder="Hi! Is this still available?"></textarea><p class="form-error" id="form-error" aria-live="polite"></p><button class="button">Send inquiry ${icon("arrow")}</button><p class="form-success" id="form-success" aria-live="polite"></p></form>`}</article></div></section>`,
  );
  document
    .querySelector("#inquiry-form")
    ?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const form = e.currentTarget,
        btn = form.querySelector("button"),
        error = form.querySelector("#form-error"),
        success = form.querySelector("#form-success");
      error.textContent = "";
      success.textContent = "";
      if (form.message.value.trim().length < 8) {
        error.textContent =
          "Please add a little more detail (at least 8 characters).";
        return;
      }
      btn.disabled = true;
      btn.textContent = "Sending…";
      try {
        await api.sendInquiry(
          { listingId: b.id, message: form.message.value.trim() },
          u,
        );
        form.reset();
        success.textContent =
          "Message sent! You can follow replies in your inbox.";
      } catch (err) {
        error.textContent = err.message;
      } finally {
        btn.disabled = false;
        btn.innerHTML = `Send inquiry ${icon("arrow")}`;
      }
    });
}
function formField(label, name, type = "text", opts = {}) {
  return `<label class="field ${opts.wide ? "wide" : ""}" for="${name}">${label}${opts.hint ? `<small>${opts.hint}</small>` : ""}<span class="input-wrap"><input id="${name}" name="${name}" type="${type}" ${opts.required ? "required" : ""} ${opts.min != null ? `min="${opts.min}"` : ""} ${opts.autocomplete ? `autocomplete="${opts.autocomplete}"` : ""} ${opts.value !== undefined ? `value="${esc(opts.value)}"` : ""} ${opts.placeholder ? `placeholder="${opts.placeholder}"` : ""}>${opts.toggle ? '<button type="button" class="show-password" aria-label="Show password">Show</button>' : ""}</span><small class="field-error" data-error="${name}" aria-live="polite"></small></label>`;
}
function authPage(kind) {
  const register = kind === "register";
  shell(
    `<section class="form-page"><div class="form-illustration"><div class="mini-card"><span>FILED UNDER</span><b>FRESH<br>STARTS</b><small>GOOD BOOKS, GOOD COMPANY</small></div><p>Pass it on.<br><em>Pay it forward.</em></p><span class="form-spark">✳</span></div><div class="form-panel">${pageTitle(register ? "JOIN THE SHELF" : "WELCOME BACK", register ? "Make room for a good read." : "Pick up where you left off.", register ? "Create a student account to list books and message sellers." : "Sign in to your campus bookshelf.")}<form id="auth-form" novalidate>${register ? formField("Full name", "name", "text", { required: true, autocomplete: "name" }) : ""}${formField("Email address", "email", "email", { required: true, autocomplete: "email", placeholder: "you@campus.edu" })}${register ? formField("Phone number", "phone", "tel", { required: true, autocomplete: "tel", placeholder: "01X XXX XXXX" }) : ""}${formField("Password", "password", "password", { required: true, autocomplete: register ? "new-password" : "current-password", toggle: true })}<p class="form-error" id="form-error" aria-live="polite"></p><button type="submit" class="button form-submit">${register ? "Create account" : "Sign in"} ${icon("arrow")}</button></form><p class="form-switch">${register ? "Already on the shelf?" : "New to the exchange?"} <a href="${url(register ? "signin" : "register")}">${register ? "Sign in" : "Create an account"}</a></p><div class="demo-hint"><b>Demo note</b> Sign in with a seeded account email and any password of 6+ characters. Use the footer role switcher to preview Visitor, Student, and Admin screens.</div></div></section>`,
  );
  document.querySelector(".show-password").onclick = (e) => {
    const input = document.querySelector("#password"),
      show = input.type === "password";
    input.type = show ? "text" : "password";
    e.currentTarget.textContent = show ? "Hide" : "Show";
    e.currentTarget.setAttribute(
      "aria-label",
      show ? "Hide password" : "Show password",
    );
  };
  document.querySelector("#auth-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      d = Object.fromEntries(new FormData(f)),
      err = document.querySelector("#form-error"),
      btn = f.querySelector("button[type=submit]");
    err.textContent = "";
    f.querySelectorAll(".field-error").forEach((x) => (x.textContent = ""));
    if (register && d.name.trim().length < 2)
      f.querySelector('[data-error="name"]').textContent =
        "Enter your full name.";
    if (register && !/^\+?[\d\s()-]{8,}$/.test(d.phone))
      f.querySelector('[data-error="phone"]').textContent =
        "Enter a valid phone number.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      f.querySelector('[data-error="email"]').textContent =
        "Enter a valid email address.";
    if (d.password.length < 6)
      f.querySelector('[data-error="password"]').textContent =
        "Use at least 6 characters.";
    if (f.querySelector(".field-error:not(:empty)")) return;
    btn.disabled = true;
    btn.textContent = register ? "Creating account…" : "Signing in…";
    try {
      const u = register
        ? await api.register({ ...d, email: d.email.toLowerCase() })
        : await api.signIn(d.email, d.password);
      setUser(u);
      go(u.role === "admin" ? "admin" : "");
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${register ? "Create account" : "Sign in"} ${icon("arrow")}`;
    }
  };
}
// Student listings, inbox, and profile pages.
async function myListings() {
  const u = current();
  const rows = await api.getListings({ includeHidden: true, ownerId: u.id });
  shell(
    `<section class="workspace-page">${pageTitle("YOUR STUDENT SHELF", "Your books, <em>your way.</em>", "Keep your listings current so the right book finds the right person.")}<div class="workspace-actions"><span class="result-count">${rows.length} ${rows.length === 1 ? "listing" : "listings"} filed</span><a class="button" href="${url("listing/new")}">＋ Add a book</a></div>${rows.length ? `<div class="my-listings">${rows.map((b) => `<article class="my-listing">${placeholder(b)}<div class="my-listing-copy"><div class="line-pair">${stamp(b.status)}<span class="card-course">${esc(b.course)}</span></div><h2>${esc(b.title)}</h2><p>${esc(money(b.price))} <span>·</span> ${esc(b.condition)}</p><div class="quick-actions"><a class="button outline small" href="${url(`listing/edit/${b.id}`)}">Edit listing</a><label class="status-control">Status <select data-status="${esc(b.id)}">${["Available", "Sold", "Hidden"].map((s) => `<option ${b.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></label><button class="text-button delete-listing" data-id="${esc(b.id)}">Delete</button></div></div></article>`).join("")}</div>` : `<div class="empty-state"><h3>Your shelf is waiting.</h3><p>List a book and help somebody find their next favorite.</p><a class="button" href="${url("listing/new")}">Add your first book</a></div>`}</section>`,
  );
  document.querySelectorAll("[data-status]").forEach(
    (el) =>
      (el.onchange = async () => {
        await api.updateListing(el.dataset.status, { status: el.value }, u);
        myListings();
      }),
  );
  document.querySelectorAll(".delete-listing").forEach(
    (el) =>
      (el.onclick = () =>
        confirmDialog(
          "Delete this listing?",
          "This removes the book and its inquiries from the demo shelf.",
          async () => {
            await api.deleteListing(el.dataset.id, u);
            myListings();
          },
        )),
  );
}
async function listingForm(id) {
  const u = current(),
    edit = Boolean(id),
    b = edit
      ? await api.getListing(id)
      : {
          title: "",
          author: "",
          isbn: "",
          course: "",
          condition: "",
          description: "",
          price: "",
          cover: "",
          color: "#E4472B",
        };
  if (edit && (!b || (u.role !== "admin" && b.ownerId !== u.id))) {
    return denied();
  }
  shell(
    `<section class="workspace-page listing-form-page"><a class="back-link" href="${url(u.role === "admin" ? "admin/listings" : "my-listings")}">← Back to ${u.role === "admin" ? "all listings" : "my shelf"}</a>${pageTitle(edit ? "UPDATE YOUR LISTING" : "ADD TO THE SHELF", edit ? "Make a few changes." : "Give a good book a new chapter.", "Tell fellow students what they need to know before they reach out.")}<form id="listing-form" class="listing-form" novalidate><div class="form-grid">${formField("Book title", "title", "text", { required: true, value: b.title, wide: true, placeholder: "The name on the cover" })}${formField("Author", "author", "text", { value: b.author, placeholder: "If known" })}${formField("Course code", "course", "text", { value: b.course, placeholder: "e.g. CS-301" })}${formField("ISBN", "isbn", "text", { value: b.isbn, placeholder: "Optional" })}<label class="field" for="condition">Condition<select id="condition" name="condition" required><option value="">Choose one</option>${["New", "Like new", "Good", "Fair", "Worn"].map((x) => `<option ${b.condition === x ? "selected" : ""}>${x}</option>`).join("")}</select><small class="field-error" data-error="condition"></small></label>${formField("Price (EGP)", "price", "number", { required: true, value: b.price, min: 0, placeholder: "0 means free" })}<label class="field wide" for="description">Description<textarea id="description" name="description" rows="4" required placeholder="Any notes that will help the next reader?">${esc(b.description)}</textarea><small class="field-error" data-error="description"></small></label><div class="field wide upload-field"><label for="cover">Book photo <span>(optional)</span></label><div class="upload-box">${placeholder(b)}<div><p>Choose a cover photo, or we’ll make a shelf-ready placeholder.</p><input id="cover" name="coverFile" type="file" accept="image/*"><small>In this demo, images are previewed in your browser only.</small></div></div></div><p id="form-error" class="form-error wide" aria-live="polite"></p></div><button type="submit" class="button form-submit">${edit ? "Save changes" : "Add to the shelf"} ${icon("arrow")}</button></form></section>`,
  );
  const file = document.querySelector("#cover");
  file.onchange = () => {
    const f = file.files?.[0];
    if (f) {
      const url = URL.createObjectURL(f);
      document.querySelector(".upload-box .cover-art").outerHTML =
        `<img class="cover-art uploaded-cover" src="${url}" alt="Selected book cover preview">`;
    }
  };
  document.querySelector("#listing-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      d = Object.fromEntries(new FormData(f));
    const enteredPrice = d.price;
    d.price = Number(enteredPrice);
    const err = document.querySelector("#form-error");
    err.textContent = "";
    [
      ["title", d.title.trim().length > 0, "Add the book title."],
      ["condition", !!d.condition, "Choose the book condition."],
      [
        "description",
        d.description.trim().length >= 10,
        "Write at least 10 characters about the book.",
      ],
      [
        "price",
        enteredPrice.trim() !== "" && d.price >= 0 && Number.isFinite(d.price),
        "Enter a price of zero or more.",
      ],
    ].forEach(([field, ok, msg]) => {
      const el = f.querySelector(`[data-error="${field}"]`);
      if (el) el.textContent = ok ? "" : msg;
    });
    if (f.querySelector(".field-error:not(:empty)")) return;
    const btn = f.querySelector(".form-submit");
    btn.disabled = true;
    btn.textContent = "Saving…";
    try {
      if (file.files?.[0]) d.cover = URL.createObjectURL(file.files[0]);
      delete d.coverFile;
      edit
        ? await api.updateListing(id, d, u)
        : await api.createListing(d, u.id);
      go(u.role === "admin" ? "admin/listings" : "my-listings");
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `${edit ? "Save changes" : "Add to the shelf"} ${icon("arrow")}`;
    }
  };
}
async function inbox() {
  const u = current(),
    qs = await api.getInquiries(u),
    all = await api.getListings({ includeHidden: true }),
    accounts = await api.getAccounts();
  const received = qs.filter((q) => q.recipientId === u.id);
  shell(
    `<section class="workspace-page">${pageTitle("NOTES PASSED ALONG", "Your inbox.", "Messages from students interested in the books on your shelf.")}<div class="inbox-list">${
      received.length
        ? received
            .map((q) => {
              const sender = accounts.find((x) => x.id === q.senderId);
              const book = all.find((x) => x.id === q.listingId);
              return `<article class="inquiry-card"><div class="inquiry-top"><div><small>ABOUT THIS BOOK</small><h2>${esc(book?.title || "Removed listing")}</h2></div><time>${esc(date(q.createdAt))}</time></div><p class="inquiry-message">“${esc(q.message)}”</p><div class="inquiry-sender"><span>FROM</span><b>${esc(sender?.name || "Campus student")}</b><a href="mailto:${esc(sender?.email || "")}">${esc(sender?.email || "")}</a><a href="tel:${esc(sender?.phone || "")}">${esc(sender?.phone || "")}</a></div></article>`;
            })
            .join("")
        : `<div class="empty-state"><span class="empty-doodle">✉</span><h3>No notes yet.</h3><p>When someone asks about your book, their message will land right here.</p></div>`
    }</div></section>`,
  );
}
async function profile() {
  const u = current(),
    initials = esc(
      u.name
        .split(/\s+/)
        .map((x) => x[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    );
  shell(
    `<section class="workspace-page profile-page">${pageTitle("YOUR DETAILS", "A little about <em>you.</em>", "Your profile helps the next reader know who they’re meeting.")}<form id="profile-form" class="profile-form"><div class="profile-photo-field"><div id="profile-avatar" class="profile-avatar">${u.avatar ? `<img src="${esc(u.avatar)}" alt="Your profile picture">` : initials}</div><label class="field" for="avatar">Profile picture<input id="avatar" name="avatarFile" type="file" accept="image/*"><small>Optional · JPG, PNG, or WebP · up to 2 MB</small></label></div>${formField("Full name", "name", "text", { required: true, value: u.name, autocomplete: "name" })}${formField("Email address", "email", "email", { required: true, value: u.email, autocomplete: "email" })}${formField("Phone number", "phone", "tel", { required: true, value: u.phone, autocomplete: "tel" })}<p class="form-error" id="form-error" aria-live="polite"></p><p class="form-success" id="form-success" aria-live="polite"></p><button type="submit" class="button">Save profile ${icon("arrow")}</button></form></section>`,
  );
  const file = document.querySelector("#avatar");
  file.onchange = () => {
    const image = file.files?.[0];
    if (!image) return;
    if (image.size > 2 * 1024 * 1024) {
      document.querySelector("#form-error").textContent =
        "Choose an image smaller than 2 MB.";
      file.value = "";
      return;
    }
    if (!image.type.startsWith("image/")) {
      document.querySelector("#form-error").textContent =
        "Choose an image file.";
      file.value = "";
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      document.querySelector("#profile-avatar").innerHTML =
        `<img src="${esc(reader.result)}" alt="Your profile picture preview">`;
      document.querySelector("#form-error").textContent = "";
    };
    reader.readAsDataURL(image);
  };
  document.querySelector("#profile-form").onsubmit = async (e) => {
    e.preventDefault();
    const f = e.currentTarget,
      d = Object.fromEntries(new FormData(f)),
      err = document.querySelector("#form-error"),
      success = document.querySelector("#form-success"),
      btn = f.querySelector("button[type=submit]");
    delete d.avatarFile;
    err.textContent = "";
    success.textContent = "";
    if (d.name.trim().length < 2) err.textContent = "Enter your full name.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.email))
      err.textContent = "Enter a valid email address.";
    else if (!/^\+?[\d\s()-]{8,}$/.test(d.phone))
      err.textContent = "Enter a valid phone number.";
    if (err.textContent) return;
    try {
      btn.disabled = true;
      btn.textContent = "Saving…";
      const image = file.files?.[0];
      if (image) {
        d.avatar = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = () =>
            reject(new Error("Could not read that image."));
          reader.readAsDataURL(image);
        });
      } else d.avatar = u.avatar || "";
      const next = await api.updateProfile(u.id, d);
      setUser(next);
      success.textContent = "Your profile is saved.";
    } catch (ex) {
      err.textContent = ex.message;
    } finally {
      btn.disabled = false;
      btn.innerHTML = `Save profile ${icon("arrow")}`;
    }
  };
}
// Admin dashboard and moderation pages.
async function adminHome() {
  const counts = await api.getCounts(),
    all = await api.getListings({ includeHidden: true }),
    accounts = await api.getAccounts();
  shell(
    `<section class="admin-page">${pageTitle("THE LIBRARY DESK", "Behind the <em>desk.</em>", "A quick look at what’s happening across the campus shelf.")}<div class="admin-counts"><article><span>REGISTERED ACCOUNTS</span><b>${counts.accounts}</b><small>students + desk team</small></article><article><span>AVAILABLE BOOKS</span><b>${counts.available}</b><small>ready for a new reader</small></article><article><span>SOLD BOOKS</span><b>${counts.sold}</b><small>passed along already</small></article></div><div class="admin-shortcuts"><a href="${url("admin/listings")}"><span>01</span><b>Review listings</b><i>→</i></a><a href="${url("admin/accounts")}"><span>02</span><b>Manage accounts</b><i>→</i></a></div><div class="admin-latest"><div class="admin-section-head"><h2>Recently filed</h2><a href="${url("admin/listings")}">All listings ↗</a></div>${adminListingTable(all.slice(0, 5), accounts)}</div></section>`,
    true,
  );
  bindAdminListingActions(all, () => adminHome());
}
function adminListingTable(rows, accounts) {
  return `<div class="table-wrap"><table><thead><tr><th>BOOK / COURSE</th><th>OWNER</th><th>PRICE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${rows
    .map((b) => {
      const o = accounts.find((a) => a.id === b.ownerId);
      return `<tr><td><b>${esc(b.title)}</b><small>${esc(b.course)}</small></td><td>${esc(o?.name || "Unknown")}</td><td>${esc(money(b.price))}</td><td>${stamp(b.status)}<select class="admin-status" data-id="${esc(b.id)}" aria-label="Set status for ${esc(b.title)}">${["Available", "Sold", "Hidden"].map((s) => `<option ${b.status === s ? "selected" : ""}>${s}</option>`).join("")}</select></td><td><a class="table-action" href="${url(`listing/edit/${b.id}`)}">Edit</a><button class="table-action danger admin-del" data-id="${esc(b.id)}">Delete</button></td></tr>`;
    })
    .join("")}</tbody></table></div>`;
}
function bindAdminListingActions(rows, refresh) {
  document.querySelectorAll(".admin-status").forEach(
    (el) =>
      (el.onchange = async () => {
        await api.adminListing(el.dataset.id, el.value);
        refresh();
      }),
  );
  document.querySelectorAll(".admin-del").forEach(
    (el) =>
      (el.onclick = () =>
        confirmDialog(
          "Delete this listing?",
          "This removes the book and attached inquiries.",
          async () => {
            await api.adminListing(el.dataset.id, "delete");
            refresh();
          },
        )),
  );
}
async function adminListings() {
  const rows = await api.getListings({ includeHidden: true }),
    accounts = await api.getAccounts();
  shell(
    `<section class="admin-page">${pageTitle("THE LIBRARY DESK · CATALOG", "Every book, <em>one shelf.</em>", "Review status and keep the public catalog tidy.")}<div class="admin-table-card">${adminListingTable(rows, accounts)}</div></section>`,
    true,
  );
  bindAdminListingActions(rows, () => adminListings());
}
async function adminAccounts() {
  const accounts = await api.getAccounts();
  shell(
    `<section class="admin-page">${pageTitle("THE LIBRARY DESK · PEOPLE", "The community <em>ledger.</em>", "Accounts and access, all in one place.")}<div class="admin-table-card"><div class="table-wrap"><table><thead><tr><th>STUDENT</th><th>CONTACT</th><th>ROLE</th><th>STATUS</th><th>ACTIONS</th></tr></thead><tbody>${accounts.map((a) => `<tr><td><b>${esc(a.name)}</b></td><td>${esc(a.email)}<small>${esc(a.phone)}</small></td><td>${esc(a.role)}</td><td><span class="account-status ${a.status === "Suspended" ? "suspended" : ""}">${esc(a.status)}</span></td><td>${a.role === "admin" ? '<span class="table-muted">Desk account</span>' : `<button class="table-action suspend-account" data-id="${esc(a.id)}">${a.status === "Suspended" ? "Restore" : "Suspend"}</button><button class="table-action danger delete-account" data-id="${esc(a.id)}">Delete</button>`}</td></tr>`).join("")}</tbody></table></div></div></section>`,
    true,
  );
  document.querySelectorAll(".suspend-account").forEach(
    (el) =>
      (el.onclick = async () => {
        const a = accounts.find((x) => x.id === el.dataset.id);
        await api.adminAccount(
          a.id,
          a.status === "Suspended" ? "restore" : "suspend",
        );
        adminAccounts();
      }),
  );
  document.querySelectorAll(".delete-account").forEach(
    (el) =>
      (el.onclick = () =>
        confirmDialog(
          "Delete this account?",
          "This demo removes the account. Account data cleanup is one of the backend decisions to confirm.",
          async () => {
            await api.adminAccount(el.dataset.id, "delete");
            adminAccounts();
          },
        )),
  );
}
function confirmDialog(title, text, onConfirm) {
  modal.innerHTML = `<div class="modal-head"><span class="eyebrow">A QUICK CHECK</span><button class="modal-close" aria-label="Close">×</button></div><h2 id="modal-title">${esc(title)}</h2><p>${esc(text)}</p><div class="modal-actions"><button class="button danger-button" id="modal-confirm">Yes, delete</button><button class="button outline" id="modal-cancel">Keep it</button></div>`;
  modal.showModal();
  modal
    .querySelectorAll(".modal-close,#modal-cancel")
    .forEach((x) => (x.onclick = () => modal.close()));
  modal.querySelector("#modal-confirm").onclick = async () => {
    modal.close();
    await onConfirm();
  };
}
function denied() {
  shell(
    `<section class="message-page">${pageTitle("STAFF ONLY", "This shelf is <em>staff-only.</em>", "Your student account can’t open the administrator area.")}<a class="button" href="${url("")}">Back to the open shelf</a></section>`,
  );
}
function notFound() {
  shell(
    `<section class="message-page">${pageTitle("PAGE NOT FOUND", "This page wandered <em>off shelf.</em>", "Let’s get you back to the books.")}<a class="button" href="${url("")}">Return to the shelf</a></section>`,
  );
}
async function adminInquiries() {
  const u = current(),
    qs = (await api.getInquiries(u)).sort(
      (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    ),
    listings = await api.getListings({ includeHidden: true }),
    accounts = await api.getAccounts();
  shell(
    `<section class="admin-page">${pageTitle("THE LIBRARY DESK · MODERATION", "Messages passed <em>along.</em>", "Review student inquiries across the exchange and remove unwanted messages.")}<div class="admin-inquiries">${
      qs.length
        ? qs
            .map((q) => {
              const book = listings.find((x) => x.id === q.listingId),
                sender = accounts.find((x) => x.id === q.senderId),
                recipient = accounts.find((x) => x.id === q.recipientId);
              return `<article class="inquiry-card"><div class="inquiry-top"><div><small>ABOUT THIS BOOK</small><h2>${esc(book?.title || "Removed listing")}</h2></div><time>${esc(date(q.createdAt))}</time></div><p class="inquiry-message">“${esc(q.message)}”</p><div class="inquiry-sender"><span>SENDER</span><b>${esc(sender?.name || "Unknown student")}</b><a href="mailto:${esc(sender?.email || "")}">${esc(sender?.email || "")}</a><span>TO</span><b>${esc(recipient?.name || "Unknown student")}</b></div><button class="table-action danger moderate-inquiry" data-id="${esc(q.id)}">Remove inquiry</button></article>`;
            })
            .join("")
        : `<div class="empty-state"><h3>No inquiries to review.</h3><p>New student messages will appear here.</p></div>`
    }</div></section>`,
    true,
  );
  document.querySelectorAll(".moderate-inquiry").forEach(
    (el) =>
      (el.onclick = () =>
        confirmDialog(
          "Remove this inquiry?",
          "This removes the selected message from the exchange.",
          async () => {
            await api.deleteInquiry(el.dataset.id, u);
            adminInquiries();
          },
        )),
  );
}

// Route the current hash and enforce the demo role permissions.
async function dispatch() {
  const route = decodeURIComponent(location.hash.replace(/^#\/?/, ""));
  const user = current();
  if (!route || route.startsWith("?")) {
    return catalog();
  }

  if (route === "signin" || route === "register") {
    return authPage(route);
  }

  if (route.startsWith("book/")) {
    return details(route.split("/")[1]);
  }

  if (route === "my-listings" || route === "inbox" || route === "profile") {
    if (!user) return authPage("signin");
    if (user.role !== "student") return denied();

    if (route === "my-listings") return myListings();
    if (route === "inbox") return inbox();
    return profile();
  }

  if (route === "listing/new" || route.startsWith("listing/edit/")) {
    if (!user) return authPage("signin");

    const canEditAsAdmin =
      user.role === "admin" && route.startsWith("listing/edit/");
    if (user.role !== "student" && !canEditAsAdmin) return denied();

    const listingId =
      route.split("/")[2] === "edit" ? route.split("/")[3] : null;
    return listingForm(listingId);
  }

  if (route.startsWith("admin")) {
    if (!user || user.role !== "admin") return denied();

    if (route === "admin") return adminHome();
    if (route === "admin/listings") return adminListings();
    if (route === "admin/accounts") return adminAccounts();
    if (route === "admin/inquiries") return adminInquiries();
    return notFound();
  }

  return notFound();
}
window.addEventListener("hashchange", () => dispatch());
dispatch();
