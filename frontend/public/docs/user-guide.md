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

### Scenarios
Browse and assign security training scenarios:
1. **Phishing Email Scenarios** - Learn to spot suspicious emails
2. **Malicious Ads** - Identify deceptive advertisements
3. **Social Engineering** - Recognize manipulation tactics
4. **QR Code Threats** - Understand QR-based attacks
5. **USB Security** - Physical device risks
6. **MFA Best Practices** - Multi-factor authentication safety

### Completing Training
1. Access assigned scenarios from your dashboard
2. Review the scenario content
3. Identify if it's safe or unsafe
4. Get instant feedback and explanations
5. Earn certificates upon completion

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

## 7. Settings & Customization

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
