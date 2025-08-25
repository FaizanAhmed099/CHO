(function(){
  "use strict";
  const hasArabic = (s) => /[\u0600-\u06FF]/.test(String(s || ""));
  function transliterateToArabic(s) {
    if (!s) return "";
    let str = (s.normalize ? s.normalize("NFC") : s);
    const digraphs = [
      [/sch/gi, "ش"],
      [/sh/gi, "ش"],
      [/ch/gi, "تش"],
      [/th/gi, "ث"],
      [/ph/gi, "ف"],
      [/gh/gi, "غ"],
      [/kh/gi, "خ"],
    ];
    for (const [re, rep] of digraphs) str = str.replace(re, rep);
    const map = {
      a: "ا", b: "ب", c: "ك", d: "د", e: "ي", f: "ف", g: "ج", h: "ه",
      i: "ي", j: "ج", k: "ك", l: "ل", m: "م", n: "ن", o: "و", p: "ب",
      q: "ق", r: "ر", s: "س", t: "ت", u: "و", v: "ف", w: "و", x: "كس",
      y: "ي", z: "ز", " ": " "
    };
    let out = "";
    for (const ch of str) {
      const lower = ch.toLowerCase();
      if (map[lower]) out += map[lower];
      else if (/[0-9]/.test(ch)) out += ch;
      else if (/\s/.test(ch)) out += ch;
      else if (/[\-'.]/.test(ch)) out += ch;
      else out += ch;
    }
    return out;
  }
  window.ArabicUtils = { hasArabic, transliterateToArabic };
})();
