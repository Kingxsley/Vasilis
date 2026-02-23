import React, { useEffect, useState } from 'react';
import { DashboardLayout } from '../components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { 
  BookOpen, FileText, Users, BarChart3, Settings, Shield, 
  Mail, Target, ChevronRight, Download, Search, ExternalLink,
  Layout, Wand2, GraduationCap, Activity
} from 'lucide-react';
import { Input } from '../components/ui/input';
import { toast } from 'sonner';

const docSections = [
  {
    id: 'getting-started',
    title: 'Getting Started',
    icon: BookOpen,
    description: 'Access requests, login, and password management',
    topics: ['Requesting Access', 'Logging In', 'Password Reset']
  },
  {
    id: 'simulations',
    title: 'Simulations',
    icon: Target,
    description: 'Create and manage security simulations',
    topics: ['Simulation Builder', 'Phishing Campaigns', 'Ad Simulations', 'Campaign Statuses']
  },
  {
    id: 'training',
    title: 'Training Center',
    icon: GraduationCap,
    description: 'Security training scenarios and certifications',
    topics: ['Available Scenarios', 'Completing Training', 'Earning Certificates']
  },
  {
    id: 'users',
    title: 'User Management',
    icon: Users,
    description: 'Managing users, roles, and access requests',
    topics: ['Creating Users', 'User Roles', 'Role Changes', 'Access Requests']
  },
  {
    id: 'analytics',
    title: 'Analytics',
    icon: BarChart3,
    description: 'Reporting and performance tracking',
    topics: ['Dashboard Metrics', 'Advanced Analytics', 'Best Performing Campaigns']
  },
  {
    id: 'settings',
    title: 'Settings',
    icon: Settings,
    description: 'Branding, customization, and configuration',
    topics: ['Branding', 'Landing Page', 'Page Builder']
  },
  {
    id: 'security',
    title: 'Security & Audit',
    icon: Shield,
    description: 'Audit logs and security best practices',
    topics: ['Audit Trail', 'Best Practices', 'Common Issues']
  }
];

const quickGuides = [
  {
    title: 'Create Your First Phishing Campaign',
    steps: [
      'Go to Simulations > Phishing Sim',
      'Click "New Campaign"',
      'Select a template (e.g., Password Reset)',
      'Choose target users from the list',
      'Click "Launch" to send emails'
    ]
  },
  {
    title: 'Build a Custom Simulation',
    steps: [
      'Go to Simulations > Create Sim',
      'Choose simulation type (e.g., MFA Fatigue)',
      'Select a quick-start template or build from scratch',
      'Drag blocks from the palette to the canvas',
      'Use the live preview to verify your design',
      'Click "Save Simulation"'
    ]
  },
  {
    title: 'Approve an Access Request',
    steps: [
      'Go to Management > Access Requests',
      'Click on a pending request',
      'Review the details and add admin notes',
      'Click "Approved" to proceed',
      'Fill in the user creation form that opens',
      'User will receive welcome email'
    ]
  },
  {
    title: 'Change a User\'s Role',
    steps: [
      'Go to Management > Users',
      'Find the user in the table',
      'Click the shield icon in Actions column',
      'Select the new role from dropdown',
      'Confirm the change'
    ]
  }
];

export default function Documentation() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredSections, setFilteredSections] = useState(docSections);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredSections(docSections);
    } else {
      const query = searchQuery.toLowerCase();
      const filtered = docSections.filter(section => 
        section.title.toLowerCase().includes(query) ||
        section.description.toLowerCase().includes(query) ||
        section.topics.some(topic => topic.toLowerCase().includes(query))
      );
      setFilteredSections(filtered);
    }
  }, [searchQuery]);

  const downloadGuide = () => {
    window.open('/docs/user-guide.md', '_blank');
    toast.success('Opening user guide...');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6" data-testid="documentation-page">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold text-[#E8DDB5]" style={{ fontFamily: 'Chivo, sans-serif' }}>
              Documentation
            </h1>
            <p className="text-gray-400 mt-1">Learn how to use Vasilis NetShield effectively</p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={downloadGuide}
              className="border-[#D4A836]/30 text-[#E8DDB5]"
            >
              <Download className="w-4 h-4 mr-2" />
              Download Full Guide
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-500" />
          <Input
            placeholder="Search documentation..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 bg-[#161B22] border-[#30363D] text-white"
            data-testid="doc-search"
          />
        </div>

        {/* Documentation Sections Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.id} 
                className="bg-[#161B22] border-[#30363D] hover:border-[#D4A836]/50 transition-colors cursor-pointer"
                onClick={() => toast.info(`Opening ${section.title} section...`)}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 bg-[#D4A836]/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Icon className="w-5 h-5 text-[#D4A836]" />
                    </div>
                    <div>
                      <CardTitle className="text-lg text-[#E8DDB5]">{section.title}</CardTitle>
                      <CardDescription className="text-gray-500 text-sm">{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <ul className="space-y-1">
                    {section.topics.map((topic, idx) => (
                      <li key={idx} className="flex items-center gap-2 text-sm text-gray-400">
                        <ChevronRight className="w-3 h-3 text-[#D4A836]" />
                        {topic}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Start Guides */}
        <div>
          <h2 className="text-xl font-semibold text-[#E8DDB5] mb-4 flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-[#D4A836]" />
            Quick Start Guides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {quickGuides.map((guide, idx) => (
              <Card key={idx} className="bg-[#0D1117] border-[#30363D]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-[#E8DDB5] text-base">{guide.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="space-y-2">
                    {guide.steps.map((step, stepIdx) => (
                      <li key={stepIdx} className="flex items-start gap-3 text-sm">
                        <span className="w-5 h-5 bg-[#D4A836]/20 rounded-full flex items-center justify-center text-[#D4A836] text-xs font-medium flex-shrink-0">
                          {stepIdx + 1}
                        </span>
                        <span className="text-gray-400">{step}</span>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Video Tutorials Placeholder */}
        <Card className="bg-[#161B22] border-[#30363D]">
          <CardHeader>
            <CardTitle className="text-[#E8DDB5] flex items-center gap-2">
              <Activity className="w-5 h-5 text-[#D4A836]" />
              Video Tutorials
              <span className="text-xs font-normal text-gray-500">(Coming Soon)</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Step-by-step video walkthroughs for common tasks
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {['Platform Overview', 'Creating Campaigns', 'Analyzing Results'].map((title, idx) => (
                <div key={idx} className="bg-[#0D1117] rounded-lg p-4 flex items-center justify-center h-32 border border-[#30363D]/50">
                  <span className="text-gray-500 text-sm">{title}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Support Section */}
        <Card className="bg-gradient-to-r from-[#D4A836]/10 to-[#D4A836]/5 border-[#D4A836]/30">
          <CardContent className="py-6">
            <div className="flex flex-col md:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[#D4A836]/20 rounded-full flex items-center justify-center">
                  <Mail className="w-6 h-6 text-[#D4A836]" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-[#E8DDB5]">Need More Help?</h3>
                  <p className="text-gray-400 text-sm">Contact our support team for personalized assistance</p>
                </div>
              </div>
              <Button className="bg-[#D4A836] hover:bg-[#C49A30] text-black">
                <ExternalLink className="w-4 h-4 mr-2" />
                Contact Support
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
