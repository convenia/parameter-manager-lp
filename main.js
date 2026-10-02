// Parameter Manager landing page: progressive enhancements only. The page reads fine without JS.
document.documentElement.classList.add('js')

const $ = (selector, root = document) => root.querySelector(selector)
const $$ = (selector, root = document) => [...root.querySelectorAll(selector)]
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches

// Mobile navigation
const navToggle = $('[data-nav-toggle]')
const nav = $('[data-nav]')

function setNavOpen(open) {
  navToggle.setAttribute('aria-expanded', String(open))
  nav.classList.toggle('is-open', open)
}

navToggle.addEventListener('click', () => setNavOpen(navToggle.getAttribute('aria-expanded') !== 'true'))
nav.addEventListener('click', (event) => { if (event.target.closest('a')) setNavOpen(false) })
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') setNavOpen(false) })

// Header shadow once the page scrolls
const header = $('[data-header]')
const onScroll = () => header.classList.toggle('is-scrolled', window.scrollY > 8)
window.addEventListener('scroll', onScroll, { passive: true })
onScroll()

// Highlight the nav link of the section in view
const navLinks = $$('.site-nav a[href^="#"]:not(.btn)')
// The hero is observed too, so scrolling back to the top clears the highlight.
const sections = [$('#top'), ...navLinks.map((link) => $(link.getAttribute('href')))].filter(Boolean)
const sectionObserver = new IntersectionObserver((entries) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    for (const link of navLinks) link.classList.toggle('is-current', link.getAttribute('href') === `#${entry.target.id}`)
  }
}, { rootMargin: '-45% 0px -50% 0px' })
sections.forEach((section) => sectionObserver.observe(section))

// Reveal on scroll
const revealObserver = new IntersectionObserver((entries, observer) => {
  for (const entry of entries) {
    if (!entry.isIntersecting) continue
    entry.target.classList.add('is-visible')
    observer.unobserve(entry.target)
  }
}, { rootMargin: '0px 0px -10% 0px' })
$$('.reveal').forEach((el) => revealObserver.observe(el))

// FAQ accordion
function setFaqOpen(button, open) {
  const panel = document.getElementById(button.getAttribute('aria-controls'))
  if (open === (button.getAttribute('aria-expanded') === 'true')) return
  button.setAttribute('aria-expanded', String(open))

  if (reducedMotion) {
    panel.hidden = !open
    return
  }
  if (open) {
    panel.hidden = false
    const height = panel.scrollHeight
    panel.style.height = '0px'
    requestAnimationFrame(() => { panel.style.height = `${height}px` })
  } else {
    panel.style.height = `${panel.scrollHeight}px`
    requestAnimationFrame(() => { panel.style.height = '0px' })
  }
  panel.addEventListener('transitionend', () => {
    panel.style.height = ''
    if (button.getAttribute('aria-expanded') !== 'true') panel.hidden = true
  }, { once: true })
}

$$('.faq__q').forEach((button) => {
  button.addEventListener('click', () => setFaqOpen(button, button.getAttribute('aria-expanded') !== 'true'))
})

// Links such as "Required IAM permissions" open their FAQ entry before scrolling to it
function openFaqFromHash(id) {
  const button = $(`.faq__q[aria-controls="${id}"]`)
  if (!button) return
  setFaqOpen(button, true)
  button.closest('.faq__item').scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'start' })
}

$$('[data-open-faq]').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault()
    history.replaceState(null, '', `#${link.dataset.openFaq}`)
    openFaqFromHash(link.dataset.openFaq)
  })
})
if (location.hash.startsWith('#faq-')) openFaqFromHash(location.hash.slice(1))

// Copy buttons
async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text)
  const area = Object.assign(document.createElement('textarea'), { value: text })
  area.style.position = 'fixed'
  area.style.opacity = '0'
  document.body.append(area)
  area.select()
  const ok = document.execCommand('copy')
  area.remove()
  if (!ok) throw new Error('Copy failed')
}

$$('[data-copy], [data-copy-from]').forEach((button) => {
  button.addEventListener('click', async () => {
    const text = button.dataset.copy ?? button.previousElementSibling.textContent
    try {
      await copyText(text)
      button.textContent = 'Copied'
      button.classList.add('is-done')
    } catch {
      button.textContent = 'Press Ctrl+C'
    }
    setTimeout(() => {
      button.textContent = 'Copy'
      button.classList.remove('is-done')
    }, 1800)
  })
})

// Light / dark screenshots
const shots = $$('img[data-shot]')
const themeButtons = $$('[data-shot-theme]')

function setShotTheme(theme) {
  for (const button of themeButtons) {
    const active = button.dataset.shotTheme === theme
    button.classList.toggle('is-active', active)
    button.setAttribute('aria-pressed', String(active))
  }
  for (const img of shots) {
    const src = `assets/${theme}-${img.dataset.shot}.webp`
    if (img.getAttribute('src') === src) continue
    if (reducedMotion) {
      img.src = src
      continue
    }
    img.classList.add('is-swapping')
    setTimeout(() => {
      img.addEventListener('load', () => img.classList.remove('is-swapping'), { once: true })
      img.src = src
    }, 200)
  }
}

themeButtons.forEach((button) => button.addEventListener('click', () => setShotTheme(button.dataset.shotTheme)))

// Screenshot lightbox
const lightbox = $('[data-lightbox]')
const lightboxImg = $('img', lightbox)

$$('[data-zoom]').forEach((trigger) => {
  trigger.setAttribute('aria-label', `Enlarge screenshot: ${$('img', trigger).alt}`)
  trigger.addEventListener('click', () => {
    const img = $('img', trigger)
    lightboxImg.src = img.currentSrc || img.src
    lightboxImg.alt = img.alt
    lightbox.showModal()
  })
})
$('[data-lightbox-close]').addEventListener('click', () => lightbox.close())
lightbox.addEventListener('click', (event) => { if (event.target === lightbox) lightbox.close() })

// Put the visitor's platform first; point everyone else at the releases page
const platform = (navigator.userAgentData?.platform || navigator.platform || navigator.userAgent).toLowerCase()
const isMobile = /android|iphone|ipad/.test(navigator.userAgent.toLowerCase())
const os = isMobile ? null : /win/.test(platform) ? 'windows' : /mac/.test(platform) ? 'macos' : /linux|x11/.test(platform) ? 'linux' : null
const osLabels = { linux: 'Linux', windows: 'Windows', macos: 'macOS' }
if (os) {
  const downloads = $('[data-downloads]')
  downloads.prepend($(`[data-os="${os}"]`, downloads))
  const heroDownload = $('[data-hero-download]')
  heroDownload.textContent = `Download for ${osLabels[os]}`
  heroDownload.prepend($(`[data-os="${os}"] .os-logo`, downloads).cloneNode(true))
} else {
  $('[data-os-note]').hidden = false
}

$$('[data-year]').forEach((el) => { el.textContent = String(new Date().getFullYear()) })
