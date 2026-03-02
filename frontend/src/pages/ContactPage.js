import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { Loader2, Send, Mail, Phone, MapPin, CheckCircle } from 'lucide-react';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

export default function ContactPage() {
  const [branding, setBranding] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    organization: '',
    subject: '',
    message: ''
  });

  useEffect(() => {
    axios.get(`${API}/settings/branding`)
      .then(res => setBranding(res.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.message) {
      toast.error('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    try {
      await axios.post(`${API}/contact`, formData);
      setSubmitted(true);
      toast.success('Message sent successfully!');
      setFormData({ name: '', email: '', phone: '', organization: '', subject: '', message: '' });
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to send message');
    } finally {
      setSubmitting(false);
    }
  };

  // Dynamic colors
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const accentColor = branding?.accent_color || '#D4A836';
  const primaryColor = branding?.primary_color || '#D4A836';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12 flex-1">
        {/* Hero */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
            Contact Us
          </h1>
          <p className="text-lg" style={{ color: textColor, opacity: 0.8 }}>
            Have questions? We'd love to hear from you. Send us a message and we'll respond as soon as possible.
          </p>
        </div>

        <div className="max-w-5xl mx-auto grid lg:grid-cols-3 gap-8">
          {/* Contact Info */}
          <div className="lg:col-span-1 space-y-6">
            <Card className="bg-[#0f0f15] border-[#1a1a2e]">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                    <Mail className="w-5 h-5" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: headingColor }}>Email</h3>
                    <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                      {branding?.contact_email || 'info@vasilisnetshield.com'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f0f15] border-[#1a1a2e]">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                    <Phone className="w-5 h-5" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: headingColor }}>Phone</h3>
                    <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                      {branding?.contact_phone || 'Available upon request'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-[#0f0f15] border-[#1a1a2e]">
              <CardContent className="p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                    <MapPin className="w-5 h-5" style={{ color: accentColor }} />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1" style={{ color: headingColor }}>Location</h3>
                    <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                      {branding?.company_address || 'Remote / Global'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Contact Form */}
          <div className="lg:col-span-2">
            <Card className="bg-[#0f0f15] border-[#1a1a2e]">
              <CardContent className="p-6 sm:p-8">
                {submitted ? (
                  <div className="text-center py-12">
                    <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center" style={{ backgroundColor: `${primaryColor}20` }}>
                      <CheckCircle className="w-8 h-8" style={{ color: accentColor }} />
                    </div>
                    <h3 className="text-2xl font-bold mb-2" style={{ color: headingColor }}>Message Sent!</h3>
                    <p className="mb-6" style={{ color: textColor, opacity: 0.7 }}>
                      Thank you for reaching out. We'll get back to you soon.
                    </p>
                    <Button 
                      onClick={() => setSubmitted(false)}
                      style={{ backgroundColor: primaryColor }}
                      className="hover:opacity-90"
                    >
                      Send Another Message
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmit} className="space-y-6" data-testid="contact-form">
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name" style={{ color: textColor }}>Name *</Label>
                        <Input
                          id="name"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          placeholder="Your name"
                          required
                          className="bg-[#0a0a0f] border-[#30363D] focus:border-[#D4A836]"
                          style={{ color: textColor }}
                          data-testid="contact-name-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email" style={{ color: textColor }}>Email *</Label>
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          value={formData.email}
                          onChange={handleChange}
                          placeholder="your@email.com"
                          required
                          className="bg-[#0a0a0f] border-[#30363D] focus:border-[#D4A836]"
                          style={{ color: textColor }}
                          data-testid="contact-email-input"
                        />
                      </div>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="phone" style={{ color: textColor }}>Phone</Label>
                        <Input
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleChange}
                          placeholder="+1 (555) 000-0000"
                          className="bg-[#0a0a0f] border-[#30363D] focus:border-[#D4A836]"
                          style={{ color: textColor }}
                          data-testid="contact-phone-input"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="organization" style={{ color: textColor }}>Organization</Label>
                        <Input
                          id="organization"
                          name="organization"
                          value={formData.organization}
                          onChange={handleChange}
                          placeholder="Your company"
                          className="bg-[#0a0a0f] border-[#30363D] focus:border-[#D4A836]"
                          style={{ color: textColor }}
                          data-testid="contact-organization-input"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="subject" style={{ color: textColor }}>Subject</Label>
                      <Input
                        id="subject"
                        name="subject"
                        value={formData.subject}
                        onChange={handleChange}
                        placeholder="What's this about?"
                        className="bg-[#0a0a0f] border-[#30363D] focus:border-[#D4A836]"
                        style={{ color: textColor }}
                        data-testid="contact-subject-input"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message" style={{ color: textColor }}>Message *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        value={formData.message}
                        onChange={handleChange}
                        placeholder="Tell us more about your inquiry..."
                        rows={5}
                        required
                        className="bg-[#0a0a0f] border-[#30363D] focus:border-[#D4A836] resize-none"
                        style={{ color: textColor }}
                        data-testid="contact-message-input"
                      />
                    </div>

                    <Button
                      type="submit"
                      disabled={submitting}
                      className="w-full hover:opacity-90"
                      style={{ backgroundColor: primaryColor }}
                      data-testid="contact-submit-btn"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Sending...
                        </>
                      ) : (
                        <>
                          <Send className="w-4 h-4 mr-2" />
                          Send Message
                        </>
                      )}
                    </Button>
                  </form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <PublicFooter branding={branding} />
    </div>
  );
}
