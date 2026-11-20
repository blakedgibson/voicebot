import { Textarea } from '@/components/ui/textarea';
import { useEffect, useState, useRef } from 'react';
import DOMPurify from 'dompurify';

interface SyntaxHighlightedTextareaProps {
  id?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLTextAreaElement>) => void;
  placeholder?: string;
  className?: string;
  'data-testid'?: string;
}

export function SyntaxHighlightedTextarea({
  id,
  value,
  onChange,
  placeholder,
  className,
  'data-testid': dataTestId
}: SyntaxHighlightedTextareaProps) {
  const [highlightedHtml, setHighlightedHtml] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);

  // Custom function names to highlight (from retellFunctionsConfig.ts)
  const functionNames = [
    'place_order',
    'create_reservation',
    'schedule_delivery',
    'book_calendar_event',
    'book_appointment',
    'modify_appointment',
    'update_service',
    'add_client_note',
    'modify_reservation',
    'book_event',
    'check_availability',
    'request_prescription_refill',
    'send_sms_reminder',
    'update_patient_record',
    'book_service',
    'request_estimate',
    'update_service_status',
    'log_customer_request',
    'update_service_request',
    'log_feedback',
    'transfer_call',
    'transfer_to_human',
    'sms_order_confirmation',
    'sms_reservation_confirmation',
    'sms_delivery_tracking',
    'sms_catering_confirmation',
    'sms_general_confirmation',
    'collect_feedback'
  ];

  useEffect(() => {
    const highlightFunctions = (text: string): string => {
      if (!text) return '';

      let highlighted = text;

      // Escape HTML characters first
      highlighted = highlighted
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

      // Highlight each function name
      functionNames.forEach(funcName => {
        // Match function name as a standalone word (not part of another word)
        const regex = new RegExp(`\\b(${funcName})\\b`, 'g');
        highlighted = highlighted.replace(
          regex,
          '<span class="text-blue-400 font-semibold">$1</span>'
        );
      });

      // Preserve line breaks and spaces
      highlighted = highlighted
        .replace(/\n/g, '<br/>')
        .replace(/  /g, '&nbsp;&nbsp;');

      return highlighted;
    };

    setHighlightedHtml(highlightFunctions(value));
  }, [value]);

  // Sync scroll between textarea and highlight div
  const handleScroll = () => {
    if (textareaRef.current && highlightRef.current) {
      highlightRef.current.scrollTop = textareaRef.current.scrollTop;
      highlightRef.current.scrollLeft = textareaRef.current.scrollLeft;
    }
  };

  return (
    <div className="relative">
      {/* Highlighted background */}
      <div
        ref={highlightRef}
        className={`absolute top-0 left-0 right-0 bottom-0 pointer-events-none overflow-hidden whitespace-pre-wrap break-words ${className || ''}`}
        style={{
          padding: '0.75rem', // Match textarea padding
          fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
          fontSize: '0.875rem',
          lineHeight: '1.5',
          color: 'transparent',
          zIndex: 1
        }}
      >
        <div
          dangerouslySetInnerHTML={{
            __html: DOMPurify.sanitize(
              highlightedHtml || (placeholder ? `<span class="text-gray-500">${DOMPurify.sanitize(placeholder)}</span>` : '')
            )
          }}
        />
      </div>

      {/* Actual textarea */}
      <Textarea
        ref={textareaRef}
        id={id}
        value={value}
        onChange={onChange}
        onScroll={handleScroll}
        placeholder={placeholder}
        className={`relative bg-transparent caret-white ${className || ''}`}
        style={{
          zIndex: 2,
          color: value ? 'white' : 'transparent'
        }}
        data-testid={dataTestId}
      />
    </div>
  );
}
