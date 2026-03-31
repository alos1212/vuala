import React from "react";
import { FaWhatsapp } from "react-icons/fa";

const WHATSAPP_NUMBER = "+573243836336";
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER.replace(/\D/g, "")}`;

const WhatsAppFloatingButton: React.FC = () => {
  return (
    <a
      href={WHATSAPP_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="whatsapp-floating-button fixed bottom-4 right-4 md:bottom-6 md:right-6 z-40 group"
      aria-label="Abrir chat de WhatsApp"
      title="Chatear por WhatsApp"
    >
      <div className="flex items-center gap-2 rounded-full bg-[#25D366] text-white px-4 py-3 shadow-2xl ring-2 ring-white transition-transform duration-200 group-hover:scale-105">
        <FaWhatsapp className="text-2xl" />
        <span className="font-semibold text-sm whitespace-nowrap">WhatsApp</span>
      </div>
    </a>
  );
};

export default WhatsAppFloatingButton;
