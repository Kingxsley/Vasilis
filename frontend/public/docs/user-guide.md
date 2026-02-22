# Vasilis NetShield - User Guide

## Welcome to Vasilis NetShield
Your comprehensive cybersecurity training platform for building a security-aware workforce.

---

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [Simulations](#simulations)
4. [Training Center](#training-center)
5. [User Management](#user-management)
6. [Analytics](#analytics)
7. [Settings & Customization](#settings)

---

## 1. Getting Started

### Requesting Access
1. Visit the landing page and click **"Get Started"** or **"Request Access"**
2. Fill in your email, phone number, and a brief message
3. An admin will review your request and create your account
4. You'll receive a welcome email with login credentials

### Logging In
1. Navigate to the login page
2. Enter your email and password
3. Click **"Sign In"**
4. On first login, you may be prompted to change your password

### Password Reset
1. Click **"Forgot Password?"** on the login page
2. Enter your registered email
3. Check your email for a reset link (valid for 1 hour)
4. Create a new strong password

---

## 2. Dashboard Overview

The dashboard provides a quick summary of your security posture:

### Key Metrics
- **Total Users**: Number of registered users in your organization
- **Active Campaigns**: Running phishing simulations
- **Training Completion**: Percentage of completed training modules
- **Click Rate**: Overall phishing susceptibility rate

### Quick Actions
- Launch new phishing campaigns
- View recent simulation results
- Access training modules

---

## 3. Simulations

### Simulation Builder (Create Sim)
The drag-and-drop simulation builder allows you to create custom security tests:

#### Available Simulation Types:
1. **Phishing Email** - Classic email phishing tests
2. **Credential Harvest** - Track password submission attempts
3. **QR Code Phishing** - Fake QR codes that redirect
4. **MFA Fatigue** - Repeated push notification attacks
5. **USB Drop** - Physical security awareness tests
6. **SMS Phishing (Smishing)** - Text message based attacks
7. **Business Email Compromise** - Executive impersonation
8. **Malicious Ad** - Deceptive advertisement tests

#### Creating a Simulation:
1. Go to **Simulations > Create Sim**
2. Select a simulation type
3. Choose a pre-built template or start from scratch
4. Drag building blocks to the canvas:
   - **Content**: Headers, body text, signatures
   - **Form Elements**: Input fields, buttons, checkboxes
   - **Phishing Tactics**: Urgency messages, deadlines, fake links
   - **Visual Elements**: Images, QR codes, dividers
   - **Special Elements**: MFA prompts, USB labels
5. View the live preview on the right
6. Name your simulation and click **Save**

### Phishing Campaigns

#### Creating a Campaign:
1. Go to **Simulations > Phishing Sim**
2. Click **New Campaign**
3. Select a template and target users
4. Schedule or launch immediately
5. Monitor results in real-time

#### Campaign Statuses:
- **Draft**: Not yet launched
- **Scheduled**: Set to launch at a future time
- **Active**: Currently running
- **Paused**: Temporarily stopped
- **Completed**: Finished

### Ad Simulations
Create fake advertisements to test user awareness against malicious ads:
1. Go to **Simulations > Ad Simulation**
2. Use the visual editor to design ad templates
3. Choose from pre-built scam templates
4. Set target users and launch

---

## 4. Training Center

### Scenarios and Module Builder

Training modules consist of one or more **scenarios**, which are individual questions or challenges.  Administrators can mix and match scenarios to build customized training modules for different topics.  To manage scenarios and modules:

1. **Browse Scenario Library** – Go to **Simulations > Create Sim** and select a simulation type to create or edit scenarios.  Save your scenarios to make them available in the Module Builder.
2. **Module Builder** – Navigate to **Create Trainings** (admins only) to assemble modules.  Select scenarios from the library, drag to reorder them, and choose a certificate template.  You can also remove or add scenarios at any time; a new version date will appear on the module card when changes are saved.
3. **Scenario Types** – NetShield supports multiple scenario formats:
   - **Phishing Email** – Traditional emails with suspicious links or attachments for users to analyze.
   - **Credential Harvest** – Login forms that capture credentials when users submit them.
   - **Malicious Ad / QR Code** – Images or QR codes that may hide malicious content.
   - **Social Engineering (Chat)** – Multi‑turn conversations in a chat format (as seen in the Social Engineering module).  Authors can script dialogues where the trainee chooses responses.
   - **USB and Device Security** – Physical device drop scenarios and other safety tips.

Administrators can edit scenarios and modules individually.  When a module is updated after a trainee completes it, the trainee will see **Updated [Month, Year]** on their dashboard, indicating that new questions are available and a new certificate can be earned.

### Completing Training
1. Open the **Training** section in your dashboard
2. Choose a module and click **Start** or **Continue**
3. Review each scenario and answer the question or select the safest option
4. Your progress and question number update as you advance through the module
5. After answering all scenarios, you’ll see your score and whether you passed or failed
6. Successful trainees can download their module certificate; if you fail, you’ll be reassigned and can retake the training

Whenever a module is updated, a timestamp will appear on the module card (e.g., “Updated Mar 2026”).  Retake the module to complete the latest version and earn an updated certificate.

---

## 5. User Management

### For Administrators

#### Creating Users:
1. Go to **Management > Users**
2. Click **New User**
3. Fill in name, email, and temporary password
4. Select role and organization
5. User receives welcome email with credentials

#### User Roles:
| Role | Description | Permissions |
|------|-------------|-------------|
| **Trainee** | Standard user | Complete training, view own results |
| **Media Manager** | Content creator | Manage CMS content, pages |
| **Org Admin** | Organization admin | Manage users in their org, launch campaigns |
| **Super Admin** | Full access | All permissions across platform |

#### Changing User Roles:
1. Find the user in the Users table
2. Click the shield icon to change role
3. Select the new role from dropdown
4. Confirm the change

#### Bulk Operations:
- Select multiple users with checkboxes
- Use **Select All** for bulk selection
- Click **Delete Selected** for bulk deletion

### Access Requests
Review pending access requests:
1. Go to **Management > Access Requests**
2. Click on a request to view details
3. Update status: **Contacted**, **Approved**, **Rejected**, **Pending**
4. When approved, you're redirected to create the user account

---

## 6. Analytics

### Dashboard Analytics
- Total simulations run
- Overall click rates
- Training completion rates
- User engagement metrics

### Advanced Analytics
Access detailed reporting:
1. Go to **Overview > Advanced Analytics**
2. Filter by date range or custom dates
3. View metrics by campaign type (Phishing, Ad)
4. Compare multiple campaigns side-by-side

### Best Performing Campaigns
See which campaigns have the lowest click rates (best security awareness):
- 🥇 Top performer
- 🥈 Second place
- 🥉 Third place
- Color-coded click rates (Green ≤5%, Yellow ≤15%, Red >15%)

### Click Analysis
View detailed information about who clicked phishing links:
- User details
- Click timestamp
- Campaign information
- Device/browser information

---

## 7. Security & Two‑Factor Authentication

Keeping your account secure is a shared responsibility.  NetShield provides advanced controls to help protect your data:

### Two‑Factor Enforcement

Super administrators can require all users to enable two‑factor authentication (2FA).  When this setting is on (found under **Settings > Security**), any user without 2FA configured will be unable to log in until they complete the 2FA setup process.  To set up 2FA:

1. Log in and go to **Settings > Account**
2. Click **Enable Two‑Factor Authentication**
3. Scan the QR code with an authenticator app (e.g., Google Authenticator) and enter the verification code
4. Once verified, your account will have 2FA enabled and you can log in normally

If a user doesn’t have 2FA enabled when enforcement is turned on, the login page will show an error instructing them to enable 2FA.

### Session Timeouts

For administrators, session timeout can be configured to automatically log users out after a period of inactivity.  Super administrators can change the timeout under **Settings > Security**.  When the session expires, you’ll be prompted to log in again.

---


## 8. Settings & Customization

### Branding (Super Admin Only)
Customize the platform appearance:
1. Go to **Settings**
2. Upload company logo
3. Set primary and accent colors
4. Configure company name and tagline
5. Manage social media links

### Landing Page Editor
Customize your public-facing landing page:
1. Go to **Content > Landing Page**
2. Edit hero section, features, testimonials
3. Toggle section visibility
4. Save and preview changes

### Page Builder
Create custom pages:
1. Go to **Content > Page Builder**
2. Create new page with blocks (headers, text, images, forms)
3. Set page as published and navigation visibility
4. Access via `/page/[your-page-slug]`

---

## Need Help?

### Contact Support
- Email: info@vasilisnetshield.com
- Use the Contact Us form on the landing page

### Common Issues

**Q: I didn't receive my welcome email**
A: Check spam folder. Contact admin to resend.

**Q: My account is locked**
A: Wait 15 minutes or contact admin to unlock.

**Q: Campaign shows 0 emails sent**
A: Verify targets were added before launching. Check SendGrid configuration.

**Q: I can't access certain features**
A: Your role may not have permission. Contact admin for role elevation.

---

## Security Best Practices

1. **Use strong passwords** - Min 8 characters with mixed case, numbers, and symbols
2. **Don't share credentials** - Each user should have unique login
3. **Report suspicious activity** - Contact admin immediately
4. **Complete training regularly** - Stay updated on latest threats
5. **Verify before clicking** - When in doubt, don't click links

---

## Audit Trail

All platform activities are logged for security and compliance:
- User creation, updates, and deletion
- Role changes (who elevated whom)
- Access request approvals and rejections
- Campaign launches
- Login attempts and password resets

Audit logs are accessible to Super Admins under **Security > Audit Logs**.

---

*Vasilis NetShield - Human + AI Powered Security Training*
*© 2026 Vasilis NetShield. All rights reserved.*
