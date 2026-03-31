
import { usePageStore } from '../../stores/usePageStore';

export const LayoutAuth = ({ children }: { children: React.ReactNode }) => {
    const layoutPage = usePageStore.getState().page;

    if (layoutPage === '1') {
        return (
            <div className="relative min-h-screen w-full bg-image-login flex items-center justify-center">
                {/* Capa para mejorar la legibilidad sobre la imagen */}
                <div className="absolute inset-0 bg-base-100/40 backdrop-blur-sm" />
                <div className="relative z-10 w-full max-w-md px-6">
                    <div className="bg-base-100/90 rounded-2xl shadow-2xl p-8">
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
