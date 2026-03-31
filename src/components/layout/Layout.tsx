// src/components/Layout.tsx
import { useEffect } from 'react';
import { usePageStore } from '../../stores/usePageStore';
import WhatsAppFloatingButton from '../ui/WhatsAppFloatingButton';

export const Layout = ({ children }: { children: React.ReactNode }) => {
  const pageMain = usePageStore.getState().page;
  useEffect(() => {
    const domainStyles: Record<string, string> = {
        '2': '/styles/page2.css',
      };
      // Determina qué archivo CSS cargar
      const cssFile = domainStyles[pageMain] || '/styles/page1.css';

      // Crea un elemento link para cargar el CSS
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = cssFile;
      link.id = 'dynamic-css'; // Asigna un ID para poder reemplazarlo más tarde si es necesario

      // Elimina cualquier CSS dinámico previamente cargado
      const oldLink = document.getElementById('dynamic-css');
      if (oldLink) {
        document.head.removeChild(oldLink);
      }
      document.head.appendChild(link);
  }, []);

  return (
    <>
      {children}
      <WhatsAppFloatingButton />
    </>
  );
};
