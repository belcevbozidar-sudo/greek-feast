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

  // Dynamic image replacement from products.js to keep images updated
  if (typeof PRODUCTS !== 'undefined') {
    // Replace product images and data-img attributes
    document.querySelectorAll('.product-card').forEach(card => {
      const addBtn = card.querySelector('.add-btn');
      if (addBtn) {
        const id = addBtn.dataset.id;
        const prod = PRODUCTS.find(p => p.id === id);
        if (prod && prod.img) {
          // Update img in data-img attribute
          addBtn.dataset.img = prod.img;
          // Update the actual image src
          const img = card.querySelector('.product-figure img');
          if (img) {
            img.src = prod.img;
          }
        }
      }
    });

    // Replace category images
    const catImageMap = {
      'salad.svg': 'https://images.unsplash.com/photo-1623428187969-5da2d87e0afb?auto=format&fit=crop&w=600&q=80',
      'fish.svg': 'https://images.unsplash.com/photo-1497034825429-c343d7c6a68f?auto=format&fit=crop&w=600&q=80',
      'chicken-skewer.svg': 'https://images.unsplash.com/photo-1603360946369-dc9bb6258143?auto=format&fit=crop&w=600&q=80',
      'pork-skewer.svg': 'https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=600&q=80',
      'alcohol.svg': 'https://images.unsplash.com/photo-1568213816046-0ee1c42bd559?auto=format&fit=crop&w=600&q=80',
      'drinks.svg': 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?auto=format&fit=crop&w=600&q=80',
      'meze.svg': 'https://images.unsplash.com/photo-1541014741259-df549fa9ba6f?auto=format&fit=crop&w=600&q=80'
    };

    document.querySelectorAll('.category-card img, .cat-figure img').forEach(img => {
      const src = img.src;
      for (const key in catImageMap) {
        if (src.endsWith(key)) {
          img.src = catImageMap[key];
          break;
        }
      }
    });
  }
});
