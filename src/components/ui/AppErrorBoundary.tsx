import React from 'react';

type AppErrorBoundaryState = {
  hasError: boolean;
  errorMessage: string;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  constructor(props: React.PropsWithChildren) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: unknown): AppErrorBoundaryState {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido en la interfaz.';
    return {
      hasError: true,
      errorMessage,
    };
  }

  componentDidCatch(error: unknown, errorInfo: React.ErrorInfo) {
    console.error('AppErrorBoundary capturó un error:', error, errorInfo);
  }

  handleReload = () => {
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-base-200 flex items-center justify-center p-6">
          <div className="w-full max-w-2xl rounded-3xl border border-error/20 bg-base-100 p-6 shadow">
            <h1 className="text-2xl font-bold text-error">Se produjo un error en la aplicacion</h1>
            <p className="mt-2 text-base-content/70">
              La interfaz se detuvo para evitar una pantalla en blanco. Puedes recargar y revisar el mensaje tecnico.
            </p>
            <div className="mt-4 rounded-2xl bg-base-200 p-4 text-sm font-mono text-base-content/80 break-words">
              {this.state.errorMessage}
            </div>
            <div className="mt-6 flex justify-end">
              <button className="btn btn-primary" onClick={this.handleReload}>
                Recargar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default AppErrorBoundary;
