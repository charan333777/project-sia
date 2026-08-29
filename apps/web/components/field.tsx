import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";

type CommonProps = { label: string; hint?: string; error?: string };

export function TextField({ label, hint, error, id, ...props }: CommonProps & InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        {hint && <span>{hint}</span>}
      </div>
      <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

export function TextAreaField({ label, hint, error, id, ...props }: CommonProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <div className="field">
      <div className="field-label-row">
        <label htmlFor={id}>{label}</label>
        {hint && <span>{hint}</span>}
      </div>
      <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...props} />
      {error && <p className="field-error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}
