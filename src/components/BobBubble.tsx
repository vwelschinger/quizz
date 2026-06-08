'use client';

// Bulle de texte de Bob — décorative, autonome (style affiche constructiviste).
// Usage : <BobBubble tail="left">Salut camarade !</BobBubble>
import './bob-bubble.css';
import type { ReactNode } from 'react';

export default function BobBubble({
  children,
  eyebrow = 'BOB DIT',
  tail = 'left',
}: {
  children: ReactNode;
  eyebrow?: string;
  tail?: 'left' | 'right';
}) {
  return (
    <div className={`bob-bubble${tail === 'right' ? ' bob-bubble--right' : ''}`}>
      {eyebrow ? <p className="bob-bubble__eyebrow">{eyebrow}</p> : null}
      <p className="bob-bubble__text">{children}</p>
      <span className="bob-bubble__tail" />
    </div>
  );
}
