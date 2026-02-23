import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { PublicNav } from '../components/layout/PublicNav';
import { PublicFooter } from '../components/layout/PublicFooter';
import { 
  Shield, Lock, Key, Calendar, MapPin, Mail, Check, Loader2, 
  ArrowLeft, AlertTriangle
} from 'lucide-react';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Block renderers
const HeadingBlock = ({ content }) => {
  // Handle both numeric levels (1,2,3) and string levels ('h1','h2','h3')
  const levelMap = {1: 'h1', 2: 'h2', 3: 'h3', h1: 'h1', h2: 'h2', h3: 'h3'};
  const Tag = levelMap[content.level] || 'h2';
  const styles = {
    h1: 'text-4xl md:text-5xl font-bold text-[#E8DDB5]',
    h2: 'text-2xl md:text-3xl font-bold text-[#E8DDB5]',
    h3: 'text-xl md:text-2xl font-semibold text-[#E8DDB5]'
  };
  
  return (
    <Tag className={`${styles[Tag]} mb-4`} style={{ textAlign: content.align || 'left' }}>
      {content.text}
    </Tag>
  );
};

const TextBlock = ({ content }) => (
  <div 
    className="text-gray-300 leading-relaxed whitespace-pre-wrap"
    style={{ textAlign: content.align || 'left' }}
  >
    {content.text}
  </div>
);

const ButtonBlock = ({ content }) => {
  const styles = {
    primary: 'bg-[#D4A836] hover:bg-[#C49A30] text-black',
    secondary: 'border border-[#D4A836] text-[#D4A836] hover:bg-[#D4A836]/10',
    ghost: 'text-[#D4A836] hover:text-[#E8DDB5] underline'
  };
  
  const handleClick = () => {
    if (content.url) {
      if (content.open_new_tab) {
        window.open(content.url, '_blank');
      } else {
        window.location.href = content.url;
      }
    }
  };
  
  return (
    <div className="my-4">
      <Button 
        onClick={handleClick}
        className={styles[content.style] || styles.primary}
      >
        {content.text}
      </Button>
    </div>
  );
};

const ImageBlock = ({ content }) => (
  <div className="my-6">
    {content.url && (
      <img 
        src={content.url} 
        alt={content.alt || ''} 
        className="max-w-full h-auto rounded-lg"
      />
    )}
    {content.caption && (
      <p className="text-gray-500 text-sm mt-2 text-center">{content.caption}</p>
    )}
  </div>
);

const DividerBlock = () => (
  <hr className="border-[#D4A836]/30 my-8" />
);

const HeroBlock = ({ content }) => (
  <div 
    className="py-16 px-6 rounded-xl text-center mb-8"
    style={{ backgroundColor: content.background_color || '#0f0f15' }}
  >
    <h1 className="text-4xl md:text-5xl font-bold text-[#E8DDB5] mb-4">
      {content.title}
    </h1>
    {content.subtitle && (
      <p className="text-xl text-gray-400 mb-8 max-w-2xl mx-auto">
        {content.subtitle}
      </p>
    )}
    {content.button_text && (
      <Button 
        onClick={() => content.button_url && (window.location.href = content.button_url)}
        className="bg-[#D4A836] hover:bg-[#C49A30] text-black px-8 py-3 text-lg"
      >
        {content.button_text}
      </Button>
    )}
  </div>
);

const ContactFormBlock = ({ content }) => {
  const [formData, setFormData] = useState({ name: '', email: '', message: '' });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await axios.post(`${API}/inquiries`, {
        name: formData.name,
        email: formData.email,
        message: formData.message,
        source: 'custom_page_contact_form'
      });
      setSubmitted(true);
      toast.success(content.success_message || 'Thank you for your message!');
    } catch (error) {
      toast.error('Failed to send message. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (submitted) {
    return (
      <Card className="bg-[#0f0f15] border-[#D4A836]/20 max-w-xl mx-auto my-8">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">Message Sent!</h3>
          <p className="text-gray-400">{content.success_message || 'Thank you for your message!'}</p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card className="bg-[#0f0f15] border-[#D4A836]/20 max-w-xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
          <Mail className="w-5 h-5 text-[#D4A836]" />
          {content.title || 'Contact Us'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Input
              placeholder="Your Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="bg-[#1a1a24] border-[#30363D] text-white"
              required
            />
          </div>
          <div>
            <Input
              type="email"
              placeholder="Your Email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="bg-[#1a1a24] border-[#30363D] text-white"
              required
            />
          </div>
          <div>
            <Textarea
              placeholder="Your Message"
              value={formData.message}
              onChange={(e) => setFormData({ ...formData, message: e.target.value })}
              className="bg-[#1a1a24] border-[#30363D] text-white min-h-[120px]"
              required
            />
          </div>
          <Button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-[#D4A836] hover:bg-[#C49A30] text-black"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Sending...</>
            ) : (
              content.submit_text || 'Send Message'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const EventRegistrationBlock = ({ content }) => {
  const [formData, setFormData] = useState({ name: '', email: '', company: '' });
  const [submitting, setSubmitting] = useState(false);
  const [registered, setRegistered] = useState(false);
  
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      await axios.post(`${API}/inquiries`, {
        name: formData.name,
        email: formData.email,
        message: `Event Registration for: ${content.event_name}\nCompany: ${formData.company || 'N/A'}`,
        source: 'event_registration'
      });
      setRegistered(true);
      toast.success('Successfully registered for the event!');
    } catch (error) {
      toast.error('Failed to register. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };
  
  if (registered) {
    return (
      <Card className="bg-[#0f0f15] border-[#D4A836]/20 max-w-xl mx-auto my-8">
        <CardContent className="py-12 text-center">
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <Check className="w-8 h-8 text-green-400" />
          </div>
          <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">You're Registered!</h3>
          <p className="text-gray-400">We'll send you a confirmation email with event details.</p>
        </CardContent>
      </Card>
    );
  }
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'TBA';
    try {
      return new Date(dateStr).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateStr;
    }
  };
  
  return (
    <Card className="bg-[#0f0f15] border-[#D4A836]/20 max-w-xl mx-auto my-8">
      <CardHeader>
        <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
          <Calendar className="w-5 h-5 text-[#D4A836]" />
          {content.title || 'Register for Event'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-6 p-4 bg-[#1a1a24] rounded-lg border border-[#D4A836]/20">
          <h3 className="text-lg font-semibold text-[#E8DDB5] mb-2">{content.event_name}</h3>
          <div className="space-y-2 text-sm text-gray-400">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              <span>{formatDate(content.event_date)}</span>
            </div>
            {content.event_location && (
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4" />
                <span>{content.event_location}</span>
              </div>
            )}
          </div>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            placeholder="Your Name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-[#1a1a24] border-[#30363D] text-white"
            required
          />
          <Input
            type="email"
            placeholder="Your Email"
            value={formData.email}
            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            className="bg-[#1a1a24] border-[#30363D] text-white"
            required
          />
          <Input
            placeholder="Company (optional)"
            value={formData.company}
            onChange={(e) => setFormData({ ...formData, company: e.target.value })}
            className="bg-[#1a1a24] border-[#30363D] text-white"
          />
          <Button 
            type="submit" 
            disabled={submitting}
            className="w-full bg-[#D4A836] hover:bg-[#C49A30] text-black"
          >
            {submitting ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Registering...</>
            ) : (
              content.button_text || 'Register Now'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

const CardsBlock = ({ content }) => {
  const ICONS = {
    Shield: Shield,
    Lock: Lock,
    Key: Key
  };
  
  const cols = content.columns || 3;
  const gridClass = {
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4'
  }[cols] || 'grid-cols-1 md:grid-cols-3';
  
  return (
    <div className={`grid ${gridClass} gap-6 my-8`}>
      {(content.cards || []).map((card, i) => {
        const IconComponent = ICONS[card.icon] || Shield;
        return (
          <Card key={i} className="bg-[#0f0f15] border-[#D4A836]/20">
            <CardContent className="pt-6">
              <div className="w-12 h-12 bg-[#D4A836]/20 rounded-lg flex items-center justify-center mb-4">
                <IconComponent className="w-6 h-6 text-[#D4A836]" />
              </div>
              <h3 className="text-lg font-semibold text-[#E8DDB5] mb-2">{card.title}</h3>
              <p className="text-gray-400">{card.description}</p>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
};

// Main component
export default function CustomPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [page, setPage] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [branding, setBranding] = useState(null);

  useEffect(() => {
    fetchPage();
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

  const fetchPage = async () => {
    try {
      const res = await axios.get(`${API}/pages/custom/${slug}`);
      setPage(res.data);
    } catch (err) {
      setError(err.response?.status === 404 ? 'Page not found' : 'Failed to load page');
    } finally {
      setLoading(false);
    }
  };

  const renderBlock = (block) => {
    const components = {
      heading: HeadingBlock,
      text: TextBlock,
      button: ButtonBlock,
      image: ImageBlock,
      divider: DividerBlock,
      hero: HeroBlock,
      contact_form: ContactFormBlock,
      event_registration: EventRegistrationBlock,
      cards: CardsBlock
    };
    
    const Component = components[block.type];
    if (!Component) return null;
    
    return <Component key={block.block_id} content={block.content} />;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#0B0E14] flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-[#E8DDB5] mb-2">{error}</h1>
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

  return (
    <div className="min-h-screen bg-[#0B0E14] flex flex-col">
      {/* Public Navigation - same as landing page */}
      <PublicNav branding={branding} />

      {/* Content */}
      <main className="flex-1 max-w-5xl mx-auto px-4 py-8 w-full">
        {/* Page Title */}
        <h1 className="text-3xl md:text-4xl font-bold text-[#E8DDB5] mb-8 text-center">
          {page.title}
        </h1>
        
        {page.blocks && page.blocks.length > 0 ? (
          <div className="space-y-6">
            {page.blocks.sort((a, b) => a.order - b.order).map(renderBlock)}
          </div>
        ) : (
          <div className="text-center py-16 text-gray-400">
            <p>This page has no content yet.</p>
          </div>
        )}
      </main>

      {/* Public Footer */}
      <PublicFooter branding={branding} />
    </div>
  );
}
