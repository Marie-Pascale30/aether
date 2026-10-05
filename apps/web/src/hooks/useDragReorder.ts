"use client";

import { useState, type DragEvent } from "react";

/**
 * Réordonnancement par glisser-déposer natif (HTML5) pour une liste d'identifiants.
 * À compléter par des boutons ↑ ↓ : le glisser-déposer n'est pas accessible au clavier.
 */
export function useDragReorder(ids: string[], onReorder: (ids: string[]) => void) {
    const [dragged, setDragged] = useState<string | null>(null);
    const [over, setOver] = useState<string | null>(null);

    const rowProps = (id: string) => ({
        draggable: true,
        "data-dragging": dragged === id || undefined,
        "data-drop-target": (over === id && dragged !== id) || undefined,
        onDragStart: (event: DragEvent) => {
            setDragged(id);
            event.dataTransfer.effectAllowed = "move";
            event.dataTransfer.setData("text/plain", id);
        },
        onDragOver: (event: DragEvent) => {
            if (!dragged) return;
            event.preventDefault(); // autorise le dépôt
            event.dataTransfer.dropEffect = "move";
            setOver(id);
        },
        onDragLeave: () => setOver((current) => (current === id ? null : current)),
        onDrop: (event: DragEvent) => {
            event.preventDefault();
            if (dragged && dragged !== id) {
                const next = ids.filter((other) => other !== dragged);
                next.splice(next.indexOf(id) + (ids.indexOf(dragged) < ids.indexOf(id) ? 1 : 0), 0, dragged);
                onReorder(next);
            }
            setDragged(null);
            setOver(null);
        },
        onDragEnd: () => {
            setDragged(null);
            setOver(null);
        },
    });

    return { rowProps, dragging: dragged !== null };
}
