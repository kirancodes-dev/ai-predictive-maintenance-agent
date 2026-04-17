import React, { useState } from 'react';

interface DateRangePickerProps {
  from: string;
  to: string;
  onChange: (from: string, to: string) => void;
}

const DateRangePicker: React.FC<DateRangePickerProps> = ({ from, to, onChange }) => {
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  const handleApply = () => onChange(localFrom, localTo);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
      <label style={{ fontSize: '0.8125rem' }}>
        From
        <input
          type="datetime-local"
          value={localFrom}
          onChange={e => setLocalFrom(e.target.value)}
          style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}
        />
      </label>
      <label style={{ fontSize: '0.8125rem' }}>
        To
        <input
          type="datetime-local"
          value={localTo}
          onChange={e => setLocalTo(e.target.value)}
          style={{ marginLeft: '0.5rem', padding: '0.25rem 0.5rem', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-sm)', fontSize: '0.8125rem' }}
        />
      </label>
      <button
        onClick={handleApply}
        style={{ padding: '0.375rem 1rem', background: 'var(--color-primary)', color: '#fff', border: 'none', borderRadius: 'var(--radius-md)', cursor: 'pointer', fontSize: '0.875rem' }}
      >
        Apply
      </button>
    </div>
  );
};

export default DateRangePicker;
