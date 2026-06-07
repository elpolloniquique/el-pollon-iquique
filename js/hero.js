(function () {
  const header = document.getElementById('site-header');
  const menuToggle = document.getElementById('menu-toggle');
  const mobileMenu = document.getElementById('mobile-menu');
  const btnDelivery = document.getElementById('btn-delivery');
  const modal = document.getElementById('modal-delivery');
  const modalClose = document.getElementById('modal-delivery-close');

  window.addEventListener('scroll', () => {
    header?.classList.toggle('is-scrolled', window.scrollY > 24);
  }, { passive: true });

  function toggleMobileMenu(open) {
    const isOpen = open ?? mobileMenu?.hasAttribute('hidden');
    if (!mobileMenu || !menuToggle) return;
    if (isOpen) {
      mobileMenu.removeAttribute('hidden');
      menuToggle.setAttribute('aria-expanded', 'true');
    } else {
      mobileMenu.setAttribute('hidden', '');
      menuToggle.setAttribute('aria-expanded', 'false');
    }
  }

  menuToggle?.addEventListener('click', () => toggleMobileMenu());

  document.querySelectorAll('[data-open-delivery]').forEach(el => {
    el.addEventListener('click', () => {
      toggleMobileMenu(false);
      openModal();
    });
  });

  function openModal() {
    modal?.classList.add('is-open');
    modal?.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
  }

  function closeModal() {
    modal?.classList.remove('is-open');
    modal?.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
  }

  btnDelivery?.addEventListener('click', openModal);
  modalClose?.addEventListener('click', closeModal);
  modal?.addEventListener('click', e => { if (e.target === modal) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
})();
