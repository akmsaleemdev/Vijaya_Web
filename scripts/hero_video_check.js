JSON.stringify((() => {
  const v = document.querySelector('section video');
  const r = v ? v.getBoundingClientRect() : null;
  const h1 = document.querySelector('h1');
  const h1r = h1 ? h1.getBoundingClientRect() : null;
  const posterImg = document.querySelector('section img[alt*="hero video"]');
  const exploreLink = document.querySelector('a[href="/about"]');
  const dateForm = document.querySelector('section form, section button[type="submit"]');
  return {
    videoPresent: !!v,
    videoSrc: v ? (v.querySelector('source[type="video/mp4"]') || {}).src || v.src : null,
    paused: v ? v.paused : null,
    muted: v ? v.muted : null,
    loop: v ? v.loop : null,
    autoplay: v ? v.autoplay : null,
    playsInline: v ? v.playsInline : null,
    controls: v ? v.controls : null,
    readyState: v ? v.readyState : null,
    currentTime: v ? Number(v.currentTime.toFixed(2)) : null,
    duration: v ? Number(v.duration.toFixed(2)) : null,
    videoW: r ? Math.round(r.width) : null,
    videoH: r ? Math.round(r.height) : null,
    containerW: window.innerWidth,
    containerH: window.innerHeight,
    h1Visible: !!(h1 && h1r && h1r.height > 0),
    h1Text: h1 ? h1.innerText.trim().slice(0, 60) : null,
    exploreCtaPresent: !!exploreLink,
    dateCheckCtaPresent: !!dateForm,
    posterPresent: !!posterImg,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
  };
})())
