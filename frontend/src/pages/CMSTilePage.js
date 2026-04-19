import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { sanitizeHtml } from '../utils/sanitize';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent } from '../components/ui/card';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { Loader2, ArrowLeft, AlertTriangle, Send, Mail, Phone, MapPin, CheckCircle, Calendar, Quote } from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Block Renderer - renders individual blocks on the public page
const BlockRenderer = ({ block, branding }) => {
  const { type, content } = block;
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const primaryColor = branding?.primary_color || '#D4A836';

  switch (type) {
    case 'heading':
      const HeadingTag = content.level || 'h2';
      const headingClasses = {
        h1: 'text-4xl sm:text-5xl font-bold',
        h2: 'text-3xl sm:text-4xl font-bold',
        h3: 'text-2xl sm:text-3xl font-semibold',
        h4: 'text-xl sm:text-2xl font-semibold',
      };
      return (
        <HeadingTag 
          className={`${headingClasses[HeadingTag]} ${content.align === 'center' ? 'text-center' : content.align === 'right' ? 'text-right' : 'text-left'} mb-6`}
          style={{ color: headingColor }}
        >
          {content.text}
        </HeadingTag>
      );

    case 'text':
      return (
        <div 
          className="prose prose-invert max-w-none mb-6"
          style={{ color: textColor }}
          dangerouslySetInnerHTML={createSafeMarkup(sanitizeHtml(content.html))}
        />
      );

    case 'image':
      const widthClasses = {
        small: 'max-w-[25%]',
        medium: 'max-w-[50%]',
        large: 'max-w-[75%]',
        full: 'max-w-full'
      };
      return (
        <figure className={`mb-6 ${widthClasses[content.width || 'full']} mx-auto`}>
          <img 
            src={content.url} 
            alt={content.alt || ''} 
            className="w-full rounded-lg"
          />
          {content.caption && (
            <figcaption className="text-center text-sm text-gray-400 mt-2">
              {content.caption}
            </figcaption>
          )}
        </figure>
      );

    case 'video':
      // Extract video ID from YouTube/Vimeo URL
      const getVideoEmbed = (url) => {
        if (url.includes('youtube.com') || url.includes('youtu.be')) {
          const videoId = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&\s]+)/)?.[1];
          return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
        }
        if (url.includes('vimeo.com')) {
          const videoId = url.match(/vimeo\.com\/(\d+)/)?.[1];
          return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
        }
        return null;
      };
      const embedUrl = getVideoEmbed(content.url);
      return embedUrl ? (
        <div className="aspect-video mb-6 rounded-lg overflow-hidden">
          <iframe 
            src={embedUrl} 
            className="w-full h-full"
            allowFullScreen
            title="Video"
          />
        </div>
      ) : null;

    case 'divider':
      return (
        <hr 
          className="my-8 border-0 h-px"
          style={{ 
            backgroundColor: content.color || '#30363D',
            borderStyle: content.style || 'solid'
          }}
        />
      );

    case 'spacer':
      return <div style={{ height: content.height || 40 }} />;

    case 'quote':
      return (
        <blockquote className="border-l-4 pl-6 py-2 my-6" style={{ borderColor: primaryColor }}>
          <p className="text-lg italic mb-2" style={{ color: textColor }}>
            "{content.text}"
          </p>
          {content.author && (
            <cite className="text-sm text-gray-400">— {content.author}</cite>
          )}
        </blockquote>
      );

    case 'button':
      const buttonStyles = {
        primary: { backgroundColor: primaryColor, color: '#000' },
        secondary: { backgroundColor: 'transparent', border: `2px solid ${primaryColor}`, color: primaryColor },
        outline: { backgroundColor: 'transparent', border: '2px solid #30363D', color: textColor }
      };
      return (
        <div className={`mb-6 ${content.align === 'center' ? 'text-center' : content.align === 'right' ? 'text-right' : 'text-left'}`}>
          <a 
            href={content.url}
            className="inline-block px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={buttonStyles[content.style || 'primary']}
          >
            {content.text}
          </a>
        </div>
      );

    case 'cta':
      return (
        <div 
          className="rounded-lg p-8 text-center my-8"
          style={{ backgroundColor: `${primaryColor}10`, border: `1px solid ${primaryColor}30` }}
        >
          <h3 className="text-2xl font-bold mb-2" style={{ color: headingColor }}>
            {content.title}
          </h3>
          <p className="mb-6" style={{ color: textColor, opacity: 0.8 }}>
            {content.description}
          </p>
          <a 
            href={content.buttonUrl}
            className="inline-block px-6 py-3 rounded-lg font-medium transition-opacity hover:opacity-80"
            style={{ backgroundColor: primaryColor, color: '#000' }}
          >
            {content.buttonText}
          </a>
        </div>
      );

    case 'contact_form':
      return <ContactFormSection branding={branding} formContent={content} />;

    case 'events':
      return <EventsSection branding={branding} limit={content.limit} layout={content.layout} />;

    case 'team':
      return <TeamSection branding={branding} content={content} />;

    case 'testimonials':
      return <TestimonialsSection branding={branding} content={content} />;

    case 'pricing':
      return <PricingSection branding={branding} content={content} />;

    case 'faq':
      return <FAQSection branding={branding} content={content} />;

    case 'features':
      return <FeaturesSection branding={branding} content={content} />;

    case 'gallery':
      return <GallerySection branding={branding} content={content} />;

    case 'list':
      return (
        <div className="mb-6" style={{ color: textColor }}>
          {content.type === 'numbered' ? (
            <ol className="list-decimal list-inside space-y-2">
              {(content.items || []).map((item, i) => (
                <li key={i} className="text-base">{item}</li>
              ))}
            </ol>
          ) : (
            <ul className="list-disc list-inside space-y-2">
              {(content.items || []).map((item, i) => (
                <li key={i} className="text-base">{item}</li>
              ))}
            </ul>
          )}
        </div>
      );

    case 'map':
      const mapQuery = encodeURIComponent(content.address || 'New York');
      return (
        <div className="mb-6 rounded-lg overflow-hidden">
          <iframe
            src={`https://www.google.com/maps?q=${mapQuery}&output=embed`}
            width="100%"
            height="400"
            style={{ border: 0 }}
            allowFullScreen
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            title="Map"
          />
        </div>
      );

    default:
      return null;
  }
};

// Contact Form Component - Clean design without sidebar
const ContactFormSection = ({ branding, formContent = {} }) => {
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
  
  const title = formContent.title || 'Get in Touch';
  const description = formContent.description || 'Fill out the form below and we\'ll get back to you.';
  const buttonText = formContent.buttonText || 'Send Message';

  return (
    <div className="max-w-2xl mx-auto">
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
                data-testid="contact-form-submit"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Sending...
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4 mr-2" />
                    {buttonText}
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

// Team Members Section
const TeamSection = ({ branding, content }) => {
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const primaryColor = branding?.primary_color || '#D4A836';
  const members = content.members || [];
  const columns = content.columns || 3;

  if (members.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No team members added yet</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 mb-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-${columns}`}>
      {members.map((member, index) => (
        <Card key={index} className="bg-[#0f0f15] border-[#1a1a2e] overflow-hidden">
          {member.image && (
            <div className="aspect-square overflow-hidden">
              <img 
                src={member.image} 
                alt={member.name} 
                className="w-full h-full object-cover"
              />
            </div>
          )}
          <CardContent className="p-6 text-center">
            <h3 className="text-lg font-semibold mb-1" style={{ color: headingColor }}>
              {member.name}
            </h3>
            <p className="text-sm mb-3" style={{ color: primaryColor }}>
              {member.role}
            </p>
            {member.bio && (
              <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
                {member.bio}
              </p>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Testimonials Section
const TestimonialsSection = ({ branding, content }) => {
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const primaryColor = branding?.primary_color || '#D4A836';
  const items = content.items || [];

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No testimonials added yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3">
      {items.map((item, index) => (
        <Card key={index} className="bg-[#0f0f15] border-[#1a1a2e]">
          <CardContent className="p-6">
            <Quote className="w-8 h-8 mb-4" style={{ color: primaryColor, opacity: 0.5 }} />
            <p className="text-base mb-4 italic" style={{ color: textColor }}>
              "{item.quote}"
            </p>
            <div className="flex items-center gap-3">
              {item.image && (
                <img 
                  src={item.image} 
                  alt={item.author} 
                  className="w-10 h-10 rounded-full object-cover"
                />
              )}
              <div>
                <p className="font-semibold text-sm" style={{ color: headingColor }}>
                  {item.author}
                </p>
                {item.role && (
                  <p className="text-xs" style={{ color: textColor, opacity: 0.6 }}>
                    {item.role}
                  </p>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Pricing Table Section
const PricingSection = ({ branding, content }) => {
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const primaryColor = branding?.primary_color || '#D4A836';
  const plans = content.plans || [];

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No pricing plans added yet</p>
      </div>
    );
  }

  return (
    <div className="grid gap-6 mb-6 md:grid-cols-2 lg:grid-cols-3">
      {plans.map((plan, index) => (
        <Card 
          key={index} 
          className={`bg-[#0f0f15] border-[#1a1a2e] relative ${plan.popular ? 'ring-2' : ''}`}
          style={plan.popular ? { '--tw-ring-color': primaryColor } : {}}
        >
          {plan.popular && (
            <div 
              className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 text-xs font-bold rounded-full"
              style={{ backgroundColor: primaryColor, color: '#000' }}
            >
              POPULAR
            </div>
          )}
          <CardContent className="p-6 text-center">
            <h3 className="text-xl font-bold mb-2" style={{ color: headingColor }}>
              {plan.name}
            </h3>
            <div className="mb-6">
              <span className="text-4xl font-bold" style={{ color: primaryColor }}>
                {plan.price}
              </span>
              <span className="text-sm" style={{ color: textColor, opacity: 0.6 }}>
                {plan.period}
              </span>
            </div>
            <ul className="space-y-3 mb-6 text-left">
              {(plan.features || []).map((feature, i) => (
                <li key={i} className="flex items-center gap-2" style={{ color: textColor }}>
                  <CheckCircle className="w-4 h-4 flex-shrink-0" style={{ color: primaryColor }} />
                  <span className="text-sm">{feature}</span>
                </li>
              ))}
            </ul>
            <Button
              className="w-full"
              style={{ 
                backgroundColor: plan.popular ? primaryColor : 'transparent',
                color: plan.popular ? '#000' : primaryColor,
                border: plan.popular ? 'none' : `2px solid ${primaryColor}`
              }}
            >
              {plan.cta || 'Get Started'}
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// FAQ Accordion Section
const FAQSection = ({ branding, content }) => {
  const [openIndex, setOpenIndex] = useState(null);
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const primaryColor = branding?.primary_color || '#D4A836';
  const items = content.items || [];

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No FAQ items added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3 mb-6 max-w-3xl mx-auto">
      {items.map((item, index) => (
        <Card 
          key={index} 
          className="bg-[#0f0f15] border-[#1a1a2e] overflow-hidden cursor-pointer"
          onClick={() => setOpenIndex(openIndex === index ? null : index)}
        >
          <CardContent className="p-0">
            <div 
              className="p-4 flex items-center justify-between"
              style={{ color: headingColor }}
            >
              <span className="font-medium">{item.question}</span>
              <span 
                className="text-xl transition-transform"
                style={{ 
                  transform: openIndex === index ? 'rotate(45deg)' : 'none',
                  color: primaryColor
                }}
              >
                +
              </span>
            </div>
            {openIndex === index && (
              <div 
                className="px-4 pb-4 border-t border-[#1a1a2e] pt-3"
                style={{ color: textColor, opacity: 0.8 }}
              >
                {item.answer}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Features Grid Section
const FeaturesSection = ({ branding, content }) => {
  const textColor = branding?.text_color || '#E8DDB5';
  const headingColor = branding?.heading_color || '#FFFFFF';
  const primaryColor = branding?.primary_color || '#D4A836';
  const items = content.items || [];
  const columns = content.columns || 3;

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No features added yet</p>
      </div>
    );
  }

  return (
    <div className={`grid gap-6 mb-6 sm:grid-cols-2 lg:grid-cols-${columns}`}>
      {items.map((item, index) => (
        <Card key={index} className="bg-[#0f0f15] border-[#1a1a2e]">
          <CardContent className="p-6">
            <div 
              className="w-12 h-12 rounded-lg flex items-center justify-center mb-4"
              style={{ backgroundColor: `${primaryColor}20` }}
            >
              <span className="text-2xl" style={{ color: primaryColor }}>
                {item.icon === 'Zap' ? '⚡' : 
                 item.icon === 'Shield' ? '🛡️' : 
                 item.icon === 'Star' ? '⭐' : 
                 item.icon === 'Heart' ? '❤️' : 
                 item.icon === 'Check' ? '✓' : '✦'}
              </span>
            </div>
            <h3 className="text-lg font-semibold mb-2" style={{ color: headingColor }}>
              {item.title}
            </h3>
            <p className="text-sm" style={{ color: textColor, opacity: 0.7 }}>
              {item.description}
            </p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

// Image Gallery Section
const GallerySection = ({ branding, content }) => {
  const images = content.images || [];
  const columns = content.columns || 3;
  const gap = content.gap || 4;

  if (images.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p>No images added yet</p>
      </div>
    );
  }

  return (
    <div 
      className={`grid mb-6 sm:grid-cols-2 lg:grid-cols-${columns}`}
      style={{ gap: `${gap * 4}px` }}
    >
      {images.map((image, index) => (
        <div key={index} className="overflow-hidden rounded-lg">
          <img 
            src={typeof image === 'string' ? image : image.url} 
            alt={typeof image === 'string' ? `Gallery image ${index + 1}` : image.alt || ''} 
            className="w-full h-48 object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      ))}
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
      const res = await axios.get(`${API}/events/upcoming`);
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
              {new Date(event.start_date).toLocaleDateString('en-US', {
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

  // Render page based on blocks (new system) or route_type (legacy)
  const renderContent = () => {
    // If the tile has blocks, render them
    if (tile.blocks && tile.blocks.length > 0) {
      return (
        <div className="space-y-0">
          {tile.blocks.map((block, index) => (
            <BlockRenderer key={block.id || index} block={block} branding={branding} />
          ))}
        </div>
      );
    }

    // Legacy route_type based rendering
    switch (tile.route_type) {
      case 'contact_form':
        return <ContactFormSection branding={branding} />;
      
      case 'events':
        return <EventsSection branding={branding} />;
      
      case 'team':
      case 'services':
      case 'faq':
      case 'testimonials':
      case 'pricing':
      case 'gallery':
      case 'features':
        return (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-full mx-auto mb-4 flex items-center justify-center bg-yellow-500/20">
              <Calendar className="w-8 h-8 text-yellow-500" />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ color: textColor }}>Coming Soon</h3>
            <p className="text-gray-400 max-w-md mx-auto">
              This page type is under development. Check back soon for {tile.route_type.replace('_', ' ')} functionality!
            </p>
          </div>
        );
      
      case 'custom':
      default:
        // Render HTML content from visual editor
        if (tile.custom_content) {
          return (
            <div 
              className="prose prose-invert max-w-none"
              style={{ color: textColor }}
              dangerouslySetInnerHTML={createSafeMarkup(sanitizeHtml(tile.custom_content))}
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
