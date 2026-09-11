"""Real local HTML/CSS/ES-module rendering checks, using offline Chromium.

Requires Python Playwright and Chromium. Honors the actual import map. Network
and real-origin storage are NOT tested: localStorage is an in-memory fixture.
Run: python tests/browser-compact-ui.py
"""
from pathlib import Path
import json
import os
import re
from playwright.sync_api import sync_playwright

ROOT = Path(os.environ.get('UI_ROOT', Path(__file__).resolve().parents[1]))
ARTIFACTS = Path(os.environ.get('UI_ARTIFACTS', ROOT / 'artifacts/compact-ui'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def load(page, saved=None):
    html = (ROOT / 'dist/index.html').read_text()
    scripts = re.findall(r'<script type="module" src="./([^"?]+)', html)
    styles = re.findall(r'<link rel="stylesheet" href="./([^"?]+)', html)
    match = re.search(r'<script type="importmap">([\s\S]*?)</script>', html)
    imports = json.loads(match[1]).get('imports', {}) if match else {}
    html = re.sub(r'<script\b[\s\S]*?</script>', '', html)
    html = re.sub(r'<link rel="stylesheet"[^>]+>', '', html)
    html = html.replace('</head>', '<style>' + '\n'.join((ROOT/'dist'/f).read_text() for f in styles) + '</style></head>')
    page.set_content(html)
    files = {f.name: f.read_text() for f in (ROOT/'dist').glob('*.js')}
    page.evaluate(r'''async ({files, scripts, saved, imports}) => {
      const store = new Map();
      if(saved) store.set('luanshi-jia-shu-v3', saved);
      Object.defineProperty(window, 'localStorage', {value: {
        getItem:k=>store.get(k)??null, setItem:(k,v)=>store.set(k,String(v)),
        removeItem:k=>store.delete(k), clear:()=>store.clear()
      }});
      const urls = new Map(), visiting = new Set();
      function moduleUrl(name) {
        if(urls.has(name)) return urls.get(name);
        if(visiting.has(name)) throw Error('Circular fixture module: '+name);
        if(!(name in files)) throw Error('Missing fixture module: '+name);
        visiting.add(name);
        const source=files[name].replace(/(\bfrom\s*|\bimport\s*)(['"])(\.\/[^'"]+)\2/g,(_,prefix,quote,spec)=>{
          const target=(imports[spec]||spec).slice(2).split('?')[0];
          return prefix+quote+moduleUrl(target)+quote;
        });
        const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));
        urls.set(name,url);visiting.delete(name);return url;
      }
      for(const name of scripts) await import(moduleUrl(name));
      window.__browserEngine=await import(moduleUrl(imports['./engine.js?v=1.2.0'].slice(2).split('?')[0]));
      window.dispatchEvent(new Event('DOMContentLoaded'));
    }''', dict(files=files, scripts=scripts, saved=saved, imports=imports))
    if not saved:
        page.locator('#setup-form button').click()
    page.wait_for_timeout(220)
    page.evaluate('scrollTo(0,0)')


def height(page, selector):
    return page.locator(selector).first.evaluate('(e)=>e.getBoundingClientRect().height')


def no_page_overflow(page):
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), 'page overflows horizontally'


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'), headless=True, args=['--no-sandbox'])
        errors = []
        metrics = []
        for width, h, touch in [(1440, 1000, False), (1024, 768, False), (390, 844, True), (320, 740, True)]:
            context = browser.new_context(viewport={'width': width, 'height': h}, has_touch=touch)
            page = context.new_page()
            page.set_default_timeout(4000)
            page.on('pageerror', lambda e: errors.append(str(e)))
            load(page)
            assert page.evaluate("parseFloat(getComputedStyle(document.documentElement).fontSize) <= 14"), 'compact base type is missing'
            no_page_overflow(page)
            assert height(page, '.time-flow') <= 58
            assert height(page, '#tree') <= 210, 'initial two-generation tree must be shorter'
            assert page.locator('#tree .relation-line').count() > 0
            assert page.locator('.chronicle').get_attribute('open') is None
            market = page.locator('[data-compact-fold="grain-market"]')
            assert market.count() == 1 and not market.evaluate('(e)=>e.open')
            market.locator('summary').click()
            assert market.evaluate('(e)=>e.open')
            page.evaluate("dispatchEvent(new Event('luanshi:statechange'))")
            page.wait_for_timeout(140)
            assert market.evaluate('(e)=>e.open'), 'market expansion lost after render'
            market.locator('summary').click()

            if width == 1440:
                assert height(page, '.resource-strip') <= 48, 'seven core resources must occupy one row'
                ys = page.locator('.resource-card').evaluate_all('(nodes)=>nodes.map(e=>e.getBoundingClientRect().top)')
                assert len(set(ys)) == 1 and len(ys) == 7
                assert height(page, '.topbar') < 90
                assert height(page, '.actions-panel') < 920
                assert height(page, '.archive-panel') < 420
                assert height(page, '#economy-panel') < 230

            # View refreshes cannot alter the saved game state.
            before = page.evaluate('__browserEngine.serializeState(__luanshiState)')
            page.wait_for_timeout(300)
            assert page.evaluate('__browserEngine.serializeState(__luanshiState)') == before
            metrics.append(dict(width=width, topbar=height(page,'.topbar'), resources=height(page,'.resource-strip'), actions=height(page,'.actions-panel'), family=height(page,'.archive-panel'), tree=height(page,'#tree')))
            page.evaluate('scrollTo(0,0)')
            page.screenshot(path=str(ARTIFACTS / f'family-{width}.png'), full_page=True)

            # Existing keyboard/right-click assignment remains usable, inside the viewport.
            player_id = page.evaluate('__luanshiState.playerId')
            player = page.locator(f'#tree [data-person="{player_id}"]')
            player.click(button='right')
            menu = page.locator('#work-context-menu')
            assert menu.is_visible()
            assert menu.evaluate('(e)=>{const r=e.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight}')
            menu.locator('[data-job="shortwork"]').click()
            assert page.evaluate('__luanshiState.currentActivity.id') == 'trade'
            assert page.locator('[data-action="trade"] span').evaluate('(e)=>getComputedStyle(e).webkitLineClamp') == 'none'
            page.select_option('#speed', '1')
            page.locator('#start-time').click()
            assert page.locator('#time-flow').evaluate('(e)=>e.classList.contains("running")')
            page.locator('#pause-time').click()
            assert not page.evaluate('__luanshiState.running')
            other = page.locator(f'#tree [data-person]:not([data-person="{player_id}"])').first
            other.click(button='right')
            assert page.locator('#work-context-menu').count() == 0, 'mother must not gain manual work control'

            # Resource shortcut buys immediately; shrinking never moves the click target.
            page.locator('[data-resource-shortcut="grain"]').click()
            money, grain = page.evaluate('[__luanshiState.resources.money,__luanshiState.resources.grain]')
            page.locator('#resource-shortcut-panel button').filter(has_text='买10粮').click()
            new_money, new_grain = page.evaluate('[__luanshiState.resources.money,__luanshiState.resources.grain]')
            assert new_grain == grain + 10 and new_money < money

            page.locator('[data-tab="assets"]').click()
            page.wait_for_timeout(180)
            assert page.locator('.business-card').count() == 10
            assert page.locator('.unlock-badge.locked').count() > 0
            assert page.locator('.unlock-conditions').count() > 0
            remote = page.locator('.v170-remote-businesses')
            assert not remote.evaluate('(e)=>e.open')
            remote.locator('summary').click()
            assert remote.evaluate('(e)=>e.open')
            page.evaluate("dispatchEvent(new Event('luanshi:statechange'))")
            page.wait_for_timeout(160)
            assert remote.evaluate('(e)=>e.open'), 'remote expansion lost after a day/render'
            assert page.locator('.business-card').evaluate_all('(cards)=>cards.filter(e=>e.getBoundingClientRect().height>0).every(e=>e.scrollWidth<=e.clientWidth+1)'), 'industry card content overflows'
            no_page_overflow(page)
            remote.locator('summary').click()
            page.evaluate('scrollTo(0,0)')
            page.screenshot(path=str(ARTIFACTS / f'assets-{width}.png'), full_page=True)
            if touch:
                assert page.locator('.resource-plus').first.evaluate('(e)=>e.getBoundingClientRect().height>=36')
                assert page.locator('#speed').evaluate('(e)=>parseFloat(getComputedStyle(e).fontSize)>=16')
            page.locator('[data-tab="timeline"]').click()
            assert page.locator('.timeline-row').count() > 0
            no_page_overflow(page)
            # Large families scroll inside their own pane, not across the detail panel.
            page.evaluate('''()=>{
              const s=__luanshiState, root=s.people[s.playerId];
              for(let i=0;i<8;i++){
                const person=structuredClone(root);
                person.id='ui-test-relative-'+i;person.name='家族成员'+i;
                person.spouseId=null;person.childrenIds=[];person.role='relative';
                s.people[person.id]=person;
              }
            }''')
            page.locator('[data-tab="family"]').click()
            page.wait_for_timeout(160)
            assert page.locator('#tree .tree-node').count() == 10
            assert page.locator('.compact-family-map').evaluate('(e)=>e.scrollWidth>e.clientWidth')
            if width == 1440:
                assert page.evaluate("document.querySelector('.compact-family-map').getBoundingClientRect().right <= document.querySelector('#person-detail').getBoundingClientRect().left")
            no_page_overflow(page)
            context.close()
        assert not errors, errors
        (ARTIFACTS/'metrics.json').write_text(json.dumps(metrics, ensure_ascii=False, indent=2))
        print(json.dumps({'result':'passed','viewport_count':len(metrics),'page_errors':len(errors),'metrics':metrics}, ensure_ascii=False, indent=2))
        browser.close()


if __name__ == '__main__':
    run()
