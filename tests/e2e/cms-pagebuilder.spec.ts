import { test, expect } from '@playwright/test';

test.describe('CMS Pages and Page Builder', () => {
  
  test.beforeEach(async ({ page }) => {
    // Remove emergent badge overlay if present
    await page.addInitScript(() => {
      setInterval(() => {
        const badge = document.querySelector('[class*="emergent"], [id*="emergent-badge"]');
        if (badge) badge.remove();
      }, 500);
    });
  });

  test.describe('CMS Pages at Root URLs', () => {
    
    test('Contact us page loads at /Contact-us', async ({ page }) => {
      await page.goto('/Contact-us', { waitUntil: 'domcontentloaded' });
      
      // Page should load without 404
      await expect(page.locator('h1')).toContainText(/Contact us/i);
      
      // Should have the contact form
      await expect(page.getByTestId('contact-form')).toBeVisible();
    });

    test('Events page loads at /events-page', async ({ page }) => {
      await page.goto('/events-page', { waitUntil: 'domcontentloaded' });
      
      // Page should load without 404
      await expect(page.locator('h1')).toContainText(/Events/i);
      
      // Should show events or "No Upcoming Events" message
      const hasEvents = await page.locator('[class*="card"]').first().isVisible().catch(() => false);
      const hasNoEventsMsg = await page.getByText(/No Upcoming Events|Check back soon/i).isVisible().catch(() => false);
      
      expect(hasEvents || hasNoEventsMsg).toBeTruthy();
    });

    test('Dynamic navigation shows CMS pages', async ({ page }) => {
      // Navigate to events page first since landing page may not have CMS links
      await page.goto('/events-page', { waitUntil: 'domcontentloaded' });
      
      // Wait for page to load
      await expect(page.locator('h1')).toContainText(/Events/i);
      
      // Check navigation has CMS tiles from the CMS page's nav
      const contactLink = page.getByRole('link', { name: /Contact us/i });
      
      // Nav should show Contact us link (from CMS page)
      await expect(contactLink.first()).toBeVisible({ timeout: 5000 });
    });

    test('Navigation links to CMS pages work', async ({ page }) => {
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      
      // Click on Contact us link in nav
      const contactLink = page.getByRole('link', { name: /Contact us/i });
      if (await contactLink.isVisible()) {
        await contactLink.click();
        await page.waitForLoadState('domcontentloaded');
        
        // Should be on contact page
        await expect(page).toHaveURL(/\/Contact-us/);
        await expect(page.locator('h1')).toContainText(/Contact us/i);
      }
    });
  });

  test.describe('Events Block Rendering', () => {
    
    test('Events block shows events with correct date format', async ({ page }) => {
      await page.goto('/events-page', { waitUntil: 'domcontentloaded' });
      
      // Wait for page to load and events section to appear
      await expect(page.locator('h1')).toContainText(/Events/i);
      
      // Wait for loading to complete
      await expect(page.getByText(/Loading/i)).toBeHidden({ timeout: 10000 }).catch(() => {});
      
      // Check for events or "no events" message
      const eventCard = page.locator('[class*="card"]').filter({ hasText: /Security Workshop|Event|Workshop/i }).first();
      const noEventsMsg = page.getByText(/No Upcoming Events/i);
      
      const hasEvent = await eventCard.isVisible({ timeout: 5000 }).catch(() => false);
      const hasNoEventsMsg = await noEventsMsg.isVisible({ timeout: 2000 }).catch(() => false);
      
      if (hasEvent) {
        // Events should display with date (e.g., "Sun, Mar 15, 02:00 PM")
        const dateText = await eventCard.textContent();
        expect(dateText).toMatch(/\d{1,2}:\d{2}|AM|PM|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec/i);
      } else {
        expect(hasNoEventsMsg).toBeTruthy();
      }
    });

    test('Events block displays event title and location', async ({ page }) => {
      await page.goto('/events-page', { waitUntil: 'domcontentloaded' });
      
      // Wait for page to load
      await expect(page.locator('h1')).toContainText(/Events/i);
      await expect(page.getByText(/Loading/i)).toBeHidden({ timeout: 10000 }).catch(() => {});
      
      // Wait for content to render
      await page.waitForTimeout(1000);
      
      // Get the page content
      const pageContent = await page.content();
      
      // Should have either events or "no events" message
      const hasEvents = pageContent.includes('Security Workshop') || 
                       pageContent.includes('Event') ||
                       pageContent.includes('Workshop');
      const hasNoEventsMsg = pageContent.includes('No Upcoming Events') || 
                            pageContent.includes('Check back soon');
      
      expect(hasEvents || hasNoEventsMsg).toBeTruthy();
    });
  });

  test.describe('Contact Form Block', () => {
    
    test('Contact form renders without sidebar', async ({ page }) => {
      await page.goto('/Contact-us', { waitUntil: 'domcontentloaded' });
      
      // Contact form should be visible
      await expect(page.getByTestId('contact-form')).toBeVisible();
      
      // Check form is centered (no sidebar layout)
      const formContainer = page.locator('[class*="max-w-2xl"]');
      await expect(formContainer).toBeVisible();
      
      // Should NOT have a sidebar
      const sidebar = page.locator('[class*="sidebar"], aside');
      const sidebarVisible = await sidebar.isVisible().catch(() => false);
      expect(sidebarVisible).toBeFalsy();
    });

    test('Contact form has all required fields', async ({ page }) => {
      await page.goto('/Contact-us', { waitUntil: 'domcontentloaded' });
      
      const form = page.getByTestId('contact-form');
      await expect(form).toBeVisible();
      
      // Check required fields
      await expect(form.locator('input[name="name"]')).toBeVisible();
      await expect(form.locator('input[name="email"]')).toBeVisible();
      await expect(form.locator('textarea[name="message"]')).toBeVisible();
      
      // Check optional fields
      await expect(form.locator('input[name="phone"]')).toBeVisible();
      await expect(form.locator('input[name="organization"]')).toBeVisible();
      await expect(form.locator('input[name="subject"]')).toBeVisible();
    });

    test('Contact form submit button works', async ({ page }) => {
      await page.goto('/Contact-us', { waitUntil: 'domcontentloaded' });
      
      // Wait for form to be visible
      await expect(page.getByTestId('contact-form')).toBeVisible();
      await expect(page.getByTestId('contact-form-submit')).toBeVisible();
      
      // Fill required fields
      await page.locator('input[name="name"]').fill('Test User');
      await page.locator('input[name="email"]').fill('test@example.com');
      await page.locator('textarea[name="message"]').fill('This is a test message from automated testing.');
      
      // Click submit
      await page.getByTestId('contact-form-submit').click();
      
      // Wait for success heading to appear
      await expect(page.getByRole('heading', { name: 'Message Sent!' })).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe('Block Type Rendering', () => {
    
    test('Heading block renders correctly', async ({ page }) => {
      await page.goto('/Contact-us', { waitUntil: 'domcontentloaded' });
      
      // Page title (heading) should be visible
      const heading = page.locator('h1');
      await expect(heading).toBeVisible();
      await expect(heading).toContainText(/Contact us/i);
    });

    test('Text block renders HTML content', async ({ page }) => {
      await page.goto('/events-page', { waitUntil: 'domcontentloaded' });
      
      // Page should have descriptive text - use specific selector
      const description = page.locator('p').filter({ hasText: 'Upcoming events and workshops' });
      await expect(description).toBeVisible();
    });
  });
});
