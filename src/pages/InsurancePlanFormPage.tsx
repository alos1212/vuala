import { useForm } from "react-hook-form";
import { useParams, useNavigate } from "react-router-dom";

export default function InsurancePlanFormPage() {
  const params = useParams();
  const isEditing = Boolean(params.id);
  const navigate = useNavigate();

  const form = useForm({
    defaultValues: {
      name: "",
      description: "",
      amount: 0,
      duration: 0,
    },
  });

  const handleCreateAsNew = () => {
    navigate('/insurance-plans/new', {
      state: {
        initialData: form.getValues() // Envía los datos actuales como estado inicial
      }
    });
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-4">
        <h1 className="text-2xl font-bold">
          {isEditing ? 'Editar Plan de Seguro' : 'Nuevo Plan de Seguro'}
        </h1>
        {isEditing && (
          <button
            onClick={handleCreateAsNew}
          >
            Crear como nuevo
          </button>
        )}
      </div>
      
      {/* ...resto del formulario... */}
    </div>
  );
}