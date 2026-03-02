import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../App';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '../components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Calendar, Clock, MapPin, Users, Plus, Edit, Trash2, Upload, Download, Loader2, Image as ImageIcon, X, CalendarDays, List, Eye, Link } from 'lucide-react';
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
  const [viewMode, setViewMode] = useState('calendar'); // 'calendar' or 'list'
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
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <CalendarDays className="w-6 h-6 text-[#D4A836]" />
              Events Management
            </h1>
            <p className="text-gray-400 text-sm mt-1">Create and manage events with calendar view, RSVP, and ICS support</p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setViewMode(viewMode === 'calendar' ? 'list' : 'calendar')}
              className="border-[#30363D]"
            >
              {viewMode === 'calendar' ? <List className="w-4 h-4 mr-2" /> : <CalendarDays className="w-4 h-4 mr-2" />}
              {viewMode === 'calendar' ? 'List View' : 'Calendar View'}
            </Button>
            <Button
              variant="outline"
              onClick={() => exportIcs()}
              className="border-[#30363D]"
            >
              <Download className="w-4 h-4 mr-2" />
              Export All
            </Button>
            <Button
              variant="outline"
              onClick={() => fileInputRef.current?.click()}
              disabled={importing}
              className="border-[#30363D]"
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
              className="bg-[#D4A836] hover:bg-[#B8922E] text-black"
            >
              <Plus className="w-4 h-4 mr-2" />
              Create Event
            </Button>
          </div>
        </div>

        {/* View */}
        {viewMode === 'calendar' ? (
          <Card className="bg-[#161B22] border-[#30363D]">
            <CardContent className="p-4">
              <div className="h-[600px] calendar-dark">
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
                      borderRadius: '4px',
                      border: 'none',
                    }
                  })}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {events.length === 0 ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardContent className="p-8 text-center">
                  <CalendarDays className="w-12 h-12 text-gray-500 mx-auto mb-4" />
                  <p className="text-gray-400">No events yet. Create your first event!</p>
                </CardContent>
              </Card>
            ) : (
              events.map(event => (
                <Card key={event.event_id} className="bg-[#161B22] border-[#30363D]">
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      {event.photo_url && (
                        <img src={event.photo_url} alt="" className="w-24 h-24 object-cover rounded-lg" />
                      )}
                      <div className="flex-1">
                        <div className="flex items-start justify-between">
                          <div>
                            <h3 className="text-lg font-semibold text-white">{event.title}</h3>
                            <div className="flex items-center gap-4 mt-1 text-sm text-gray-400">
                              <span className="flex items-center gap-1">
                                <Calendar className="w-4 h-4" />
                                {new Date(event.start_date).toLocaleDateString()}
                              </span>
                              {!event.is_all_day && (
                                <span className="flex items-center gap-1">
                                  <Clock className="w-4 h-4" />
                                  {new Date(event.start_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              )}
                              {event.location && (
                                <span className="flex items-center gap-1">
                                  <MapPin className="w-4 h-4" />
                                  {event.location}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {event.requires_rsvp && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => viewRsvps(event)}
                                className="border-[#30363D]"
                              >
                                <Users className="w-4 h-4 mr-1" />
                                {event.rsvps?.length || 0}
                              </Button>
                            )}
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => exportIcs(event.event_id)}
                              className="border-[#30363D]"
                            >
                              <Download className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setEditingEvent(event); setShowEdit(true); }}
                              className="border-[#30363D]"
                            >
                              <Edit className="w-4 h-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => deleteEvent(event.event_id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                        {event.recurrence && (
                          <span className="inline-flex items-center gap-1 mt-2 text-xs bg-[#D4A836]/20 text-[#D4A836] px-2 py-1 rounded">
                            Recurring: {event.recurrence.frequency}
                          </span>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))
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
