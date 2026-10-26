/* Slugify — title → URL slug, all local. */
(function () {
  "use strict";
  var $ = S3.$, $$ = S3.$$;

  var TASHKEEL = /[ؐ-ًؚ-ٰٟۖ-ۜ۟-۪ۨ-ۭـ]/g;
  var SPECIAL = { "ß": "ss", "ẞ": "SS", "æ": "ae", "Æ": "AE", "œ": "oe", "Œ": "OE", "ø": "o", "Ø": "O", "đ": "d", "Đ": "D", "ł": "l", "Ł": "L", "þ": "th", "Þ": "TH", "ð": "d", "Ð": "D", "ı": "i", "ħ": "h" };
  var AR = { "ا": "a", "أ": "a", "إ": "i", "آ": "a", "ٱ": "a", "ء": "", "ؤ": "u", "ئ": "i", "ب": "b", "ت": "t", "ث": "th", "ج": "j", "ح": "h", "خ": "kh",
    "د": "d", "ذ": "dh", "ر": "r", "ز": "z", "س": "s", "ش": "sh", "ص": "s", "ض": "d", "ط": "t", "ظ": "z", "ع": "a", "غ": "gh", "ف": "f", "ق": "q",
    "ك": "k", "ل": "l", "م": "m", "ن": "n", "ه": "h", "ة": "a", "ى": "a", "پ": "p", "چ": "ch", "ڤ": "v", "گ": "g", "ک": "k", "ی": "i" };
  var STOP = new Set(("a an and are as at be by for from has have how in is it its of on or that the this to was were what when where which who why will with " +
    "في من على إلى الى عن مع هذا هذه ذلك التي الذي أن ان إن كان و أو او ثم هو هي ما لا لم قد كل بعض عند بين حتى").split(" "));

  function arabicToLatin(word) {
    var w = word, pre = "";
    if (/^ال.{2,}/.test(w)) { pre = "al "; w = w.slice(2); } // definite article becomes its own word: al-bayt
    var out = "";
    Array.from(w).forEach(function (c, i) {
      if (c === "و") out += i === 0 ? "w" : "u";
      else if (c === "ي") out += i === 0 ? "y" : "i";
      else out += AR[c] != null ? AR[c] : c;
    });
    return pre + out;
  }

  // o: {sep, lower, accents, stop, arabic: "latin"|"keep", max}
  function slugify(text, o) {
    var s = text.normalize("NFKC").replace(TASHKEEL, "")
      .replace(/[٠-٩]/g, function (d) { return "٠١٢٣٤٥٦٧٨٩".indexOf(d); })
      .replace(/[۰-۹]/g, function (d) { return "۰۱۲۳۴۵۶۷۸۹".indexOf(d); })
      .replace(/&/g, " and ")
      .replace(/(\p{L})['’](?=\p{L})/gu, "$1"); // don't → dont
    if (o.arabic === "latin") s = s.replace(/[ء-يٱ-ۓ]+/g, arabicToLatin);
    if (o.accents) {
      // Fold accents on non-Arabic runs only: NFD on Arabic would strip the hamza from أ and the madda from آ.
      s = s.replace(/[^؀-ۿ]+/g, function (m) {
        return m.replace(/[ßẞæÆœŒøØđĐłŁþÞðÐıħ]/g, function (c) { return SPECIAL[c]; }).normalize("NFD").replace(/\p{M}/gu, "");
      });
    }
    if (o.lower) s = s.toLocaleLowerCase();
    var words = s.split(/[^\p{L}\p{N}\p{M}]+/u).filter(Boolean);
    if (o.stop) {
      var kept = words.filter(function (w) { return !STOP.has(w.toLowerCase()); });
      if (kept.length) words = kept;
    }
    var max = o.max | 0, sep = o.sep;
    if (max > 0) {
      var outW = [], len = 0;
      for (var i = 0; i < words.length; i++) {
        var add = Array.from(words[i]).length + (outW.length ? sep.length : 0);
        if (len + add > max) break;
        outW.push(words[i]); len += add;
      }
      if (!outW.length && words.length) outW = [Array.from(words[0]).slice(0, max).join("")]; // one long word: hard cut
      words = outW;
    }
    return words.join(sep);
  }

  // ---------- UI ----------
  var input = $("#input"), list = $("#list"), maxEl = $("#max");
  var saved = S3.store("slug.opts") || {};
  var o = { sep: saved.sep || "-", lower: saved.lower !== false, accents: saved.accents !== false, stop: !!saved.stop, arabic: saved.arabic === "keep" ? "keep" : "latin", max: saved.max | 0 };
  var current = [];

  function seg(el, value, onPick) {
    $$("button", el).forEach(function (b) {
      b.setAttribute("aria-pressed", String(b.dataset.v === value));
      b.addEventListener("click", function () {
        $$("button", el).forEach(function (x) { x.setAttribute("aria-pressed", String(x === b)); });
        onPick(b.dataset.v);
      });
    });
  }
  function save() { S3.store("slug.opts", o); }

  function render() {
    var lines = input.value.split("\n").filter(function (l) { return l.trim(); });
    current = lines.map(function (l) { return slugify(l, o); });
    list.innerHTML = "";
    if (!lines.length) {
      list.appendChild(S3.h("li", {}, [S3.h("div", { "class": "empty" }, [S3.h("b", { text: "Your slugs appear here" }), "Type a title above. One title per line for bulk mode."])]));
      return;
    }
    current.forEach(function (sl, i) {
      var chars = Array.from(sl).length, enc = encodeURI(sl).length;
      list.appendChild(S3.h("li", {}, [
        S3.h("span", { "class": "s", dir: "auto", title: lines[i], text: sl || "(nothing left: try other options)" }),
        S3.h("span", { "class": "meta", text: chars + " chars" + (enc !== chars ? " · " + enc + " encoded" : "") }),
        S3.h("button", { "class": "btn ghost small icon", "aria-label": "Copy slug", "data-i": i, html: S3.icon("copy") })
      ]));
    });
    if (current[0]) list.appendChild(S3.h("li", { "class": "sl-url" }, ["Preview: example.com/blog/", S3.h("b", { dir: "auto", text: current[0] })]));
  }
  list.addEventListener("click", function (e) {
    var b = e.target.closest("button[data-i]"); if (!b) return;
    var s = current[+b.dataset.i]; if (s) { S3.copy(s); S3.done(); }
  });

  seg($("#sep"), o.sep, function (v) { o.sep = v; save(); render(); });
  seg($("#arabic"), o.arabic, function (v) { o.arabic = v; save(); render(); });
  [["lower", "lower"], ["accents", "accents"], ["stop", "stop"]].forEach(function (p) {
    var el = $("#" + p[0]); el.checked = o[p[1]];
    el.addEventListener("change", function () { o[p[1]] = el.checked; save(); render(); });
  });
  maxEl.value = o.max;
  maxEl.addEventListener("input", function () { o.max = Math.max(0, Math.min(500, parseInt(maxEl.value, 10) || 0)); save(); render(); });
  input.addEventListener("input", S3.debounce(render, 80));
  $("#clear").addEventListener("click", function () { input.value = ""; render(); input.focus(); });
  $("#sample").addEventListener("click", function () {
    input.value = "10 Tips for Writing Better Headlines!\nCrème Brûlée & Café au Lait: A Love Story\nمدينة النور: دليل الزوار ٢٠٢٦\nWhy We Don't Use Cookies (and Never Will)";
    render();
  });
  $("#copy").addEventListener("click", function () {
    var all = current.filter(Boolean).join("\n");
    if (!all) { S3.toast("Nothing to copy yet", "error"); return; }
    S3.copy(all); S3.done();
  });
  $("#save").addEventListener("click", function () { var all = current.filter(Boolean).join("\n"); if (all) { S3.download(all + "\n", "slugs.txt", "text/plain;charset=utf-8"); S3.done(); } });

  render();

  window.S3_DEMO = function () { $("#sample").click(); };

  window.S3_SELFTEST = function () {
    var d = { sep: "-", lower: true, accents: true, stop: false, arabic: "latin", max: 0 };
    function w(x) { return Object.assign({}, d, x); }
    var t = [
      [slugify("Hello, World!", d), "hello-world"],
      [slugify("  Crème Brûlée à la carte ", d), "creme-brulee-a-la-carte"],
      [slugify("The Lord of the Rings", w({ stop: true })), "lord-rings"],
      [slugify("The Of", w({ stop: true })), "the-of"],
      [slugify("Don't stop", d), "dont-stop"],
      [slugify("Straße & Co.", d), "strasse-and-co"],
      [slugify("Hello World", w({ sep: "_" })), "hello_world"],
      [slugify("Hello World", w({ lower: false })), "Hello-World"],
      [slugify("hello wonderful world", w({ max: 10 })), "hello"],
      [slugify("hello wonderful world", w({ max: 15 })), "hello-wonderful"],
      [slugify("supercalifragilistic", w({ max: 5 })), "super"],
      [slugify("مدينة نور", d), "mdina-nur"],
      [slugify("البيت", d), "al-bit"],
      [slugify("١٢٣ عنوان", d), "123-anuan"],
      [slugify("مَرْحَباً بالعالم!", w({ arabic: "keep" })), "مرحبا-بالعالم"],
      [slugify("أهلاً وسهلاً", w({ arabic: "keep" })), "أهلا-وسهلا"],
      [slugify("café", w({ accents: false })), "café"],
      [slugify("!!!", d), ""]
    ];
    return t.every(function (p) { return p[0] === p[1]; });
  };
})();
