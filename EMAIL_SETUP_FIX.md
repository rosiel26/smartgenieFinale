# Email Setup Fix Guide - Password Reset & Signup Emails Not Being Sent

## Problem
When users try to reset password or signup, they don't receive confirmation emails even though the app shows "Email sent successfully".

## Root Cause
Your Supabase project might have email delivery disabled or misconfigured. Common issues:

1. **Email provider not configured** - Supabase needs an SMTP provider to send emails
2. **Email templates disabled** - Signup/reset password templates need to be enabled
3. **Domain not verified** - Custom domain not whitelisted for email sending
4. **Rate limiting or quota exceeded** - Too many emails sent, hitting limits

## How to Fix

### Step 1: Enable Email Sending in Supabase Dashboard

1. Go to **Supabase Dashboard** → Your Project
2. Navigate to **Authentication** → **Email Templates**
3. Check that these templates are **enabled**:
   - ✅ Confirm signup
   - ✅ Reset password
   - ✅ Magic Link (if using)

### Step 2: Configure Email Provider

**Option A: Use Supabase's Built-in Email Service (Free tier limit)**
- Limited to 3 emails/hour in free tier
- Good for testing only
- No SMTP configuration needed

**Option B: Connect Custom SMTP Provider (Recommended for Production)**

Supabase supports these providers:
- SendGrid
- AWS SES
- Mailgun
- Twilio SendGrid
- Any SMTP server

Steps:
1. Go to **Authentication** → **Email**
2. Click **Configure Custom SMTP**
3. Enter your email provider credentials:
   - **SMTP Host**: (provided by your email service)
   - **SMTP Port**: Usually 587 or 465
   - **SMTP User**: Your email account
   - **SMTP Password**: API key or password
   - **From Email**: noreply@yourdomain.com
4. Click **Save**

### Step 3: Test Email Sending

1. Go to **Email Templates**
2. Click the **Test Email** button on any template
3. Enter a test email address
4. Check your inbox for the test email

If test email works but users aren't getting emails:
- Check spam/junk folder
- Verify user email is correct and not bouncing
- Check Supabase Auth Logs for send errors

### Step 4: Update Your Environment Variables

Ensure your `.env` file has:

```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
VITE_SUPABASE_REDIRECT_URL=http://localhost:5173/health-profile
VITE_SUPABASE_PASSWORD_RESET_URL=http://localhost:5173/reset-password
```

For production, update these to your actual domain:
```env
VITE_SUPABASE_REDIRECT_URL=https://yourdomain.com/health-profile
VITE_SUPABASE_PASSWORD_RESET_URL=https://yourdomain.com/reset-password
```

### Step 5: Update Auth Redirect URLs in Supabase

1. Go to **Authentication** → **URL Configuration**
2. Add your redirect URLs:
   - Signup confirmation redirect: `https://yourdomain.com/health-profile`
   - Password reset redirect: `https://yourdomain.com/reset-password`
   - OAuth callback: `https://yourdomain.com/auth/callback`

## Recommended Email Provider Setup

### Using SendGrid (Free tier: 100 emails/day)

1. Create account at [sendgrid.com](https://sendgrid.com)
2. Verify sender domain
3. Create API key
4. In Supabase, configure SMTP:
   - **Host**: smtp.sendgrid.net
   - **Port**: 587
   - **User**: apikey
   - **Password**: (your SendGrid API key)
   - **From Email**: noreply@yourdomain.com

### Using Gmail (Development only)

⚠️ **Warning**: Less secure, use for testing only
1. Enable "Less secure app access" on your Gmail account
2. Create an App Password (for 2FA accounts)
3. Use these in SMTP:
   - **Host**: smtp.gmail.com
   - **Port**: 587
   - **User**: your-email@gmail.com
   - **Password**: your-app-password

### Using AWS SES (Production ready)

1. Verify email address in AWS SES
2. Request production access
3. Create SMTP credentials in AWS
4. Configure in Supabase with your SES SMTP endpoint

## Checking Email Logs

To see if emails are being sent or failing:

1. **Supabase Dashboard** → **Authentication** → **Logs**
2. Look for entries with:
   - Event type: `user_signup`
   - Event type: `password_reset_requested`
3. Check the details for any error messages

## Testing Locally

When testing locally, use:
- **Localhost redirect**: `http://localhost:5173/reset-password`
- **Temporary email service**: Mailtrap, Mailhog, or temp-mail for testing

## Code Changes Made

Your signup and forgot password components now:
- ✅ Include proper redirect URL configuration
- ✅ Handle errors more gracefully
- ✅ Validate email format before sending
- ✅ Suggest checking spam folder

## Common Error Messages & Solutions

| Error | Cause | Solution |
|-------|-------|----------|
| Email not received | Provider not configured | Set up SMTP provider |
| Invalid redirect URL | Domain mismatch | Update URL Configuration |
| Rate limit exceeded | Too many emails sent | Wait, upgrade plan |
| SMTP auth failed | Wrong credentials | Verify SMTP settings |
| 500 error on send | Email template issue | Re-enable template |

## Verification Checklist

- [ ] Email provider is configured (SMTP or built-in)
- [ ] Email templates are enabled
- [ ] Test email sends successfully
- [ ] Redirect URLs are configured in Supabase
- [ ] Environment variables have correct URLs
- [ ] User can receive password reset email
- [ ] User can receive signup confirmation email
- [ ] Both emails contain correct redirect links
- [ ] Links work and don't show "expired" error

## Still Not Working?

1. **Check browser console** for JavaScript errors
2. **Check Supabase logs** for send failures
3. **Test email address** - try different domains (gmail, outlook, etc.)
4. **Check spam folder** - emails might be filtered
5. **Verify SMTP settings** - test with Supabase test button
6. **Check rate limits** - you might have exceeded quota
