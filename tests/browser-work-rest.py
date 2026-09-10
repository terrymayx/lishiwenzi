"""Offline Chromium UI checks. Requires Python Playwright + an installed Chromium.
Loads the real HTML/CSS/ES modules in memory (no network); localStorage is a
memory fixture because about:blank has an opaque origin. This is not a live
GitHub Pages deployment or real-origin storage test.
"""
from pathlib import Path
import json
import os
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
ARTIFACTS = Path(os.environ.get('UI_ARTIFACTS', '/mnt/data/lishi-ui-checks'))
ARTIFACTS.mkdir(parents=True, exist_ok=True)


def load(page, saved=None):
    html = (ROOT / 'dist/index.html').read_text()
    scripts = re.findall(r'<script type="module" src="./([^"?]+)', html)
    css = re.findall(r'<link rel="stylesheet" href="./([^"?]+)', html)
    html = re.sub(r'<script\b[\s\S]*?</script>', '', html)
    html = re.sub(r'<link rel="stylesheet"[^>]+>', '', html)
    html = html.replace('</head>', '<style>' + '\n'.join((ROOT/'dist'/f).read_text() for f in css) + '</style></head>')
    page.set_content(html)
    files = {f.name: f.read_text() for f in (ROOT/'dist').glob('*.js')}
    page.evaluate(r'''async ({files,scripts,saved}) => {
      const store=new Map();if(saved)store.set('luanshi-jia-shu-v3',saved);
      Object.defineProperty(window,'localStorage',{value:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,String(v)),removeItem:k=>store.delete(k),clear:()=>store.clear()}});
      const urls=new Map();
      function moduleUrl(name){
        if(urls.has(name))return urls.get(name);
        if(!(name in files))throw Error('Unknown fixture module: '+name);
        let source=files[name].replace(/(\bfrom\s*|\bimport\s*)(['"])(\.\/[^'"]+)\2/g,(_,prefix,quote,spec)=>{
          let target=spec.slice(2).split('?')[0];
          if(name==='game.js'&&spec==='./engine.js?v=1.2.0')target='engine-v14.js';
          return prefix+quote+moduleUrl(target)+quote;
        });
        const url=URL.createObjectURL(new Blob([source],{type:'text/javascript'}));urls.set(name,url);return url;
      }
      for(const name of scripts)await import(moduleUrl(name));
      window.__browserEngine=await import(moduleUrl('engine-v14.js'));
      window.dispatchEvent(new Event('DOMContentLoaded'));
    }''', {'files': files, 'scripts': scripts, 'saved': saved})
    if not saved:
        page.locator('#setup-form button').click()
    page.wait_for_timeout(240)


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch(executable_path=os.environ.get('CHROMIUM', '/usr/bin/chromium'),headless=True,args=['--no-sandbox'])
        page = browser.new_page(viewport={'width':1440,'height':1050})
        page.set_default_timeout(3500)
        errors=[]; page.on('pageerror',lambda e:errors.append(str(e)))
        load(page)
        assert page.locator('#economy-panel summary').filter(has_text='家庭分工').count()==0, 'old household assignment panel remains'
        assert page.locator('#actions [data-action]').first.get_attribute('data-action')=='longfarm'
        ids=page.locator('#tree .tree-node[data-person]').evaluate_all('(nodes)=>nodes.map(n=>n.dataset.person)')
        assert len(ids)==2
        assert page.locator('#tree .tree-work-label').count()==2, 'missing current-work labels'
        assert page.locator('#tree .tree-health-track').count()==2
        # Assign the protagonist: main action, label, income and save update without a day tick.
        before=page.evaluate('({day:__luanshiState.elapsedDays,money:__luanshiState.resources.money,health:__luanshiState.people[__luanshiState.playerId].health})')
        page.locator(f'#tree [data-person="{ids[0]}"]').click(button='right')
        page.locator('#work-context-menu [data-job="shortwork"]').click()
        assert page.evaluate('__luanshiState.currentActivity.id')=='trade'
        assert '短工' in page.locator('#activity-line').inner_text()
        assert '短工' in page.locator(f'#tree [data-person="{ids[0]}"] .tree-work-label').text_content()
        assert before==page.evaluate('({day:__luanshiState.elapsedDays,money:__luanshiState.resources.money,health:__luanshiState.people[__luanshiState.playerId].health})')
        # A family member has a separate persistent assignment.
        page.locator(f'#tree [data-person="{ids[1]}"]').click(button='right')
        page.locator('#work-context-menu [data-job="longfarm"]').click()
        assert page.evaluate('__luanshiState.currentActivity.id')=='trade'
        assert '农闲休养' in page.locator(f'#tree [data-person="{ids[1]}"] .tree-work-label').text_content()
        # Right-click during simulation pauses; dismissing or choosing never resumes it.
        page.select_option('#speed','1');page.locator('#start-time').click();page.wait_for_timeout(480)
        page.locator(f'#tree [data-person="{ids[1]}"]').click(button='right')
        assert page.evaluate('__luanshiState.running') is False
        date=page.evaluate('__luanshiState.elapsedDays');page.wait_for_timeout(550)
        assert page.evaluate('__luanshiState.elapsedDays')==date
        page.keyboard.press('Escape');assert not page.locator('#work-context-menu').is_visible()
        assert not page.evaluate('__luanshiState.running')
        # Existing single-click details remain usable; explicit fallback button works too.
        page.locator(f'#tree [data-person="{ids[1]}"]').click()
        page.locator('#person-detail .assign-work-button').click()
        page.locator('#work-context-menu [data-job="homecraft"]').click()
        assert '副业' in page.locator(f'#tree [data-person="{ids[1]}"] .tree-work-label').text_content()
        # Buying grain immediately updates the top resources; date remains unchanged.
        old=page.evaluate('__luanshiState.resources.grain')
        page.get_by_role('button',name=re.compile(r'^买1粮 ·')).click()
        assert float(page.locator('#grain').inner_text())==round(old+1,2)
        assert page.evaluate('__luanshiState.elapsedDays')==date
        saved=page.evaluate('localStorage.getItem("luanshi-jia-shu-v3")')
        page.screenshot(path=str(ARTIFACTS/'desktop.png'),full_page=True)
        # Reload the JSON using the same app bootstrap, not an invented second state.
        restored=browser.new_page(viewport={'width':1280,'height':960})
        restored.on('pageerror',lambda e:errors.append(str(e)))
        load(restored,saved)
        assert restored.evaluate('__luanshiState.currentActivity.id')=='trade'
        assert restored.evaluate('__luanshiState.agriculture.work.assignments[Object.keys(__luanshiState.people)[1]]')=='homecraft'
        assert not restored.evaluate('__luanshiState.running')
        # Menu respects age, death and major pending decisions.
        restored.evaluate('''()=>{const s=__luanshiState;const p=s.people[Object.keys(s.people)[1]];p.age=12;window.dispatchEvent(new Event('luanshi:statechange'));}''')
        restored.locator(f'#tree [data-person="{ids[1]}"]').click(button='right')
        assert restored.locator('#work-context-menu [data-job="shortwork"]').is_disabled()
        assert not restored.locator('#work-context-menu [data-job="study"]').is_disabled()
        restored.keyboard.press('Escape')
        restored.evaluate('''()=>{__luanshiState.pendingEvent={id:'major',title:'测试重大事件',options:[]};window.dispatchEvent(new Event('luanshi:statechange'));}''')
        restored.locator(f'#tree [data-person="{ids[0]}"]').click(button='right')
        assert restored.locator('#work-context-menu [data-job]:enabled').count()==0
        restored.keyboard.press('Escape')
        restored.evaluate('''()=>{const s=__luanshiState;s.pendingEvent=null;s.people[Object.keys(s.people)[1]].alive=false;window.dispatchEvent(new Event('luanshi:statechange'));}''')
        restored.locator(f'#tree [data-person="{ids[1]}"]').click(button='right')
        assert restored.locator('#work-context-menu [data-job]:enabled').count()==0
        # Three generations with long names: no overlapping cards or clipped work rows.
        restored.evaluate("""()=>{const s=__luanshiState,base=s.people[s.playerId];
          for(let i=0;i<9;i++){const p=JSON.parse(JSON.stringify(base));p.id='test-person-'+i;p.name='测试长姓名人物'+i;p.generation=1+Math.floor(i/3);p.parentIds=[i<3?s.playerId:'test-person-'+(i-3)];s.people[p.id]=p;}
          window.dispatchEvent(new Event('luanshi:statechange'));
        }""")
        boxes=restored.locator('#tree .tree-person-card').evaluate_all('(nodes)=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height}})')
        for i,a in enumerate(boxes):
            for b in boxes[i+1:]:
                assert a['x']+a['w']<=b['x']+.1 or b['x']+b['w']<=a['x']+.1 or a['y']+a['h']<=b['y']+.1 or b['y']+b['h']<=a['y']+.1
        restored.locator('#tree [data-person="test-person-0"]').click(button='right')
        restored.screenshot(path=str(ARTIFACTS/'family-menu.png'),full_page=True)
        restored.close()
        # Narrow screen: selected-person fallback rather than a required mouse right click.
        phone=browser.new_page(viewport={'width':390,'height':844},is_mobile=True,has_touch=True)
        phone.on('pageerror',lambda e:errors.append(str(e)))
        load(phone,saved)
        phone.locator(f'#tree [data-person="{ids[1]}"]').tap()
        phone.locator('#person-detail .assign-work-button').tap()
        box=phone.locator('#work-context-menu').bounding_box()
        assert box['x']>=0 and box['x']+box['width']<=391
        phone.locator('#work-context-menu [data-job="rest"]').tap()
        assert '休养' in phone.locator(f'#tree [data-person="{ids[1]}"] .tree-work-label').text_content()
        phone.screenshot(path=str(ARTIFACTS/'phone.png'),full_page=True)
        assert not errors,errors
        print(json.dumps({'result':'passed','console_errors':errors,'checks':['panel removed','node status and health','main assignment sync','family assignment','pause on right-click','escape','click details','immediate market feedback','JSON reload','minor restrictions','major event lock','dead restrictions','touch fallback','multi-generation card geometry']},ensure_ascii=False))
        browser.close()

if __name__=='__main__':run()
