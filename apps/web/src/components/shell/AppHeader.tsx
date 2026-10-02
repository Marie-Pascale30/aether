"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMe } from "@/lib/queries";
import { useSound } from "@/lib/sound/SoundProvider";
import styles from "./AppHeader.module.css";

const LINKS = [
    { href: "/mondes", label: "Mondes" },
    { href: "/classement", label: "Classement" },
];

export function AppHeader() {
    const pathname = usePathname();
    const { data: me } = useMe();
    const { muted, toggleMuted } = useSound();

    const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
    const links = [
        ...LINKS,
        ...(me?.role === "ADMIN" ? [{ href: "/admin/niveaux", label: "Éditeur" }] : []),
    ];

    return (
        <header className={styles.header}>
            <Link href="/" className={styles.logo}>
                AETHER
            </Link>

            <nav className={styles.nav} aria-label="Navigation principale">
                {links.map((link) => (
                    <Link key={link.href} href={link.href} aria-current={isActive(link.href) ? "page" : undefined}>
                        {link.label}
                    </Link>
                ))}
            </nav>

            <div className={styles.aside}>
                <button
                    type="button"
                    className={styles.sound}
                    onClick={toggleMuted}
                    aria-pressed={!muted}
                    title={muted ? "Activer le son" : "Couper le son"}
                >
                    <span aria-hidden>{muted ? "🔇" : "🔊"}</span>
                    <span className="visually-hidden">Son</span>
                </button>

                {me && !me.isGuest ? (
                    <Link href="/profil" className={styles.account} aria-current={isActive("/profil") ? "page" : undefined}>
                        {me.displayName}
                    </Link>
                ) : (
                    <Link href={me ? "/inscription" : "/connexion"} className={styles.account}>
                        {me ? "Sauvegarder ma progression" : "Connexion"}
                    </Link>
                )}
            </div>
        </header>
    );
}
