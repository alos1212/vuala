import React from 'react';

const PrivacyPolicyPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-base-200 py-10 px-4">
      <div className="mx-auto max-w-4xl rounded-3xl border border-base-300 bg-base-100 p-6 shadow md:p-10">
        <h1 className="text-3xl font-bold">Política de Privacidad de VualaCRM</h1>
        <p className="mt-2 text-sm text-base-content/60">
          Última actualización: 8 de abril de 2026
        </p>

        <div className="mt-6 space-y-5 text-sm leading-7 md:text-base">
          <section>
            <h2 className="text-lg font-semibold">1. Responsable del tratamiento</h2>
            <p>
              VualaCRM es la plataforma responsable del tratamiento de la información personal gestionada
              dentro del sistema CRM.
            </p>
            <p>
              Sitio web oficial: <a className="link link-primary" href="https://vualacrm.com" target="_blank" rel="noreferrer">https://vualacrm.com</a>
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">2. Datos que recopilamos</h2>
            <p>
              Podemos tratar datos como: nombre, correo electrónico, teléfono, cargo, empresa, historial de
              interacción comercial, información de clientes y contactos, y datos operativos necesarios para la
              gestión del CRM.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">3. Finalidad del tratamiento</h2>
            <p>La información se utiliza para:</p>
            <ul className="list-disc pl-5">
              <li>Administrar usuarios, compañías, clientes y contactos.</li>
              <li>Gestionar procesos comerciales, tareas y seguimiento CRM.</li>
              <li>Habilitar funcionalidades de mensajería e integración con proveedores externos (por ejemplo, WhatsApp).</li>
              <li>Mejorar seguridad, trazabilidad y rendimiento de la plataforma.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">4. Base legal y autorización</h2>
            <p>
              El tratamiento se realiza conforme a la autorización del titular, a la ejecución de relaciones
              contractuales y al interés legítimo de operación y seguridad del servicio.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">5. Conservación de la información</h2>
            <p>
              Los datos se conservan durante el tiempo necesario para cumplir las finalidades del servicio, obligaciones
              legales y requerimientos de auditoría o seguridad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">6. Compartición de datos</h2>
            <p>
              VualaCRM no comercializa datos personales. La información puede compartirse únicamente con proveedores
              tecnológicos o integraciones necesarias para la operación, bajo medidas de seguridad y confidencialidad.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">7. Derechos de los titulares</h2>
            <p>Los titulares pueden solicitar, según aplique:</p>
            <ul className="list-disc pl-5">
              <li>Acceso, actualización o corrección de sus datos.</li>
              <li>Revocatoria de autorización y/o supresión de la información.</li>
              <li>Información sobre el uso dado a sus datos personales.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-semibold">8. Seguridad de la información</h2>
            <p>
              VualaCRM implementa medidas técnicas y organizativas razonables para proteger la información contra
              acceso no autorizado, pérdida, alteración o divulgación indebida.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-semibold">9. Contacto</h2>
            <p>
              Para consultas sobre privacidad y tratamiento de datos: {' '}
              <a className="link link-primary" href="mailto:soporte@vualacrm.com">soporte@vualacrm.com</a>
            </p>
          </section>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPolicyPage;
