import Link from "next/link";
import type { ButtonHTMLAttributes, ComponentProps } from "react";
import styles from "./ui.module.css";

type Variant = "default" | "primary" | "ghost" | "danger";

const classes = (variant: Variant, className?: string) =>
    [styles.btn, variant !== "default" && styles[variant], className].filter(Boolean).join(" ");

export function Button({
    variant = "default",
    className,
    type = "button",
    ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant }) {
    return <button type={type} className={classes(variant, className)} {...props} />;
}

export function ButtonLink({
    variant = "default",
    className,
    ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
    return <Link className={classes(variant, className)} {...props} />;
}
