"use client";

import ChatWidget from '../components/ChatWidget';

export default function WidgetPage() {
  return (
    <div className="widget-container">
      <ChatWidget />
      <style jsx global>{`
        body {
          margin: 0;
          padding: 0;
          background: transparent;
        }
        .widget-container {
          position: relative;
          width: 100%;
          height: 100vh;
        }
      `}</style>
    </div>
  );
} 