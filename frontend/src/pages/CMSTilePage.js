import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { Loader2, ArrowLeft, AlertTriangle, Send, Mail, Phone, MapPin, CheckCircle, Calendar } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Contact Form Component
const ContactFormSection = ({ branding }) => {
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

  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const accentColor = branding?.accent_color || '#D4A836';
  const primaryColor = branding?.primary_color || '#D4A836';

  return (
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
                  />
                </div>

                <Button
                  type="submit"
                  disabled={submitting}
                  className="w-full hover:opacity-90"
                  style={{ backgroundColor: primaryColor }}
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
  );
};

// Events Calendar Component (imports from EventsPage)
const EventsSection = ({ branding }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API}/events/public`);
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
    } finally {
      setLoading(false);
    }
  };

  const primaryColor = branding?.primary_color || '#D4A836';
  const textColor = branding?.text_color || '#E8DDB5';

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-8 h-8 animate-spin" style={{ color: primaryColor }} />
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-12">
        <Calendar className="w-16 h-16 mx-auto mb-4 opacity-50" style={{ color: primaryColor }} />
        <h3 className="text-xl font-semibold mb-2" style={{ color: textColor }}>No Upcoming Events</h3>
        <p className="text-gray-400">Check back soon for new events!</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {events.map(event => (
        <Card key={event.event_id} className="bg-[#0f0f15] border-[#1a1a2e] hover:border-[#D4A836]/50 transition-colors">
          {event.image_url && (
            <img src={event.image_url} alt={event.title} className="w-full h-48 object-cover rounded-t-lg" />
          )}
          <CardContent className="p-4">
            <h3 className="font-semibold text-lg mb-2" style={{ color: textColor }}>{event.title}</h3>
            <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
              <Calendar className="w-4 h-4" />
              {new Date(event.start_time).toLocaleDateString('en-US', {
                weekday: 'short',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
              })}
            </div>
            {event.location && (
              <div className="flex items-center gap-2 text-sm text-gray-400">
                <MapPin className="w-4 h-4" />
                {event.location}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Main CMS Tile Page Component
export default function CMSTilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [tile, setTile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    fetchTile();
    fetchBranding();
  }, [slug]);

  const fetchBranding = async () => {
    try {
      const res = await axios.get(`${API}/settings/branding`);
      setBranding(res.data);
    } catch (err) {
      console.error('Failed to load branding:', err);
    }
  };

  const fetchTile = async () => {
    try {
      const res = await axios.get(`${API}/cms-tiles/${slug}`);
      setTile(res.data);
    } catch (err) {
      if (err.response?.status === 404) {
        setError('not_found');
      } else {
        setError('failed');
      }
    } finally {
      setLoading(false);
    }
  };

  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
      </div>
    );
  }

  if (error === 'not_found') {
    // Return null to let the router try the next route
    return null;
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0a0a0f] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#E8DDB5] mb-2">Page Not Found</h1>
          <p className="text-gray-400 mb-6">The page you're looking for doesn't exist.</p>
          <Button 
            onClick={() => navigate('/')}
            className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </div>
      </div>
    );
  }

  // Handle external redirects
  if (tile.route_type === 'external' && tile.external_url) {
    window.location.href = tile.external_url;
    return null;
  }

  // Render page based on route_type
  const renderContent = () => {
    switch (tile.route_type) {
      case 'contact_form':
        return <ContactFormSection branding={branding} />;
      
      case 'events':
        return <EventsSection branding={branding} />;
      
      case 'custom':
      default:
        // Render HTML content from visual editor
        if (tile.custom_content) {
          return (
            <div 
              className="prose prose-invert max-w-none"
              style={{ color: textColor }}
              dangerouslySetInnerHTML={{ __html: tile.custom_content }}
            />
          );
        }
        return (
          <div className="text-center py-16 text-gray-400">
            <p>This page has no content yet.</p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0f] flex flex-col">
      <PublicNav branding={branding} />

      <main className="container mx-auto px-6 py-12 flex-1">
        {/* Page Title */}
        <div className="text-center max-w-3xl mx-auto mb-12">
          <h1 className="text-4xl sm:text-5xl font-bold mb-4" style={{ color: headingColor, fontFamily: 'Chivo, sans-serif' }}>
            {tile.name}
          </h1>
          {tile.description && (
            <p className="text-lg" style={{ color: textColor, opacity: 0.8 }}>
              {tile.description}
            </p>
          )}
        </div>

        {/* Page Content */}
        {renderContent()}
      </main>

      <PublicFooter branding={branding} />
    </div>
  );
}
