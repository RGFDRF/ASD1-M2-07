'use strict';
// Optional browser regression suite: npm install --no-save playwright; CHROME_PATH may override.
const { chromium } = require('playwright');
const assert = require('node:assert/strict');
const { pathToFileURL } = require('node:url');
const path = require('node:path');
const fs = require('node:fs');
(async () => {
 const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', headless: true });
 const page = await browser.newPage({ viewport: { width: 1280, height: 960 } });
 await page.route('https://**/*', route => route.abort()); // Reproducible offline run.
 const externalImages = []; page.on('request', r=>{if(r.resourceType()==='image' && /^https?:/.test(r.url()))externalImages.push(r.url());});
 const errors = []; page.on('pageerror', e => errors.push(e.message));
 const checks = [];
 const check = async (name, fn) => { try { await fn(); checks.push({name,pass:true}); } catch(e) { checks.push({name,pass:false,error:e.message}); } };
 const open = () => page.goto(pathToFileURL(path.resolve(__dirname, '../index.html')).href);
 await open();
 await check('Pusta lista ma czytelny komunikat', async()=>assert.match(await page.locator('#entries').innerText(), /Brak wpisów/));
 await check('Import dostępny z klawiatury', async()=>{
   await page.locator('#downloadReport').focus(); await page.keyboard.press('Tab');
   assert.equal(await page.evaluate(()=>document.activeElement.id),'import');
 });
 await check('Logo UwB działa lokalnie bez żądań do serwera', async()=>{
   assert.equal(await page.evaluate(()=>Array.from(document.images).filter(img=>!img.complete || img.naturalWidth===0).length),0);
   assert.equal(externalImages.length,0);
   assert.equal(await page.locator('#brandLogo').isVisible(),true);
   assert.ok(await page.locator('#brandLogo').evaluate(img=>img.naturalWidth>0));
 });
 await page.locator('#example').click();
 assert.equal(await page.locator('#progress').innerText(),'77,5%');
 page.on('dialog', d=>d.accept());
 await check('Zmiana przerwy aktualizuje sumy',async()=>{
   await page.getByRole('button',{name:'Edytuj',exact:true}).first().click();
   await page.locator('#break').fill('30'); await page.getByRole('button',{name:'Zapisz wpis'}).click();
   assert.equal(await page.locator('#done').innerText(),'450 min (7 h 30 min)');
   assert.match(await page.locator('#days').innerText(),/2026-11-02: 270 min/);
 });
 await check('Konflikt odrzucony bez zmiany stanu', async()=>{
   const before=await page.evaluate(()=>localStorage.getItem('asd1m207'));
   for(const [id,value] of Object.entries({id:'X',date:'2026-11-02',start:'11:00',end:'12:30',break:'0',description:'Konflikt'}))await page.locator('#'+id).fill(value);
   await page.getByRole('button',{name:'Zapisz wpis'}).click();
   assert.match(await page.locator('#message').innerText(),/nakłada/);
   assert.equal(await page.evaluate(()=>localStorage.getItem('asd1m207')),before);
 });
 await check('Eksport i import JSON przez interfejs', async()=>{
   const before=JSON.parse(await page.evaluate(()=>localStorage.getItem('asd1m207')));
   const dl=page.waitForEvent('download'); await page.locator('#export').click();
   const data=fs.readFileSync(await (await dl).path());
   assert.deepEqual(JSON.parse(data),before);
   await page.locator('#typical').click();
   await page.locator('#import').setInputFiles({name:'copy.json',mimeType:'application/json',buffer:data});
   await page.waitForFunction(()=>document.querySelector('#done').textContent.startsWith('450 min'));
   assert.deepEqual(JSON.parse(await page.evaluate(()=>localStorage.getItem('asd1m207'))),before);
 });
 await check('Wadliwy import zachowuje zapis',async()=>{
   const before=await page.evaluate(()=>localStorage.getItem('asd1m207'));
   await page.locator('#import').setInputFiles({name:'bad.json',mimeType:'application/json',buffer:Buffer.from('{bad')});
   await page.waitForFunction(()=>document.querySelector('#message').textContent.includes('Import odrzucony'));
   assert.equal(await page.evaluate(()=>localStorage.getItem('asd1m207')),before);
 });
 await check('Wyszukiwanie i filtr dat',async()=>{
   await page.locator('#search').fill('TESTOWANIE');assert.equal(await page.locator('.entry').count(),1);
   await page.locator('#from').fill('2026-11-04');assert.equal(await page.locator('.entry').count(),0);
   await page.locator('#search').fill('');await page.locator('#from').fill('');
 });
 await check('Odświeżenie odtwarza dane',async()=>{
   await page.reload();assert.equal(await page.locator('#done').innerText(),'450 min (7 h 30 min)');
 });
 await check('Tekst HTML nie jest wykonywany',async()=>{
   await page.getByRole('button',{name:'Edytuj',exact:true}).first().click();
   await page.locator('#description').fill('<img src=x onerror="window.injected=true">');
   await page.getByRole('button',{name:'Zapisz wpis'}).click();
   assert.equal(await page.locator('#entries img').count(),0);
   assert.equal(await page.evaluate(()=>window.injected),undefined);
 });
 await page.locator('#example').click();
 await page.evaluate(()=>scrollTo(0,0));
 const assets=path.resolve(__dirname,'../presentation/assets');fs.mkdirSync(assets,{recursive:true});
 await page.screenshot({path:path.join(assets,'aplikacja-desktop.png'),fullPage:true});
 await page.screenshot({path:path.join(assets,'aplikacja-podsumowanie.png'),clip:{x:0,y:0,width:1280,height:650}});
 await page.locator('#entries').screenshot({path:path.join(assets,'aplikacja-wpisy.png')});
 await check('Układ mobilny bez przewijania poziomego',async()=>{
   await page.setViewportSize({width:375,height:812});
   assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
   await page.screenshot({path:path.join(assets,'aplikacja-mobile.png'),fullPage:true});
 });
 await check('Brak błędów JavaScript',async()=>assert.deepEqual(errors,[]));
 const report={date:'2026-11-23',browser:await browser.version(),checks};
 fs.writeFileSync(path.resolve(__dirname,'../docs/verification/browser_verification.json'),JSON.stringify(report,null,2));
 console.log(JSON.stringify(report,null,2));await browser.close();
 if(checks.some(c=>!c.pass))process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
