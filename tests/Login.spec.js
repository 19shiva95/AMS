// @ts-check
import { test, expect } from '@playwright/test';
import { isContext, runInNewContext } from 'node:vm';

test.describe('Login functionality validation', () => {
  test.describe.configure({ mode: 'serial' });
  test('login with valid credentials',async({page})=>{
    await page.goto('https://DEV.milanhospital.chorusassetmanagement.com')
    await expect(page.locator("//h1[contains(text(),'Log in to your account')]")).toBeVisible()
    await (page.locator("(//p[@class='auth-step__subtitle'])[1]")).waitFor({ state: 'visible' }); 
    await page.getByRole('textbox',{name:"email"}).fill("shivayogi_kumbhar@ylconsulting.com")
    await page.getByRole('textbox',{name:"password"}).fill("Admin@123")
    await page.getByRole('button',{name:"Sign In"}).click()
    await expect(page.getByRole('button',{name:"Sign In"})).toBeHidden()


  })
test('login with INvalid credentials',async({page})=>{
    await page.goto('https://DEV.milanhospital.chorusassetmanagement.com')
    await page.getByRole('textbox',{name:"email"}).fill("Invalid@ylconsulting.com")
    await page.getByRole('textbox',{name:"password"}).fill("Admin@123")
    await page.getByRole('button',{name:"Sign In"}).click()
    await expect(page.getByRole('button',{name:"Sign In"})).toBeVisible()
    await expect(page.locator("//p[contains(text(),'User not found')]")).toBeVisible()
        
  })
test('Validate account lock functionality',async({page})=>{
    await page.goto('https://DEV.milanhospital.chorusassetmanagement.com')
    await page.getByRole('textbox',{name:"email"}).fill("shivayogi_kumbhar@ylconsulting.com")
    await page.getByRole('textbox',{name:"password"}).fill("Admin@12")
      for(let i=1;i<=5;i++){
          await page.getByRole('button',{name:"Sign In"}).click()   
          if(i<5){
          await expect(page.locator('//p[@class="auth-step__error"]')).toContainText("Invalid credentials")
          }
      }

    await (page.getByText('Account locked due to too many failed attempts')).waitFor({ state: 'visible' }); 

  await page.getByRole('textbox',{name:"email"}).clear()
  await page.getByRole('textbox',{name:"email"}).fill("System@ams.com")  
  await page.getByRole('textbox',{name:"password"}).clear()
  await page.getByRole('textbox',{name:"password"}).fill("Admin@123")
  await page.getByRole('button',{name:"Sign In"}).click()
  await page.locator('span:has-text("User Management")').click()
  await page.getByRole('textbox', { name: /Search name, email, role, field office, location, status, verification status/i }).fill("shivayogi")
  await page.locator('(//div[@class="shared-action-menu__trigger"])[3]').click()    
  await page.getByText('Unlock').click()

  })
 test('validate the error message for the fields ',async({page})=>{
    await page.goto('https://DEV.milanhospital.chorusassetmanagement.com')
    await page.getByRole('textbox',{name:"email"}).fill(" ")
    await page.getByRole('textbox',{name:"password"}).fill(" ")
    await page.getByRole('button',{name:"Sign In"}).click()
    await expect(page.getByText('Please enter your email address.')).toBeVisible()
    await (page.getByText('Please enter your password.')).waitFor({state: "visible"})
    await page.getByRole('textbox',{name:"email"}).fill("shiavyogi")
    await (page.getByText('Please enter a valid email address.')).waitFor({state: "visible"})
    

  })
test('validate the JWT token generation', async ({ page }) => {
  function decode_JWT_token(token) {
    const parts = token.split('.');
    if (parts.length !== 3) {
      throw new Error("Invalid format token ");
    }
    // Handle Base64URL characters and base64 decode
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf-8');

    return JSON.parse(jsonPayload);
  }

  const expectedEmail = 'shivayogi_kumbhar@ylconsulting.com';
  const expectedRole = 'Admin';

  await page.goto('https://DEV.milanhospital.chorusassetmanagement.com');
  await expect(page.locator("//h1[contains(text(),'Log in to your account')]")).toBeVisible();

  // 1. Intercept the login network response
  const loginResponsePromise = page.waitForResponse(
    response => response.url().includes('/auth/login') && response.request().method() === 'POST'
  );

  // 2. Perform login actions
  await page.getByRole('textbox', { name: "email" }).fill("shivayogi_kumbhar@ylconsulting.com");
  await page.getByRole('textbox', { name: "password" }).fill("Admin@123");
  await page.getByRole('button', { name: "Sign In" }).click();

  // 3. Extract access token from response (or switch to localStorage/cookies if preferred)
  const loginResponse = await loginResponsePromise;
  expect(loginResponse.status()).toBe(200);

  const body = await loginResponse.json();
  const accessToken = body.data?.accessToken || body.accessToken || body.token;

  expect(accessToken).toBeTruthy();

  // 4. Decode the token payload and print all extracted details
  const payload = decode_JWT_token(accessToken);
  console.log('Decoded JWT Payload:', JSON.stringify(payload, null, 2));

  // 5. Extract fields (supports common JWT claim variations)
  const email = payload.email || payload.sub;
  const role = payload.roleName || payload.role || (payload.roles && payload.roles[0]);
  const sessionId = payload.sessionId || payload.sid || payload.jti;
  const expTimestamp = payload.exp; // Epoch time in seconds

  // --- Validations ---

  // Validate Email
  expect(email).toBe(expectedEmail);

  // Validate Role
  expect(role).toBe(expectedRole);


  // Validate Session ID (must exist and be non-empty)
  expect(sessionId).toBeDefined();
  expect(typeof sessionId).toBe('string');
  expect(sessionId.length).toBeGreaterThan(0);

  // Validate Expiration Date (must be in the future)
  expect(expTimestamp).toBeDefined();
  const currentEpochSeconds = Math.floor(Date.now() / 1000);
  expect(expTimestamp).toBeGreaterThan(currentEpochSeconds);

  // Optional: Convert expiration to human-readable Date for logging/asserting
  const expiryDate = new Date(expTimestamp * 1000);
  console.log(`Token expires at: ${expiryDate.toISOString()}`);
  expect(expiryDate.getTime()).toBeGreaterThan(Date.now());

})

test('validate concurrent seession handling ',async({page,context}) =>{
    await page.goto('https://DEV.milanhospital.chorusassetmanagement.com');
    await page.getByRole('textbox',{name:"email"}).fill("shivayogi_kumbhar@ylconsulting.com")
    await page.getByRole('textbox',{name:"password"}).fill("Admin@123")
    await page.getByRole('button',{name:"Sign In"}).click()
    const newPage=await context.newPage()
    await newPage.goto('https://DEV.milanhospital.chorusassetmanagement.com');
    await newPage.getByRole('textbox',{name:"email"}).fill("shivayogi_kumbhar@ylconsulting.com")
    await newPage.getByRole('textbox',{name:"password"}).fill("Admin@123")
    await newPage.getByRole('button',{name:"Sign In"}).click()
    await page.bringToFront();
    await page.reload()
    await expect(page.getByRole('button',{name:"Sign In"})).toBeVisible()
    await newPage.close()

})
test('validate forgot password page ',async({page})=>{
    await page.goto('https://DEV.milanhospital.chorusassetmanagement.com');
    await page.getByRole('button',{name:'Forgot password?'}).click()
    await page.locator('//button[@aria-label="Back to sign in"]').click()
    await page.getByRole('button',{name:'Forgot password?'}).click()
    await page.getByRole('textbox', { name: 'Email Address' }).fill('Invalid email')
    await page.getByRole('button', { name: 'Send OTP' }).click()
    await expect(page.getByText('Please enter a valid email address.')).toBeVisible()
    await page.getByRole('textbox', { name: 'Email Address' }).fill('Nonexistingemail@gmail.com')
    await page.getByRole('button', { name: 'Send OTP' }).click()
    await expect(page.getByText('User not found', { exact: true })).toBeVisible()
    await page.getByRole('textbox', { name: 'Email Address' }).clear()

})


})



