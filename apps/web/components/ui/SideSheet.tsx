'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';

interface SideSheetProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    children: React.ReactNode;
}

export function SideSheet({ isOpen, onClose, title, children }: SideSheetProps) {
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'auto';
        }
        return () => {
            document.body.style.overflow = 'auto';
        };
    }, [isOpen]);

    if (!isOpen) return null;

    const content = (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity">
            <div
                className="w-full max-w-xl h-full bg-bg flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-right duration-300"
                role="dialog"
                aria-modal="true"
            >
                <div className="flex items-center justify-between border-b border-border p-6">
                    <h2 className="text-xl font-semibold text-text">{title}</h2>
                    <button
                        onClick={onClose}
                        className="rounded-full p-2 text-text-muted transition-colors hover:bg-bg-muted hover:text-text focus:outline-none"
                        aria-label="Cerrar"
                    >
                        ✕
                    </button>
                </div>
                <div className="flex-1 overflow-y-auto p-6">
                    {children}
                </div>
            </div>
        </div>
    );

    if (typeof document === 'undefined') return null;
    return createPortal(content, document.body);
}
