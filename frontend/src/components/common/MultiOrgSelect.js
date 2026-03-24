import React, { useState, useRef, useEffect } from 'react';
import { Check, ChevronDown, X, Building2 } from 'lucide-react';

/**
 * MultiOrgSelect - Multi-select dropdown for organizations.
 * Supports selecting multiple orgs with checkboxes.
 */
export function MultiOrgSelect({ organizations = [], selectedOrgs = [], onChange, className = '' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleOrg = (orgId) => {
    const newSelection = selectedOrgs.includes(orgId)
      ? selectedOrgs.filter(id => id !== orgId)
      : [...selectedOrgs, orgId];
    onChange(newSelection);
  };

  const selectAll = () => {
    onChange(organizations.map(o => o.organization_id));
  };

  const clearAll = () => {
    onChange([]);
  };

  const getLabel = () => {
    if (selectedOrgs.length === 0) return 'All Organizations';
    if (selectedOrgs.length === 1) {
      const org = organizations.find(o => o.organization_id === selectedOrgs[0]);
      return org?.name || '1 selected';
    }
    return `${selectedOrgs.length} organizations`;
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Trigger */}
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center justify-between gap-2 w-[260px] px-3 py-2 bg-[#161B22] border border-[#30363D] rounded-md text-sm text-gray-200 hover:border-[#D4A836]/50 transition-colors"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
          <span className="truncate">{getLabel()}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          {selectedOrgs.length > 0 && (
            <span
              onClick={(e) => { e.stopPropagation(); clearAll(); }}
              className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-white/10 cursor-pointer"
            >
              <X className="w-3 h-3 text-gray-400" />
            </span>
          )}
          <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute z-50 mt-1 w-[300px] bg-[#161B22] border border-[#30363D] rounded-lg shadow-xl overflow-hidden">
          {/* Controls */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-[#30363D]">
            <span className="text-xs text-gray-500">{selectedOrgs.length} of {organizations.length} selected</span>
            <div className="flex gap-2">
              <button onClick={selectAll} className="text-xs text-[#D4A836] hover:text-[#E8DDB5]">Select all</button>
              <button onClick={clearAll} className="text-xs text-gray-400 hover:text-white">Clear</button>
            </div>
          </div>

          {/* Options */}
          <div className="max-h-[280px] overflow-y-auto">
            {organizations.length === 0 ? (
              <div className="px-3 py-6 text-center text-sm text-gray-500">No organizations found</div>
            ) : (
              organizations.map(org => {
                const isSelected = selectedOrgs.includes(org.organization_id);
                return (
                  <button
                    key={org.organization_id}
                    onClick={() => toggleOrg(org.organization_id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-white/5 transition-colors ${
                      isSelected ? 'bg-[#D4A836]/10' : ''
                    }`}
                  >
                    <div className={`w-4 h-4 rounded border flex items-center justify-center flex-shrink-0 ${
                      isSelected ? 'bg-[#D4A836] border-[#D4A836]' : 'border-[#30363D]'
                    }`}>
                      {isSelected && <Check className="w-3 h-3 text-black" />}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-gray-200 truncate">{org.name}</div>
                      {org.domain && <div className="text-xs text-gray-500 truncate">{org.domain}</div>}
                    </div>
                    {org.user_count > 0 && (
                      <span className="text-xs text-gray-500 flex-shrink-0">{org.user_count} users</span>
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default MultiOrgSelect;
