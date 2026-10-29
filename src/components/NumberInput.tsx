import { useEffect, useState, type InputHTMLAttributes } from 'react';

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> & {
  value: number;
  onChange: (n: number) => void;
};

// Keeps its own text so in-progress input like "1." or "" isn't clobbered on re-render.
export function NumberInput({ value, onChange, ...rest }: Props) {
  const [text, setText] = useState(String(value));
  useEffect(() => {
    if (parseFloat(text) !== value && !(text === '' && value === 0)) setText(String(value));
  }, [value]); // only resync when the value changes from outside
  return (
    <input
      {...rest}
      type="number"
      inputMode="decimal"
      value={text}
      onChange={(e) => {
        setText(e.target.value);
        const n = parseFloat(e.target.value);
        onChange(Number.isFinite(n) ? n : 0);
      }}
    />
  );
}
