# Vasilis NetShield - Roadmap

## Completed Features (P0)
- [x] Core authentication (JWT, Google OAuth, 2FA)
- [x] Phishing campaign management
- [x] Credential harvest simulations
- [x] Training modules and certificates
- [x] Vulnerable users dashboard
- [x] Admin dashboard and analytics
- [x] CMS tiles management
- [x] RSS feed aggregation
- [x] Email configuration (SendGrid)

## In Progress (P1)
- [ ] Credential Harvest Statistics - Track and display submission statistics beyond clicks
- [ ] Expand PPT modules to 30-50 slides each

## Backlog (P2)
- [ ] Visual drag-and-drop email builder for credential harvest
- [ ] A/B testing for email templates
- [ ] Scheduled campaign automation improvements
- [ ] Bulk user import fixes

## Future Enhancements (P3)
- [ ] AI-powered phishing detection training
- [ ] Mobile app for training
- [ ] Integration with SIEM tools
- [ ] Advanced reporting dashboard
- [ ] Multi-language support

## Known Issues
- Email sending requires valid SendGrid key in production
- Bulk user import may need investigation
- Some frontend tests are rate-limited during testing

## Production Environment Variables
```
SENDGRID_API_KEY=<user-provided>
SENDER_EMAIL=info@vasilisnetshield.com
API_URL=https://api.vasilisnetshield.com
FRONTEND_URL=https://vasilisnetshield.com
CORS_ORIGINS=https://vasilisnetshield.com,https://www.vasilisnetshield.com
MONGO_URL=<mongodb-atlas-url>
DB_NAME=vasilisnetshield
JWT_SECRET=<secure-random-string>
```
