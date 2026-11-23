JSON.stringify((() => {
  const headerLogo = document.querySelector('header img');
  const footerLogo = document.querySelector('footer img');
  const allImgs = Array.from(document.querySelectorAll('img'));
  const broken = allImgs.filter(i => !i.complete || i.naturalWidth === 0).length;
  const info = (el) => el ? {
    variant: (el.getAttribute('src') || el.currentSrc || '').match(/vijaya-logo-(\w+)/)?.[1] || '?',
    w: Math.round(el.getBoundingClientRect().width),
    h: Math.round(el.getBoundingClientRect().height),
    natW: el.naturalWidth, natH: el.naturalHeight,
    aspect: el.naturalWidth ? (el.naturalWidth/el.naturalHeight).toFixed(3) : null,
    complete: el.complete,
  } : null;
  return {
    path: location.pathname,
    header: info(headerLogo),
    footer: info(footerLogo),
    totalImgs: allImgs.length,
    broken,
    hOverflow: document.documentElement.scrollWidth > window.innerWidth,
    vw: window.innerWidth,
  };
})())
