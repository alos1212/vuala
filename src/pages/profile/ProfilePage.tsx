import React, { useEffect, useMemo, useState } from "react";
import { BiImage, BiSave, BiUpload, BiUserCircle } from "react-icons/bi";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "../../hooks/useAuth";
import UserPointsCard from "../../components/profile/UserPointsCard";
import { userService } from "../../services/userService";
import { getUserAvatar } from "../../utils/authHelpers";

interface ProfileFormState {
  name: string;
  first_name: string;
  last_name: string;
  phone: string;
  birthdate: string;
  gender: "" | "M" | "F";
}

const emptyForm: ProfileFormState = {
  name: "",
  first_name: "",
  last_name: "",
  phone: "",
  birthdate: "",
  gender: "",
};

const normalizeDateValue = (value?: string | null) => {
  if (!value) return "";
  const raw = String(value);
  return raw.includes("T") ? raw.slice(0, 10) : raw;
};

const ProfilePage: React.FC = () => {
  const { user, updateProfile, isUpdatingProfile, isProfileLoading } = useAuth();
  const [form, setForm] = useState<ProfileFormState>(emptyForm);
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string>("");
  const [successMessage, setSuccessMessage] = useState<string>("");
  const [showPoints, setShowPoints] = useState(false);
  const [pointsPage, setPointsPage] = useState(1);

  const pointsQuery = useQuery({
    queryKey: ["profile-points", pointsPage],
    queryFn: () => userService.getMyProfilePoints({ page: pointsPage, per_page: 10 }),
    enabled: showPoints,
    placeholderData: (previousData) => previousData,
  });

  useEffect(() => {
    if (!user) return;

    setForm({
      name: user.name ?? "",
      first_name: user.first_name ?? "",
      last_name: user.last_name ?? "",
      phone: user.phone ?? "",
      birthdate: normalizeDateValue(user.birthdate ?? user.birth_date ?? null),
      gender: (user.gender as "" | "M" | "F" | null) ?? "",
    });
    setAvatarFile(null);
    setAvatarPreview("");
  }, [user]);

  const roleLabel = useMemo(() => {
    if (!user?.role?.length) return "Usuario";
    return user.role[0]?.display_name || "Usuario";
  }, [user]);

  const agencyLabel = useMemo(() => {
    if (user?.agency?.name) return user.agency.name;
    if (user?.agency_id) return `Agencia #${user.agency_id}`;
    return "Sin agencia";
  }, [user]);

  useEffect(() => {
    return () => {
      if (avatarPreview.startsWith("blob:")) {
        URL.revokeObjectURL(avatarPreview);
      }
    };
  }, [avatarPreview]);

  const previewAvatar = avatarPreview || getUserAvatar(user);

  const handleChange =
    (field: keyof ProfileFormState) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [field]: event.target.value }));
    };

  const handleAvatarChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (avatarPreview.startsWith("blob:")) {
      URL.revokeObjectURL(avatarPreview);
    }

    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSuccessMessage("");

    const payload = new FormData();
    payload.append("name", form.name);
    payload.append("first_name", form.first_name);
    payload.append("last_name", form.last_name);

    if (form.phone.trim()) {
      payload.append("phone", form.phone.trim());
    }

    if (form.birthdate) {
      payload.append("birthdate", form.birthdate);
    }

    if (form.gender) {
      payload.append("gender", form.gender);
    }

    if (avatarFile) {
      payload.append("avatar", avatarFile);
    }

    window.dispatchEvent(new CustomEvent("loader:start"));
    try {
      await updateProfile(payload);
      setSuccessMessage("La información se guardó correctamente.");
    } catch {
      // El error ya se notifica desde useAuth
    } finally {
      window.dispatchEvent(new CustomEvent("loader:end"));
    }
  };

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-5xl">
      <div>
        <h1 className="text-3xl font-bold">Mi perfil</h1>
        <p className="text-base-content/60">Actualiza tu información personal.</p>
        <button
          className="btn btn-sm btn-outline mt-3"
          onClick={() => {
            setShowPoints((prev) => !prev);
            setPointsPage(1);
          }}
        >
          {showPoints ? "Ocultar historial de puntos" : "Ver historial de puntos"}
        </button>
      </div>

      {successMessage && (
        <div className="alert alert-success shadow-sm">
          <span>{successMessage}</span>
        </div>
      )}

      <form className="grid grid-cols-1 lg:grid-cols-3 gap-6" onSubmit={handleSubmit}>
        <div className="card bg-base-100 shadow border border-base-200">
          <div className="card-body items-center text-center space-y-3">
            <div className="avatar">
              <div className="w-28 h-28 rounded-full ring ring-primary ring-offset-base-100 ring-offset-2">
                <img src={previewAvatar} alt="Avatar del usuario" />
              </div>
            </div>
            <h2 className="text-lg font-semibold">{user?.name || "Usuario"}</h2>
            <span className="badge badge-primary badge-outline">{roleLabel}</span>
            <div className="w-full form-control">
              <label className="label">
                <span className="label-text font-semibold flex items-center gap-1">
                  <BiUpload className="w-4 h-4" />
                  Cambiar foto
                </span>
              </label>
              <input type="file" accept="image/*" className="file-input file-input-bordered w-full" onChange={handleAvatarChange} />
              <p className="text-xs text-base-content/60 pt-2 flex items-center gap-1">
                <BiImage className="w-4 h-4" />
                {avatarFile ? avatarFile.name : "Se mostrará la foto guardada en /storage del backend"}
              </p>
            </div>
          </div>
        </div>

        <div className="card bg-base-100 shadow border border-base-200 lg:col-span-2">
          <div className="card-body space-y-4">
            <h3 className="card-title flex items-center gap-2">
              <BiUserCircle className="w-5 h-5" />
              Información de cuenta
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="form-control">
                <span className="label-text font-semibold">Correo</span>
                <input className="input input-bordered" value={user?.email || ""} disabled />
              </label>

              <label className="form-control">
                <span className="label-text font-semibold">Nombre</span>
                <input className="input input-bordered" value={form.name} onChange={handleChange("name")} />
              </label>

              <label className="form-control">
                <span className="label-text font-semibold">Segundo nombre</span>
                <input className="input input-bordered" value={form.first_name} onChange={handleChange("first_name")} />
              </label>

              <label className="form-control">
                <span className="label-text font-semibold">Apellido</span>
                <input className="input input-bordered" value={form.last_name} onChange={handleChange("last_name")} />
              </label>

              <label className="form-control">
                <span className="label-text font-semibold">Teléfono</span>
                <input className="input input-bordered" value={form.phone} onChange={handleChange("phone")} />
              </label>

              <label className="form-control">
                <span className="label-text font-semibold">Agencia</span>
                <input className="input input-bordered" value={agencyLabel} disabled />
              </label>

              <label className="form-control">
                <span className="label-text font-semibold">Fecha de nacimiento</span>
                <input type="date" className="input input-bordered" value={form.birthdate} onChange={handleChange("birthdate")} />
              </label>

              <label className="form-control">
                <span className="label-text font-semibold">Género</span>
                <select className="select select-bordered" value={form.gender} onChange={handleChange("gender")}>
                  <option value="">Seleccionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                </select>
              </label>
            </div>

            <div className="card-actions justify-end pt-2">
              <button type="submit" className="btn btn-primary" disabled={isUpdatingProfile}>
                {isUpdatingProfile ? <span className="loading loading-spinner loading-sm" /> : <BiSave className="w-4 h-4" />}
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </form>

      {showPoints && (
        <UserPointsCard
          title="Historial de puntos"
          data={pointsQuery.data}
          isLoading={pointsQuery.isLoading || pointsQuery.isFetching}
          onPageChange={setPointsPage}
        />
      )}
    </div>
  );
};

export default ProfilePage;
