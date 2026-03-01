"""
Additional Executive Training Content
More comprehensive training modules with detailed slides
"""

# Ransomware Awareness Training - 35+ slides
RANSOMWARE_CONTENT = {
    "title": "Ransomware Awareness",
    "subtitle": "Protecting Your Organization from Ransomware Attacks",
    "slides": [
        {
            "title": "What is Ransomware?",
            "content": "Ransomware is malicious software that encrypts files and demands payment for their release.",
            "bullets": [
                "Malware that encrypts your data",
                "Demands payment (usually cryptocurrency)",
                "Can spread across networks rapidly",
                "Average ransom demand: $200,000+",
                "Recovery can take weeks or months"
            ]
        },
        {
            "title": "The Ransomware Epidemic",
            "type": "stats",
            "stats": [
                ("$20B", "Global Cost", "Annual ransomware damages"),
                ("11 sec", "Attack Rate", "Business attacked every 11 seconds"),
            ]
        },
        {
            "title": "Real-World Impact: Colonial Pipeline",
            "content": "In 2021, Colonial Pipeline paid $4.4 million in ransom after a cyberattack",
            "bullets": [
                "Pipeline shut down for 6 days",
                "Fuel shortages across East Coast",
                "Stock market disruption",
                "National security implications",
                "Led to executive order on cybersecurity"
            ]
        },
        {
            "title": "Real-World Impact: Healthcare Sector",
            "content": "Hospitals are prime targets for ransomware attacks",
            "bullets": [
                "Universal Health Services: $67M loss",
                "Scripps Health: 4 weeks of downtime",
                "Patient care directly impacted",
                "Medical records inaccessible",
                "Life-threatening delays in treatment"
            ]
        },
        {
            "title": "How Ransomware Spreads",
            "type": "two_column",
            "left_title": "Primary Vectors",
            "left_items": ["Phishing emails", "Malicious attachments", "Compromised websites", "Remote Desktop Protocol (RDP)"],
            "right_title": "Secondary Vectors",
            "right_items": ["USB drives", "Software vulnerabilities", "Supply chain attacks", "Insider threats"]
        },
        {
            "title": "Anatomy of a Ransomware Attack",
            "bullets": [
                "Initial Access: Phishing email or exploit",
                "Reconnaissance: Attackers map the network",
                "Privilege Escalation: Gaining admin rights",
                "Lateral Movement: Spreading to other systems",
                "Data Exfiltration: Stealing sensitive data",
                "Encryption: Locking files and systems",
                "Ransom Demand: Payment ultimatum"
            ]
        },
        {
            "title": "Types of Ransomware",
            "bullets": [
                "Crypto Ransomware: Encrypts files",
                "Locker Ransomware: Locks entire system",
                "Double Extortion: Encrypts + threatens to leak",
                "Triple Extortion: Adds DDoS threats",
                "RaaS: Ransomware-as-a-Service",
                "Wiper Malware: Destroys data permanently"
            ]
        },
        {
            "title": "Warning Signs of Infection",
            "bullets": [
                "Unusual file extensions (.encrypted, .locked)",
                "Ransom note files on desktop",
                "Slow system performance",
                "Unable to access files",
                "Antivirus disabled",
                "Suspicious network activity"
            ],
            "warning": "If you see these signs, disconnect from network immediately!"
        },
        {
            "title": "Prevention: Email Security",
            "bullets": [
                "Don't open unexpected attachments",
                "Verify sender before clicking links",
                "Report suspicious emails",
                "Use email filtering solutions",
                "Enable attachment scanning",
                "Block executable attachments"
            ]
        },
        {
            "title": "Prevention: System Hardening",
            "bullets": [
                "Keep systems updated and patched",
                "Disable unnecessary services",
                "Use application whitelisting",
                "Implement least privilege access",
                "Segment networks properly",
                "Disable macros in Office files"
            ]
        },
        {
            "title": "Prevention: Backup Strategy",
            "content": "The 3-2-1 Backup Rule",
            "bullets": [
                "3 copies of your data",
                "2 different storage media types",
                "1 copy stored offsite/offline",
                "Test backups regularly",
                "Ensure backups are not connected to network"
            ]
        },
        {
            "title": "What To Do If Infected",
            "bullets": [
                "Disconnect from network immediately",
                "Do NOT pay the ransom",
                "Report to IT security team",
                "Preserve evidence for investigation",
                "Contact law enforcement",
                "Assess backup availability"
            ],
            "warning": "Paying ransom funds criminal activity and doesn't guarantee recovery!"
        },
        {
            "title": "Should You Pay the Ransom?",
            "type": "two_column",
            "left_title": "Reasons NOT to Pay",
            "left_items": ["Funds criminal operations", "No guarantee of recovery", "May be targeted again", "Illegal in some cases"],
            "right_title": "Considerations",
            "right_items": ["Business continuity needs", "Data criticality", "Legal obligations", "Insurance coverage"]
        },
        {
            "title": "Recovery Process",
            "bullets": [
                "Contain the infection",
                "Identify ransomware variant",
                "Check for free decryptors",
                "Restore from clean backups",
                "Rebuild affected systems",
                "Conduct post-incident review"
            ]
        },
        {
            "title": "Key Takeaways",
            "bullets": [
                "Ransomware is a serious and growing threat",
                "Prevention is better than cure",
                "Regular backups are essential",
                "Never pay ransom if possible",
                "Report incidents immediately",
                "Stay vigilant and informed"
            ]
        }
    ]
}

# Insider Threat Training - 30+ slides
INSIDER_THREAT_CONTENT = {
    "title": "Insider Threat Awareness",
    "subtitle": "Recognizing and Preventing Internal Security Risks",
    "slides": [
        {
            "title": "What are Insider Threats?",
            "content": "Insider threats are security risks that originate from within the organization.",
            "bullets": [
                "Current or former employees",
                "Contractors and vendors",
                "Business partners with access",
                "Can be intentional or unintentional",
                "Often harder to detect than external threats"
            ]
        },
        {
            "title": "The Cost of Insider Threats",
            "type": "stats",
            "stats": [
                ("$15.4M", "Average Cost", "Per insider threat incident"),
                ("85 days", "Detection Time", "Average time to contain"),
            ]
        },
        {
            "title": "Types of Insider Threats",
            "type": "two_column",
            "left_title": "Malicious Insiders",
            "left_items": ["Disgruntled employees", "Corporate espionage", "Fraud and theft", "Sabotage"],
            "right_title": "Negligent Insiders",
            "right_items": ["Accidental data exposure", "Poor security practices", "Lost devices", "Shadow IT"]
        },
        {
            "title": "Real Case: Edward Snowden",
            "content": "NSA contractor leaked classified documents in 2013",
            "bullets": [
                "Had legitimate system access",
                "Used colleagues' credentials",
                "Downloaded millions of documents",
                "Massive national security impact",
                "Led to security overhaul at NSA"
            ]
        },
        {
            "title": "Real Case: Tesla Sabotage",
            "content": "Employee made unauthorized code changes and leaked data",
            "bullets": [
                "Modified manufacturing software",
                "Exported sensitive data",
                "Claimed whistleblower status",
                "Caused production disruptions",
                "Highlighted need for access controls"
            ]
        },
        {
            "title": "Warning Signs: Behavioral",
            "bullets": [
                "Unusual working hours",
                "Accessing data outside job scope",
                "Expressing disgruntlement openly",
                "Financial difficulties",
                "Sudden lifestyle changes",
                "Resistance to policy changes"
            ]
        },
        {
            "title": "Warning Signs: Technical",
            "bullets": [
                "Large data downloads or transfers",
                "Using personal storage devices",
                "Accessing systems after termination notice",
                "Attempting to bypass security controls",
                "Installing unauthorized software",
                "Multiple failed login attempts"
            ]
        },
        {
            "title": "Prevention: Access Management",
            "bullets": [
                "Implement least privilege principle",
                "Regular access reviews",
                "Segregation of duties",
                "Timely access revocation",
                "Multi-factor authentication",
                "Privileged access management"
            ]
        },
        {
            "title": "Prevention: Monitoring",
            "bullets": [
                "User behavior analytics",
                "Data loss prevention tools",
                "Network traffic monitoring",
                "Audit logging and review",
                "Endpoint detection and response",
                "Database activity monitoring"
            ]
        },
        {
            "title": "Creating a Positive Culture",
            "bullets": [
                "Clear policies and expectations",
                "Open communication channels",
                "Anonymous reporting mechanisms",
                "Recognition and rewards",
                "Work-life balance support",
                "Fair and consistent treatment"
            ]
        },
        {
            "title": "Reporting Concerns",
            "bullets": [
                "Trust your instincts",
                "Report to manager or HR",
                "Use anonymous hotline if available",
                "Document specific observations",
                "Don't confront the individual",
                "Maintain confidentiality"
            ]
        },
        {
            "title": "Key Takeaways",
            "bullets": [
                "Insider threats are real and costly",
                "They can be malicious or accidental",
                "Everyone plays a role in prevention",
                "Report suspicious behavior",
                "Follow security policies",
                "Protect your credentials"
            ]
        }
    ]
}

# Mobile Security Training - 30+ slides
MOBILE_SECURITY_CONTENT = {
    "title": "Mobile Device Security",
    "subtitle": "Protecting Data on Smartphones and Tablets",
    "slides": [
        {
            "title": "Why Mobile Security Matters",
            "content": "Mobile devices are now primary targets for cybercriminals.",
            "bullets": [
                "We carry sensitive data everywhere",
                "Always connected to internet",
                "Mix of personal and work data",
                "Easy to lose or steal",
                "Often less protected than computers"
            ]
        },
        {
            "title": "Mobile Threat Landscape",
            "type": "stats",
            "stats": [
                ("60%", "Mobile Malware", "Year-over-year increase"),
                ("70M", "Lost Phones", "Smartphones lost annually"),
            ]
        },
        {
            "title": "Types of Mobile Threats",
            "type": "two_column",
            "left_title": "Technical Threats",
            "left_items": ["Malware and spyware", "Phishing apps", "Network attacks", "OS vulnerabilities"],
            "right_title": "Physical Threats",
            "right_items": ["Device theft", "Visual hacking", "Juice jacking", "Lost devices"]
        },
        {
            "title": "Mobile Malware",
            "bullets": [
                "Fake apps that steal data",
                "Banking trojans",
                "Ransomware on mobile",
                "Spyware tracking your location",
                "SMS interceptors",
                "Cryptominers draining battery"
            ]
        },
        {
            "title": "Public Wi-Fi Dangers",
            "bullets": [
                "Man-in-the-middle attacks",
                "Evil twin networks",
                "Packet sniffing",
                "Session hijacking",
                "Malware distribution",
                "Credential theft"
            ],
            "warning": "Avoid accessing sensitive data on public Wi-Fi!"
        },
        {
            "title": "Juice Jacking Explained",
            "content": "Malicious USB charging stations can steal data or install malware",
            "bullets": [
                "Public charging stations may be compromised",
                "USB can transfer data, not just power",
                "Attackers can install malware",
                "Data can be silently copied",
                "Use your own charger and outlet"
            ]
        },
        {
            "title": "Securing Your Device",
            "bullets": [
                "Use strong PIN or password (not 1234!)",
                "Enable biometric authentication",
                "Turn on device encryption",
                "Enable Find My Device feature",
                "Set auto-lock to 1 minute",
                "Enable remote wipe capability"
            ]
        },
        {
            "title": "App Security Best Practices",
            "bullets": [
                "Only download from official stores",
                "Check app permissions carefully",
                "Read reviews before installing",
                "Keep apps updated",
                "Remove apps you don't use",
                "Be wary of apps requesting too many permissions"
            ]
        },
        {
            "title": "Protecting Your Data",
            "bullets": [
                "Don't store sensitive data locally",
                "Use secure cloud storage",
                "Enable backup encryption",
                "Be careful with autofill",
                "Use mobile VPN when traveling",
                "Log out of sensitive apps"
            ]
        },
        {
            "title": "If Your Device is Lost or Stolen",
            "bullets": [
                "Use Find My Device to locate it",
                "Remote lock immediately",
                "Remote wipe if necessary",
                "Report to IT security",
                "Change passwords for accounts",
                "Monitor for suspicious activity"
            ]
        },
        {
            "title": "BYOD Security",
            "content": "Bring Your Own Device policies require extra vigilance",
            "bullets": [
                "Separate work and personal data",
                "Install required security apps",
                "Follow company MDM policies",
                "Don't jailbreak or root devices",
                "Report security incidents",
                "Understand data ownership"
            ]
        },
        {
            "title": "Key Takeaways",
            "bullets": [
                "Mobile devices are valuable targets",
                "Lock your device with strong authentication",
                "Be cautious with apps and permissions",
                "Avoid public Wi-Fi for sensitive tasks",
                "Keep devices and apps updated",
                "Report lost devices immediately"
            ]
        }
    ]
}

# Remote Work Security Training - 30+ slides
REMOTE_WORK_CONTENT = {
    "title": "Remote Work Security",
    "subtitle": "Staying Secure While Working from Anywhere",
    "slides": [
        {
            "title": "The Remote Work Reality",
            "content": "Remote work has become the new normal for many organizations.",
            "bullets": [
                "70% of workers work remotely at least once a week",
                "Home networks are less secure than offices",
                "Personal devices may be used for work",
                "Physical security is reduced",
                "IT support is not on-site"
            ]
        },
        {
            "title": "Security Challenges",
            "type": "stats",
            "stats": [
                ("20%", "Breach Increase", "Since shift to remote work"),
                ("$137K", "Average Cost", "Per remote work breach"),
            ]
        },
        {
            "title": "Home Network Security",
            "bullets": [
                "Change default router password",
                "Use WPA3 encryption (or WPA2)",
                "Update router firmware regularly",
                "Create separate network for IoT devices",
                "Disable WPS",
                "Hide your network name (SSID)"
            ]
        },
        {
            "title": "Securing Your Workspace",
            "bullets": [
                "Work in a private area",
                "Use privacy screen if needed",
                "Lock computer when stepping away",
                "Secure printed documents",
                "Shred sensitive papers",
                "Be aware of smart home devices"
            ]
        },
        {
            "title": "VPN Best Practices",
            "content": "Always use VPN when accessing company resources",
            "bullets": [
                "Connect to VPN before working",
                "Don't use free or untrusted VPNs",
                "Keep VPN software updated",
                "Report connection issues to IT",
                "Disconnect when not needed"
            ]
        },
        {
            "title": "Video Conferencing Security",
            "bullets": [
                "Use password-protected meetings",
                "Enable waiting rooms",
                "Don't share meeting links publicly",
                "Be aware of background visibility",
                "Use blur or virtual backgrounds",
                "Mute when not speaking"
            ]
        },
        {
            "title": "Phishing While Remote",
            "content": "Phishing attacks have increased targeting remote workers",
            "bullets": [
                "COVID-themed phishing campaigns",
                "Fake IT support requests",
                "Impersonation of executives",
                "Spoofed collaboration tools",
                "Verify unusual requests by phone"
            ],
            "warning": "Be extra vigilant - attackers know you're working alone!"
        },
        {
            "title": "Cloud Storage Security",
            "bullets": [
                "Use approved cloud services only",
                "Don't store sensitive data in personal accounts",
                "Enable two-factor authentication",
                "Check sharing settings carefully",
                "Review access permissions regularly",
                "Use expiring links when sharing"
            ]
        },
        {
            "title": "Physical Security at Home",
            "bullets": [
                "Don't leave laptop in car",
                "Secure devices when traveling",
                "Be cautious of delivery personnel",
                "Don't discuss work in public",
                "Use cable locks if needed",
                "Dispose of equipment properly"
            ]
        },
        {
            "title": "Handling Sensitive Data",
            "bullets": [
                "Follow data classification policies",
                "Don't download sensitive data locally",
                "Use encrypted email for confidential info",
                "Avoid taking screenshots of sensitive data",
                "Be careful with printers at home",
                "Use secure file transfer methods"
            ]
        },
        {
            "title": "Incident Reporting",
            "bullets": [
                "Know how to contact IT security",
                "Report suspicious activity immediately",
                "Don't try to fix security issues yourself",
                "Document what happened",
                "Preserve evidence",
                "Follow up on reported incidents"
            ]
        },
        {
            "title": "Key Takeaways",
            "bullets": [
                "Security is your responsibility at home too",
                "Secure your home network",
                "Always use VPN for work",
                "Be extra cautious of phishing",
                "Protect physical devices",
                "Report incidents promptly"
            ]
        }
    ]
}

# Business Email Compromise Training - 30+ slides
BEC_CONTENT = {
    "title": "Business Email Compromise",
    "subtitle": "Protecting Against Executive Impersonation Attacks",
    "slides": [
        {
            "title": "What is BEC?",
            "content": "Business Email Compromise is a sophisticated scam targeting businesses.",
            "bullets": [
                "Attackers impersonate executives or vendors",
                "Often involves wire transfer requests",
                "Highly targeted and researched",
                "Can bypass technical controls",
                "Causes billions in losses annually"
            ]
        },
        {
            "title": "The Financial Impact",
            "type": "stats",
            "stats": [
                ("$2.4B", "Annual Losses", "FBI reported BEC losses in 2021"),
                ("$120K", "Average Loss", "Per successful BEC attack"),
            ]
        },
        {
            "title": "Real Case: Ubiquiti Networks",
            "content": "$46.7 million lost to BEC attack",
            "bullets": [
                "Attackers impersonated executives",
                "Requested wire transfers to overseas accounts",
                "Finance team followed instructions",
                "Multiple transfers over weeks",
                "Partial recovery through legal action"
            ]
        },
        {
            "title": "How BEC Works",
            "bullets": [
                "Research: Attackers study the organization",
                "Setup: Create lookalike domains/accounts",
                "Impersonation: Pose as executive or vendor",
                "Request: Urgent payment or data request",
                "Execution: Victim complies with request",
                "Escape: Money transferred overseas"
            ]
        },
        {
            "title": "Common BEC Scenarios",
            "type": "two_column",
            "left_title": "Executive Impersonation",
            "left_items": ["CEO fraud", "CFO payment requests", "Urgent wire transfers", "Gift card purchases"],
            "right_title": "Vendor Impersonation",
            "right_items": ["Invoice fraud", "Account changes", "Payment redirects", "Fake contracts"]
        },
        {
            "title": "Red Flags to Watch For",
            "bullets": [
                "Urgent or time-sensitive requests",
                "Requests for secrecy",
                "Changes to payment details",
                "Unusual sender email address",
                "Requests outside normal process",
                "Poor grammar or formatting"
            ],
            "warning": "If something feels wrong, verify through another channel!"
        },
        {
            "title": "Verification Procedures",
            "bullets": [
                "Call the requester at known number",
                "Use out-of-band verification",
                "Verify with multiple approvers",
                "Check for domain spoofing",
                "Confirm account changes in person",
                "Document verification attempts"
            ]
        },
        {
            "title": "Technical Controls",
            "bullets": [
                "Email authentication (DMARC, DKIM, SPF)",
                "External email banners",
                "Lookalike domain monitoring",
                "Email filtering and scanning",
                "Multi-factor authentication",
                "Data loss prevention"
            ]
        },
        {
            "title": "If You Suspect BEC",
            "bullets": [
                "Stop all communication with the attacker",
                "Do NOT make any transfers",
                "Report to IT security immediately",
                "Contact your bank to freeze transfers",
                "Report to FBI IC3",
                "Preserve all evidence"
            ]
        },
        {
            "title": "Key Takeaways",
            "bullets": [
                "BEC is a multi-billion dollar problem",
                "Anyone can be targeted",
                "Verify unusual requests through known channels",
                "Follow established payment procedures",
                "Report suspicious requests immediately",
                "Trust but verify - always"
            ]
        }
    ]
}

# Add to module mapping
ADDITIONAL_MODULES = {
    "ransomware": RANSOMWARE_CONTENT,
    "ransomware_awareness": RANSOMWARE_CONTENT,
    "insider_threat": INSIDER_THREAT_CONTENT,
    "insider_threats": INSIDER_THREAT_CONTENT,
    "mobile_security": MOBILE_SECURITY_CONTENT,
    "mobile": MOBILE_SECURITY_CONTENT,
    "remote_work": REMOTE_WORK_CONTENT,
    "remote_work_security": REMOTE_WORK_CONTENT,
    "work_from_home": REMOTE_WORK_CONTENT,
    "bec": BEC_CONTENT,
    "business_email_compromise": BEC_CONTENT,
    "ceo_fraud": BEC_CONTENT,
}
