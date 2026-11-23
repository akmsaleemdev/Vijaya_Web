JSON.stringify((() => {
  // 1. Find every rendered <img> on the page and check it loaded (not broken)
  const imgs = Array.from(document.querySelectorAll('img'));
  const broken = imgs.filter(i => !i.complete || i.naturalWidth === 0).map(i => i.src);
  // 2. Logo-specific checks
  const headerLogo = document.querySelector('header img');
  const footerLogo = document.querySelector('footer img');
  const headerLogoInfo = headerLogo ? {
    src: headerLogo.getAttribute('src') || headerLogo.src,
    naturalW: headerLogo.naturalWidth,
    naturalH: headerLogo.naturalHeight,
    renderedW: Math.round(headerLogo.getBoundingClientRect().width),
    renderedH: Math.round(headerLogo.getBoundingClientRect().height),
    aspect: (headerLogo.naturalWidth / headerLogo.naturalHeight).toFixed(3),
    complete: headerLogo.complete,
  } : null;
  const footerLogoInfo = footerLogo ? {
    src: footerLogo.getAttribute('src') || footerLogo.src,
    naturalW: footerLogo.naturalWidth,
    complete: footerLogo.complete,
  } : null;
  return {
    url: location.pathname,
    totalImgs: imgs.length,
    brokenImgs: broken,
    headerLogo: headerLogoInfo,
    footerLogo: footerLogoInfo,
    horizontalOverflow: document.documentElement.scrollWidth > window.innerWidth,
    viewport: window.innerWidth + 'x' + window.innerHeight,
  };
})())
