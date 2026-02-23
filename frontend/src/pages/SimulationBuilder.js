import React, { useState, useCallback, useRef, useEffect } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { useAuth } from '../App';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '../components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { 
  Plus, GripVertical, Trash2, Mail, Monitor, Phone, Shield, AlertTriangle,
  FileText, Image, Link, Type, MessageSquare, Users, Clock, Target,
  Save, Eye, Sparkles, Settings, Play, ChevronUp, ChevronDown,
  Layout, MousePointerClick, QrCode, Usb, Lock, Briefcase, Database, Cloud,
  Smartphone, Bell, KeyRound, FormInput, Square, Circle, Palette,
  Copy, Check, X, Loader2, Zap, FileWarning, CreditCard, Download
} from 'lucide-react';
import { toast } from 'sonner';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Simulation types available
const SIMULATION_TYPES = [
  { 
    id: 'phishing_email', 
    name: 'Phishing Email', 
    icon: Mail, 
    color: 'bg-blue-500',
    description: 'Classic email phishing tests'
  },
  { 
    id: 'credential_harvest', 
    name: 'Credential Harvest', 
    icon: KeyRound, 
    color: 'bg-red-500',
    description: 'Track password submission attempts'
  },
  { 
    id: 'qr_phishing', 
    name: 'QR Code Phishing', 
    icon: QrCode, 
    color: 'bg-orange-500',
    description: 'Fake QR codes that redirect'
  },
  { 
    id: 'mfa_fatigue', 
    name: 'MFA Fatigue', 
    icon: Bell, 
    color: 'bg-yellow-500',
    description: 'Repeated push notification attacks'
  },
  { 
    id: 'usb_drop', 
    name: 'USB Drop', 
    icon: Usb, 
    color: 'bg-purple-500',
    description: 'Physical security awareness'
  },
  { 
    id: 'smishing', 
    name: 'SMS Phishing', 
    icon: Smartphone, 
    color: 'bg-green-500',
    description: 'Text message based attacks'
  },
  { 
    id: 'bec', 
    name: 'Business Email Compromise', 
    icon: Briefcase, 
    color: 'bg-indigo-500',
    description: 'Executive impersonation'
  },
  { 
    id: 'malicious_ad', 
    name: 'Malicious Ad', 
    icon: Monitor, 
    color: 'bg-pink-500',
    description: 'Deceptive advertisement tests'
  },
];

// Pre-built templates
const PREBUILT_TEMPLATES = {
  mfa_fatigue: [
    {
      id: 'mfa_okta',
      name: 'Okta MFA Bombardment',
      description: 'Simulate repeated Okta push notifications',
      preview: 'okta-mfa',
      blocks: [
        { id: 'mfa_header', type: 'header', value: 'Okta Verify' },
        { id: 'mfa_notification', type: 'mfa_prompt', value: 'Sign In Attempt' },
        { id: 'body_text', type: 'textarea', value: 'A sign-in attempt requires your approval.\n\nLocation: New York, NY\nDevice: Chrome on Windows\nTime: Just now' },
        { id: 'mfa_buttons', type: 'mfa_buttons', value: 'approve' },
      ]
    },
    {
      id: 'mfa_microsoft',
      name: 'Microsoft 365 MFA Attack',
      description: 'Microsoft Authenticator push simulation',
      preview: 'ms-mfa',
      blocks: [
        { id: 'mfa_header', type: 'header', value: 'Microsoft' },
        { id: 'mfa_notification', type: 'mfa_prompt', value: 'Approve sign in?' },
        { id: 'body_text', type: 'textarea', value: 'john.doe@company.com is trying to sign in.\n\nNumber shown: 42' },
        { id: 'mfa_buttons', type: 'mfa_buttons', value: 'approve' },
      ]
    },
  ],
  usb_drop: [
    {
      id: 'usb_payroll',
      name: 'Payroll USB Drive',
      description: 'USB labeled with enticing payroll content',
      preview: 'usb-payroll',
      blocks: [
        { id: 'usb_label', type: 'usb_device', value: 'Payroll Q4 2024' },
        { id: 'file_list', type: 'file_list', value: 'Salary_Adjustments.xlsx\nBonus_Allocations.pdf\nEmployee_Reviews.docx' },
        { id: 'warning_text', type: 'text', value: 'CONFIDENTIAL - HR USE ONLY' },
      ]
    },
    {
      id: 'usb_photos',
      name: 'Personal Photos USB',
      description: 'USB appearing to contain personal photos',
      preview: 'usb-photos',
      blocks: [
        { id: 'usb_label', type: 'usb_device', value: 'Vacation Photos 2024' },
        { id: 'file_list', type: 'file_list', value: 'Beach_Day.jpg\nFamily_Reunion.png\nIMG_2847.jpg' },
      ]
    },
  ],
  qr_phishing: [
    {
      id: 'qr_parking',
      name: 'Parking Payment QR',
      description: 'Fake parking meter QR code',
      preview: 'qr-parking',
      blocks: [
        { id: 'qr_header', type: 'header', value: 'PAY HERE' },
        { id: 'qr_code', type: 'qr_code', value: 'https://fake-parking.com/pay' },
        { id: 'qr_instructions', type: 'text', value: 'Scan to pay for parking\nFast, contactless payment' },
        { id: 'qr_logo', type: 'image', value: 'parking-logo' },
      ]
    },
    {
      id: 'qr_policy',
      name: 'HR Policy Update QR',
      description: 'Office poster with policy update QR',
      preview: 'qr-policy',
      blocks: [
        { id: 'qr_header', type: 'header', value: 'IMPORTANT: New Policy Update' },
        { id: 'body_text', type: 'textarea', value: 'Effective January 1st, 2025\n\nAll employees must review and acknowledge the updated remote work policy.' },
        { id: 'qr_code', type: 'qr_code', value: 'https://company-policy.fake/update' },
        { id: 'qr_instructions', type: 'text', value: 'Scan to read and sign' },
      ]
    },
  ],
  credential_harvest: [
    {
      id: 'cred_microsoft',
      name: 'Microsoft Login Page',
      description: 'Fake Microsoft 365 login',
      preview: 'cred-microsoft',
      blocks: [
        { id: 'login_logo', type: 'image', value: 'microsoft-logo' },
        { id: 'login_header', type: 'header', value: 'Sign in' },
        { id: 'email_input', type: 'form_input', value: 'Email, phone, or Skype' },
        { id: 'password_input', type: 'form_input', value: 'Password' },
        { id: 'submit_button', type: 'submit_button', value: 'Sign in' },
        { id: 'forgot_link', type: 'link', value: 'Forgot password?' },
      ]
    },
    {
      id: 'cred_google',
      name: 'Google Sign In',
      description: 'Fake Google account login',
      preview: 'cred-google',
      blocks: [
        { id: 'login_logo', type: 'image', value: 'google-logo' },
        { id: 'login_header', type: 'header', value: 'Sign in' },
        { id: 'login_subtext', type: 'text', value: 'Use your Google Account' },
        { id: 'email_input', type: 'form_input', value: 'Email or phone' },
        { id: 'next_button', type: 'submit_button', value: 'Next' },
        { id: 'create_link', type: 'link', value: 'Create account' },
      ]
    },
    {
      id: 'cred_bank',
      name: 'Bank Portal Login',
      description: 'Generic banking login page',
      preview: 'cred-bank',
      blocks: [
        { id: 'login_header', type: 'header', value: 'Secure Banking Login' },
        { id: 'alert_message', type: 'urgency', value: 'Session expired. Please sign in again.' },
        { id: 'account_input', type: 'form_input', value: 'Account Number' },
        { id: 'password_input', type: 'form_input', value: 'Password' },
        { id: 'remember_checkbox', type: 'checkbox', value: 'Remember this device' },
        { id: 'submit_button', type: 'submit_button', value: 'Log In' },
      ]
    },
  ],
  phishing_email: [
    {
      id: 'email_password_reset',
      name: 'IT Password Reset',
      description: 'Urgent password reset request',
      preview: 'email-it',
      blocks: [
        { id: 'sender', type: 'sender', value: 'IT Support <it-support@company-secure.net>' },
        { id: 'subject', type: 'subject', value: 'Urgent: Password Reset Required' },
        { id: 'body_text', type: 'textarea', value: 'Dear {{USER_NAME}},\n\nOur security system has detected that your password has not been updated in 90 days. For security purposes, you must reset your password within 24 hours or your account will be temporarily locked.' },
        { id: 'call_to_action', type: 'button', value: 'Reset Password Now' },
        { id: 'signature', type: 'signature', value: 'Best regards,\nIT Support Team' },
      ]
    },
    {
      id: 'email_delivery',
      name: 'Package Delivery',
      description: 'Failed delivery notification',
      preview: 'email-delivery',
      blocks: [
        { id: 'sender', type: 'sender', value: 'Delivery Express <tracking@delivery-notify.com>' },
        { id: 'subject', type: 'subject', value: 'Delivery Attempt Failed - Action Required' },
        { id: 'urgency_message', type: 'urgency', value: 'We attempted to deliver your package but were unable to complete delivery.' },
        { id: 'body_text', type: 'textarea', value: 'Your package is being held at our distribution center.\n\nTracking #: PKG-2024-847291\nStatus: Delivery Attempted' },
        { id: 'call_to_action', type: 'button', value: 'Schedule Redelivery' },
        { id: 'deadline', type: 'deadline', value: 'Package will be returned to sender in 5 days' },
      ]
    },
  ],
};

// All available building blocks
const BUILDING_BLOCKS = [
  // Content blocks
  { id: 'header', type: 'header', name: 'Header/Title', icon: Type, placeholder: 'Enter title...', category: 'content' },
  { id: 'subject', type: 'subject', name: 'Email Subject', icon: Mail, placeholder: 'Email subject line...', category: 'content' },
  { id: 'sender', type: 'sender', name: 'Sender Info', icon: Users, placeholder: 'From: Name <email@domain.com>', category: 'content' },
  { id: 'body_text', type: 'textarea', name: 'Body Text', icon: FileText, placeholder: 'Main content...', category: 'content' },
  { id: 'signature', type: 'signature', name: 'Signature', icon: MessageSquare, placeholder: 'Best regards,\nName\nTitle', category: 'content' },
  
  // Form blocks
  { id: 'form_input', type: 'form_input', name: 'Input Field', icon: FormInput, placeholder: 'Field label (e.g., Email)', category: 'forms' },
  { id: 'password_input', type: 'password_input', name: 'Password Field', icon: KeyRound, placeholder: 'Password', category: 'forms' },
  { id: 'submit_button', type: 'submit_button', name: 'Submit Button', icon: MousePointerClick, placeholder: 'Button text...', category: 'forms' },
  { id: 'checkbox', type: 'checkbox', name: 'Checkbox', icon: Square, placeholder: 'Checkbox label...', category: 'forms' },
  
  // Tactics blocks
  { id: 'urgency', type: 'urgency', name: 'Urgency Message', icon: AlertTriangle, placeholder: 'ACTION REQUIRED!', category: 'tactics' },
  { id: 'deadline', type: 'deadline', name: 'Deadline/Timer', icon: Clock, placeholder: 'You have 24 hours...', category: 'tactics' },
  { id: 'threat', type: 'threat', name: 'Threat/Warning', icon: Shield, placeholder: 'Account will be suspended...', category: 'tactics' },
  { id: 'button', type: 'button', name: 'CTA Button', icon: MousePointerClick, placeholder: 'Click Here', category: 'tactics' },
  { id: 'link', type: 'link', name: 'Fake Link', icon: Link, placeholder: 'https://secure-login.com', category: 'tactics' },
  
  // Visual blocks
  { id: 'image', type: 'image', name: 'Image/Logo', icon: Image, placeholder: 'Image URL or name...', category: 'visual' },
  { id: 'qr_code', type: 'qr_code', name: 'QR Code', icon: QrCode, placeholder: 'URL for QR code...', category: 'visual' },
  { id: 'divider', type: 'divider', name: 'Divider Line', icon: Square, placeholder: '', category: 'visual' },
  
  // Special blocks
  { id: 'mfa_prompt', type: 'mfa_prompt', name: 'MFA Notification', icon: Bell, placeholder: 'Sign in attempt', category: 'special' },
  { id: 'mfa_buttons', type: 'mfa_buttons', name: 'MFA Approve/Deny', icon: Check, placeholder: 'approve', category: 'special' },
  { id: 'usb_device', type: 'usb_device', name: 'USB Label', icon: Usb, placeholder: 'USB drive label...', category: 'special' },
  { id: 'file_list', type: 'file_list', name: 'File List', icon: FileText, placeholder: 'file1.xlsx\nfile2.pdf', category: 'special' },
  { id: 'push_notification', type: 'push_notification', name: 'Push Notification', icon: Smartphone, placeholder: 'Notification text...', category: 'special' },
];

const BLOCK_CATEGORIES = {
  content: { name: 'Content', color: 'border-blue-500', icon: FileText },
  forms: { name: 'Form Elements', color: 'border-green-500', icon: FormInput },
  tactics: { name: 'Phishing Tactics', color: 'border-red-500', icon: AlertTriangle },
  visual: { name: 'Visual Elements', color: 'border-purple-500', icon: Image },
  special: { name: 'Special Elements', color: 'border-orange-500', icon: Zap },
};

export default function SimulationBuilder() {
  const { token } = useAuth();
  const [activeTab, setActiveTab] = useState('builder');
  const [simulationType, setSimulationType] = useState(null);
  const [simulationName, setSimulationName] = useState('');
  const [difficulty, setDifficulty] = useState('medium');
  const [selectedBlocks, setSelectedBlocks] = useState([]);
  const [blockValues, setBlockValues] = useState({});
  const [showPreview, setShowPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [draggedBlock, setDraggedBlock] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [savedSimulations, setSavedSimulations] = useState([]);
  const [loadingSimulations, setLoadingSimulations] = useState(false);
  const dropAreaRef = useRef(null);
  
  // Email header fields
  const [emailFrom, setEmailFrom] = useState('Security Team <security@company.com>');
  const [emailSubject, setEmailSubject] = useState('');
  
  // Launch campaign states
  const [showLaunchDialog, setShowLaunchDialog] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [campaignToLaunch, setCampaignToLaunch] = useState(null);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [trainingModules, setTrainingModules] = useState([]);
  const [assignedModuleId, setAssignedModuleId] = useState('');

  const headers = { Authorization: `Bearer ${token}` };

  // Fetch saved simulations and users
  useEffect(() => {
    fetchSavedSimulations();
    fetchUsers();
    fetchTrainingModules();
  }, []); // eslint-disable-line

  const fetchSavedSimulations = async () => {
    setLoadingSimulations(true);
    try {
      // Fetch phishing templates created via the builder
      const res = await axios.get(`${API}/phishing/templates`, { headers });
      setSavedSimulations(res.data || []);
    } catch (err) {
      console.error('Failed to fetch simulations:', err);
    } finally {
      setLoadingSimulations(false);
    }
  };
  
  const fetchUsers = async () => {
    setLoadingUsers(true);
    try {
      const res = await axios.get(`${API}/users`, { headers });
      // Filter to only trainee/user type users (not admins)
      const users = (res.data || []).filter(u => 
        u.role === 'trainee' || u.role === 'user' || u.role === 'org_admin'
      );
      setAvailableUsers(users);
    } catch (err) {
      console.error('Failed to fetch users:', err);
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchTrainingModules = async () => {
    try {
      const res = await axios.get(`${API}/training/modules`, { headers });
      setTrainingModules(res.data || []);
    } catch { /* ignore */ }
  };

  // Load template
  const loadTemplate = (template) => {
    setSelectedTemplate(template);
    const newBlocks = template.blocks.map((block, idx) => ({
      ...BUILDING_BLOCKS.find(b => b.id === block.id || b.type === block.type) || { id: block.id, type: block.type, name: block.id, icon: FileText, category: 'content' },
      instanceId: `${block.id}_${Date.now()}_${idx}`,
      value: block.value,
    }));
    setSelectedBlocks(newBlocks);
    
    const values = {};
    newBlocks.forEach(b => { values[b.instanceId] = b.value || ''; });
    setBlockValues(values);
    
    setSimulationName(template.name);
    toast.success(`Template "${template.name}" loaded!`);
  };

  // Handle drag start from palette
  const handleDragStart = (e, block) => {
    setDraggedBlock(block);
    e.dataTransfer.effectAllowed = 'copy';
    e.dataTransfer.setData('text/plain', JSON.stringify(block));
  };

  // Handle drag over
  const handleDragOver = (e, index = null) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
    setDragOverIndex(index !== null ? index : selectedBlocks.length);
  };

  // Handle drop
  const handleDrop = (e, index = null) => {
    e.preventDefault();
    const data = e.dataTransfer.getData('text/plain');
    
    if (data) {
      try {
        const block = JSON.parse(data);
        
        // Check if reordering existing block
        if (block.reorder && block.fromIndex !== undefined) {
          moveBlock(block.fromIndex, index !== null ? index : selectedBlocks.length);
        } else {
          // Find the original block definition to get the icon component
          // JSON.stringify loses the icon function, so we need to look it up
          const originalBlock = BUILDING_BLOCKS.find(b => b.id === block.id);
          const newBlock = {
            ...block,
            icon: originalBlock?.icon || FileText, // Restore icon from original
            instanceId: `${block.id}_${Date.now()}`
          };
          
          const insertIndex = index !== null ? index : selectedBlocks.length;
          const newBlocks = [...selectedBlocks];
          newBlocks.splice(insertIndex, 0, newBlock);
          setSelectedBlocks(newBlocks);
          
          setBlockValues(prev => ({
            ...prev,
            [newBlock.instanceId]: ''
          }));
          
          toast.success(`Added ${block.name}`);
        }
      } catch (err) {
        console.error('Drop error:', err);
      }
    }
    
    setDraggedBlock(null);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedBlock(null);
    setDragOverIndex(null);
  };

  // Move block
  const moveBlock = (fromIndex, toIndex) => {
    const newBlocks = [...selectedBlocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex > fromIndex ? toIndex - 1 : toIndex, 0, moved);
    setSelectedBlocks(newBlocks);
  };

  // Remove block
  const removeBlock = (instanceId) => {
    setSelectedBlocks(prev => prev.filter(b => b.instanceId !== instanceId));
    setBlockValues(prev => {
      const next = { ...prev };
      delete next[instanceId];
      return next;
    });
  };

  // Update block value
  const updateBlockValue = (instanceId, value) => {
    setBlockValues(prev => ({ ...prev, [instanceId]: value }));
  };

  // Save simulation
  const saveSimulation = async (andLaunch = false) => {
    if (!simulationType || !simulationName) {
      toast.error('Please select a simulation type and name');
      return null;
    }
    
    if (selectedBlocks.length === 0) {
      toast.error('Add at least one building block');
      return null;
    }

    setSaving(true);
    try {
      // Build email content from blocks
      const subject = emailSubject || simulationName;
      const senderInfo = emailFrom || 'Security Team <security@company.com>';
      
      // Build HTML body from blocks
      let bodyHtml = '';
      selectedBlocks.forEach(block => {
        const value = blockValues[block.instanceId] || '';
        switch (block.type) {
          case 'header':
            bodyHtml += `<h1 style="font-size: 24px; margin-bottom: 16px;">${value}</h1>`;
            break;
          case 'textarea':
            bodyHtml += `<p style="margin-bottom: 16px; white-space: pre-wrap;">${value.replace(/\n/g, '<br>')}</p>`;
            break;
          case 'signature':
            bodyHtml += `<div style="margin-top: 24px; padding-top: 16px; border-top: 1px solid #ddd;">${value.replace(/\n/g, '<br>')}</div>`;
            break;
          case 'urgency':
            bodyHtml += `<div style="background: #fee2e2; border-left: 4px solid #ef4444; padding: 12px; margin: 16px 0; color: #991b1b;">${value}</div>`;
            break;
          case 'deadline':
            bodyHtml += `<p style="color: #f97316; font-weight: 500; margin: 16px 0;">⏰ ${value}</p>`;
            break;
          case 'threat':
            bodyHtml += `<p style="color: #ef4444; margin: 16px 0;">⚠️ ${value}</p>`;
            break;
          case 'button':
            bodyHtml += `<div style="text-align: center; margin: 24px 0;"><a href="{{TRACKING_URL}}" style="display: inline-block; background: #2563eb; color: white; padding: 12px 32px; text-decoration: none; border-radius: 8px; font-weight: 500;">${value || 'Click Here'}</a></div>`;
            break;
          case 'link':
            bodyHtml += `<p><a href="{{TRACKING_URL}}" style="color: #2563eb;">${value}</a></p>`;
            break;
          case 'form_input':
          case 'password_input':
            bodyHtml += `<div style="margin: 12px 0;"><input type="${block.type === 'password_input' ? 'password' : 'text'}" placeholder="${value}" style="width: 100%; padding: 8px; border: 1px solid #ddd; border-radius: 4px;"></div>`;
            break;
          case 'submit_button':
            bodyHtml += `<div style="margin: 16px 0;"><a href="{{TRACKING_URL}}" style="display: block; text-align: center; background: #2563eb; color: white; padding: 10px; text-decoration: none; border-radius: 4px;">${value || 'Submit'}</a></div>`;
            break;
          case 'qr_code':
            bodyHtml += `<div style="text-align: center; margin: 24px 0;"><div style="display: inline-block; padding: 16px; background: #f3f4f6; border-radius: 8px;"><img src="https://api.qrserver.com/v1/create-qr-code/?size=150x150&data={{TRACKING_URL}}" alt="QR Code" style="width: 150px; height: 150px;"><p style="font-size: 12px; color: #6b7280; margin-top: 8px;">Scan to continue</p></div></div>`;
            break;
          case 'image':
            bodyHtml += `<div style="text-align: center; margin: 16px 0;"><img src="${value || 'https://via.placeholder.com/200'}" alt="Image" style="max-width: 200px; border-radius: 8px;"></div>`;
            break;
          case 'divider':
            bodyHtml += `<hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">`;
            break;
          case 'mfa_prompt':
            bodyHtml += `<div style="background: #eff6ff; border: 1px solid #bfdbfe; border-radius: 8px; padding: 16px; text-align: center; margin: 16px 0;"><p style="font-weight: 500;">${value || 'Sign-in Request'}</p></div>`;
            break;
          case 'mfa_buttons':
            bodyHtml += `<div style="display: flex; gap: 12px; margin: 16px 0;"><a href="{{TRACKING_URL}}" style="flex: 1; text-align: center; background: #22c55e; color: white; padding: 12px; text-decoration: none; border-radius: 8px;">Approve</a><a href="#" style="flex: 1; text-align: center; background: #ef4444; color: white; padding: 12px; text-decoration: none; border-radius: 8px;">Deny</a></div>`;
            break;
          case 'usb_device':
            bodyHtml += `<div style="background: #1f2937; color: white; padding: 16px; border-radius: 8px; margin: 16px 0;"><strong>📁 ${value || 'USB Drive'}</strong><br><small style="color: #9ca3af;">Removable Disk</small></div>`;
            break;
          case 'file_list':
            const files = (value || 'file.txt').split('\n').map(f => `<div style="padding: 4px 0;"><span style="color: #2563eb;">📄</span> ${f}</div>`).join('');
            bodyHtml += `<div style="background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 4px; padding: 12px; margin: 16px 0;">${files}</div>`;
            break;
          default:
            if (value) bodyHtml += `<p>${value}</p>`;
        }
      });
      
      // Create phishing template first
      const templateData = {
        name: simulationName,
        subject: subject,
        sender_name: senderInfo.split('<')[0].trim() || 'Security Team',
        sender_email: senderInfo.match(/<(.+)>/)?.[1] || 'security@company.com',
        body_html: bodyHtml || '<p>{{TRACKING_URL}}</p>',
        body_text: selectedBlocks.map(b => blockValues[b.instanceId] || '').join('\n'),
        difficulty,
        scenario_type: simulationType.id
      };
      
      const templateRes = await axios.post(`${API}/phishing/templates`, templateData, { headers });
      const templateId = templateRes.data.template_id;
      
      toast.success('Simulation template created!');
      
      if (andLaunch) {
        // Open launch dialog
        setCampaignToLaunch({
          name: simulationName,
          template_id: templateId,
          type: simulationType
        });
        setShowLaunchDialog(true);
      } else {
        // Reset builder
        setSimulationType(null);
        setSimulationName('');
        setSelectedBlocks([]);
        setBlockValues({});
        setSelectedTemplate(null);
      }
      
      fetchSavedSimulations();
      return templateId;
    } catch (err) {
      console.error('Save error:', err);
      toast.error(err.response?.data?.detail || 'Failed to save simulation');
      return null;
    } finally {
      setSaving(false);
    }
  };
  
  // Launch campaign
  const launchCampaign = async () => {
    if (!campaignToLaunch) {
      toast.error('No campaign to launch');
      return;
    }
    
    if (selectedTargets.length === 0) {
      toast.error('Please select at least one target user');
      return;
    }
    
    setLaunching(true);
    try {
      // Get organization ID from first selected user
      const firstUser = availableUsers.find(u => selectedTargets.includes(u.user_id));
      const orgId = firstUser?.organization_id || 'org_default';
      
      // Create campaign
      const campaignData = {
        name: campaignToLaunch.name,
        organization_id: orgId,
        template_id: campaignToLaunch.template_id,
        target_user_ids: selectedTargets,
        assigned_module_id: assignedModuleId || null
      };
      
      const campaignRes = await axios.post(`${API}/phishing/campaigns`, campaignData, { headers });
      const campaignId = campaignRes.data.campaign_id;
      
      // Launch immediately
      const launchRes = await axios.post(`${API}/phishing/campaigns/${campaignId}/launch`, {}, { headers });
      
      toast.success(`Campaign launched! ${launchRes.data.emails_sent} emails sent to ${launchRes.data.total_targets} targets.`);
      
      // Reset everything
      setShowLaunchDialog(false);
      setCampaignToLaunch(null);
      setSelectedTargets([]);
      setAssignedModuleId('');
      setSimulationType(null);
      setSimulationName('');
      setSelectedBlocks([]);
      setBlockValues({});
      setSelectedTemplate(null);
      
    } catch (err) {
      console.error('Launch error:', err);
      toast.error(err.response?.data?.detail || 'Failed to launch campaign');
    } finally {
      setLaunching(false);
    }
  };
  
  // Toggle target selection
  const toggleTarget = (userId) => {
    setSelectedTargets(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };
  
  // Select all targets
  const selectAllTargets = () => {
    if (selectedTargets.length === availableUsers.length) {
      setSelectedTargets([]);
    } else {
      setSelectedTargets(availableUsers.map(u => u.user_id));
    }
  };
  
  // Launch saved simulation
  const launchSavedSimulation = async (simulation) => {
    // If this is already a phishing template (has template_id), launch directly
    if (simulation.template_id) {
      setCampaignToLaunch({
        name: simulation.name || simulation.title,
        template_id: simulation.template_id,
        type: SIMULATION_TYPES.find(t => t.id === simulation.scenario_type) || SIMULATION_TYPES[0]
      });
      setShowLaunchDialog(true);
      return;
    }
    
    // Otherwise it's a scenario - need to create/find template
    try {
      const templatesRes = await axios.get(`${API}/phishing/templates`, { headers });
      const existingTemplate = templatesRes.data.find(t => t.name === (simulation.title || simulation.name));
      
      if (existingTemplate) {
        setCampaignToLaunch({
          name: simulation.title || simulation.name,
          template_id: existingTemplate.template_id,
          type: SIMULATION_TYPES.find(t => t.id === simulation.scenario_type) || SIMULATION_TYPES[0]
        });
        setShowLaunchDialog(true);
      } else {
        // Need to create template from simulation content
        toast.info('Creating campaign template...');
        
        // Build content from simulation
        const content = simulation.content || {};
        let bodyHtml = '<p>This is a security awareness test.</p>';
        
        if (content.blocks) {
          bodyHtml = content.blocks.map(block => {
            switch (block.type) {
              case 'header': return `<h1>${block.value}</h1>`;
              case 'textarea': return `<p>${block.value?.replace(/\n/g, '<br>') || ''}</p>`;
              case 'button': return `<a href="{{TRACKING_URL}}" style="display:inline-block;background:#2563eb;color:white;padding:12px 24px;text-decoration:none;border-radius:4px;">${block.value || 'Click Here'}</a>`;
              case 'link': return `<a href="{{TRACKING_URL}}">${block.value}</a>`;
              case 'urgency': return `<div style="background:#fee2e2;padding:12px;color:#991b1b;">${block.value}</div>`;
              default: return block.value ? `<p>${block.value}</p>` : '';
            }
          }).join('\n');
        }
        
        const templateData = {
          name: simulation.title,
          subject: simulation.title,
          sender_name: 'Security Team',
          sender_email: 'security@company.com',
          body_html: bodyHtml,
          body_text: simulation.explanation || 'Security test',
          difficulty: simulation.difficulty || 'medium'
        };
        
        const templateRes = await axios.post(`${API}/phishing/templates`, templateData, { headers });
        
        setCampaignToLaunch({
          name: simulation.title,
          template_id: templateRes.data.template_id,
          type: SIMULATION_TYPES.find(t => t.id === simulation.scenario_type) || SIMULATION_TYPES[0]
        });
        setShowLaunchDialog(true);
      }
    } catch (err) {
      console.error('Error preparing launch:', err);
      toast.error('Failed to prepare campaign launch');
    }
  };

  // Render block input based on type
  const renderBlockInput = (block) => {
    const value = blockValues[block.instanceId] || '';
    
    switch (block.type) {
      case 'textarea':
      case 'signature':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateBlockValue(block.instanceId, e.target.value)}
            placeholder={block.placeholder}
            className="bg-[#0D1117] border-[#30363D] text-white min-h-[80px] resize-none"
          />
        );
      case 'file_list':
        return (
          <Textarea
            value={value}
            onChange={(e) => updateBlockValue(block.instanceId, e.target.value)}
            placeholder="file1.xlsx&#10;file2.pdf&#10;file3.docx"
            className="bg-[#0D1117] border-[#30363D] text-white min-h-[60px] resize-none font-mono text-sm"
          />
        );
      case 'mfa_buttons':
        return (
          <div className="flex gap-2">
            <Button 
              size="sm" 
              className={`flex-1 ${value === 'approve' ? 'bg-green-600' : 'bg-[#0D1117] border border-[#30363D]'}`}
              onClick={() => updateBlockValue(block.instanceId, 'approve')}
            >
              <Check className="w-4 h-4 mr-1" /> Approve
            </Button>
            <Button 
              size="sm" 
              className={`flex-1 ${value === 'deny' ? 'bg-red-600' : 'bg-[#0D1117] border border-[#30363D]'}`}
              onClick={() => updateBlockValue(block.instanceId, 'deny')}
            >
              <X className="w-4 h-4 mr-1" /> Deny
            </Button>
          </div>
        );
      case 'divider':
        return <div className="h-1 bg-[#30363D] rounded my-2" />;
      case 'button':
      case 'link':
      case 'submit_button':
        return (
          <div className="space-y-2">
            <Input
              value={value}
              onChange={(e) => updateBlockValue(block.instanceId, e.target.value)}
              placeholder={block.type === 'link' ? 'Link display text (e.g. Reset Password)' : block.placeholder}
              className="bg-[#0D1117] border-[#30363D] text-white"
            />
            <div className="flex items-center gap-2 bg-[#0D1117]/50 border border-[#30363D] rounded px-3 py-2">
              <Link className="w-4 h-4 text-[#D4A836] flex-shrink-0" />
              <span className="text-xs text-gray-400">Tracking link auto-inserted</span>
              <code className="text-xs text-[#D4A836] bg-[#0D1117] px-1.5 py-0.5 rounded ml-auto font-mono">{'{{TRACKING_URL}}'}</code>
            </div>
          </div>
        );
      default:
        return (
          <Input
            value={value}
            onChange={(e) => updateBlockValue(block.instanceId, e.target.value)}
            placeholder={block.placeholder}
            className="bg-[#0D1117] border-[#30363D] text-white"
          />
        );
    }
  };

  // Render block in canvas
  const renderBlock = (block, index) => {
    const Icon = block.icon || FileText;
    const categoryColor = BLOCK_CATEGORIES[block.category]?.color || 'border-gray-500';
    
    return (
      <div
        key={block.instanceId}
        className={`group relative bg-[#1a1a24] border-l-4 ${categoryColor} rounded-lg p-4 mb-3 transition-all ${
          dragOverIndex === index ? 'border-t-2 border-t-[#D4A836]' : ''
        }`}
        onDragOver={(e) => handleDragOver(e, index)}
        onDrop={(e) => handleDrop(e, index)}
        data-testid={`canvas-block-${block.id}`}
      >
        <div className="flex items-start gap-3">
          <div 
            className="cursor-move text-gray-500 hover:text-[#D4A836] mt-1"
            draggable
            onDragStart={(e) => {
              e.dataTransfer.setData('text/plain', JSON.stringify({ ...block, reorder: true, fromIndex: index }));
            }}
          >
            <GripVertical className="w-5 h-5" />
          </div>
          
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <Icon className="w-4 h-4 text-[#D4A836]" />
              <span className="text-sm font-medium text-[#E8DDB5]">{block.name}</span>
            </div>
            {renderBlockInput(block)}
          </div>
          
          <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => index > 0 && moveBlock(index, index - 1)}
              disabled={index === 0}
              className="h-6 w-6 p-0"
            >
              <ChevronUp className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => index < selectedBlocks.length - 1 && moveBlock(index, index + 1)}
              disabled={index === selectedBlocks.length - 1}
              className="h-6 w-6 p-0"
            >
              <ChevronDown className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => removeBlock(block.instanceId)}
              className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };

  // Render live preview
  const renderLivePreview = () => {
    const getPreviewStyle = () => {
      if (!simulationType) return {};
      switch (simulationType.id) {
        case 'mfa_fatigue':
          return { maxWidth: '380px', margin: '0 auto' };
        case 'credential_harvest':
          return { maxWidth: '450px', margin: '0 auto' };
        case 'qr_phishing':
          return { maxWidth: '400px', margin: '0 auto', textAlign: 'center' };
        case 'usb_drop':
          return { maxWidth: '300px', margin: '0 auto' };
        default:
          return { maxWidth: '600px', margin: '0 auto' };
      }
    };

    return (
      <div className="bg-white text-black p-6 rounded-lg" style={getPreviewStyle()}>
        {selectedBlocks.map((block) => {
          const value = blockValues[block.instanceId];
          
          switch (block.type) {
            case 'header':
              return <h1 key={block.instanceId} className="text-2xl font-bold mb-4 text-center">{value || 'Header'}</h1>;
            case 'subject':
              return <div key={block.instanceId} className="bg-gray-100 p-2 rounded mb-3 text-sm"><strong>Subject:</strong> {value}</div>;
            case 'sender':
              return <div key={block.instanceId} className="text-sm text-gray-600 mb-3">{value}</div>;
            case 'textarea':
              return <p key={block.instanceId} className="mb-4 whitespace-pre-wrap">{value}</p>;
            case 'signature':
              return <div key={block.instanceId} className="border-t pt-4 mt-4 text-sm text-gray-600 whitespace-pre-wrap">{value}</div>;
            case 'urgency':
              return <div key={block.instanceId} className="bg-red-100 border-l-4 border-red-500 text-red-800 p-3 rounded mb-4">{value}</div>;
            case 'deadline':
              return <p key={block.instanceId} className="text-orange-600 font-medium mb-4 flex items-center gap-2"><Clock className="w-4 h-4" /> {value}</p>;
            case 'threat':
              return <p key={block.instanceId} className="text-red-600 mb-4 flex items-center gap-2"><AlertTriangle className="w-4 h-4" /> {value}</p>;
            case 'button':
              return <button key={block.instanceId} className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium block mx-auto mb-4 hover:bg-blue-700">{value || 'Click Here'}</button>;
            case 'submit_button':
              return <button key={block.instanceId} className="w-full bg-blue-600 text-white px-4 py-2 rounded font-medium mb-3">{value || 'Submit'}</button>;
            case 'link':
              return <a key={block.instanceId} href="#" className="text-blue-600 underline block mb-4 text-sm">{value}</a>;
            case 'form_input':
              return (
                <div key={block.instanceId} className="mb-3">
                  <input 
                    type="text" 
                    placeholder={value || 'Input field'} 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              );
            case 'password_input':
              return (
                <div key={block.instanceId} className="mb-3">
                  <input 
                    type="password" 
                    placeholder={value || 'Password'} 
                    className="w-full border border-gray-300 rounded px-3 py-2 focus:outline-none focus:border-blue-500"
                  />
                </div>
              );
            case 'checkbox':
              return (
                <label key={block.instanceId} className="flex items-center gap-2 mb-3 text-sm">
                  <input type="checkbox" className="w-4 h-4" />
                  {value || 'Checkbox'}
                </label>
              );
            case 'qr_code':
              return (
                <div key={block.instanceId} className="mb-4 flex flex-col items-center">
                  <div className="w-48 h-48 bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center rounded">
                    <QrCode className="w-24 h-24 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-2">QR: {value || 'URL'}</p>
                </div>
              );
            case 'mfa_prompt':
              return (
                <div key={block.instanceId} className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-center">
                  <Bell className="w-8 h-8 text-blue-600 mx-auto mb-2" />
                  <p className="font-medium">{value || 'Sign-in Request'}</p>
                </div>
              );
            case 'mfa_buttons':
              return (
                <div key={block.instanceId} className="flex gap-3 mb-4">
                  <button className="flex-1 bg-green-500 text-white py-3 rounded-lg font-medium">Approve</button>
                  <button className="flex-1 bg-red-500 text-white py-3 rounded-lg font-medium">Deny</button>
                </div>
              );
            case 'usb_device':
              return (
                <div key={block.instanceId} className="bg-gray-800 text-white p-4 rounded-lg mb-4 flex items-center gap-3">
                  <Usb className="w-8 h-8" />
                  <div>
                    <p className="font-medium">{value || 'USB Drive'}</p>
                    <p className="text-xs text-gray-400">Removable Disk</p>
                  </div>
                </div>
              );
            case 'file_list':
              return (
                <div key={block.instanceId} className="bg-gray-50 border rounded p-3 mb-4">
                  {(value || 'file.txt').split('\n').map((file, i) => (
                    <div key={i} className="flex items-center gap-2 py-1 text-sm">
                      <FileText className="w-4 h-4 text-blue-600" />
                      {file}
                    </div>
                  ))}
                </div>
              );
            case 'image':
              return (
                <div key={block.instanceId} className="mb-4 text-center">
                  <div className="w-32 h-32 bg-gray-100 rounded flex items-center justify-center mx-auto">
                    <Image className="w-12 h-12 text-gray-400" />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">{value || 'Image'}</p>
                </div>
              );
            case 'divider':
              return <hr key={block.instanceId} className="my-4 border-gray-200" />;
            case 'push_notification':
              return (
                <div key={block.instanceId} className="bg-gray-100 rounded-xl p-3 mb-4 flex items-start gap-3 shadow">
                  <div className="w-10 h-10 bg-blue-500 rounded-lg flex items-center justify-center">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium text-sm">Notification</p>
                    <p className="text-xs text-gray-600">{value || 'Notification content'}</p>
                    <p className="text-xs text-gray-400 mt-1">now</p>
                  </div>
                </div>
              );
            default:
              return value ? <p key={block.instanceId} className="mb-4">{value}</p> : null;
          }
        })}
        {selectedBlocks.length === 0 && (
          <div className="text-center text-gray-400 py-8">
            <Eye className="w-12 h-12 mx-auto mb-3 opacity-30" />
            <p>Preview will appear here</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="simulation-builder">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Simulation Builder
            </h1>
            <p className="text-gray-400 mt-1">Create custom security simulations with drag-and-drop</p>
          </div>
          <div className="flex gap-3">
            {simulationType && (
              <>
                <Button
                  variant="outline"
                  onClick={() => setShowPreview(true)}
                  disabled={selectedBlocks.length === 0}
                  className="border-[#D4A836]/30 text-[#E8DDB5]"
                  data-testid="preview-simulation-btn"
                >
                  <Eye className="w-4 h-4 mr-2" />
                  Preview
                </Button>
                <Button
                  variant="outline"
                  onClick={() => saveSimulation(false)}
                  disabled={saving || !simulationName || selectedBlocks.length === 0}
                  className="border-[#30363D] text-[#E8DDB5]"
                  data-testid="save-simulation-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
                  Save
                </Button>
                <Button
                  onClick={() => saveSimulation(true)}
                  disabled={saving || !simulationName || selectedBlocks.length === 0}
                  className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                  data-testid="save-and-launch-btn"
                >
                  {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Play className="w-4 h-4 mr-2" />}
                  Save & Launch
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="bg-[#161B22] border border-[#30363D]">
            <TabsTrigger 
              value="builder" 
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836]"
              data-testid="builder-tab"
            >
              <Layout className="w-4 h-4 mr-2" />
              Builder
            </TabsTrigger>
            <TabsTrigger 
              value="templates"
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836]"
              data-testid="templates-tab"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Templates
            </TabsTrigger>
            <TabsTrigger 
              value="saved"
              className="data-[state=active]:bg-[#D4A836]/20 data-[state=active]:text-[#D4A836]"
              data-testid="saved-tab"
            >
              <FileText className="w-4 h-4 mr-2" />
              Saved ({savedSimulations.length})
            </TabsTrigger>
          </TabsList>

          {/* Builder Tab */}
          <TabsContent value="builder" className="space-y-6">
            {/* Step 1: Select Type */}
            {!simulationType ? (
              <Card className="bg-[#161B22] border-[#30363D]">
                <CardHeader>
                  <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
                    <Target className="w-5 h-5 text-[#D4A836]" />
                    Step 1: Choose Simulation Type
                  </CardTitle>
                  <CardDescription className="text-gray-400">
                    Select the type of security test you want to create
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {SIMULATION_TYPES.map((type) => {
                      const Icon = type.icon;
                      return (
                        <button
                          key={type.id}
                          onClick={() => setSimulationType(type)}
                          className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg hover:border-[#D4A836] transition-all text-left group"
                          data-testid={`sim-type-${type.id}`}
                        >
                          <div className={`w-10 h-10 ${type.color} rounded-lg flex items-center justify-center mb-3`}>
                            <Icon className="w-5 h-5 text-white" />
                          </div>
                          <h3 className="font-medium text-[#E8DDB5] group-hover:text-[#D4A836] text-sm">
                            {type.name}
                          </h3>
                          <p className="text-xs text-gray-500 mt-1">{type.description}</p>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <>
                {/* Selected Type Header */}
                <Card className="bg-[#161B22] border-[#30363D]">
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className={`w-12 h-12 ${simulationType.color} rounded-lg flex items-center justify-center`}>
                          {React.createElement(simulationType.icon, { className: "w-6 h-6 text-white" })}
                        </div>
                        <div className="flex items-center gap-3">
                          <Input
                            value={simulationName}
                            onChange={(e) => setSimulationName(e.target.value)}
                            placeholder="Enter simulation name..."
                            className="bg-[#0D1117] border-[#30363D] text-white w-72"
                            data-testid="simulation-name-input"
                          />
                          <Select value={difficulty} onValueChange={setDifficulty}>
                            <SelectTrigger className="w-28 bg-[#0D1117] border-[#30363D]" data-testid="difficulty-select">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="bg-[#161B22] border-[#30363D]">
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                          <Badge className="bg-[#D4A836]/20 text-[#D4A836]">{simulationType.name}</Badge>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        onClick={() => {
                          setSimulationType(null);
                          setSelectedBlocks([]);
                          setBlockValues({});
                          setSelectedTemplate(null);
                          setSimulationName('');
                        }}
                        className="text-gray-400"
                        data-testid="change-type-btn"
                      >
                        Change Type
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Email Header Fields */}
                <Card className="bg-[#161B22] border-[#30363D]">
                  <CardContent className="py-4 space-y-3">
                    <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">Email Headers</p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <div>
                        <Label className="text-gray-400 text-xs mb-1 block">From (Sender)</Label>
                        <Input
                          value={emailFrom}
                          onChange={(e) => setEmailFrom(e.target.value)}
                          placeholder="Security Team <security@company.com>"
                          className="bg-[#0D1117] border-[#30363D] text-white"
                          data-testid="email-from-input"
                        />
                      </div>
                      <div>
                        <Label className="text-gray-400 text-xs mb-1 block">Subject Line</Label>
                        <Input
                          value={emailSubject}
                          onChange={(e) => setEmailSubject(e.target.value)}
                          placeholder={simulationName || 'Email subject...'}
                          className="bg-[#0D1117] border-[#30363D] text-white"
                          data-testid="email-subject-input"
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Quick Templates for this type */}
                {PREBUILT_TEMPLATES[simulationType.id] && (
                  <Card className="bg-[#161B22] border-[#30363D]">
                    <CardHeader className="py-3">
                      <CardTitle className="text-sm text-[#E8DDB5] flex items-center gap-2">
                        <Sparkles className="w-4 h-4 text-[#D4A836]" />
                        Quick Start Templates
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="py-2">
                      <div className="flex gap-3 overflow-x-auto pb-2">
                        {PREBUILT_TEMPLATES[simulationType.id].map((template) => (
                          <button
                            key={template.id}
                            onClick={() => loadTemplate(template)}
                            className={`flex-shrink-0 p-3 bg-[#0D1117] border rounded-lg hover:border-[#D4A836] transition-all text-left min-w-[200px] ${
                              selectedTemplate?.id === template.id ? 'border-[#D4A836]' : 'border-[#30363D]'
                            }`}
                            data-testid={`template-${template.id}`}
                          >
                            <h4 className="font-medium text-[#E8DDB5] text-sm">{template.name}</h4>
                            <p className="text-xs text-gray-500 mt-1">{template.description}</p>
                          </button>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Builder Grid with Live Preview */}
                <div className="grid grid-cols-1 xl:grid-cols-5 gap-6">
                  {/* Block Palette */}
                  <div className="xl:col-span-1 space-y-4">
                    <Card className="bg-[#161B22] border-[#30363D]">
                      <CardHeader className="py-3">
                        <CardTitle className="text-sm text-[#E8DDB5]">Building Blocks</CardTitle>
                        <CardDescription className="text-xs text-gray-500">
                          Drag to canvas
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4 max-h-[60vh] overflow-y-auto">
                        {Object.entries(BLOCK_CATEGORIES).map(([categoryId, category]) => (
                          <div key={categoryId}>
                            <h4 className="text-xs text-gray-400 mb-2 uppercase tracking-wider flex items-center gap-1">
                              {React.createElement(category.icon, { className: "w-3 h-3" })}
                              {category.name}
                            </h4>
                            <div className="space-y-1">
                              {BUILDING_BLOCKS.filter(b => b.category === categoryId).map((block) => {
                                const Icon = block.icon;
                                return (
                                  <div
                                    key={block.id}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, block)}
                                    onDragEnd={handleDragEnd}
                                    className={`flex items-center gap-2 p-2 bg-[#0D1117] border border-[#30363D] rounded cursor-grab hover:border-[#D4A836] transition-all text-xs ${
                                      draggedBlock?.id === block.id ? 'opacity-50 scale-95' : ''
                                    }`}
                                    data-testid={`block-${block.id}`}
                                  >
                                    <Icon className="w-3 h-3 text-[#D4A836]" />
                                    <span className="text-gray-300">{block.name}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Canvas */}
                  <div className="xl:col-span-2">
                    <Card className="bg-[#161B22] border-[#30363D] min-h-[500px]">
                      <CardHeader className="py-3 border-b border-[#30363D]">
                        <CardTitle className="text-sm text-[#E8DDB5] flex items-center gap-2">
                          <Layout className="w-4 h-4 text-[#D4A836]" />
                          Canvas
                          {selectedBlocks.length > 0 && (
                            <Badge className="ml-2 bg-[#D4A836]/20 text-[#D4A836]">
                              {selectedBlocks.length} blocks
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div
                          ref={dropAreaRef}
                          onDragOver={(e) => handleDragOver(e)}
                          onDrop={(e) => handleDrop(e)}
                          className={`min-h-[400px] rounded-lg border-2 border-dashed transition-colors ${
                            draggedBlock 
                              ? 'border-[#D4A836] bg-[#D4A836]/5' 
                              : 'border-[#30363D]'
                          } ${selectedBlocks.length === 0 ? 'flex items-center justify-center' : 'p-4'}`}
                          data-testid="drop-canvas"
                        >
                          {selectedBlocks.length === 0 ? (
                            <div className="text-center text-gray-500">
                              <Sparkles className="w-12 h-12 mx-auto mb-3 text-[#D4A836]/30" />
                              <p className="font-medium">Drag blocks here</p>
                              <p className="text-sm">Or use a template above</p>
                            </div>
                          ) : (
                            <>
                              {selectedBlocks.map((block, index) => renderBlock(block, index))}
                              <div
                                onDragOver={(e) => handleDragOver(e, selectedBlocks.length)}
                                onDrop={(e) => handleDrop(e, selectedBlocks.length)}
                                className={`h-12 rounded border-2 border-dashed transition-colors ${
                                  dragOverIndex === selectedBlocks.length
                                    ? 'border-[#D4A836] bg-[#D4A836]/10'
                                    : 'border-transparent'
                                }`}
                              />
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Live Preview */}
                  <div className="xl:col-span-2">
                    <Card className="bg-[#161B22] border-[#30363D] min-h-[500px]">
                      <CardHeader className="py-3 border-b border-[#30363D]">
                        <CardTitle className="text-sm text-[#E8DDB5] flex items-center gap-2">
                          <Eye className="w-4 h-4 text-[#D4A836]" />
                          Live Preview
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="min-h-[400px] rounded-lg bg-gray-50 overflow-auto">
                          {renderLivePreview()}
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </>
            )}
          </TabsContent>

          {/* Templates Tab */}
          <TabsContent value="templates" className="space-y-6">
            <div className="grid gap-6">
              {Object.entries(PREBUILT_TEMPLATES).map(([typeId, templates]) => {
                const simType = SIMULATION_TYPES.find(t => t.id === typeId);
                if (!simType) return null;
                const Icon = simType.icon;
                
                return (
                  <Card key={typeId} className="bg-[#161B22] border-[#30363D]">
                    <CardHeader>
                      <CardTitle className="text-[#E8DDB5] flex items-center gap-3">
                        <div className={`w-10 h-10 ${simType.color} rounded-lg flex items-center justify-center`}>
                          <Icon className="w-5 h-5 text-white" />
                        </div>
                        {simType.name} Templates
                      </CardTitle>
                      <CardDescription className="text-gray-400">{simType.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {templates.map((template) => (
                          <div
                            key={template.id}
                            className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg hover:border-[#D4A836] transition-all"
                          >
                            <h4 className="font-medium text-[#E8DDB5]">{template.name}</h4>
                            <p className="text-sm text-gray-400 mt-1">{template.description}</p>
                            <p className="text-xs text-gray-500 mt-2">{template.blocks.length} blocks</p>
                            <Button
                              size="sm"
                              onClick={() => {
                                setSimulationType(simType);
                                loadTemplate(template);
                                setActiveTab('builder');
                              }}
                              className="mt-3 bg-[#D4A836] hover:bg-[#C49A30] text-black w-full"
                              data-testid={`use-template-${template.id}`}
                            >
                              <Copy className="w-4 h-4 mr-2" />
                              Use Template
                            </Button>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          {/* Saved Tab */}
          <TabsContent value="saved" className="space-y-6">
            <Card className="bg-[#161B22] border-[#30363D]">
              <CardHeader>
                <CardTitle className="text-[#E8DDB5]">Saved Simulations</CardTitle>
                <CardDescription className="text-gray-400">Your created simulations</CardDescription>
              </CardHeader>
              <CardContent>
                {loadingSimulations ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-8 h-8 animate-spin text-[#D4A836]" />
                  </div>
                ) : savedSimulations.length === 0 ? (
                  <div className="text-center py-12">
                    <FileText className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-[#E8DDB5] mb-2">No saved simulations</h3>
                    <p className="text-gray-400 mb-4">Create your first simulation using the builder</p>
                    <Button
                      onClick={() => setActiveTab('builder')}
                      className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
                    >
                      <Plus className="w-4 h-4 mr-2" />
                      Create Simulation
                    </Button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {savedSimulations.map((sim) => {
                      const simType = SIMULATION_TYPES.find(t => t.id === sim.scenario_type);
                      const Icon = simType?.icon || FileText;
                      return (
                        <div
                          key={sim.template_id || sim.scenario_id || sim._id}
                          className="p-4 bg-[#0D1117] border border-[#30363D] rounded-lg hover:border-[#D4A836]/50 transition-colors"
                        >
                          <div className="flex items-start gap-3">
                            <div className={`w-10 h-10 ${simType?.color || 'bg-gray-500'} rounded-lg flex items-center justify-center flex-shrink-0`}>
                              <Icon className="w-5 h-5 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-medium text-[#E8DDB5] truncate">{sim.name || sim.title}</h4>
                              <p className="text-sm text-gray-400">{simType?.name || sim.scenario_type}</p>
                              <div className="flex items-center gap-2 mt-2">
                                <Badge className={`text-xs ${
                                  sim.difficulty === 'easy' ? 'bg-green-500/20 text-green-400' :
                                  sim.difficulty === 'hard' ? 'bg-red-500/20 text-red-400' :
                                  'bg-yellow-500/20 text-yellow-400'
                                }`}>
                                  {sim.difficulty || 'medium'}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          <Button
                            size="sm"
                            onClick={() => launchSavedSimulation(sim)}
                            className="mt-3 bg-[#D4A836] hover:bg-[#C49A30] text-black w-full"
                            data-testid={`launch-sim-${sim.template_id || sim.scenario_id}`}
                          >
                            <Play className="w-4 h-4 mr-2" />
                            Launch Campaign
                          </Button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Full Preview Dialog */}
        <Dialog open={showPreview} onOpenChange={setShowPreview}>
          <DialogContent className="bg-[#161B22] border-[#30363D] max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Eye className="w-5 h-5 text-[#D4A836]" />
                {simulationName || 'Simulation'} Preview
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                This is how your simulation will appear to targets
              </DialogDescription>
            </DialogHeader>
            <div className="mt-4">
              {renderLivePreview()}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setShowPreview(false)} className="border-[#D4A836]/30 text-[#E8DDB5]">
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
        
        {/* Launch Campaign Dialog */}
        <Dialog open={showLaunchDialog} onOpenChange={(open) => {
          setShowLaunchDialog(open);
          if (!open) {
            setSelectedTargets([]);
            setCampaignToLaunch(null);
          }
        }}>
          <DialogContent className="bg-[#161B22] border-[#30363D] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-[#E8DDB5] flex items-center gap-2">
                <Play className="w-5 h-5 text-[#D4A836]" />
                Launch Campaign
              </DialogTitle>
              <DialogDescription className="text-gray-400">
                Select target users to receive this simulation
              </DialogDescription>
            </DialogHeader>
            
            {campaignToLaunch && (
              <div className="space-y-4">
                {/* Campaign Info */}
                <Card className="bg-[#0D1117] border-[#30363D]">
                  <CardContent className="py-3">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 ${campaignToLaunch.type?.color || 'bg-blue-500'} rounded-lg flex items-center justify-center`}>
                        {campaignToLaunch.type?.icon && <campaignToLaunch.type.icon className="w-5 h-5 text-white" />}
                      </div>
                      <div>
                        <h4 className="font-medium text-[#E8DDB5]">{campaignToLaunch.name}</h4>
                        <p className="text-sm text-gray-400">{campaignToLaunch.type?.name || 'Simulation'}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                {/* Target Selection */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-[#E8DDB5]">Select Target Users</Label>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={selectAllTargets}
                      className="text-xs border-[#30363D] text-gray-400"
                    >
                      {selectedTargets.length === availableUsers.length ? 'Deselect All' : 'Select All'}
                    </Button>
                  </div>
                  
                  {loadingUsers ? (
                    <div className="flex items-center justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-[#D4A836]" />
                    </div>
                  ) : availableUsers.length === 0 ? (
                    <div className="text-center py-8 text-gray-400">
                      <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>No users available</p>
                      <p className="text-sm">Create users first in User Management</p>
                    </div>
                  ) : (
                    <div className="max-h-[300px] overflow-y-auto border border-[#30363D] rounded-lg">
                      {availableUsers.map((user) => (
                        <div
                          key={user.user_id}
                          onClick={() => toggleTarget(user.user_id)}
                          className={`flex items-center gap-3 p-3 cursor-pointer hover:bg-[#0D1117] border-b border-[#30363D] last:border-b-0 transition-colors ${
                            selectedTargets.includes(user.user_id) ? 'bg-[#D4A836]/10' : ''
                          }`}
                        >
                          <div className={`w-5 h-5 rounded border flex items-center justify-center ${
                            selectedTargets.includes(user.user_id) 
                              ? 'bg-[#D4A836] border-[#D4A836]' 
                              : 'border-[#30363D]'
                          }`}>
                            {selectedTargets.includes(user.user_id) && (
                              <Check className="w-3 h-3 text-black" />
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[#E8DDB5] truncate">{user.name || user.email}</p>
                            <p className="text-xs text-gray-500 truncate">{user.email}</p>
                          </div>
                          <Badge className="text-xs bg-[#30363D] text-gray-400">
                            {user.role}
                          </Badge>
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {selectedTargets.length > 0 && (
                    <p className="text-sm text-[#D4A836] mt-2">
                      {selectedTargets.length} user{selectedTargets.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <DialogFooter className="gap-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  setShowLaunchDialog(false);
                  setSelectedTargets([]);
                  setCampaignToLaunch(null);
                }} 
                className="border-[#30363D] text-gray-400"
              >
                Cancel
              </Button>
              <Button
                onClick={launchCampaign}
                disabled={launching || selectedTargets.length === 0}
                className="bg-[#D4A836] hover:bg-[#C49A30] text-black"
              >
                {launching ? (
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                ) : (
                  <Play className="w-4 h-4 mr-2" />
                )}
                Launch to {selectedTargets.length} Target{selectedTargets.length !== 1 ? 's' : ''}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
