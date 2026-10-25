import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { ChatbotModal } from './ChatbotModal';

export function FloatingChatButton() {
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        style={{
          bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
        }}
        className={[
          'fixed right-4 z-40',
          'h-12 w-12 rounded-full',
          'bg-transparent hover:bg-transparent text-white',
          'shadow-none hover:shadow-none border-0',
          'flex items-center justify-center',
          'transition-transform duration-200 hover:scale-105 active:scale-95',
          'focus:outline-none focus:ring-4 focus:ring-[var(--color-primary-300)]',
        ].join(' ')}
        aria-label={t('chatbot.open_assistant', 'Open AI Help Assistant')}
      >
        <img
          src="/images/chat-mascot.png"
          alt=""
          className="h-12 w-12 object-contain drop-shadow-xl transition-transform duration-200 hover:scale-110"
        />
      </button>

      <ChatbotModal isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </>
  );
}
