document.addEventListener('DOMContentLoaded', () => {
  const toggle = document.getElementById('navToggle');
  const nav = document.getElementById('mainNav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => nav.classList.toggle('open'));
    nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => nav.classList.remove('open')));
  }

  const filterBar = document.querySelector('.filter-bar');
  if (filterBar) {
    filterBar.addEventListener('click', e => {
      const chip = e.target.closest('.filter-chip');
      if (!chip) return;
      filterBar.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      const target = chip.dataset.target;
      document.querySelectorAll('.category-anchor').forEach(section => {
        section.style.display = (target === 'all' || section.id === target) ? '' : 'none';
      });
    });
  }

  const searchInput = document.getElementById('catalogSearch');
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      const q = searchInput.value.trim().toLowerCase();
      document.querySelectorAll('.product-card').forEach(card => {
        const name = card.dataset.searchName || '';
        card.style.display = name.includes(q) ? '' : 'none';
      });
      if (q) {
        document.querySelectorAll('.category-anchor').forEach(s => s.style.display = '');
        document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        document.querySelector('.filter-chip[data-target="all"]')?.classList.add('active');
      }
    });
  }
});
