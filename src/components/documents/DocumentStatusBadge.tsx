import React from 'react';
import { 
  FileBadge2, 
  ShieldCheck, 
  Receipt, 
  BookOpen, 
  Umbrella, 
  Camera, 
  FileText,
  HardDrive,
  Clock,
  Loader2,
  HelpCircle,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  File
} from 'lucide-react';
import { Document } from '../../types';
import { 
  getDocumentCategory, 
  getDocumentPresentationState,
  UICategoryDefinition,
  DocumentPresentationState 
} from '../../lib/documentPresentation';

interface DocumentStatusBadgeProps {
  document: Document;
  showIcon?: boolean;
  size?: 'sm' | 'md';
}

export const DocumentStatusBadge: React.FC<DocumentStatusBadgeProps> = ({
  document,
  showIcon = true,
  size = 'sm'
}) => {
  const state: DocumentPresentationState = getDocumentPresentationState(document);

  const renderIcon = () => {
    if (!showIcon) return null;
    const iconClass = size === 'sm' ? 'w-3.5 h-3.5 mr-1.5' : 'w-4 h-4 mr-1.5';

    switch (state.iconName) {
      case 'HardDrive':
        return <HardDrive className={iconClass} />;
      case 'Clock':
        return <Clock className={iconClass} />;
      case 'Loader2':
        return <Loader2 className={`${iconClass} animate-spin`} />;
      case 'HelpCircle':
        return <HelpCircle className={iconClass} />;
      case 'CheckCircle2':
        return <CheckCircle2 className={iconClass} />;
      case 'AlertTriangle':
        return <AlertTriangle className={iconClass} />;
      case 'XCircle':
        return <XCircle className={iconClass} />;
      default:
        return <File className={iconClass} />;
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'px-2.5 py-0.5 text-xs font-medium' 
    : 'px-3 py-1 text-sm font-medium';

  return (
    <span 
      id={`doc-status-${document.document_id}`}
      className={`inline-flex items-center rounded-full border ${sizeClasses} ${state.badgeStyle} transition-colors`}
      title={state.description}
    >
      {renderIcon()}
      <span className="whitespace-nowrap">{state.label}</span>
    </span>
  );
};

interface DocumentCategoryBadgeProps {
  document: Document;
  size?: 'sm' | 'md';
}

export const DocumentCategoryBadge: React.FC<DocumentCategoryBadgeProps> = ({
  document,
  size = 'sm'
}) => {
  const category: UICategoryDefinition = getDocumentCategory(document);

  const renderIcon = () => {
    const iconClass = size === 'sm' ? 'w-3 h-3 mr-1' : 'w-3.5 h-3.5 mr-1.5';
    switch (category.iconName) {
      case 'FileBadge2':
        return <FileBadge2 className={iconClass} />;
      case 'ShieldCheck':
        return <ShieldCheck className={iconClass} />;
      case 'Receipt':
        return <Receipt className={iconClass} />;
      case 'BookOpen':
        return <BookOpen className={iconClass} />;
      case 'Umbrella':
        return <Umbrella className={iconClass} />;
      case 'Camera':
        return <Camera className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  const sizeClasses = size === 'sm' 
    ? 'px-2 py-0.5 text-[11px] font-medium' 
    : 'px-2.5 py-1 text-xs font-medium';

  return (
    <span
      id={`doc-cat-${document.document_id}`}
      className={`inline-flex items-center rounded-md bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 ${sizeClasses}`}
    >
      {renderIcon()}
      <span className="whitespace-nowrap">{category.badgeLabel}</span>
    </span>
  );
};
