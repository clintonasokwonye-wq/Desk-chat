import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Send, Paperclip, Smile, Search, User, Clock, Phone, Mail,
  MoreVertical, X, Users, CheckCircle, MessageCircle, Users as UsersIcon,
  FileText, BarChart3, Settings, Plus, Copy, Check, ChevronLeft,
  Trash2, Bot, CornerDownLeft, Sparkles, MapPin, Eye, Folder, ChevronDown,
  ArrowRightLeft, File, Link
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { io, Socket } from 'socket.io-client';

// ─── CONFIGURATION ─────────────────────────────────────────────────────────
const CHAT_SERVER_URL = 'https://vehicle2u-admin.onrender.com';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Message {
  id: number;
  text: string;
  isAgent: boolean;
  time: string;
  type?: string;
  imageUrl?: string;
}

interface AgentInfo {
  name: string;
  department: string;
  gender: string;
  avatar: string;
}

interface Chat {
  visitorId: string;
  topicId: string;
  agent: AgentInfo | null;
  messages: Message[];
  lastMessage: string;
  time: string;
  unread: number;
  isTyping: boolean;
  connectedAt: number;
}

interface SavedTemplate {
  id: number;
  title: string;
  preview: string;
  fullText: string;
  createdAt: string;
  folderId: number;
}

interface TemplateFolder {
  id: number;
  name: string;
  color: string;
}

interface AIMessage {
  id: number;
  text: string;
  isUser: boolean;
  loading?: boolean;
}

// ─── Initial Data (Templates & Folders unchanged) ─────────────────────────────

const initialFolders: TemplateFolder[] = [
  { id: 1, name: 'Personal', color: '#3b82f6' },
  { id: 2, name: 'Work', color: '#10b981' },
];

const initialTemplates: SavedTemplate[] = [];

// ─── Helper: Visitor color & display ─────────────────────────────────────────

function getVisitorColor(visitorId: string): string {
  const colors = [
    '#3b82f6', '#10b981', '#8b5cf6',
    '#f59e0b', '#ec4899', '#06b6d4',
    '#ef4444', '#84cc16'
  ];
  let hash = 0;
  for (let i = 0; i < visitorId.length; i++) {
    hash = visitorId.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function getVisitorNumber(visitorId: string): string {
  const digits = visitorId.replace(/\D/g, '');
  const num = parseInt(digits.slice(-4)) || 0;
  return `#${num % 100}`;
}

function getAvatarUrl(_name: string, gender: string): string {
  const randomNum = Math.floor(Math.random() * 50) + 1;
  return gender.toLowerCase() === "female"
    ? `https://randomuser.me/api/portraits/women/${randomNum}.jpg`
    : `https://randomuser.me/api/portraits/men/${randomNum}.jpg`;
}

// ─── Socket Hook ──────────────────────────────────────────────────────────────

function useAdminSocket() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const s = io(CHAT_SERVER_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
    });

    s.on('connect', () => {
      setConnected(true);
      s.emit('admin_register', { name: 'Admin' });
    });

    s.on('disconnect', () => setConnected(false));

    s.on('reconnect', () => {
      setConnected(true);
      s.emit('admin_register', { name: 'Admin' });
    });

    setSocket(s);
    return () => { s.disconnect(); };
  }, []);

  return { socket, connected };
}

// ─── Transfer Agent Modal (NEW) ───────────────────────────────────────────────

function TransferAgentModal({
  onTransfer,
  onClose,
}: {
  onTransfer: (agent: AgentInfo) => void;
  onClose: () => void;
}) {
  const [name, setName] = useState('');
  const [department, setDepartment] = useState('');
  const [gender, setGender] = useState('');
  const [isTransferring, setIsTransferring] = useState(false);

  const handleTransfer = () => {
    if (!name.trim() || !department.trim() || !gender) return;
    setIsTransferring(true);
    const agent: AgentInfo = {
      name: name.trim(),
      department: department.trim(),
      gender,
      avatar: getAvatarUrl(name.trim(), gender),
    };
    setTimeout(() => onTransfer(agent), 1500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <ArrowRightLeft className="w-4 h-4 text-blue-400" />
            </div>
            <div className="font-semibold">Transfer Agent</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {isTransferring ? (
          <div className="p-10 flex flex-col items-center justify-center">
            <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mb-4" />
            <div className="font-semibold text-lg mb-1">Transferring...</div>
            <div className="text-sm text-slate-400">
              {name} ({department}) is now attending.
            </div>
          </div>
        ) : (
          <div className="p-6 space-y-4">
            {/* Name */}
            <div>
              <label className="text-xs text-slate-400 mb-1.5 block tracking-wide">
                TYPE THE NAME OF THE REPRESENTATIVE
              </label>
              <input
                type="text"
                placeholder="e.g. Nathalie Elisabeth"
                value={name}
                onChange={e => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
                autoFocus
              />
            </div>

            {/* Department — shows after name */}
            {name.trim() && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <label className="text-xs text-slate-400 mb-1.5 block tracking-wide">
                  TYPE THE DEPARTMENT FOR {name.trim().toUpperCase()}
                </label>
                <input
                  type="text"
                  placeholder="e.g. Equipo de ventas"
                  value={department}
                  onChange={e => setDepartment(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
                />
              </motion.div>
            )}

            {/* Gender — shows after department */}
            {name.trim() && department.trim() && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}>
                <label className="text-xs text-slate-400 mb-1.5 block tracking-wide">
                  SELECT GENDER FOR {name.trim().toUpperCase()}
                </label>
                <div className="flex gap-3">
                  {['Male', 'Female'].map(g => (
                    <button
                      key={g}
                      onClick={() => setGender(g)}
                      className={`flex-1 py-2.5 rounded-2xl border text-sm font-medium transition-all ${
                        gender === g
                          ? 'bg-blue-600 border-blue-500 text-white'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:border-slate-600'
                      }`}
                    >
                      {g === 'Male' ? '👨' : '👩'} {g}
                    </button>
                  ))}
                </div>
              </motion.div>
            )}

            {/* Preview */}
            {name.trim() && department.trim() && gender && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-4 text-center"
              >
                <div className="flex items-center justify-center gap-2 mb-2">
                  <img
                    src={getAvatarUrl(name.trim(), gender)}
                    alt={name}
                    className="w-10 h-10 rounded-full"
                  />
                  <div className="text-left">
                    <div className="font-semibold text-emerald-400">{name.trim()}</div>
                    <div className="text-xs text-slate-400">{department.trim()}</div>
                  </div>
                </div>
                <div className="text-xs text-emerald-400 mt-2">
                  ✓ {name.trim()} ({department.trim()}) is now attending.
                </div>
              </motion.div>
            )}
          </div>
        )}

        {!isTransferring && (
          <div className="px-6 pb-6 flex gap-3">
            <button
              onClick={handleTransfer}
              disabled={!name.trim() || !department.trim() || !gender}
              className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm transition-colors"
            >
              Transfer Agent
            </button>
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-2xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-sm transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// ─── Send Link Modal (NEW) ────────────────────────────────────────────────────

function SendLinkModal({
  onSend,
  onClose,
}: {
  onSend: (url: string) => void;
  onClose: () => void;
}) {
  const [url, setUrl] = useState('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-cyan-600/20 rounded-xl flex items-center justify-center">
              <Link className="w-4 h-4 text-cyan-400" />
            </div>
            <div className="font-semibold">Send Link Widget</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6">
          <label className="text-xs text-slate-400 mb-1.5 block tracking-wide">URL</label>
          <input
            type="url"
            placeholder="https://example.com"
            value={url}
            onChange={e => setUrl(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && url.trim() && (onSend(url.trim()), onClose())}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
            autoFocus
          />
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={() => { onSend(url.trim()); onClose(); }}
            disabled={!url.trim()}
            className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm transition-colors"
          >
            Send Link
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Visitor Info Panel (UNCHANGED) ──────────────────────────────────────────

function VisitorInfoPanel({
  currentChat,
  onClose,
}: {
  currentChat: Chat | undefined;
  onClose: () => void;
}) {
  return (
    <motion.div
      key="visitor-panel"
      initial={{ width: 0, opacity: 0 }}
      animate={{ width: 288, opacity: 1 }}
      exit={{ width: 0, opacity: 0 }}
      transition={{ duration: 0.22, ease: 'easeInOut' }}
      className="border-l border-slate-800 bg-slate-950 flex flex-col overflow-hidden flex-shrink-0 hidden lg:flex"
      style={{ minWidth: 0 }}
    >
      <div className="p-5 border-b border-slate-800">
        <div className="flex items-center justify-between mb-4">
          <div className="uppercase text-xs tracking-[1px] text-slate-500">VISITOR INFO</div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 -mr-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {currentChat ? (
          <>
            <div className="flex justify-center mb-5">
              <div
                className="w-20 h-20 rounded-3xl flex items-center justify-center text-4xl shadow-inner"
                style={{
                  backgroundColor: getVisitorColor(currentChat.visitorId) + '33',
                  color: getVisitorColor(currentChat.visitorId),
                }}
              >
                👤
              </div>
            </div>
            <div className="text-center mb-1">
              <div className="font-semibold text-xl">
                Visitor {getVisitorNumber(currentChat.visitorId)}
              </div>
              <div className="text-emerald-400 text-xs mt-px">ACTIVE NOW</div>
            </div>
          </>
        ) : (
          <div className="h-32 flex items-center justify-center text-slate-500 text-sm">
            No visitor selected
          </div>
        )}
      </div>

      {currentChat && (
        <div className="flex-1 overflow-y-auto p-5 space-y-7 text-sm custom-scroll">
          {/* Contact */}
          <div>
            <div className="text-slate-400 text-xs mb-3 font-medium tracking-wide">CONTACT DETAILS</div>
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <Mail className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">EMAIL</div>
                  <div className="text-slate-300">—</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Phone className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">PHONE</div>
                  <div className="text-slate-300">—</div>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="w-4 h-4 mt-0.5 text-slate-400 flex-shrink-0" />
                <div>
                  <div className="text-slate-500 text-[10px] mb-0.5">LOCATION</div>
                  <div className="text-slate-300">—</div>
                </div>
              </div>
            </div>
          </div>

          {/* Agent assigned */}
          <div>
            <div className="text-slate-400 text-xs mb-3 font-medium tracking-wide">AGENT ASSIGNED</div>
            {currentChat.agent ? (
              <div className="flex items-center gap-3 bg-slate-900 rounded-2xl p-3">
                <img
                  src={currentChat.agent.avatar}
                  alt={currentChat.agent.name}
                  className="w-10 h-10 rounded-full object-cover"
                />
                <div>
                  <div className="font-medium text-sm">{currentChat.agent.name}</div>
                  <div className="text-xs text-slate-500">{currentChat.agent.department}</div>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-xs">No agent assigned yet</div>
            )}
          </div>

          {/* Notes */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-slate-400 text-xs tracking-wide">NOTES</div>
              <button className="text-blue-400 text-xs hover:underline">Edit</button>
            </div>
            <textarea
              className="w-full h-28 bg-slate-900 border border-slate-700 rounded-2xl p-3 text-sm resize-y min-h-[100px] focus:outline-none focus:border-blue-500 transition-colors custom-scroll"
              placeholder="Add notes about this visitor..."
            />
          </div>

          {/* System Info */}
          <div className="pt-2 border-t border-slate-800 text-xs space-y-3 text-slate-400">
            <div className="flex justify-between">
              <div>Visitor ID</div>
              <div className="text-white font-mono text-[10px]">
                {currentChat.visitorId.slice(0, 14)}...
              </div>
            </div>
            <div className="flex justify-between">
              <div>Messages</div>
              <div className="text-white">{currentChat.messages.length}</div>
            </div>
            <div className="flex justify-between">
              <div>Status</div>
              <div className="text-emerald-400">Connected</div>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 border-t border-slate-800">
        <div className="text-[10px] text-center text-slate-500">
          Visitor ID: VST-{currentChat?.visitorId.slice(-5) ?? '00000'}
        </div>
      </div>
    </motion.div>
  );
}

// ─── Add Template Modal (UNCHANGED) ──────────────────────────────────────────

function AddTemplateModal({
  onSave,
  onClose,
  currentFolderId,
}: {
  onSave: (t: Omit<SavedTemplate, 'id' | 'createdAt'>) => void;
  onClose: () => void;
  currentFolderId: number;
}) {
  const [title, setTitle] = useState('');
  const [fullText, setFullText] = useState('');
  const charLimit = 1000;
  const preview = fullText.trim().slice(0, 60) + (fullText.trim().length > 60 ? '...' : '');

  const handleSave = () => {
    if (!title.trim() || !fullText.trim()) return;
    onSave({ title: title.trim(), preview, fullText: fullText.trim(), folderId: currentFolderId });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-emerald-600/20 rounded-xl flex items-center justify-center">
              <Plus className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="font-semibold">New Template</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <label className="text-xs text-slate-400 mb-1.5 block tracking-wide">TITLE</label>
            <input
              type="text"
              placeholder="e.g. Shipping Policy, Greeting..."
              value={title}
              onChange={e => setTitle(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
            />
          </div>
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs text-slate-400 tracking-wide">TEMPLATE TEXT</label>
              <span className="text-xs text-slate-500">{fullText.length}/{charLimit}</span>
            </div>
            <textarea
              placeholder="Paste or type your reusable text here..."
              value={fullText}
              onChange={e => setFullText(e.target.value.slice(0, charLimit))}
              rows={6}
              className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-3 text-sm resize-none focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500 custom-scroll"
            />
          </div>
          {fullText.trim().length > 0 && (
            <div className="bg-slate-800/50 border border-slate-700 rounded-2xl px-4 py-3 text-xs text-slate-400">
              <span className="text-slate-500 mr-1">Preview:</span>{preview}
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={!title.trim() || !fullText.trim()}
            className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm transition-colors"
          >
            Save Template
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Preview Template Modal (UNCHANGED) ──────────────────────────────────────

function PreviewTemplateModal({
  template,
  onClose,
}: {
  template: SavedTemplate;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl overflow-hidden flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 flex-shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Eye className="w-4 h-4 text-blue-400" />
            </div>
            <div className="font-semibold">Template Preview</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6 space-y-4 overflow-y-auto custom-scroll flex-1">
          <div>
            <div className="text-xs text-slate-500 mb-2">TITLE</div>
            <div className="text-lg font-semibold break-words">{template.title}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-2">CREATED</div>
            <div className="text-sm text-slate-400">{template.createdAt}</div>
          </div>
          <div>
            <div className="text-xs text-slate-500 mb-2">CONTENT</div>
            <div className="bg-slate-800 border border-slate-700 rounded-2xl p-4 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap break-words">
              {template.fullText}
            </div>
          </div>
        </div>
        <div className="px-6 pb-6 flex-shrink-0">
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-sm transition-colors"
          >
            Close Preview
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Add Folder Modal (UNCHANGED) ────────────────────────────────────────────

function AddFolderModal({
  onSave,
  onClose,
}: {
  onSave: (name: string) => void;
  onClose: () => void;
}) {
  const [folderName, setFolderName] = useState('');

  const handleSave = () => {
    if (!folderName.trim()) return;
    onSave(folderName.trim());
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.18 }}
        className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <Folder className="w-4 h-4 text-purple-400" />
            </div>
            <div className="font-semibold">New Folder</div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1.5 rounded-xl hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-6">
          <label className="text-xs text-slate-400 mb-1.5 block tracking-wide">FOLDER NAME</label>
          <input
            type="text"
            placeholder="e.g. Sales, Support, Marketing..."
            value={folderName}
            onChange={e => setFolderName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSave()}
            className="w-full bg-slate-800 border border-slate-700 rounded-2xl px-4 py-2.5 text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
            autoFocus
          />
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={!folderName.trim()}
            className="flex-1 py-2.5 rounded-2xl bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-medium text-sm transition-colors"
          >
            Create Folder
          </button>
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-2xl border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600 text-sm transition-colors"
          >
            Cancel
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Copy Button (UNCHANGED) ──────────────────────────────────────────────────

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={handleCopy}
      className={`flex items-center gap-2 px-4 py-2 rounded-2xl text-sm font-medium transition-all ${
        copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-500 text-white'
      }`}
    >
      {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
      {copied ? 'Copied!' : 'Copy'}
    </button>
  );
}

// ─── Templates Page (UNCHANGED) ───────────────────────────────────────────────

function TemplatesPage() {
  // Load from localStorage or use defaults
  const [templates, setTemplates] = useState<SavedTemplate[]>(() => {
    const saved = localStorage.getItem('desk-chat-templates');
    return saved ? JSON.parse(saved) : initialTemplates;
  });
  
  const [folders, setFolders] = useState<TemplateFolder[]>(() => {
    const saved = localStorage.getItem('desk-chat-folders');
    return saved ? JSON.parse(saved) : initialFolders;
  });
  
  const [currentFolderId, setCurrentFolderId] = useState<number>(() => {
    const saved = localStorage.getItem('desk-chat-current-folder');
    return saved ? JSON.parse(saved) : 1;
  });
  
  const [activeTab, setActiveTab] = useState<'snippets' | 'ai'>('snippets');
  const [selectedTemplate, setSelectedTemplate] = useState<SavedTemplate | null>(null);
  const [previewTemplate, setPreviewTemplate] = useState<SavedTemplate | null>(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showAddFolderModal, setShowAddFolderModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const [aiMessages, setAiMessages] = useState<AIMessage[]>(() => {
    const saved = localStorage.getItem('desk-chat-ai-messages');
    if (saved) {
      return JSON.parse(saved);
    }
    return [
      {
        id: 1,
        text: "Hello! I'm your AI assistant powered by Cohere. Paste any text and I'll help you translate, summarise, rewrite, or improve it. What would you like to do?",
        isUser: false,
      },
    ];
  });
  const [aiInput, setAiInput] = useState('');
  const [selectedModel, setSelectedModel] = useState('command-a-translate-08-2025');
  const [apiKey] = useState('3r37zxINyQTcRPG89QlN2CdSlyRN74noDElCYCVB');
  const [isAiLoading, setIsAiLoading] = useState(false);
  const aiScrollRef = useRef<HTMLDivElement>(null);

  const currentFolder = folders.find(f => f.id === currentFolderId);
  const filteredTemplates = templates.filter(
    t =>
      t.folderId === currentFolderId &&
      (t.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        t.preview.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  const handleAddTemplate = (data: Omit<SavedTemplate, 'id' | 'createdAt'>) => {
    const newT: SavedTemplate = {
      id: Date.now(),
      ...data,
      createdAt: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    };
    setTemplates(prev => [newT, ...prev]);
  };

  const handleDeleteTemplate = (id: number) => {
    setTemplates(prev => prev.filter(t => t.id !== id));
  };

  const handleAddFolder = (name: string) => {
    const folderColors = ['#3b82f6', '#10b981', '#8b5cf6', '#f59e0b', '#ec4899', '#06b6d4'];
    const newFolder: TemplateFolder = {
      id: Date.now(),
      name,
      color: folderColors[folders.length % folderColors.length],
    };
    setFolders(prev => [...prev, newFolder]);
    setCurrentFolderId(newFolder.id);
  };

  // Save to localStorage whenever data changes
  useEffect(() => {
    localStorage.setItem('desk-chat-templates', JSON.stringify(templates));
  }, [templates]);

  useEffect(() => {
    localStorage.setItem('desk-chat-folders', JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem('desk-chat-current-folder', JSON.stringify(currentFolderId));
  }, [currentFolderId]);

  useEffect(() => {
    localStorage.setItem('desk-chat-ai-messages', JSON.stringify(aiMessages));
  }, [aiMessages]);

  useEffect(() => {
    if (aiScrollRef.current) {
      aiScrollRef.current.scrollTop = aiScrollRef.current.scrollHeight;
    }
  }, [aiMessages]);

  const sendAiMessage = async () => {
    if (!aiInput.trim() || isAiLoading) return;
    const userMsg: AIMessage = { id: Date.now(), text: aiInput.trim(), isUser: true };
    const loadingMsg: AIMessage = { id: Date.now() + 1, text: '', isUser: false, loading: true };
    setAiMessages(prev => [...prev, userMsg, loadingMsg]);
    setAiInput('');
    setIsAiLoading(true);
    try {
      const response = await fetch('https://api.cohere.ai/v2/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            { role: 'system', content: 'You are a helpful customer support assistant. Help agents with translations, text summarisation, rewriting messages, and drafting professional support replies. Keep responses concise and practical.' },
            ...aiMessages.filter(m => !m.loading).map(m => ({ role: m.isUser ? 'user' : 'assistant', content: m.text })),
            { role: 'user', content: userMsg.text },
          ],
        }),
      });
      if (!response.ok) throw new Error(`API error: ${response.status}`);
      const data = await response.json();
      const replyText = data?.message?.content?.[0]?.text || data?.text || 'Sorry, I could not generate a response.';
      setAiMessages(prev => prev.map(m => m.loading ? { ...m, text: replyText, loading: false } : m));
    } catch (err: any) {
      setAiMessages(prev => prev.map(m => m.loading ? { ...m, text: `⚠️ Request failed: ${err.message}`, loading: false } : m));
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleAiKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendAiMessage(); }
  };

  const aiModels = [
    { value: 'command-a-translate-08-2025', label: 'Command A Translate (Aug 2025) ⭐' },
    { value: 'command-r-plus-08-2024', label: 'Command R+ (Aug 2024)' },
    { value: 'command-r-08-2024', label: 'Command R (Aug 2024)' },
    { value: 'command-r-03-2024', label: 'Command R (Mar 2024)' },
    { value: 'command-r-plus', label: 'Command R+ (Latest)' },
    { value: 'command-r', label: 'Command R (Latest)' },
  ];

  return (
    <div className="flex-1 flex flex-row overflow-hidden">
      {/* Sidebar */}
      <div className="w-72 border-r border-slate-800 bg-slate-950 flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-slate-800">
          <div className="flex bg-slate-900 rounded-2xl p-1 gap-1">
            <button
              onClick={() => setActiveTab('snippets')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'snippets' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Snippets</span>
            </button>
            <button
              onClick={() => setActiveTab('ai')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-sm font-medium transition-all ${activeTab === 'ai' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>AI Assistant</span>
            </button>
          </div>
        </div>

        {activeTab === 'snippets' && (
          <>
            <div className="p-4 pb-2 border-b border-slate-800">
              <div className="relative">
                <Folder className="absolute left-3 top-2.5 text-slate-500 w-3.5 h-3.5" />
                <select
                  value={currentFolderId}
                  onChange={e => setCurrentFolderId(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 pl-9 pr-8 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors appearance-none cursor-pointer"
                  style={{ color: currentFolder?.color }}
                >
                  {folders.map(folder => (
                    <option key={folder.id} value={folder.id}>{folder.name}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3 top-2.5 text-slate-500 w-3.5 h-3.5 pointer-events-none" />
              </div>
              <button
                onClick={() => setShowAddFolderModal(true)}
                className="w-full mt-2 flex items-center justify-center gap-2 py-1.5 bg-slate-800/50 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-slate-300 rounded-lg text-xs transition-all"
              >
                <Plus className="w-3 h-3" /> New Folder
              </button>
            </div>

            <div className="p-4 pb-2 space-y-2">
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-slate-500 w-3.5 h-3.5" />
                <input
                  type="text"
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 pl-9 pr-3 py-2 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors placeholder:text-slate-500"
                />
              </div>
              <button
                onClick={() => setShowAddModal(true)}
                className="w-full flex items-center justify-center gap-2 py-2 bg-blue-600/15 hover:bg-blue-600/25 border border-blue-600/30 text-blue-400 hover:text-blue-300 rounded-xl text-sm transition-all"
              >
                <Plus className="w-4 h-4" />
                <span className="hidden sm:inline">Add New Template</span>
                <span className="sm:hidden">Add Template</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-3 pb-3 space-y-2 custom-scroll">
              {filteredTemplates.length === 0 ? (
                <div className="text-center text-slate-500 text-sm py-10">
                  {searchQuery ? 'No templates found' : `No templates in ${currentFolder?.name}`}
                </div>
              ) : (
                filteredTemplates.map(t => (
                  <motion.div
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`group relative rounded-2xl p-3.5 cursor-pointer border transition-all ${
                      selectedTemplate?.id === t.id
                        ? 'bg-blue-600/10 border-blue-600/40'
                        : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                    }`}
                    onClick={() => setSelectedTemplate(t)}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="font-medium text-sm truncate">{t.title}</div>
                        <div className="text-xs text-slate-500 truncate mt-0.5">{t.preview}</div>
                        <div className="text-[10px] text-slate-600 mt-1.5">{t.createdAt}</div>
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={e => { e.stopPropagation(); setPreviewTemplate(t); }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-blue-400 hover:bg-blue-400/10 transition-all flex-shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={e => {
                            e.stopPropagation();
                            handleDeleteTemplate(t.id);
                            if (selectedTemplate?.id === t.id) setSelectedTemplate(null);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </>
        )}

        {activeTab === 'ai' && (
          <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
            <div className="w-14 h-14 bg-blue-600/15 rounded-3xl flex items-center justify-center mb-4">
              <Bot className="w-7 h-7 text-blue-400" />
            </div>
            <div className="font-semibold mb-1">AI Assistant</div>
            <div className="text-xs text-slate-500 leading-relaxed">
              Powered by Cohere Command R. Translate, summarise, rewrite, and more.
            </div>
            <div className="mt-4 w-full bg-slate-900 border border-slate-700 rounded-2xl p-3 text-xs text-slate-500 text-left">
              <div className="text-slate-400 mb-1 font-medium">Tips:</div>
              <ul className="space-y-1 list-disc list-inside">
                <li>Paste a message to translate</li>
                <li>Ask for a professional rewrite</li>
                <li>Summarise long customer messages</li>
                <li>Draft a support reply</li>
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Right panel */}
      {activeTab === 'snippets' ? (
        <div className="flex-1 flex flex-col bg-[#0a0f1c]">
          {selectedTemplate ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={selectedTemplate.id}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.18 }}
                className="flex-1 flex flex-col p-6 lg:p-10 max-w-2xl mx-auto w-full overflow-hidden"
              >
                <button
                  onClick={() => setSelectedTemplate(null)}
                  className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-8 transition-colors w-fit flex-shrink-0"
                >
                  <ChevronLeft className="w-4 h-4" /> All Templates
                </button>
                <div className="flex flex-col sm:flex-row items-start justify-between mb-6 gap-4 flex-shrink-0">
                  <div className="min-w-0 flex-1">
                    <h2 className="text-xl lg:text-2xl font-semibold truncate" title={selectedTemplate.title}>
                      {selectedTemplate.title}
                    </h2>
                    <div className="text-slate-500 text-sm mt-1">Saved on {selectedTemplate.createdAt}</div>
                  </div>
                  <CopyButton text={selectedTemplate.fullText} />
                </div>
                <div className="bg-slate-900 border border-slate-800 rounded-3xl p-4 lg:p-6 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap select-all overflow-y-auto custom-scroll flex-1 min-h-[200px] break-words">
                  {selectedTemplate.fullText}
                </div>
                <p className="text-xs text-slate-600 mt-3 text-center flex-shrink-0">
                  Click inside the text box to select all • Use Copy button to copy to clipboard
                </p>
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-12">
              <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
                <FileText className="w-10 h-10 text-slate-500" />
              </div>
              <h3 className="text-xl font-medium text-slate-300 mb-2">Select a template</h3>
              <p className="text-slate-500 text-sm max-w-xs">
                Choose a saved snippet from the list to view and copy its content.
              </p>
              <button
                onClick={() => setShowAddModal(true)}
                className="mt-6 flex items-center gap-2 px-6 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-2xl text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" /> Add your first template
              </button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex-1 flex flex-col bg-[#0a0f1c]">
          <div className="h-14 border-b border-slate-800 bg-slate-950 px-4 lg:px-6 flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-blue-400" />
            </div>
            <div>
              <div className="font-semibold text-sm">Cohere AI Assistant</div>
              <div className="text-[10px] text-slate-500 hidden sm:block">Translation & Text Processing</div>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <select
                value={selectedModel}
                onChange={e => setSelectedModel(e.target.value)}
                className="hidden lg:block text-xs bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-full focus:outline-none focus:border-blue-500 transition-colors cursor-pointer"
              >
                {aiModels.map(model => (
                  <option key={model.value} value={model.value}>{model.label}</option>
                ))}
              </select>
            </div>
          </div>

          <div ref={aiScrollRef} className="flex-1 overflow-y-auto p-4 lg:p-6 space-y-4 custom-scroll">
            {aiMessages.map(msg => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex ${msg.isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!msg.isUser && (
                  <div className="w-8 h-8 bg-blue-600/20 rounded-xl flex items-center justify-center mr-3 flex-shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-blue-400" />
                  </div>
                )}
                <div className={`max-w-[85%] lg:max-w-[75%] px-4 py-3 rounded-3xl text-sm leading-relaxed ${
                  msg.isUser ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-800 text-slate-200 rounded-tl-none'
                }`}>
                  {msg.loading ? (
                    <div className="flex gap-1 items-center h-4">
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                  ) : (
                    <div className="whitespace-pre-wrap break-words">{msg.text}</div>
                  )}
                </div>
                {msg.isUser && (
                  <div className="w-8 h-8 bg-slate-700 rounded-xl flex items-center justify-center ml-3 flex-shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-slate-300" />
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          <div className="border-t border-slate-800 bg-slate-950 p-4">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end bg-slate-900 border border-slate-700 focus-within:border-blue-600 rounded-3xl px-4 py-2 gap-3 transition-all">
                <textarea
                  value={aiInput}
                  onChange={e => setAiInput(e.target.value)}
                  onKeyDown={handleAiKeyDown}
                  placeholder="Paste text to translate, summarise, or ask anything..."
                  rows={2}
                  className="flex-1 bg-transparent py-2 text-sm placeholder:text-slate-500 focus:outline-none resize-none leading-snug max-h-32 overflow-y-auto custom-scroll"
                  style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap', minHeight: 'auto' }}
                />
                <button
                  onClick={sendAiMessage}
                  disabled={!aiInput.trim() || isAiLoading}
                  className="w-9 h-9 flex items-center justify-center bg-blue-600 disabled:bg-slate-700 hover:bg-blue-500 rounded-2xl transition-colors disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
                >
                  <CornerDownLeft className="w-4 h-4" />
                </button>
              </div>
              <div className="text-center text-[10px] text-slate-600 mt-2">
                Press Enter to send • Shift+Enter for new line
              </div>
            </div>
          </div>
        </div>
      )}

      <AnimatePresence>
        {showAddModal && (
          <AddTemplateModal
            onSave={handleAddTemplate}
            onClose={() => setShowAddModal(false)}
            currentFolderId={currentFolderId}
          />
        )}
        {showAddFolderModal && (
          <AddFolderModal
            onSave={handleAddFolder}
            onClose={() => setShowAddFolderModal(false)}
          />
        )}
        {previewTemplate && (
          <PreviewTemplateModal
            template={previewTemplate}
            onClose={() => setPreviewTemplate(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Analytics Page (UNCHANGED) ───────────────────────────────────────────────

function AnalyticsPage() {
  const stats = [
    { label: 'Total Chats Today', value: '124', change: '+12%', up: true },
    { label: 'Avg. Response Time', value: '1m 24s', change: '-8%', up: true },
    { label: 'Resolved Tickets', value: '98', change: '+5%', up: true },
    { label: 'Customer Satisfaction', value: '94%', change: '+2%', up: true },
  ];
  return (
    <div className="flex-1 flex flex-col bg-[#0a0f1c] p-4 lg:p-8 overflow-y-auto custom-scroll">
      <div className="max-w-4xl mx-auto w-full">
        <h2 className="text-xl lg:text-2xl font-semibold mb-1">Analytics Overview</h2>
        <p className="text-slate-500 text-sm mb-8">Performance metrics for today</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-8">
          {stats.map((s, i) => (
            <div key={i} className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
              <div className="text-slate-400 text-xs mb-3">{s.label}</div>
              <div className="text-2xl lg:text-3xl font-bold mb-2">{s.value}</div>
              <div className={`text-xs font-medium ${s.up ? 'text-emerald-400' : 'text-red-400'}`}>
                {s.change} from yesterday
              </div>
            </div>
          ))}
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-slate-500 text-sm">
          <BarChart3 className="w-10 h-10 mx-auto mb-3 text-slate-600" />
          Detailed charts coming soon
        </div>
      </div>
    </div>
  );
}

// ─── Contacts Page (UNCHANGED) ────────────────────────────────────────────────

function ContactsPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-[#0a0f1c] p-12 text-center">
      <div className="w-20 h-20 bg-slate-800 rounded-3xl flex items-center justify-center mb-6">
        <UsersIcon className="w-10 h-10 text-slate-500" />
      </div>
      <h2 className="text-2xl font-light mb-3 text-white">Contacts</h2>
      <p className="text-slate-500 text-sm max-w-xs">
        Your visitor contacts will appear here. This section is under development.
      </p>
    </div>
  );
}

// ─── Login Modal Component ────────────────────────────────────────────────────

function LoginModal({ onLoginSuccess, isLockScreen = false }: { onLoginSuccess: () => void; isLockScreen?: boolean }) {
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [error, setError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const CORRECT_PASSWORD = "Asokwonye@2023";

  const handleLogin = () => {
    if (password === CORRECT_PASSWORD) {
      setIsLoggingIn(true);
      setTimeout(() => {
        if (rememberMe && !isLockScreen) {
          localStorage.setItem('desk-chat-auth', 'true');
          localStorage.setItem('desk-chat-remember-me', 'true');
        }
        onLoginSuccess();
      }, 600);
    } else {
      setError("Incorrect password");
      setTimeout(() => setError(""), 3000);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <>
      <link
        href="https://fonts.googleapis.com/css2?family=Source+Sans+3:wght@300;400;600;700&display=swap"
        rel="stylesheet"
      />

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0, scale: 1.5 }}
        transition={{ duration: 0.5 }}
        style={{
          minHeight: "100vh",
          background: "#6b7280",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "'Source Sans 3', sans-serif",
        }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: isLoggingIn ? 1.5 : 1, opacity: isLoggingIn ? 0 : 1 }}
          transition={{ duration: 0.5 }}
          style={{
            background: "#1e3d8f",
            borderRadius: "22px",
            border: "2.5px solid #ffffff",
            width: "380px",
            maxWidth: "95vw",
            padding: "28px 40px 36px 40px",
            position: "relative",
            boxSizing: "border-box",
          }}
        >
          <h1
            style={{
              color: "#ffffff",
              fontSize: "32px",
              fontWeight: 700,
              textAlign: "center",
              margin: "0 0 20px 0",
              letterSpacing: "0.01em",
              lineHeight: 1.2,
            }}
          >
            Login
          </h1>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              alignItems: "center",
              marginBottom: "20px",
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="70"
              height="70"
              viewBox="0 0 64 64"
              fill="white"
            >
              <circle cx="32" cy="18" r="12" />
              <path d="M8 56c0-13.255 10.745-24 24-24s24 10.745 24 24H8z" />
            </svg>
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "15px",
                textAlign: "center",
                marginBottom: "8px",
                letterSpacing: "0.01em",
              }}
            >
              Password
            </label>
            <div style={{ position: "relative", width: "86%", margin: "0 auto" }}>
              <span
                style={{
                  position: "absolute",
                  left: "14px",
                  top: "50%",
                  transform: "translateY(-50%)",
                  color: "#555",
                  display: "flex",
                  alignItems: "center",
                }}
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="16"
                  height="16"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="#555"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                  <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                </svg>
              </span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="••••••••••"
                style={{
                  width: "100%",
                  padding: "10px 16px 10px 42px",
                  borderRadius: "999px",
                  border: error ? "2px solid #ef4444" : "none",
                  outline: "none",
                  fontSize: "15px",
                  fontFamily: "'Source Sans 3', sans-serif",
                  background: "#f0f0f0",
                  color: "#333",
                  boxSizing: "border-box",
                  letterSpacing: "0.12em",
                }}
              />
            </div>
            {error && (
              <div style={{ 
                color: "#fee2e2", 
                fontSize: "13px", 
                textAlign: "center", 
                marginTop: "8px",
                fontWeight: 600
              }}>
                {error}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "8px",
              marginBottom: "20px",
            }}
          >
            <input
              type="checkbox"
              id="rememberMe"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              style={{
                width: "14px",
                height: "14px",
                accentColor: "#1e40af",
                cursor: "pointer",
              }}
            />
            <label
              htmlFor="rememberMe"
              style={{
                color: "#ffffff",
                fontWeight: 700,
                fontSize: "14px",
                cursor: "pointer",
                letterSpacing: "0.01em",
                userSelect: "none",
              }}
            >
              Remember Me
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "center", marginBottom: "18px" }}>
            <button
              onClick={handleLogin}
              disabled={isLoggingIn}
              style={{
                background: "#f5f5f5",
                color: "#2563eb",
                border: "none",
                borderRadius: "999px",
                padding: "12px 0",
                width: "66%",
                fontSize: "16px",
                fontFamily: "'Source Sans 3', sans-serif",
                fontWeight: 700,
                cursor: isLoggingIn ? "not-allowed" : "pointer",
                letterSpacing: "0.02em",
                boxShadow: "0 2px 8px rgba(0,0,0,0.10)",
                opacity: isLoggingIn ? 0.7 : 1,
              }}
            >
              {isLoggingIn ? "Logging in..." : "Log In"}
            </button>
          </div>

          <div style={{ textAlign: "center" }}>
            <a
              href="#"
              style={{
                color: "#ffffff",
                fontSize: "13px",
                fontFamily: "'Source Sans 3', sans-serif",
                fontWeight: 400,
                textDecoration: "underline",
                textUnderlineOffset: "3px",
                letterSpacing: "0.01em",
              }}
            >
              Lost Your Password?
            </a>
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────

function AdminPanel() {
  const { socket, connected } = useAdminSocket();

  // ── State (structure unchanged, data now from socket + localStorage) ──
  const [chats, setChats] = useState<Chat[]>(() => {
    try {
      const saved = localStorage.getItem('desk-chat-history');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [currentChatId, setCurrentChatId] = useState<string>('');
  const [messageInput, setMessageInput] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [activeNav, setActiveNav] = useState<'chats' | 'contacts' | 'templates' | 'analytics'>('chats');
  const [showVisitorInfo, setShowVisitorInfo] = useState(true);
  const [chatListWidth, setChatListWidth] = useState(320);
  const [isResizing, setIsResizing] = useState(false);

  // NEW modal states
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState(false);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const currentChat = chats.find(c => c.visitorId === currentChatId);

  // Window resize removed - desktop only view

  // ── Auto-resize textarea ──
  useEffect(() => {
    if (textareaRef.current && messageInput) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 120) + 'px';
    }
  }, [messageInput]);

  // ── Save chat history to localStorage ──
  useEffect(() => {
    try {
      localStorage.setItem('desk-chat-history', JSON.stringify(chats));
    } catch (err) {
      console.error('Failed to save chat history:', err);
    }
  }, [chats]);

  // ── Scroll to bottom ──
  const scrollToBottom = useCallback(() => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({ top: chatContainerRef.current.scrollHeight, behavior: 'smooth' });
    }
  }, []);

  useEffect(() => { scrollToBottom(); }, [currentChat?.messages, scrollToBottom]);

  // ── Socket events ──
  useEffect(() => {
    if (!socket) return;

    socket.on('chat_list_update', (chatList: any[]) => {
      setChats(prev => {
        const newChats = chatList.map(c => ({
          visitorId: c.visitorId,
          topicId: c.topicId,
          agent: c.agent,
          messages: c.messages || [],
          lastMessage: c.lastMessage || 'New visitor',
          time: c.time || '',
          unread: c.unread || 0,
          isTyping: c.isTyping || false,
          connectedAt: c.connectedAt || Date.now(),
        }));
        
        // Merge with existing chats from localStorage
        const merged = [...prev];
        newChats.forEach(newChat => {
          const existingIndex = merged.findIndex(c => c.visitorId === newChat.visitorId);
          if (existingIndex >= 0) {
            // Update existing chat but keep old messages if new one has none
            merged[existingIndex] = {
              ...newChat,
              messages: newChat.messages.length > 0 ? newChat.messages : merged[existingIndex].messages,
            };
          } else {
            // Add new chat
            merged.push(newChat);
          }
        });
        return merged;
      });
    });

    socket.on('visitor_message', (data: { visitorId: string; message: Message }) => {
      setChats(prev => prev.map(chat =>
        chat.visitorId === data.visitorId
          ? {
              ...chat,
              messages: [...chat.messages, data.message],
              lastMessage: data.message.text || '[Image]',
              time: data.message.time,
              unread: chat.visitorId === currentChatId ? 0 : chat.unread + 1,
            }
          : chat
      ));
    });

    socket.on('admin_message_sent', (data: { visitorId: string; message: Message }) => {
      setChats(prev => prev.map(chat =>
        chat.visitorId === data.visitorId
          ? {
              ...chat,
              messages: [...chat.messages, data.message],
              lastMessage: data.message.text || '[Widget]',
              time: data.message.time,
            }
          : chat
      ));
    });

    socket.on('visitor_typing_update', (data: { visitorId: string; isTyping: boolean }) => {
      setChats(prev => prev.map(chat =>
        chat.visitorId === data.visitorId ? { ...chat, isTyping: data.isTyping } : chat
      ));
    });

    socket.on('agent_transferred', (data: { visitorId: string; agent: AgentInfo }) => {
      setChats(prev => prev.map(chat =>
        chat.visitorId === data.visitorId ? { ...chat, agent: data.agent } : chat
      ));
    });

    socket.on('visitor_left_chat', (data: { visitorId: string; message: Message }) => {
      setChats(prev => prev.map(chat =>
        chat.visitorId === data.visitorId
          ? {
              ...chat,
              messages: [...chat.messages, data.message],
              lastMessage: '👋 Visitor left the chat',
              isTyping: false,
            }
          : chat
      ));
    });

    return () => {
      socket.off('chat_list_update');
      socket.off('visitor_message');
      socket.off('admin_message_sent');
      socket.off('visitor_typing_update');
      socket.off('agent_transferred');
      socket.off('visitor_left_chat');
    };
  }, [socket, currentChatId]);

  // ── Mark read when switching chats ──
  useEffect(() => {
    if (socket && currentChatId) {
      socket.emit('mark_read', currentChatId);
      setChats(prev => prev.map(chat =>
        chat.visitorId === currentChatId ? { ...chat, unread: 0 } : chat
      ));
    }
  }, [currentChatId, socket]);

  // ── Send message ──
  const handleSendMessage = () => {
    if (!messageInput.trim() || !currentChat || !socket) return;
    socket.emit('admin_message', { visitorId: currentChatId, text: messageInput.trim() });
    socket.emit('admin_typing', { visitorId: currentChatId, isTyping: false });
    setMessageInput('');
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  };

  // ── Typing emission ──
  const handleTyping = (value: string) => {
    setMessageInput(value);
    if (!socket || !currentChatId) return;
    socket.emit('admin_typing', { visitorId: currentChatId, isTyping: true });
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit('admin_typing', { visitorId: currentChatId, isTyping: false });
    }, 2000);
  };

  const selectChat = (visitorId: string) => {
    setCurrentChatId(visitorId);
    if (socket) socket.emit('mark_read', visitorId);
  };

  const endChat = () => {
    if (!currentChat || !socket) return;
    socket.emit('end_chat', currentChatId);
    setCurrentChatId('');
  };

  // ── Delete chat from history ──
  const deleteChat = (visitorId: string) => {
    setChats(prev => prev.filter(c => c.visitorId !== visitorId));
    if (currentChatId === visitorId) {
      setCurrentChatId('');
    }
  };

  // ── Transfer agent ──
  const handleTransferAgent = (agent: AgentInfo) => {
    if (!socket || !currentChatId) return;
    socket.emit('transfer_agent', { visitorId: currentChatId, agent });
    setShowTransferModal(false);
  };

  // ── Send document widget ──
  const handleSendDocumentWidget = () => {
    if (!socket || !currentChatId) return;
    socket.emit('send_document_widget', { visitorId: currentChatId });
  };

  // ── Send link widget ──
  const handleSendLinkWidget = (url: string) => {
    if (!socket || !currentChatId) return;
    socket.emit('send_link_widget', { visitorId: currentChatId, url });
  };

  // ── Resize handle ──
  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return;
      setChatListWidth(Math.min(Math.max(e.clientX - 64, 240), 600));
    };
    const handleMouseUp = () => setIsResizing(false);
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = 'none';
      document.body.style.cursor = 'col-resize';
    }
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
    };
  }, [isResizing]);

  const filteredChats = chats.filter(
    chat =>
      `Visitor ${getVisitorNumber(chat.visitorId)}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      chat.lastMessage.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const totalUnread = chats.reduce((sum, c) => sum + c.unread, 0);

  // ── No chats empty state ──
  if (!connected && chats.length === 0) {
    return (
      <div className="h-screen flex items-center justify-center bg-slate-950 text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-slate-700 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Connecting to server...</h2>
          <p className="text-slate-400 text-sm">{CHAT_SERVER_URL}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen flex flex-col bg-[#0f172a] text-white overflow-hidden font-sans">

      {/* ── Top Nav (UNCHANGED except connection indicator) ── */}
      <div className="h-14 border-b border-slate-800 bg-slate-950 flex items-center px-4 justify-between z-50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-blue-600 rounded-xl flex items-center justify-center">
            <MessageCircle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold text-lg tracking-tight">DeskChat</div>
            <div className="text-[10px] text-slate-500 -mt-1">LIVE SUPPORT</div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center bg-slate-900 rounded-full px-3 py-1 text-sm">
            <div className={`w-2 h-2 rounded-full mr-2 ${connected ? 'bg-emerald-500 animate-pulse' : 'bg-red-500'}`} />
            <span>{connected ? 'Connected' : 'Reconnecting...'}</span>
          </div>
          <div className="flex items-center gap-2 text-sm pr-3 border-r border-slate-800">
            <div className="w-7 h-7 bg-slate-700 rounded-full flex items-center justify-center">
              <User className="w-4 h-4" />
            </div>
            <div>
              <div className="font-medium">Alex Rivera</div>
              <div className="text-xs text-emerald-400">Online</div>
            </div>
          </div>
          <button className="text-slate-400 hover:text-white transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">

        {/* ── Icon Rail (UNCHANGED + badge on chats icon) ── */}
        <div className="w-16 bg-slate-950 border-r border-slate-800 flex flex-col items-center pt-8 gap-9 z-10 flex-shrink-0">
          {[
            { key: 'chats', icon: <MessageCircle className="w-6 h-6" />, badge: totalUnread },
            { key: 'contacts', icon: <UsersIcon className="w-6 h-6" /> },
            { key: 'templates', icon: <FileText className="w-6 h-6" /> },
            { key: 'analytics', icon: <BarChart3 className="w-6 h-6" /> },
          ].map(({ key, icon, badge }) => (
            <div
              key={key}
              onClick={() => setActiveNav(key as any)}
              className={`relative p-3 rounded-2xl cursor-pointer transition-all hover:bg-slate-900 ${
                activeNav === key ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {icon}
              {/* Notification badge - only show when unread count > 0 */}
              {badge !== undefined && badge > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold min-w-[18px] h-[18px] px-1 rounded-full flex items-center justify-center">
                  {badge > 99 ? '99+' : badge}
                </span>
              )}
            </div>
          ))}
          <div className="mt-auto mb-8">
            <div className="p-3 rounded-2xl cursor-pointer text-slate-400 hover:text-slate-200 hover:bg-slate-900 transition-all">
              <Settings className="w-6 h-6" />
            </div>
          </div>
        </div>

        {/* ── CHATS VIEW ── */}
        {activeNav === 'chats' && (
          <>
            {/* Chat List Sidebar */}
            <div
              className="flex border-r border-slate-800 bg-slate-950 flex-col flex-shrink-0"
              style={{
                width: `${chatListWidth}px`,
                maxWidth: `${chatListWidth}px`,
              }}
            >
              <div className="p-4 border-b border-slate-800">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="font-semibold">My Chats</div>
                    <div className="px-2 py-0.5 text-xs bg-blue-500/20 text-blue-400 rounded">
                      {chats.length} Open
                    </div>
                  </div>
                  <button className="text-slate-400 hover:text-white">
                    <CheckCircle className="w-4 h-4" />
                  </button>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-3 text-slate-500 w-4 h-4" />
                  <input
                    type="text"
                    placeholder="Search visitors or messages..."
                    className="w-full bg-slate-900 border border-slate-700 pl-10 py-2.5 rounded-xl text-sm focus:outline-none focus:border-blue-500 transition-colors"
                    value={searchTerm}
                    onChange={e => setSearchTerm(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto py-2 custom-scroll">
                {chats.length === 0 ? (
                  <div className="px-6 py-12 text-center text-slate-400">
                    <MessageCircle className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                    <div className="font-medium mb-1">No active chats</div>
                    <div className="text-xs text-slate-500">Waiting for visitors...</div>
                  </div>
                ) : (
                  <AnimatePresence>
                    {filteredChats.map((chat, index) => (
                      <motion.div
                        key={chat.visitorId}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.02 }}
                        className={`group px-4 py-3 mx-2 rounded-2xl flex gap-3 cursor-pointer transition-all hover:bg-slate-900 ${
                          currentChatId === chat.visitorId ? 'bg-slate-900' : ''
                        }`}
                      >
                        <div
                          onClick={() => selectChat(chat.visitorId)}
                          className="w-10 h-10 rounded-2xl flex-shrink-0 flex items-center justify-center text-white text-sm font-medium"
                          style={{ backgroundColor: getVisitorColor(chat.visitorId) }}
                        >
                          {getVisitorNumber(chat.visitorId).replace('#', '')}
                        </div>
                        <div 
                          onClick={() => selectChat(chat.visitorId)}
                          className="flex-1 min-w-0"
                        >
                          <div className="flex justify-between items-baseline">
                            <div className="font-medium truncate">
                              Visitor {getVisitorNumber(chat.visitorId)}
                            </div>
                            <div className="text-xs text-slate-500 whitespace-nowrap ml-2">{chat.time}</div>
                          </div>
                          <div className="text-sm text-slate-400 truncate mt-0.5">
                            {chat.isTyping
                              ? <span className="text-blue-400 italic">typing...</span>
                              : chat.lastMessage
                            }
                          </div>
                        </div>
                        {chat.unread > 0 ? (
                          <div className="bg-blue-600 text-white text-[10px] px-1.5 rounded-full h-5 flex items-center justify-center mt-1 font-medium flex-shrink-0">
                            {chat.unread}
                          </div>
                        ) : (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteChat(chat.visitorId);
                            }}
                            className="opacity-0 group-hover:opacity-100 p-1.5 rounded-lg text-slate-500 hover:text-red-400 hover:bg-red-400/10 transition-all flex-shrink-0 mt-1"
                            title="Delete chat"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                )}
              </div>

              <div className="p-4 border-t border-slate-800 text-xs text-slate-500 flex items-center gap-2">
                <div className="flex-1">{chats.length} conversations active</div>
                <button
                  onClick={endChat}
                  disabled={!currentChat}
                  className="text-xs px-3 py-1 bg-red-500/10 hover:bg-red-500/20 text-red-400 rounded-lg disabled:opacity-40"
                >
                  End Current
                </button>
              </div>
            </div>

            {/* Resize Handle */}
            <div
              onMouseDown={handleMouseDown}
              className={`w-1 bg-slate-800 hover:bg-blue-500 cursor-col-resize transition-colors relative group ${isResizing ? 'bg-blue-500' : ''}`}
              style={{ flexShrink: 0 }}
            >
              <div className="absolute inset-y-0 -left-1 -right-1" />
            </div>

            {/* Main Chat Area */}
            <div className="flex flex-1 flex-col min-w-0 overflow-hidden">

              {/* Chat Header */}
              {currentChat && (
                <div className="h-16 border-b border-slate-800 bg-slate-950 px-6 flex items-center justify-between flex-shrink-0">
                  <div className="flex items-center gap-4 min-w-0">
                    <div
                      className="w-9 h-9 rounded-2xl flex items-center justify-center text-white flex-shrink-0"
                      style={{ backgroundColor: getVisitorColor(currentChat.visitorId) }}
                    >
                      {getVisitorNumber(currentChat.visitorId).replace('#', '')}
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold flex items-center gap-2 truncate">
                        <span className="truncate">
                          Visitor {getVisitorNumber(currentChat.visitorId)}
                        </span>
                        <span className="flex items-center text-xs px-2 py-px rounded bg-emerald-500/20 text-emerald-400 flex-shrink-0">
                          <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full mr-1 inline-block" />
                          <span>ONLINE</span>
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 flex items-center gap-1">
                        {currentChat.isTyping
                          ? <span className="text-blue-400 italic">typing...</span>
                          : <><Clock className="w-3 h-3" /> Last active moments ago</>
                        }
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={endChat}
                      className="flex items-center gap-2 px-4 py-1.5 bg-slate-900 hover:bg-red-900/50 text-red-400 hover:text-red-300 rounded-xl text-sm transition-colors"
                    >
                      <X className="w-4 h-4" />
                      <span>End Chat</span>
                    </button>
                    <button
                      onClick={() => setShowVisitorInfo(prev => !prev)}
                      className={`p-2 rounded-xl transition-colors ${
                        showVisitorInfo
                          ? 'text-blue-400 bg-blue-600/15 hover:bg-blue-600/25'
                          : 'text-slate-400 hover:text-white hover:bg-slate-900'
                      }`}
                    >
                      <MoreVertical className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              )}

              {/* Messages */}
              <div
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-6 bg-[#0a0f1c] custom-scroll"
              >
                {!currentChat ? (
                  <div className="h-full flex flex-col items-center justify-center text-center">
                    <Users className="w-20 h-20 text-slate-600 mx-auto mb-4" />
                    <h3 className="text-2xl font-light text-slate-300 mb-2">
                      Select a conversation
                    </h3>
                    <p className="max-w-xs text-slate-500 text-base">
                      Choose from the list on the left to start chatting
                    </p>
                  </div>
                ) : (
                  <div className="max-w-3xl mx-auto flex flex-col gap-1">
                    <AnimatePresence>
                      {currentChat.messages.map((msg, index) => (
                        <motion.div
                          key={msg.id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: Math.min(index * 0.025, 0.6) }}
                        >
                          {msg.type === 'system' ? (
                            /* System message */
                            <div className="text-center text-xs text-slate-500 py-3 italic">
                              {msg.text}
                            </div>
                          ) : msg.isAgent ? (
                            /* ── Agent bubble — matches website user bubble layout ── */
                            <div className="flex flex-col items-end w-full">
                              <div className="flex items-end gap-1.5 max-w-[90%]">
                                <span className="text-[10px] font-medium text-slate-500 mb-1 flex-shrink-0">
                                  {msg.time}
                                </span>
                                <div className="bg-blue-600 text-white px-3 py-2 rounded-2xl text-[15px] font-normal leading-snug break-words">
                                  {msg.text}
                                </div>
                              </div>
                            </div>
                          ) : (
                            /* ── Visitor bubble — matches website agent bubble layout ── */
                            <div className="flex flex-col items-start w-full">
                              <div className="flex items-end gap-1.5 max-w-[90%]">
                                <div
                                  className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-medium mb-1"
                                  style={{ backgroundColor: getVisitorColor(currentChat.visitorId) }}
                                >
                                  {getVisitorNumber(currentChat.visitorId).replace('#', '').slice(-2)}
                                </div>
                                <div className="bg-slate-700 text-slate-100 px-3 py-2 rounded-2xl text-[15px] font-normal leading-snug break-words">
                                  {msg.imageUrl && (
                                    <img
                                      src={msg.imageUrl}
                                      alt="Shared"
                                      className="max-w-[200px] rounded-xl mb-1 border border-slate-600"
                                    />
                                  )}
                                  {msg.text}
                                </div>
                                <span className="text-[10px] font-medium text-slate-500 mb-1 flex-shrink-0">
                                  {msg.time}
                                </span>
                              </div>
                            </div>
                          )}
                        </motion.div>
                      ))}
                    </AnimatePresence>

                    {/* Visitor typing indicator */}
                    {currentChat.isTyping && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="flex flex-col items-start w-full"
                      >
                        <div className="flex items-end gap-1.5 max-w-[90%]">
                          <div
                            className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-white text-xs font-medium mb-1"
                            style={{ backgroundColor: getVisitorColor(currentChat.visitorId) }}
                          >
                            {getVisitorNumber(currentChat.visitorId).replace('#', '').slice(-2)}
                          </div>
                          <div className="bg-slate-700 text-slate-100 px-4 py-3 rounded-2xl flex items-center gap-1">
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                            <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}
              </div>

              {/* Input Area */}
              {currentChat && (
                <div className="border-t border-slate-800 bg-slate-950 p-4 flex-shrink-0">
                  <div className="max-w-3xl mx-auto">

                    {/* Action buttons row */}
                    <div className="flex gap-2 mb-3 px-1 flex-wrap">
                      <button
                        onClick={() => setShowTransferModal(true)}
                        className="text-xs px-4 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full transition-all active:scale-[0.985] flex items-center gap-1.5"
                      >
                        <ArrowRightLeft className="w-3 h-3" /> Transfer
                      </button>
                      <button
                        onClick={handleSendDocumentWidget}
                        className="text-xs px-4 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full transition-all active:scale-[0.985] flex items-center gap-1.5"
                      >
                        <File className="w-3 h-3" /> Document
                      </button>
                      <button
                        onClick={() => setShowLinkModal(true)}
                        className="text-xs px-4 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-full transition-all active:scale-[0.985] flex items-center gap-1.5"
                      >
                        <Link className="w-3 h-3" /> Link
                      </button>
                    </div>

                    {/* Message input */}
                    <div className="flex items-end bg-slate-900 border border-slate-700 focus-within:border-blue-600 rounded-3xl px-5 py-1 transition-all">
                      <button className="text-slate-400 hover:text-slate-200 p-2 -ml-1">
                        <Smile className="w-5 h-5" />
                      </button>
                      <button className="text-slate-400 hover:text-slate-200 p-2">
                        <Paperclip className="w-5 h-5" />
                      </button>
                      <textarea
                        ref={textareaRef}
                        value={messageInput}
                        onChange={e => handleTyping(e.target.value)}
                        onKeyDown={handleKeyPress}
                        placeholder="Type a message here..."
                        rows={1}
                        className="flex-1 bg-transparent px-4 py-3 text-[15px] placeholder:text-slate-500 focus:outline-none resize-none max-h-32 overflow-y-auto custom-scroll"
                        style={{ wordWrap: 'break-word', whiteSpace: 'pre-wrap', minHeight: 'auto' }}
                      />
                      <button
                        onClick={handleSendMessage}
                        disabled={!messageInput.trim()}
                        className="w-9 h-9 flex items-center justify-center bg-blue-600 disabled:bg-slate-700 hover:bg-blue-500 rounded-2xl transition-colors disabled:cursor-not-allowed flex-shrink-0 mb-0.5"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    </div>
                    <div className="text-center text-[10px] text-slate-500 mt-2">
                      All conversations are monitored for quality
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Visitor Info Panel (UNCHANGED) */}
            <AnimatePresence>
              {showVisitorInfo && (
                <VisitorInfoPanel
                  currentChat={currentChat}
                  onClose={() => setShowVisitorInfo(false)}
                />
              )}
            </AnimatePresence>
          </>
        )}

        {/* Other views (UNCHANGED) */}
        {activeNav === 'contacts' && <ContactsPage />}
        {activeNav === 'templates' && <TemplatesPage />}
        {activeNav === 'analytics' && <AnalyticsPage />}
      </div>

      {/* NEW modals */}
      <AnimatePresence>
        {showTransferModal && (
          <TransferAgentModal
            onTransfer={handleTransferAgent}
            onClose={() => setShowTransferModal(false)}
          />
        )}
        {showLinkModal && (
          <SendLinkModal
            onSend={handleSendLinkWidget}
            onClose={() => setShowLinkModal(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── App Wrapper with Auth ────────────────────────────────────────────────────

function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(() => {
    return localStorage.getItem('desk-chat-auth') === 'true';
  });
  const [isLocked, setIsLocked] = useState(false);

  const inactivityTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const INACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds

  const handleLock = useCallback(() => {
    setIsLocked(true);
  }, []);

  const handleUnlock = useCallback(() => {
    setIsLocked(false);
  }, []);

  const resetInactivityTimer = useCallback(() => {
    // Clear existing timer
    if (inactivityTimerRef.current) {
      clearTimeout(inactivityTimerRef.current);
    }

    // Only set timer if authenticated and remember me is NOT enabled
    const rememberMe = localStorage.getItem('desk-chat-remember-me') === 'true';
    if (isAuthenticated && !rememberMe && !isLocked) {
      inactivityTimerRef.current = setTimeout(() => {
        handleLock();
      }, INACTIVITY_TIMEOUT);
    }
  }, [isAuthenticated, isLocked, handleLock, INACTIVITY_TIMEOUT]);

  // Setup activity listeners
  useEffect(() => {
    if (!isAuthenticated || isLocked) return;

    // Don't auto-lock if remember me is enabled
    if (localStorage.getItem('desk-chat-remember-me') === 'true') return;

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];

    // Reset timer on any activity
    events.forEach(event => {
      document.addEventListener(event, resetInactivityTimer);
    });

    // Start the initial timer
    resetInactivityTimer();

    // Cleanup
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, resetInactivityTimer);
      });
      if (inactivityTimerRef.current) {
        clearTimeout(inactivityTimerRef.current);
      }
    };
  }, [isAuthenticated, isLocked, resetInactivityTimer]);

  // First time - not authenticated at all
  if (!isAuthenticated) {
    return (
      <AnimatePresence>
        <LoginModal onLoginSuccess={() => setIsAuthenticated(true)} />
      </AnimatePresence>
    );
  }

  // Authenticated - always render AdminPanel
  // If locked, show lock overlay on top without unmounting AdminPanel
  return (
    <>
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
      >
        <AdminPanel />
      </motion.div>
      
      {/* Lock screen overlay - AdminPanel stays mounted underneath */}
      <AnimatePresence>
        {isLocked && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            transition={{ duration: 0.3 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9999,
              background: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <LoginModal onLoginSuccess={handleUnlock} isLockScreen />
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default App;
