import {test,expect} from '@playwright/test';
test.use({hasTouch:true});
test('five accessible menus, admin CRUD, text scaling and locking',async({page})=>{
 let rows=[];
 await page.route('**/functions/v1/aubreemenu-api',async route=>{
  const b=route.request().postDataJSON();let result={ok:true};let status=200;
  if(b.action==='list')result=rows;
  else if(b.passcode!=='test-only'){status=401;result={error:'Incorrect passcode.'}}
  else if(b.action==='add'){const row={...b,id:'test-item'};rows.push(row);result=row}
  else if(b.action==='update')rows=rows.map(r=>r.id===b.id?{...r,...b}:r);
  else if(b.action==='delete')rows=rows.filter(r=>r.id!==b.id);
  await route.fulfill({status,json:result});
 });
 await page.goto('/');
 await expect(page.getByRole('listbox')).toHaveCount(0);
 await expect(page.getByRole('button',{name:'Add item',exact:true})).toHaveCount(0);
 await page.getByRole('button',{name:'Admin',exact:true}).click();
 await page.getByLabel('Passcode',{exact:true}).fill('wrong');await page.getByRole('button',{name:'Unlock editing'}).click();
 await expect(page.getByRole('alert').filter({hasText:'Incorrect passcode.'})).toBeVisible();
 await page.getByLabel('Passcode',{exact:true}).fill('test-only');await page.getByRole('button',{name:'Unlock editing'}).click();
 await expect(page.getByRole('listbox')).toHaveCount(5);
 for(const subject of ['Spanish','English','Physical Sciences','U.S. History','Culinary']){
  const card=page.locator('section').filter({has:page.getByRole('heading',{name:subject,exact:true})});
  await card.getByRole('button',{name:'Add item',exact:true}).click();await page.getByLabel('Item name',{exact:true}).fill('Practice');await page.getByLabel('URL',{exact:true}).fill('https://example.com/');await page.getByRole('button',{name:'Save item'}).click();
  await expect(card.getByRole('option',{name:'Practice',exact:true})).toHaveCount(1);
  await card.getByRole('button',{name:'Edit selected'}).click();await page.getByLabel('Item name',{exact:true}).fill('Updated practice');await page.getByRole('button',{name:'Save item'}).click();await expect(card.getByRole('option',{name:'Updated practice'})).toHaveCount(1);
  await card.getByRole('button',{name:'Delete selected'}).click();await page.getByRole('button',{name:'Delete item',exact:true}).click();await expect(card.getByRole('option')).toHaveCount(0);
 }
 await page.getByLabel('Text size').selectOption('42');await expect(page.locator('html')).toHaveCSS('font-size','42px');
 await page.getByRole('button',{name:'Lock admin'}).click();await expect(page.getByRole('button',{name:'Add item',exact:true})).toHaveCount(0);
 await page.setViewportSize({width:390,height:844});expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.reload();await expect(page.locator('html')).toHaveCSS('font-size','42px');
});
test('network errors provide a retry path',async({page})=>{await page.route('**/functions/v1/aubreemenu-api',r=>r.abort());await page.goto('/');await expect(page.getByRole('status')).toContainText('Could not load menus');await expect(page.getByRole('button',{name:'Refresh menus'})).toBeEnabled()});

test('public menu links open from a mobile tap',async({page})=>{
 await page.setViewportSize({width:390,height:844});
 await page.route('**/functions/v1/aubreemenu-api',route=>route.fulfill({json:[{id:'1',subject:'Spanish',name:'Practice',url:'https://example.com/'}]}));
 await page.goto('/');
 const link=page.getByRole('link',{name:'Practice'});
 await expect(link).toHaveAttribute('href','https://example.com/');
 const popupPromise=page.waitForEvent('popup');
 await link.tap();
 const popup=await popupPromise;
 await expect(popup).toHaveURL('https://example.com/');
 await popup.close();
});
