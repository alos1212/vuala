import { useEffect } from 'react';
import { usePageStore } from '../../stores/usePageStore';

export const LayoutAuth = ({ children }: { children: React.ReactNode }) => {
    const layoutPage = usePageStore((state) => state.page);

    useEffect(() => {
        const domainStyles: Record<string, string> = {
            '2': '/styles/page2.css',
        };

        const cssFile = domainStyles[layoutPage] || '/styles/page1.css';
        const currentLink = document.getElementById('dynamic-css') as HTMLLinkElement | null;

        if (currentLink?.href?.endsWith(cssFile)) {
            return;
        }

        if (currentLink) {
            currentLink.remove();
        }

        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = cssFile;
        link.id = 'dynamic-css';
        document.head.appendChild(link);

        return () => {
            const mountedLink = document.getElementById('dynamic-css');
            if (mountedLink?.getAttribute('href') === cssFile) {
                mountedLink.remove();
            }
        };
    }, [layoutPage]);

    if (layoutPage === '1') {
        return (
            <div className="relative min-h-screen w-full bg-image-login flex items-center justify-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(196,181,253,0.18),transparent_28%),linear-gradient(135deg,rgba(24,9,46,0.82),rgba(76,29,149,0.72),rgba(17,24,39,0.78))]" />
                <div className="relative z-10 w-full max-w-md px-6">
                    <div className="rounded-[28px] border border-white/12 bg-[#1f1238]/82 p-8 text-white shadow-[0_30px_80px_rgba(24,9,46,0.45)] backdrop-blur-xl">
                        <div className="flex justify-center mb-6">
                            <div className="logo-login" />
                        </div>
                        <div>{children}</div>
                    </div>
                </div>
            </div>
        );
    }

    return <div>{children}</div>;
};
