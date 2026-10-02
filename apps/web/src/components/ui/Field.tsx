import { useId, type InputHTMLAttributes, type TextareaHTMLAttributes } from "react";
import styles from "./ui.module.css";

interface FieldProps {
    label: string;
    error?: string;
    hint?: string;
}

export function Field({ label, error, hint, ...input }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
    const id = useId();
    return (
        <div className={styles.field}>
            <label htmlFor={id}>{label}</label>
            <input id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...input} />
            <FieldMessage id={id} error={error} hint={hint} />
        </div>
    );
}

export function TextArea({ label, error, hint, ...input }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const id = useId();
    return (
        <div className={styles.field}>
            <label htmlFor={id}>{label}</label>
            <textarea id={id} aria-invalid={Boolean(error)} aria-describedby={error ? `${id}-error` : undefined} {...input} />
            <FieldMessage id={id} error={error} hint={hint} />
        </div>
    );
}

function FieldMessage({ id, error, hint }: { id: string; error?: string; hint?: string }) {
    if (error) return <small id={`${id}-error`} className={styles.fieldError}>{error}</small>;
    if (hint) return <small className={styles.fieldHint}>{hint}</small>;
    return null;
}
