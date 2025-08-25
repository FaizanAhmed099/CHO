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
      
      a: "ا",
      b: "ب",
      p: "پ",
      t: "ت",
      t_dot: "ٹ",
      s_th: "ث",
      j: "ج",
      ch: "چ",
      h_dot: "ح",
      kh: "خ",
      d: "د",
      d_dot: "ڈ",
      z_th: "ذ",
      r: "ر",
      r_dot: "ڑ",
      z: "ز",
      zh: "ژ",
      s: "س",
      sh: "ش",
      s_saad: "ص",
      z_zaal: "ض",
      t_toy: "ط",
      z_zoay: "ظ",
      ain: "ع",
      gh: "غ",
      f: "ف",
      q: "ق",
      k: "ک",
      g: "گ",
      l: "ل",
      m: "م",
      n: "ن",
      w: "و",
      h: "ہ",
      hamza: "ء",
      y: "ی",
      ye: "ے"    };
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
