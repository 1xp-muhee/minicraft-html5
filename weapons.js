export const weaponCatalog = {
  slingshot: { key:'slingshot', name:'새총', len:1.1, color:0x6b4f2d, projectile:'stone' },
  wand: { key:'wand', name:'마법 지팡이', len:1.0, color:0x5b3a29, projectile:'magic' },
  k2: { key:'k2', name:'K2', len:1.3, color:0x2f343a, projectile:'bullet' },
  crossbow: { key:'crossbow', name:'석궁', len:1.2, color:0x5b4632, projectile:'bolt' },
  galaxy26: { key:'galaxy26', name:'갤럭시26 울트라', len:1.35, color:0x7c3aed, projectile:'starlens' }
};

export function resolveWeaponSelection() {
  return new Promise((resolve) => {
    const saved = (localStorage.getItem('officecraft_weapon_key') || 'slingshot').toLowerCase();

    const wrap = document.createElement('div');
    wrap.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.62);display:flex;align-items:center;justify-content:center;';

    const card = document.createElement('div');
    card.style.cssText = 'width:min(780px,92vw);background:#111827;color:#fff;border-radius:14px;padding:18px;box-shadow:0 20px 40px rgba(0,0,0,.4);';
    card.innerHTML = '<div style="font-weight:700;font-size:18px;margin-bottom:12px">무기 선택</div><div style="opacity:.85;margin-bottom:14px">아래 무기 박스를 클릭해서 선택하세요.</div>';

    const grid = document.createElement('div');
    grid.style.cssText = 'display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;';

    const items = [
      { key:'slingshot', title:'새총', shape:'Y' },
      { key:'wand', title:'마법 지팡이', shape:'✦' },
      { key:'k2', title:'K2', shape:'▇' },
      { key:'crossbow', title:'석궁', shape:'⟛' },
      { key:'galaxy26', title:'갤럭시26 울트라', shape:'◉' }
    ];

    const pick = (key) => {
      const w = weaponCatalog[key] || weaponCatalog.slingshot;
      localStorage.setItem('officecraft_weapon_key', key);
      wrap.remove();
      resolve(w);
    };

    for (const item of items) {
      const btn = document.createElement('button');
      const active = item.key === saved;
      btn.style.cssText = `border:1px solid ${active ? '#60a5fa' : '#374151'};background:${active ? '#1f2937' : '#0f172a'};color:#fff;border-radius:12px;padding:14px;cursor:pointer;text-align:left;`;
      btn.innerHTML = `
        <div style="display:flex;justify-content:space-between;align-items:center">
          <strong>${item.title}</strong>
          <span style="font-size:22px">${item.shape}</span>
        </div>
        <div style="margin-top:8px;opacity:.8;font-size:12px">클릭해서 선택</div>
      `;
      btn.onclick = () => pick(item.key);
      grid.appendChild(btn);
    }

    card.appendChild(grid);
    wrap.appendChild(card);
    document.body.appendChild(wrap);
  });
}
