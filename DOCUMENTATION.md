# Vasilis NetShield - User Documentation

## Table of Contents
1. [Getting Started](#getting-started)
2. [Dashboard Overview](#dashboard-overview)
3. [User Management](#user-management)
4. [Phishing Simulations](#phishing-simulations)
5. [Ad Simulations](#ad-simulations)
6. [Training Modules](#training-modules)
7. [Analytics & Reports](#analytics--reports)
8. [Content Management](#content-management)
9. [Settings & Configuration](#settings--configuration)
10. [Security Dashboard](#security-dashboard)

---

## Getting Started

### First Login
1. Navigate to your domain (e.g., `https://vasilisnetshield.net`)
2. Click **Login** or **Get Started**
3. Enter your credentials
4. The first registered user automatically becomes a **Super Admin**

### User Roles
| Role | Permissions |
|------|-------------|
| **Super Admin** | Full access to all features |
| **Org Admin** | Manage their organization's users and campaigns |
| **Media Manager** | Manage blog posts, videos, news, and about page |
| **Employee** | Complete assigned training and view their certificates |

---

## Dashboard Overview

**Path:** `/dashboard`

The dashboard provides a quick overview of:
- Total users and organizations
- Active campaigns
- Training completion rates
- Recent activity

---

## User Management

### View All Users
**Path:** `/users`

- See all registered users
- Filter by role, organization, or status
- Search by name or email

### Create a User
1. Click **Create User**
2. Fill in:
   - **Name**: User's full name
   - **Email**: Login email address
   - **Password**: Initial password (user should change after first login)
   - **Role**: Select appropriate role
   - **Organization**: Assign to an organization (optional)
3. Click **Create**
4. A welcome email with credentials is sent automatically (if SendGrid is configured)

### Bulk Import Users
**Path:** `/user-import`

1. Click **Download Template** to get the CSV format
2. Fill in user data in the CSV file
3. Upload the CSV file
4. Review the preview
5. Click **Import** to create users

---

## Phishing Simulations

**Path:** `/phishing`

Phishing simulations test employee awareness by sending realistic fake phishing emails.

### Creating a Phishing Template
1. Go to **Simulations > Phishing Sim**
2. Click **Templates** tab
3. Click **New Template**
4. Fill in:
   - **Name**: Internal template name
   - **Subject**: Email subject line
   - **Sender Name**: Display name (e.g., "IT Support")
   - **Sender Email**: Fake sender email shown in reply-to
   - **Body**: Email content (use the visual editor)
5. Use `{{USER_NAME}}` to personalize with recipient's name
6. Use `{{TRACKING_LINK}}` where you want the clickable link
7. Click **Save Template**

### Creating a Campaign
1. Go to **Campaigns** tab
2. Click **New Campaign**
3. Fill in:
   - **Campaign Name**: Internal identifier
   - **Template**: Select from your templates
   - **Target Users**: Select users to target
   - **Schedule** (optional): Set future send date
4. Click **Create Campaign**
5. Click **Launch** to send immediately, or leave as draft/scheduled

### Viewing Results
1. Click on any campaign to see details
2. View:
   - **Sent**: Number of emails sent
   - **Opened**: Emails that were opened (tracked via pixel)
   - **Clicked**: Users who clicked the link
3. Export reports as **Excel** or **PDF**

---

## Ad Simulations

**Path:** `/ads`

Ad simulations test employee awareness of malicious advertisements.

### Ad Types
| Type | Description |
|------|-------------|
| **Popup** | Mimics intrusive popup ads |
| **Banner** | Mimics website banner ads |
| **Native** | Mimics content-style ads |

### Creating an Ad Template
1. Go to **Simulations > Ad Simulation**
2. Click **Templates** tab
3. Click **New Template** (or **Add Defaults** for pre-made templates)
4. Fill in:
   - **Name**: Template name
   - **Type**: popup/banner/native
   - **Headline**: Main ad text
   - **Description**: Supporting text
   - **Call to Action**: Button text (e.g., "Click Here", "Download Now")
   - **Image URL**: Optional ad image
5. Click **Save**

### Creating an Ad Campaign
1. Click **Campaigns** tab
2. Click **Create Campaign**
3. Select template and target users
4. Choose to launch immediately or schedule
5. Track views and clicks in campaign details

---

## Training Modules

**Path:** `/training`

### For Employees
- View assigned training modules
- Complete interactive lessons
- Take quizzes
- Download completion certificates

### For Admins

#### Managing Scenarios
**Path:** `/scenarios`

1. Create training scenarios with:
   - Title and description
   - Difficulty level
   - Category (phishing, malware, social engineering, etc.)
   - Content and questions
2. Assign scenarios to training modules

---

## Analytics & Reports

### Basic Analytics
**Path:** `/analytics`

- Overview of campaign performance
- User engagement metrics
- Trend charts

### Advanced Analytics
**Path:** `/advanced-analytics`

- **Time Range Selector**: View data for 7, 30, 90, or 365 days
- **Phishing Performance**: Sent, opened, clicked metrics
- **Vulnerability Breakdown**: Visual representation of user susceptibility
- **User Distribution**: Active/inactive users by role
- **Risk Assessment**: Color-coded risk levels with recommendations

### Exporting Reports
1. Go to any campaign
2. Click **Excel** or **PDF** button
3. A secure download link is generated
4. Report downloads automatically

---

## Content Management

### Blog Posts
**Path:** `/content` > **Blog** tab

1. Click **New Post**
2. Enter title, content, and featured image
3. Set status (Draft/Published)
4. Click **Save**

### Videos
**Path:** `/content` > **Videos** tab

1. Click **Add Video**
2. Enter YouTube URL or video embed code
3. Add title and description
4. Click **Save**

### News & RSS Feeds
**Path:** `/content` > **News** tab

#### Adding Original News
1. Click **Add News**
2. Enter title and content
3. Optionally add external link
4. Click **Save**

#### Adding RSS Feeds
1. Click **Add RSS Feed**
2. Enter feed URL (e.g., `https://example.com/feed.xml`)
3. News items are automatically fetched and displayed

### About Page
**Path:** `/content` > **About** tab

- Edit company description
- Update mission statement
- Manage team members
- Edit contact information

### Landing Page Editor
**Path:** `/page-editor`

Customize the public landing page:
- Hero section text and images
- Feature highlights
- Statistics
- Call-to-action buttons

---

## Settings & Configuration

**Path:** `/settings`

### Branding
- **Company Name**: Displayed throughout the app
- **Tagline**: Shown on landing page
- **Logo**: Upload company logo (appears in header and emails)
- **Favicon**: Upload site icon
- **Primary Color**: Main accent color

### Text Colors
- **Body Text**: Paragraph and description color
- **Headings**: Title and header color
- **Accent/Links**: Highlight and link color

### Navigation Menu
Toggle visibility of public pages:
- Blog
- Videos
- News
- About

### Password Policy
- **Password Expiry Days**: Set how often users must change passwords (0 = never)
- **Reminder Days**: Days before expiry to send email reminder
- Quick presets: 30, 60, 90, or 180 days

### Email Templates
**Path:** `/email-templates`

Customize system emails:
1. **Welcome Email**: Sent when admin creates a new user
2. **Password Reset (Admin)**: Sent when admin resets a user's password
3. **Forgot Password**: Sent when user requests password reset
4. **Password Expiry Reminder**: Sent before password expires

#### Editing Templates
1. Click **Edit** on any template
2. Use **Visual** mode for easy editing (no coding required)
3. Use **HTML** mode for advanced customization
4. Click variable buttons to insert dynamic content:
   - `{company_name}` - Your company name
   - `{user_name}` - Recipient's name
   - `{user_email}` - Recipient's email
   - `{password}` - Password (welcome email only)
   - `{login_url}` - Login page link
5. Click **Preview** to see how the email will look
6. Click **Save Template**

---

## Security Dashboard

**Path:** `/security`

Monitor security events and manage access:

### Summary Cards
- **Successful Logins (24h)**: Number of successful authentications
- **Failed Logins (24h)**: Failed login attempts
- **Account Lockouts (24h)**: Accounts locked due to failed attempts
- **Password Resets (24h)**: Password changes
- **Active Lockouts**: Currently locked accounts

### Active Lockouts
- See which accounts are currently locked
- Click **Unlock** to manually unlock an account

### Suspicious IPs
- IPs with 3+ failed login attempts in 24 hours
- Number of targeted email addresses

### Login Activity Chart
- Visual representation of login attempts over 7 days
- Green = successful, Red = failed

### Audit Logs
- Searchable log of all security events
- Filter by action type, severity, or email
- Paginated results

---

## Forgot Password

1. On the login page, click **Forgot password?**
2. Enter your email address
3. Click **Send reset link**
4. Check your email for the reset link
5. Click the link and enter a new password
6. Password must include:
   - At least 8 characters
   - Uppercase letter
   - Lowercase letter
   - Number
   - Special character

---

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Quick search (coming soon) |

---

## Troubleshooting

### Emails Not Sending
1. Check that `SENDGRID_API_KEY` and `SENDER_EMAIL` are set in environment variables
2. Verify SendGrid domain authentication (SPF/DKIM records)
3. Check spam folder

### Account Locked
1. Wait 15 minutes for automatic unlock
2. Or ask an admin to unlock via Security Dashboard

### Export Not Working
Exports now use secure download tokens. Simply click the export button and the download will start automatically.

---

## Support

For technical support or feature requests, contact your system administrator.
