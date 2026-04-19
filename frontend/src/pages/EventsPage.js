import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useAuth } from '../App';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, Upload, Download, Loader2, Image as ImageIcon, X, CalendarDays, List, Eye, Link, Search, ExternalLink, Sparkles, Repeat, TrendingUp, UserCheck, CalendarClock } from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';
import { Calendar as BigCalendar, dateFnsLocalizer } from 'react-big-calendar';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import 'react-big-calendar/lib/css/react-big-calendar.css';

// TipTap Editor imports
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TipTapImage from '@tiptap/extension-image';
import TipTapLink from '@tiptap/extension-link';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
const API = `${BACKEND_URL}/api`;

// Date-fns localizer for react-big-calendar
const locales = { 'en-US': require('date-fns/locale/en-US') };
const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek: () => startOfWeek(new Date(), { weekStartsOn: 0 }),
  getDay,
  locales,
});

// Visual Editor Toolbar Component
const EditorToolbar = ({ editor }) => {
  const addImage = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter image URL:');
    if (url) {
      editor.chain().focus().setImage({ src: url }).run();
    }
  }, [editor]);

  const addLink = useCallback(() => {
    if (!editor) return;
    const url = window.prompt('Enter URL:');
    if (url) {
      editor.chain().focus().setLink({ href: url }).run();
    }
  }, [editor]);

  if (!editor) return null;

  return (
    <div className="flex flex-wrap gap-1 p-2 border-b border-[#30363D] bg-[#0D1117]">
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bold') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleBold().run()}
        className="h-8 px-2"
      >
        <strong>B</strong>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('italic') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        className="h-8 px-2"
      >
        <em>I</em>
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('strike') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        className="h-8 px-2"
      >
        <s>S</s>
      </Button>
      <div className="w-px bg-[#30363D] mx-1" />
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('heading', { level: 1 }) ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        className="h-8 px-2"
      >
        H1
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('heading', { level: 2 }) ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className="h-8 px-2"
      >
        H2
      </Button>
      <div className="w-px bg-[#30363D] mx-1" />
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('bulletList') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        className="h-8 px-2"
      >
        • List
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('orderedList') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        className="h-8 px-2"
      >
        1. List
      </Button>
      <div className="w-px bg-[#30363D] mx-1" />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={addImage}
        className="h-8 px-2"
      >
        <ImageIcon className="w-4 h-4" />
      </Button>
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('link') ? 'default' : 'outline'}
        onClick={addLink}
        className="h-8 px-2"
      >
        <Link className="w-4 h-4" />
      </Button>
      <div className="w-px bg-[#30363D] mx-1" />
      <Button
        type="button"
        size="sm"
        variant={editor.isActive('blockquote') ? 'default' : 'outline'}
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        className="h-8 px-2"
      >
        Quote
      </Button>
    </div>
  );
};

// Visual Editor Component
const VisualEditor = ({ content, onChange }) => {
  const editor = useEditor({
    extensions: [
      StarterKit,
      TipTapImage,
      TipTapLink.configure({
        openOnClick: false,
      }),
    ],
    content: content || '<p></p>',
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
    editorProps: {
      attributes: {
        class: 'prose prose-invert max-w-none min-h-[200px] p-4 focus:outline-none',
      },
    },
  });

  return (
    <div className="border border-[#30363D] rounded-lg overflow-hidden bg-[#161B22]">
      <EditorToolbar editor={editor} />
      <EditorContent editor={editor} className="min-h-[200px]" />
    </div>
  );
};

// Event Form Component
const EventForm = React.forwardRef(({ initialData = {}, onPhotoUpload }, ref) => {
  const [title, setTitle] = useState(initialData.title || '');
  const [description, setDescription] = useState(initialData.description || '<p></p>');
  const [startDate, setStartDate] = useState(initialData.start_date ? initialData.start_date.slice(0, 16) : '');
  const [endDate, setEndDate] = useState(initialData.end_date ? initialData.end_date.slice(0, 16) : '');
  const [location, setLocation] = useState(initialData.location || '');
  const [locationUrl, setLocationUrl] = useState(initialData.location_url || '');
  const [isAllDay, setIsAllDay] = useState(initialData.is_all_day || false);
  const [requiresRsvp, setRequiresRsvp] = useState(initialData.requires_rsvp || false);
  const [maxAttendees, setMaxAttendees] = useState(initialData.max_attendees || '');
  const [reminderHours, setReminderHours] = useState(initialData.reminder_hours || 24);
  const [published, setPublished] = useState(initialData.published !== false);
  const [photoUrl, setPhotoUrl] = useState(initialData.photo_url || '');
  
  // Recurrence
  const [hasRecurrence, setHasRecurrence] = useState(!!initialData.recurrence);
  const [recurrenceFreq, setRecurrenceFreq] = useState(initialData.recurrence?.frequency || 'weekly');
  const [recurrenceInterval, setRecurrenceInterval] = useState(initialData.recurrence?.interval || 1);
  const [recurrenceEndDate, setRecurrenceEndDate] = useState(initialData.recurrence?.end_date || '');

  const fileInputRef = useRef(null);

  React.useImperativeHandle(ref, () => ({
    getData: () => ({
      title,
      description,
      start_date: startDate ? new Date(startDate).toISOString() : null,
      end_date: endDate ? new Date(endDate).toISOString() : null,
      location: location || null,
      location_url: locationUrl || null,
      is_all_day: isAllDay,
      requires_rsvp: requiresRsvp,
      max_attendees: maxAttendees ? parseInt(maxAttendees) : null,
      reminder_hours: reminderHours,
      published,
      photo_url: photoUrl,
      recurrence: hasRecurrence ? {
        frequency: recurrenceFreq,
        interval: recurrenceInterval,
        end_date: recurrenceEndDate || null,
      } : null,
    })
  }));

  const handlePhotoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPhotoUrl(e.target.result);
    reader.readAsDataURL(file);
    
    // Call upload callback if provided
    if (onPhotoUpload) {
      onPhotoUpload(file);
    }
  };

  return (
    <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto">
      {/* Title */}
      <div className="space-y-2">
        <Label>Event Title *</Label>
        <Input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="e.g., Security Training Workshop"
          className="bg-[#0D1117] border-[#30363D]"
        />
      </div>

      {/* Photo */}
      <div className="space-y-2">
        <Label>Event Photo (Optional)</Label>
        <div className="flex items-center gap-4">
          {photoUrl ? (
            <div className="relative">
              <img src={photoUrl} alt="Event" className="w-32 h-20 object-cover rounded-lg" />
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="absolute -top-2 -right-2 h-6 w-6 p-0 rounded-full"
                onClick={() => setPhotoUrl('')}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div 
              className="w-32 h-20 border-2 border-dashed border-[#30363D] rounded-lg flex items-center justify-center cursor-pointer hover:border-[#D4A836] transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <ImageIcon className="w-8 h-8 text-gray-500" />
            </div>
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handlePhotoSelect}
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => fileInputRef.current?.click()}
            className="border-[#30363D]"
          >
            <Upload className="w-4 h-4 mr-2" />
            Upload Photo
          </Button>
        </div>
      </div>

      {/* Description with Visual Editor */}
      <div className="space-y-2">
        <Label>Description</Label>
        <VisualEditor content={description} onChange={setDescription} />
      </div>

      {/* Date & Time */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Start Date & Time *</Label>
          <Input
            type="datetime-local"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-[#0D1117] border-[#30363D]"
          />
        </div>
        <div className="space-y-2">
          <Label>End Date & Time</Label>
          <Input
            type="datetime-local"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-[#0D1117] border-[#30363D]"
          />
        </div>
      </div>

      <div className="flex items-center gap-4">
        <Switch checked={isAllDay} onCheckedChange={setIsAllDay} />
        <Label>All-day event</Label>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Location</Label>
          <Input
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="e.g., Conference Room A"
            className="bg-[#0D1117] border-[#30363D]"
          />
        </div>
        <div className="space-y-2">
          <Label>Location URL (Maps link)</Label>
          <Input
            value={locationUrl}
            onChange={(e) => setLocationUrl(e.target.value)}
            placeholder="https://maps.google.com/..."
            className="bg-[#0D1117] border-[#30363D]"
          />
        </div>
      </div>

      {/* Recurrence */}
      <div className="space-y-4 p-4 bg-[#0D1117] rounded-lg border border-[#30363D]">
        <div className="flex items-center gap-4">
          <Switch checked={hasRecurrence} onCheckedChange={setHasRecurrence} />
          <Label>Recurring Event</Label>
        </div>
        
        {hasRecurrence && (
          <div className="grid grid-cols-3 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Frequency</Label>
              <Select value={recurrenceFreq} onValueChange={setRecurrenceFreq}>
                <SelectTrigger className="bg-[#161B22] border-[#30363D]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="yearly">Yearly</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Every X {recurrenceFreq.replace('ly', 's')}</Label>
              <Input
                type="number"
                min="1"
                value={recurrenceInterval}
                onChange={(e) => setRecurrenceInterval(parseInt(e.target.value) || 1)}
                className="bg-[#161B22] border-[#30363D]"
              />
            </div>
            <div className="space-y-2">
              <Label>Until (optional)</Label>
              <Input
                type="date"
                value={recurrenceEndDate}
                onChange={(e) => setRecurrenceEndDate(e.target.value)}
                className="bg-[#161B22] border-[#30363D]"
              />
            </div>
          </div>
        )}
      </div>

      {/* RSVP Settings */}
      <div className="space-y-4 p-4 bg-[#0D1117] rounded-lg border border-[#30363D]">
        <div className="flex items-center gap-4">
          <Switch checked={requiresRsvp} onCheckedChange={setRequiresRsvp} />
          <Label>Require RSVP / Registration</Label>
        </div>
        
        {requiresRsvp && (
          <div className="grid grid-cols-2 gap-4 pt-2">
            <div className="space-y-2">
              <Label>Max Attendees (optional)</Label>
              <Input
                type="number"
                min="1"
                value={maxAttendees}
                onChange={(e) => setMaxAttendees(e.target.value)}
                placeholder="Unlimited"
                className="bg-[#161B22] border-[#30363D]"
              />
            </div>
            <div className="space-y-2">
              <Label>Reminder (hours before)</Label>
              <Select value={String(reminderHours)} onValueChange={(v) => setReminderHours(parseInt(v))}>
                <SelectTrigger className="bg-[#161B22] border-[#30363D]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-[#161B22] border-[#30363D]">
                  <SelectItem value="1">1 hour</SelectItem>
                  <SelectItem value="2">2 hours</SelectItem>
                  <SelectItem value="24">24 hours</SelectItem>
                  <SelectItem value="48">48 hours</SelectItem>
                  <SelectItem value="168">1 week</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        )}
      </div>

      {/* Published */}
      <div className="flex items-center justify-between p-4 bg-[#0D1117] rounded-lg border border-[#30363D]">
        <div>
          <Label>Published</Label>
          <p className="text-xs text-gray-500">Make this event visible to users</p>
        </div>
        <Switch checked={published} onCheckedChange={setPublished} />
      </div>
    </div>
  );
});

export default function EventsPage() {
  const { token, user } = useAuth();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('list'); // 'calendar' or 'list'
  const [timeFilter, setTimeFilter] = useState('upcoming'); // all | upcoming | this_week | this_month | past
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editingEvent, setEditingEvent] = useState(null);
  const [showRsvps, setShowRsvps] = useState(false);
  const [selectedEventRsvps, setSelectedEventRsvps] = useState(null);
  const [saving, setSaving] = useState(false);
  const [importing, setImporting] = useState(false);
  
  const createFormRef = useRef(null);
  const editFormRef = useRef(null);
  const fileInputRef = useRef(null);

  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const res = await axios.get(`${API}/events`, { headers });
      setEvents(res.data.events || []);
    } catch (err) {
      console.error('Failed to fetch events:', err);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const createEvent = async () => {
    const formData = createFormRef.current?.getData();
    if (!formData?.title || !formData?.start_date) {
      toast.error('Please enter event title and start date');
      return;
    }
    
    setSaving(true);
    try {
      await axios.post(`${API}/events`, formData, { headers });
      toast.success('Event created successfully');
      setShowCreate(false);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to create event');
    } finally {
      setSaving(false);
    }
  };

  const updateEvent = async () => {
    const formData = editFormRef.current?.getData();
    if (!formData?.title) {
      toast.error('Please enter event title');
      return;
    }
    
    setSaving(true);
    try {
      await axios.patch(`${API}/events/${editingEvent.event_id}`, formData, { headers });
      toast.success('Event updated successfully');
      setShowEdit(false);
      setEditingEvent(null);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to update event');
    } finally {
      setSaving(false);
    }
  };

  const deleteEvent = async (eventId) => {
    if (!window.confirm('Are you sure you want to delete this event?')) return;
    
    try {
      await axios.delete(`${API}/events/${eventId}`, { headers });
      toast.success('Event deleted');
      fetchEvents();
    } catch (err) {
      toast.error('Failed to delete event');
    }
  };

  const viewRsvps = async (event) => {
    try {
      const res = await axios.get(`${API}/events/${event.event_id}/rsvps`, { headers });
      setSelectedEventRsvps({ ...event, rsvps: res.data.rsvps });
      setShowRsvps(true);
    } catch (err) {
      toast.error('Failed to load RSVPs');
    }
  };

  const exportIcs = async (eventId = null) => {
    try {
      const url = eventId 
        ? `${API}/events/${eventId}/ics`
        : `${API}/events/export/all`;
      
      const res = await axios.get(url, { headers, responseType: 'blob' });
      
      const blob = new Blob([res.data], { type: 'text/calendar' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = eventId ? 'event.ics' : 'all_events.ics';
      link.click();
      
      toast.success('ICS file downloaded');
    } catch (err) {
      toast.error('Failed to export ICS');
    }
  };

  const importIcs = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setImporting(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await axios.post(`${API}/events/import/ics`, formData, { 
        headers: { ...headers, 'Content-Type': 'multipart/form-data' } 
      });
      toast.success(res.data.message);
      fetchEvents();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to import ICS');
    } finally {
      setImporting(false);
      e.target.value = '';
    }
  };

  // Transform events for calendar
  const calendarEvents = events.map(event => ({
    ...event,
    title: event.title,
    start: new Date(event.start_date),
    end: event.end_date ? new Date(event.end_date) : new Date(event.start_date),
    allDay: event.is_all_day,
  }));

  const handleCalendarSelect = (event) => {
    setEditingEvent(event);
    setShowEdit(true);
  };

  // ---- Stats & filtering --------------------------------------------
  const stats = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    let upcoming = 0;
    let thisWeek = 0;
    let thisMonth = 0;
    let totalRsvps = 0;
    let recurring = 0;

    events.forEach((ev) => {
      const d = new Date(ev.start_date);
      if (d >= now) upcoming += 1;
      if (d >= now && d <= weekEnd) thisWeek += 1;
      if (d >= now && d <= monthEnd) thisMonth += 1;
      totalRsvps += (ev.rsvps?.length) || 0;
      if (ev.recurrence) recurring += 1;
    });

    return { total: events.length, upcoming, thisWeek, thisMonth, totalRsvps, recurring };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const now = new Date();
    const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, now.getDate());

    let list = events.slice();
    // time filter
    list = list.filter((ev) => {
      const d = new Date(ev.start_date);
      switch (timeFilter) {
        case 'upcoming':   return d >= now;
        case 'this_week':  return d >= now && d <= weekEnd;
        case 'this_month': return d >= now && d <= monthEnd;
        case 'past':       return d < now;
        default:           return true;
      }
    });
    // search filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter((ev) =>
        (ev.title || '').toLowerCase().includes(q) ||
        (ev.location || '').toLowerCase().includes(q) ||
        (ev.description || '').toLowerCase().includes(q)
      );
    }
    // sort by start date ascending (upcoming/all/this_*), descending for past
    list.sort((a, b) => {
      const ta = new Date(a.start_date).getTime();
      const tb = new Date(b.start_date).getTime();
      return timeFilter === 'past' ? tb - ta : ta - tb;
    });
    return list;
  }, [events, timeFilter, searchQuery]);

  // ---- Helpers -------------------------------------------------------
  const monthShort = (d) => d.toLocaleString('en-US', { month: 'short' }).toUpperCase();
  const formatTime = (d) => d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const relativeDay = (d) => {
    const now = new Date();
    const msPerDay = 86400000;
    const start = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const target = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
    const diff = Math.round((target - start) / msPerDay);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff === -1) return 'Yesterday';
    if (diff > 1 && diff < 7) return `In ${diff} days`;
    if (diff < 0 && diff > -7) return `${-diff} days ago`;
    return d.toLocaleDateString();
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="p-4 lg:p-6 space-y-6">
        {/* ===== Hero banner ===== */}
        <div className="relative overflow-hidden rounded-2xl border border-[#D4A836]/25 bg-gradient-to-br from-[#1a1a24] via-[#0f0f15] to-[#0a0a10] p-6 lg:p-8">
          <div className="absolute -top-20 -right-20 w-72 h-72 rounded-full bg-[#D4A836]/10 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -left-16 w-64 h-64 rounded-full bg-purple-500/10 blur-3xl pointer-events-none" />
          <div className="relative flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#D4A836]/10 border border-[#D4A836]/30 rounded-full text-[11px] text-[#D4A836] uppercase tracking-wider font-medium">
                <Sparkles className="w-3 h-3" />
                Events & Calendar
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold text-[#E8DDB5] mt-3 tracking-tight">
                Plan, schedule &amp; RSVP
              </h1>
              <p className="text-gray-400 mt-2 max-w-xl">
                Build your event calendar, collect RSVPs, send reminders and sync to external calendars via iCal.
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={() => exportIcs()}
                className="border-[#30363D] hover:border-[#D4A836]/40"
              >
                <Download className="w-4 h-4 mr-2" />
                Export ICS
              </Button>
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                disabled={importing}
                className="border-[#30363D] hover:border-[#D4A836]/40"
              >
                {importing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                Import ICS
              </Button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".ics"
                className="hidden"
                onChange={importIcs}
              />
              <Button
                onClick={() => setShowCreate(true)}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black font-semibold shadow-lg shadow-[#D4A836]/20"
              >
                <Plus className="w-4 h-4 mr-2" />
                Create Event
              </Button>
            </div>
          </div>
        </div>

        {/* ===== Stat cards ===== */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="p-4 rounded-xl border border-[#30363D] bg-[#0f0f15] hover:border-[#D4A836]/30 transition-all">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-gray-400">
              <CalendarDays className="w-3.5 h-3.5" /> Total
            </div>
            <div className="text-2xl font-bold text-[#E8DDB5] mt-1">{stats.total}</div>
          </div>
          <div className="p-4 rounded-xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-transparent">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-emerald-300">
              <TrendingUp className="w-3.5 h-3.5" /> Upcoming
            </div>
            <div className="text-2xl font-bold text-[#E8DDB5] mt-1">{stats.upcoming}</div>
          </div>
          <div className="p-4 rounded-xl border border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-transparent">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-blue-300">
              <CalendarClock className="w-3.5 h-3.5" /> This Week
            </div>
            <div className="text-2xl font-bold text-[#E8DDB5] mt-1">{stats.thisWeek}</div>
          </div>
          <div className="p-4 rounded-xl border border-purple-500/20 bg-gradient-to-br from-purple-500/5 to-transparent">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-purple-300">
              <UserCheck className="w-3.5 h-3.5" /> Total RSVPs
            </div>
            <div className="text-2xl font-bold text-[#E8DDB5] mt-1">{stats.totalRsvps}</div>
          </div>
          <div className="p-4 rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 to-transparent col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-amber-300">
              <Repeat className="w-3.5 h-3.5" /> Recurring
            </div>
            <div className="text-2xl font-bold text-[#E8DDB5] mt-1">{stats.recurring}</div>
          </div>
        </div>

        {/* ===== Toolbar: view switcher + time filters + search ===== */}
        <div className="flex flex-col lg:flex-row lg:items-center gap-3">
          {/* Segmented view switcher */}
          <div className="inline-flex bg-[#1a1a24] border border-[#30363D] rounded-lg p-1">
            <button
              onClick={() => setViewMode('list')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'list' ? 'bg-[#D4A836] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <List className="w-4 h-4" /> List
            </button>
            <button
              onClick={() => setViewMode('calendar')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition ${
                viewMode === 'calendar' ? 'bg-[#D4A836] text-black' : 'text-gray-400 hover:text-white'
              }`}
            >
              <CalendarDays className="w-4 h-4" /> Calendar
            </button>
          </div>

          {/* Time filter chips */}
          {viewMode === 'list' && (
            <div className="flex items-center gap-2 flex-wrap">
              {[
                { id: 'upcoming', label: 'Upcoming' },
                { id: 'this_week', label: 'This Week' },
                { id: 'this_month', label: 'This Month' },
                { id: 'past', label: 'Past' },
                { id: 'all', label: 'All' },
              ].map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTimeFilter(f.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    timeFilter === f.id
                      ? 'bg-[#D4A836] text-black border-[#D4A836]'
                      : 'bg-[#1a1a24] text-gray-300 border-[#30363D] hover:border-[#D4A836]/40'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Search */}
          {viewMode === 'list' && (
            <div className="relative flex-1 max-w-sm lg:ml-auto">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search events…"
                className="bg-[#1a1a24] border-[#30363D] text-white pl-9 pr-9"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          )}
        </div>

        {/* ===== Main view ===== */}
        {viewMode === 'calendar' ? (
          <Card className="bg-[#0f0f15] border-[#30363D]">
            <CardContent className="p-4">
              <div className="h-[640px] calendar-dark">
                <BigCalendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  onSelectEvent={handleCalendarSelect}
                  style={{ height: '100%' }}
                  views={['month', 'week', 'day', 'agenda']}
                  eventPropGetter={() => ({
                    style: {
                      backgroundColor: '#D4A836',
                      color: '#000',
                      borderRadius: '6px',
                      border: 'none',
                      padding: '2px 6px',
                      fontWeight: 500,
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div>
            {filteredEvents.length === 0 ? (
              <Card className="bg-[#0f0f15] border-[#D4A836]/20">
                <CardContent className="py-16 text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-[#D4A836]/10 flex items-center justify-center">
                    <CalendarDays className="w-10 h-10 text-[#D4A836]" />
                  </div>
                  <h3 className="text-xl font-semibold text-[#E8DDB5] mb-2">
                    {searchQuery ? 'No matches' : events.length === 0 ? 'No events yet' : `No ${timeFilter.replace('_', ' ')} events`}
                  </h3>
                  <p className="text-gray-400 mb-6 max-w-md mx-auto">
                    {searchQuery
                      ? 'Try a different search term or clear the filter.'
                      : events.length === 0
                        ? 'Create your first event to get started — add a description, set RSVP limits, and invite attendees.'
                        : 'Try switching the time filter above to see more events.'}
                  </p>
                  {!searchQuery && events.length === 0 && (
                    <Button onClick={() => setShowCreate(true)} className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                      <Plus className="w-4 h-4 mr-2" /> Create Event
                    </Button>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredEvents.map((event) => {
                  const start = new Date(event.start_date);
                  const rsvpCount = event.rsvps?.length || 0;
                  const isPast = start < new Date();
                  const rel = relativeDay(start);
                  const relClass = rel === 'Today'
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : rel === 'Tomorrow'
                      ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                      : isPast
                        ? 'bg-zinc-500/15 text-zinc-300 border-zinc-500/30'
                        : 'bg-[#D4A836]/15 text-[#D4A836] border-[#D4A836]/30';

                  return (
                    <Card
                      key={event.event_id}
                      className="group bg-[#0f0f15] border-[#30363D] hover:border-[#D4A836]/50 transition-all overflow-hidden flex flex-col"
                    >
                      {/* Photo / gradient cover */}
                      <div className="relative h-32 overflow-hidden">
                        {event.photo_url ? (
                          <>
                            <img src={event.photo_url} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                            <div className="absolute inset-0 bg-gradient-to-t from-[#0f0f15] via-[#0f0f15]/40 to-transparent" />
                          </>
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-[#D4A836]/25 via-[#1a1a24] to-purple-500/15" />
                        )}

                        {/* Date pill */}
                        <div className="absolute top-3 left-3 bg-[#0f0f15]/95 backdrop-blur border border-[#D4A836]/30 rounded-lg px-3 py-1.5 text-center min-w-[52px]">
                          <div className="text-[10px] font-bold text-[#D4A836] uppercase tracking-wider">{monthShort(start)}</div>
                          <div className="text-lg font-bold text-[#E8DDB5] leading-none">{start.getDate()}</div>
                        </div>

                        {/* Top-right badges */}
                        <div className="absolute top-3 right-3 flex gap-1">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium border ${relClass}`}>
                            {rel}
                          </span>
                          {event.recurrence && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              <Repeat className="w-2.5 h-2.5" />
                            </span>
                          )}
                        </div>
                      </div>

                      <CardContent className="p-4 flex-1 flex flex-col">
                        <h3 className="text-[#E8DDB5] font-semibold leading-snug line-clamp-2 text-base">
                          {event.title}
                        </h3>

                        <div className="flex items-center gap-3 mt-2 text-xs text-gray-400 flex-wrap">
                          {!event.is_all_day && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {formatTime(start)}
                              {event.end_date && ` – ${formatTime(new Date(event.end_date))}`}
                            </span>
                          )}
                          {event.is_all_day && (
                            <span className="inline-flex items-center gap-1">
                              <CalendarDays className="w-3 h-3" /> All day
                            </span>
                          )}
                          {event.location && (
                            <span className="inline-flex items-center gap-1 truncate">
                              <MapPin className="w-3 h-3 flex-shrink-0" />
                              <span className="truncate">{event.location}</span>
                              {event.location_url && (
                                <a
                                  href={event.location_url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#D4A836] hover:text-[#C49A30]"
                                  onClick={(e) => e.stopPropagation()}
                                  title="Open map"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              )}
                            </span>
                          )}
                        </div>

                        {/* Attendance progress */}
                        {event.requires_rsvp && (
                          <div className="mt-3">
                            <div className="flex items-center justify-between text-xs mb-1">
                              <span className="text-gray-400">
                                <Users className="w-3 h-3 inline mr-1" />
                                {rsvpCount} RSVP{rsvpCount !== 1 ? 's' : ''}
                                {event.max_attendees ? ` / ${event.max_attendees}` : ''}
                              </span>
                              {event.max_attendees && (
                                <span className={rsvpCount >= event.max_attendees ? 'text-red-400 font-medium' : 'text-gray-500'}>
                                  {Math.round((rsvpCount / event.max_attendees) * 100)}%
                                </span>
                              )}
                            </div>
                            {event.max_attendees && (
                              <div className="h-1.5 w-full bg-[#1a1a24] rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full transition-all ${
                                    rsvpCount >= event.max_attendees
                                      ? 'bg-red-500'
                                      : rsvpCount / event.max_attendees > 0.75
                                        ? 'bg-amber-500'
                                        : 'bg-emerald-500'
                                  }`}
                                  style={{ width: `${Math.min(100, (rsvpCount / event.max_attendees) * 100)}%` }}
                                />
                              </div>
                            )}
                          </div>
                        )}

                        {/* Unpublished badge */}
                        {event.published === false && (
                          <span className="inline-flex items-center mt-2 text-[10px] font-medium px-2 py-0.5 rounded-full bg-zinc-500/20 text-zinc-300 border border-zinc-500/30 self-start">
                            Unpublished
                          </span>
                        )}

                        {/* Action buttons */}
                        <div className="flex items-center gap-1 mt-auto pt-3 border-t border-[#30363D]/60">
                          {event.requires_rsvp && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => viewRsvps(event)}
                              className="border-[#30363D] text-xs h-8"
                            >
                              <Users className="w-3.5 h-3.5 mr-1" /> {rsvpCount}
                            </Button>
                          )}
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => exportIcs(event.event_id)}
                            className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0"
                            title="Download ICS"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setEditingEvent(event); setShowEdit(true); }}
                            className="text-gray-400 hover:text-[#D4A836] h-8 w-8 p-0"
                            title="Edit"
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => deleteEvent(event.event_id)}
                            className="text-red-400 hover:bg-red-500/10 h-8 w-8 p-0 ml-auto"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Create Dialog */}
        <Dialog open={showCreate} onOpenChange={setShowCreate}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[700px] max-h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Plus className="w-5 h-5 text-[#D4A836]" />
                Create New Event
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Add a new event with visual content editor
              </DialogDescription>
            </DialogHeader>
            
            {showCreate && <EventForm ref={createFormRef} />}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowCreate(false)} className="border-[#30363D]">
                Cancel
              </Button>
              <Button onClick={createEvent} className="bg-[#D4A836] hover:bg-[#B8922E] text-black" disabled={saving}>
                {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Plus className="w-4 h-4 mr-2" />}
                Create Event
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={showEdit} onOpenChange={setShowEdit}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[700px] max-h-[90vh]" onOpenAutoFocus={(e) => e.preventDefault()}>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Edit className="w-5 h-5 text-[#D4A836]" />
                Edit Event
              </DialogTitle>
            </DialogHeader>
            
            {showEdit && editingEvent && (
              <EventForm ref={editFormRef} initialData={editingEvent} />
            )}
            
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowEdit(false)} className="border-[#30363D]">
                Cancel
              </Button>
              <Button onClick={updateEvent} className="bg-[#D4A836] hover:bg-[#B8922E] text-black" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                Save Changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* RSVPs Dialog */}
        <Dialog open={showRsvps} onOpenChange={setShowRsvps}>
          <DialogContent className="bg-[#161B22] border-[#30363D] sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#D4A836]" />
                RSVPs - {selectedEventRsvps?.title}
              </DialogTitle>
            </DialogHeader>
            
            <div className="max-h-[400px] overflow-y-auto space-y-2">
              {selectedEventRsvps?.rsvps?.length === 0 ? (
                <p className="text-gray-400 text-center py-4">No RSVPs yet</p>
              ) : (
                selectedEventRsvps?.rsvps?.map((rsvp, i) => (
                  <div key={i} className="flex items-center justify-between p-3 bg-[#0D1117] rounded-lg">
                    <div>
                      <p className="text-white font-medium">{rsvp.name}</p>
                      <p className="text-gray-400 text-sm">{rsvp.email}</p>
                    </div>
                    <span className="text-xs text-gray-500">
                      {new Date(rsvp.created_at).toLocaleDateString()}
                    </span>
                  </div>
                ))
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <style>{`
        .calendar-dark .rbc-calendar {
          background: #161B22;
          color: #E6EDF3;
        }
        .calendar-dark .rbc-toolbar button {
          color: #E6EDF3;
          border-color: #30363D;
        }
        .calendar-dark .rbc-toolbar button:hover {
          background-color: #30363D;
        }
        .calendar-dark .rbc-toolbar button.rbc-active {
          background-color: #D4A836;
          color: #000;
        }
        .calendar-dark .rbc-header {
          border-color: #30363D;
          color: #8B949E;
          padding: 8px;
        }
        .calendar-dark .rbc-month-view,
        .calendar-dark .rbc-time-view,
        .calendar-dark .rbc-agenda-view {
          border-color: #30363D;
        }
        .calendar-dark .rbc-day-bg {
          border-color: #30363D;
        }
        .calendar-dark .rbc-off-range-bg {
          background: #0D1117;
        }
        .calendar-dark .rbc-today {
          background-color: rgba(212, 168, 54, 0.1);
        }
        .calendar-dark .rbc-date-cell {
          color: #E6EDF3;
          padding: 4px 8px;
        }
        .calendar-dark .rbc-date-cell.rbc-off-range {
          color: #484F58;
        }
        .calendar-dark .rbc-time-content {
          border-color: #30363D;
        }
        .calendar-dark .rbc-timeslot-group {
          border-color: #30363D;
        }
        .calendar-dark .rbc-time-slot {
          border-color: #30363D;
        }
        .calendar-dark .rbc-agenda-table {
          border-color: #30363D;
        }
        .calendar-dark .rbc-agenda-date-cell,
        .calendar-dark .rbc-agenda-time-cell,
        .calendar-dark .rbc-agenda-event-cell {
          border-color: #30363D;
          color: #E6EDF3;
        }
      `}</style>
    </DashboardLayout>
  );
}
